import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: body } = await req.json()
    const { fileType, fileData } = body

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

    let processedRecords = 0
    let insertedRecords = 0
    let updatedRecords = 0
    let failedRecords = 0

    try {
      switch (fileType) {
        case 'employee':
          // Process PLANTILLA data
          if (fileData && fileData.length > 0) {
            processedRecords = fileData.length

            for (const record of fileData) {
              try {
                // Check if employee exists
                const { data: existingEmployee } = await supabaseClient
                  .from('plantilla')
                  .select('empleado_id')
                  .eq('empleado_id', record.empleado_id)
                  .single()

                if (existingEmployee) {
                  // Update existing employee
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
                    failedRecords++
                    console.error('Update error:', updateError)
                  } else {
                    updatedRecords++
                  }
                } else {
                  // Insert new employee
                  const { error: insertError } = await supabaseClient
                    .from('plantilla')
                    .insert({
                      empleado_id: record.empleado_id,
                      first_name: record.first_name,
                      last_name: record.last_name,
                      active_status: record.active_status
                    })

                  if (insertError) {
                    failedRecords++
                    console.error('Insert error:', insertError)
                  } else {
                    insertedRecords++
                  }
                }
              } catch (recordError) {
                failedRecords++
                console.error('Record processing error:', recordError)
              }
            }
          }
          break

        case 'incident':
          // Process INCIDENCIAS data
          if (fileData && fileData.length > 0) {
            processedRecords = fileData.length

            for (const record of fileData) {
              try {
                // Check if incident exists
                const { data: existingIncident } = await supabaseClient
                  .from('incidencias')
                  .select('incident_id')
                  .eq('incident_id', record.incident_id)
                  .single()

                if (existingIncident) {
                  // Update existing incident
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
                    failedRecords++
                    console.error('Update error:', updateError)
                  } else {
                    updatedRecords++
                  }
                } else {
                  // Insert new incident
                  const { error: insertError } = await supabaseClient
                    .from('incidencias')
                    .insert({
                      incident_id: record.incident_id,
                      employee_id: record.employee_id,
                      incident_type: record.incident_type,
                      incident_date: record.incident_date
                    })

                  if (insertError) {
                    failedRecords++
                    console.error('Insert error:', insertError)
                  } else {
                    insertedRecords++
                  }
                }
              } catch (recordError) {
                failedRecords++
                console.error('Record processing error:', recordError)
              }
            }
          }
          break

        default:
          throw new Error(`Unsupported file type: ${fileType}`)
      }

      // Update import log with success
      await supabaseClient
        .from('import_logs')
        .update({
          status: 'completed',
          records_processed: processedRecords,
          records_inserted: insertedRecords,
          records_updated: updatedRecords,
          records_failed: failedRecords,
          end_time: new Date().toISOString()
        })
        .eq('id', importLog.id)

    } catch (processingError) {
      // Update import log with error
      await supabaseClient
        .from('import_logs')
        .update({
          status: 'failed',
          records_processed: processedRecords,
          records_inserted: insertedRecords,
          records_updated: updatedRecords,
          records_failed: failedRecords,
          error_message: processingError.message,
          error_details: { error: processingError.toString() },
          end_time: new Date().toISOString()
        })
        .eq('id', importLog.id)

      throw processingError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data ingestion completed successfully',
        summary: {
          processed: processedRecords,
          inserted: insertedRecords,
          updated: updatedRecords,
          failed: failedRecords
        }
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
        error: error.message,
        message: 'Failed to process SFTP data ingestion'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})