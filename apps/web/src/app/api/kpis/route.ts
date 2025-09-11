import { NextResponse } from 'next/server'
import { kpiCalculator, type TimeFilter } from '@/lib/kpi-calculator'
import { db } from '@/lib/supabase'

export async function GET(request: Request) {
  console.log('🎯 API KPIs endpoint called')
  
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'alltime'
  const dateParam = searchParams.get('date') || new Date().toISOString()

  try {
    console.log('⏳ Loading KPIs and plantilla data...')
    
    // Load both KPIs and plantilla in parallel
    const [kpis, plantilla] = await Promise.all([
      kpiCalculator.calculateAllKPIs({ 
        period: period as TimeFilter['period'], 
        date: new Date(dateParam) 
      }),
      db.getEmpleadosSFTP()
    ])
    
    console.log('✅ API KPIs loaded:', {
      kpis: kpis?.length || 0,
      plantilla: plantilla?.length || 0
    })

    return NextResponse.json({
      success: true,
      data: {
        kpis: kpis || [],
        plantilla: plantilla || [],
        lastUpdated: new Date().toISOString(),
        loading: false
      },
      meta: {
        period,
        date: dateParam,
        timestamp: new Date().toISOString()
      }
    })

  } catch (e) {
    const error = e as Error;
    console.error('❌ API KPIs error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      data: {
        kpis: [],
        plantilla: [],
        lastUpdated: new Date().toISOString(),
        loading: false
      }
    }, { status: 500 })
  }
}
