"use client"

import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'

export function DebugSupabase() {
  const [debug, setDebug] = useState<any>({})

  useEffect(() => {
    async function testSupabase() {
      console.log('🔥 TESTING SUPABASE CONNECTION...')
      
      try {
        // Test EMPLEADOS SFTP
        const empleados = await db.getEmpleadosSFTP()
        console.log('✅ EMPLEADOS SFTP test result:', empleados?.length, 'records')
        
        // Test ASISTENCIA DIARIA  
        const asistencia = await db.getAsistenciaDiaria()
        console.log('✅ ASISTENCIA DIARIA test result:', asistencia?.length, 'records')
        
        // Test MOTIVOS BAJA
        const bajas = await db.getMotivosBaja()
        console.log('✅ MOTIVOS BAJA test result:', bajas?.length, 'records')

        setDebug({
          empleados: empleados?.length || 0,
          asistencia: asistencia?.length || 0,
          bajas: bajas?.length || 0,
          empleadosData: empleados?.slice(0, 3) // First 3 records
        })
      } catch (error) {
        console.error('❌ SUPABASE TEST ERROR:', error)
        setDebug({ error: (error as Error).message })
      }
    }

    testSupabase()
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold text-lg mb-2">🔍 Debug Supabase</h3>
      <pre className="text-sm overflow-auto">
        {JSON.stringify(debug, null, 2)}
      </pre>
    </div>
  )
}