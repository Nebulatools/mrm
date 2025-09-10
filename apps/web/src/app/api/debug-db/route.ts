import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export async function GET() {
  console.log('🔥 API DEBUG: Testing database connection...')
  
  try {
    // Test 1: Direct Supabase query to check tables
    console.log('📋 Step 1: Testing direct Supabase query...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables') 
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      console.log('⚠️ Cannot query information_schema, trying direct table queries...')
    } else {
      console.log('✅ Found tables:', tables?.map(t => t.table_name))
    }

    // Test 2: Try PLANTILLA (uppercase)
    console.log('📋 Step 2: Testing PLANTILLA (uppercase)...')
    const { data: plantillaUpper, error: errorUpper } = await supabase
      .from('plantilla')
      .select('*')
      .limit(5)
    
    console.log('PLANTILLA result:', { count: plantillaUpper?.length, error: errorUpper?.message })

    // Test 3: Try plantilla (lowercase)
    console.log('📋 Step 3: Testing plantilla (lowercase)...')
    const { data: plantillaLower, error: errorLower } = await supabase
      .from('plantilla')
      .select('*')
      .limit(5)
    
    console.log('plantilla result:', { count: plantillaLower?.length, error: errorLower?.message })

    // Test 4: Try using db functions
    console.log('📋 Step 4: Testing db.getPlantilla()...')
    let dbResult = null
    let dbError = null
    try {
      dbResult = await db.getPlantilla()
    } catch (err: any) {
      dbError = err.message
    }
    console.log('db.getPlantilla result:', { count: dbResult?.length, error: dbError })

    // Test 5: Try SFTP tables and HR tables
    const sftpTables = ['empleados_sftp', 'motivos_baja', 'asistencia_diaria']
    const hrTables = ['incidencias', 'act']
    const allTables = [...sftpTables, ...hrTables]
    const results: any = {}
    
    for (const tableName of allTables) {
      console.log(`📋 Step 5: Testing ${tableName}...`)
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(3)
      
      results[tableName] = { count: data?.length || 0, error: error?.message }
      console.log(`${tableName} result:`, results[tableName])
    }

    return NextResponse.json({
      success: true,
      tables: tables?.map(t => t.table_name) || ['Could not fetch table list'],
      tests: {
        PLANTILLA_upper: { count: plantillaUpper?.length || 0, error: errorUpper?.message },
        plantilla_lower: { count: plantillaLower?.length || 0, error: errorLower?.message },
        db_function: { count: dbResult?.length || 0, error: dbError },
        alternatives: results
      },
      samples: {
        plantilla_upper: plantillaUpper?.slice(0, 2),
        plantilla_lower: plantillaLower?.slice(0, 2),
        db_result: dbResult?.slice(0, 2)
      }
    })

  } catch (error: any) {
    console.error('❌ API DEBUG ERROR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}