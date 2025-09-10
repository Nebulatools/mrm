import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔥 Checking all SFTP tables count...')
    
    const results: any = {}
    
    // Check empleados_sftp
    const { data: empleados, error: empleadosError } = await supabase
      .from('empleados_sftp')
      .select('*', { count: 'exact', head: true })
    
    results.empleados_sftp = {
      count: empleados ? 0 : (empleadosError ? 0 : 0),
      error: empleadosError?.message
    }
    
    // Alternative count method
    const { count: empleadosCount } = await supabase
      .from('empleados_sftp')
      .select('*', { count: 'exact', head: true })
    
    results.empleados_sftp.count = empleadosCount || 0
    
    // Check motivos_baja
    const { count: motivosCount } = await supabase
      .from('motivos_baja')
      .select('*', { count: 'exact', head: true })
    
    results.motivos_baja = {
      count: motivosCount || 0
    }
    
    // Check asistencia_diaria
    const { count: asistenciaCount } = await supabase
      .from('asistencia_diaria')
      .select('*', { count: 'exact', head: true })
    
    results.asistencia_diaria = {
      count: asistenciaCount || 0
    }
    
    console.log('📊 Final counts:', results)
    
    return NextResponse.json({
      success: true,
      tables: results,
      total: (results.empleados_sftp.count || 0) + (results.motivos_baja.count || 0) + (results.asistencia_diaria.count || 0)
    })

  } catch (error: any) {
    console.error('❌ Tables count error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 })
  }
}