// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment  
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno global for ESLint compliance
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// Types for better type safety and ESLint compliance
interface ImportRequest {
  fileType: 'employee' | 'incident'
  fileData: EmployeeRecord[] | IncidentRecord[]
}

interface EmployeeRecord {
  empleado_id: string
  first_name: string
  last_name: string
  active_status: string
}

interface IncidentRecord {
  incident_id: string
  employee_id: string
  incident_type: string
  incident_date: string
}

interface ImportSummary {
  processed: number
  inserted: number
  updated: number
  failed: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation helper to prevent runtime errors
function validateRequest(body: unknown): ImportRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body')
  }

  const { fileType, fileData } = body as Record<string, unknown>

  if (!fileType || !['employee', 'incident'].includes(fileType as string)) {
    throw new Error('Invalid fileType. Must be "employee" or "incident"')
  }

  if (!Array.isArray(fileData) || fileData.length === 0) {
    throw new Error('fileData must be a non-empty array')
  }

  return { fileType: fileType as 'employee' | 'incident', fileData }
}

// Main server handler
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Fix ESLint error: Proper environment variable handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Safe JSON parsing with proper error handling
    let requestBody: unknown
    try {
      requestBody = await req.json()
    } catch (jsonError) {
      throw new Error(`Invalid JSON in request body: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`)
    }

    const { fileType, fileData } = validateRequest(requestBody)

    console.log(`Processing SFTP ingestion for file type: ${fileType}`)

    // Start import log
    const { data: importLog, error: logError } = await supabaseClient
      .from('import_logs')
      .insert({
        file_name: `${fileType}_${new Date().toISOString()}.csv`,
        file_type: fileType,
        status: 'processing',
        start_time: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      throw new Error(`Failed to create import log: ${logError.message}`)
    }

    const summary: ImportSummary = {
      processed: 0,
      inserted: 0,
      updated: 0,
      failed: 0
    }

    try {
      // Process data based on file type
      await processFileData(supabaseClient, fileType, fileData, summary)
      
      // Update import log with success
      await updateImportLog(supabaseClient, importLog.id, 'completed', summary)

    } catch (processingError) {
      // Update import log with error
      await updateImportLog(supabaseClient, importLog.id, 'failed', summary, processingError as Error)
      throw processingError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data ingestion completed successfully',
        summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('SFTP Ingestion Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process SFTP data ingestion'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Helper function to process file data efficiently
async function processFileData(
  supabaseClient: any,
  fileType: 'employee' | 'incident',
  fileData: any[],
  summary: ImportSummary
): Promise<void> {
  summary.processed = fileData.length

  switch (fileType) {
    case 'employee':
      await processEmployeeData(supabaseClient, fileData as EmployeeRecord[], summary)
      break
    case 'incident':
      await processIncidentData(supabaseClient, fileData as IncidentRecord[], summary)
      break
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

// Optimized employee data processing with batch operations
async function processEmployeeData(
  supabaseClient: any, 
  records: EmployeeRecord[], 
  summary: ImportSummary
): Promise<void> {
  // Get existing employee IDs in batch for better performance
  const employeeIds = records.map(r => r.empleado_id)
  const { data: existingEmployees } = await supabaseClient
    .from('plantilla')
    .select('empleado_id')
    .in('empleado_id', employeeIds)

  const existingIds = new Set(existingEmployees?.map((e: any) => e.empleado_id) || [])

  const newEmployees: EmployeeRecord[] = []
  const updatedEmployees: EmployeeRecord[] = []

  // Separate new and existing records
  for (const record of records) {
    if (existingIds.has(record.empleado_id)) {
      updatedEmployees.push(record)
    } else {
      newEmployees.push(record)
    }
  }

  // Batch insert new employees for better performance
  if (newEmployees.length > 0) {
    const { error: insertError, count } = await supabaseClient
      .from('plantilla')
      .insert(newEmployees.map(record => ({
        empleado_id: record.empleado_id,
        first_name: record.first_name,
        last_name: record.last_name,
        active_status: record.active_status
      })))

    if (insertError) {
      console.error('Batch insert error:', insertError)
      summary.failed += newEmployees.length
    } else {
      summary.inserted += count || newEmployees.length
    }
  }

  // Process updates individually (Supabase limitation)
  for (const record of updatedEmployees) {
    try {
      const { error: updateError } = await supabaseClient
        .from('plantilla')
        .update({
          first_name: record.first_name,
          last_name: record.last_name,
          active_status: record.active_status,
          updated_at: new Date().toISOString()
        })
        .eq('empleado_id', record.empleado_id)

      if (updateError) {
        summary.failed++
        console.error('Update error:', updateError)
      } else {
        summary.updated++
      }
    } catch (recordError) {
      summary.failed++
      console.error('Record processing error:', recordError)
    }
  }
}

// Optimized incident data processing with batch operations
async function processIncidentData(
  supabaseClient: any, 
  records: IncidentRecord[], 
  summary: ImportSummary
): Promise<void> {
  // Get existing incident IDs in batch for better performance
  const incidentIds = records.map(r => r.incident_id)
  const { data: existingIncidents } = await supabaseClient
    .from('incidencias')
    .select('incident_id')
    .in('incident_id', incidentIds)

  const existingIds = new Set(existingIncidents?.map((i: any) => i.incident_id) || [])

  const newIncidents: IncidentRecord[] = []
  const updatedIncidents: IncidentRecord[] = []

  // Separate new and existing records
  for (const record of records) {
    if (existingIds.has(record.incident_id)) {
      updatedIncidents.push(record)
    } else {
      newIncidents.push(record)
    }
  }

  // Batch insert new incidents for better performance
  if (newIncidents.length > 0) {
    const { error: insertError, count } = await supabaseClient
      .from('incidencias')
      .insert(newIncidents.map(record => ({
        incident_id: record.incident_id,
        employee_id: record.employee_id,
        incident_type: record.incident_type,
        incident_date: record.incident_date
      })))

    if (insertError) {
      console.error('Batch insert error:', insertError)
      summary.failed += newIncidents.length
    } else {
      summary.inserted += count || newIncidents.length
    }
  }

  // Process updates individually
  for (const record of updatedIncidents) {
    try {
      const { error: updateError } = await supabaseClient
        .from('incidencias')
        .update({
          employee_id: record.employee_id,
          incident_type: record.incident_type,
          incident_date: record.incident_date,
          updated_at: new Date().toISOString()
        })
        .eq('incident_id', record.incident_id)

      if (updateError) {
        summary.failed++
        console.error('Update error:', updateError)
      } else {
        summary.updated++
      }
    } catch (recordError) {
      summary.failed++
      console.error('Record processing error:', recordError)
    }
  }
}

// Helper function to update import log with proper error handling
async function updateImportLog(
  supabaseClient: any,
  logId: string,
  status: 'completed' | 'failed',
  summary: ImportSummary,
  error?: Error
): Promise<void> {
  const updateData: Record<string, any> = {
    status,
    records_processed: summary.processed,
    records_inserted: summary.inserted,
    records_updated: summary.updated,
    records_failed: summary.failed,
    end_time: new Date().toISOString()
  }

  if (error) {
    updateData.error_message = error.message
    updateData.error_details = { error: error.toString() }
  }

  await supabaseClient
    .from('import_logs')
    .update(updateData)
    .eq('id', logId)
}