"use client"

import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'

export function DebugSupabase() {
  const [debug, setDebug] = useState<any>({})

  useEffect(() => {
    async function testSupabase() {
      console.log('🔥 TESTING SUPABASE CONNECTION...')
      
      try {
        // Test PLANTILLA
        const plantilla = await db.getPlantilla()
        console.log('✅ PLANTILLA test result:', plantilla?.length, 'records')
        
        // Test INCIDENCIAS  
        const incidencias = await db.getIncidencias()
        console.log('✅ INCIDENCIAS test result:', incidencias?.length, 'records')
        
        // Test ACT
        const act = await db.getACT()
        console.log('✅ ACT test result:', act?.length, 'records')

        setDebug({
          plantilla: plantilla?.length || 0,
          incidencias: incidencias?.length || 0,
          act: act?.length || 0,
          plantillaData: plantilla?.slice(0, 3) // First 3 records
        })
      } catch (error) {
        console.error('❌ SUPABASE TEST ERROR:', error)
        setDebug({ error: error.message })
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