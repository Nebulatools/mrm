'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'

interface CorrelationMatrixData {
  variables: string[]
  matrix: number[][]
  labels: string[]
}

interface CorrelationMatrixProps {
  year?: number
}

export function CorrelationMatrix({ year = 2025 }: CorrelationMatrixProps) {
  const [operationalMatrix, setOperationalMatrix] = useState<CorrelationMatrixData | null>(null)
  const [administrativeMatrix, setAdministrativeMatrix] = useState<CorrelationMatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    calculateMatrices()
  }, [year])

  const calculateMatrices = async () => {
    try {
      setLoading(true)

      // Obtener datos consolidados
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados_sftp')
        .select(`
          numero_empleado,
          genero,
          fecha_nacimiento,
          estado,
          departamento,
          puesto,
          area,
          empresa,
          tipo_nomina,
          turno,
          clasificacion,
          fecha_ingreso,
          fecha_baja,
          activo
        `)

      if (empleadosError) throw empleadosError

      const { data: bajasData, error: bajasError } = await supabase
        .from('motivos_baja')
        .select('numero_empleado, fecha_baja, tipo, motivo')
        .gte('fecha_baja', `${year}-01-01`)
        .lte('fecha_baja', `${year}-12-31`)

      if (bajasError) throw bajasError

      const { data: incidenciasData, error: incidenciasError } = await supabase
        .from('incidencias')
        .select('emp, fecha, inci, incidencia')
        .gte('fecha', `${year}-01-01`)
        .lte('fecha', `${year}-12-31`)

      if (incidenciasError) throw incidenciasError

      // Procesar datos
      console.log('🔥 DATOS RECIBIDOS:', {
        empleados: empleadosData?.length,
        bajas: bajasData?.length,
        incidencias: incidenciasData?.length,
        year,
        primeraIncidencia: incidenciasData?.[0],
        ultimaIncidencia: incidenciasData?.[incidenciasData.length - 1]
      })

      // FILTRAR: Solo empleados que tienen incidencias en el año
      const empleadosConIncidencias = new Set(incidenciasData?.map(inc => inc.emp) || [])
      const empleadosFiltrados = empleadosData?.filter(emp => empleadosConIncidencias.has(emp.numero_empleado)) || []

      console.log('🔥 FILTRO APLICADO:', {
        empleadosTotales: empleadosData?.length,
        empleadosConIncidencias: empleadosFiltrados.length,
        incidenciasUnicas: empleadosConIncidencias.size
      })

      const processedData = processDataForMatrix(empleadosFiltrados, bajasData, incidenciasData)

      console.log('📊 DATOS PROCESADOS:', {
        totalEmpleados: processedData.length,
        conTotalInc: processedData.filter(e => e.total_inc > 0).length,
        conAusentismo2d: processedData.filter(e => e.ausentismo_2d > 0).length,
        conAusentismo3d: processedData.filter(e => e.ausentismo_3d > 0).length,
        ejemploConDatos: processedData.find(e => e.total_inc > 0),
        ejemploSinDatos: processedData[0]
      })

      // Crear matrices operativa y administrativa
      const opMatrix = createOperationalMatrix(processedData)
      const admMatrix = createAdministrativeMatrix(processedData)
      setOperationalMatrix(opMatrix)
      setAdministrativeMatrix(admMatrix)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular matriz')
    } finally {
      setLoading(false)
    }
  }

  // Función auxiliar para calcular días en rachas de ausentismo consecutivo
  const calcularRachasAusentismo = (incidencias: any[], numeroEmpleado: number, debugFirst: boolean = false) => {
    // CÓDIGOS REALES DE INCIDENCIAS NEGATIVAS (según DB real)
    const INCIDENT_CODES = ['FI', 'ENFE', 'PSIN', 'SUSP']

    // Filtrar incidencias de ausentismo del empleado y ordenar por fecha
    const ausencias = incidencias
      .filter(inc => inc.emp === numeroEmpleado && INCIDENT_CODES.includes(inc.inci))
      .map(inc => new Date(inc.fecha))
      .sort((a, b) => a.getTime() - b.getTime())

    if (debugFirst && ausencias.length > 0) {
      console.log('🔍 EJEMPLO RACHA:', {
        numeroEmpleado,
        totalAusencias: ausencias.length,
        primeraFecha: ausencias[0],
        ultimaFecha: ausencias[ausencias.length - 1]
      })
    }

    if (ausencias.length === 0) {
      return { dias2plus: 0, dias3plus: 0, dias5plus: 0, dias10plus: 0 }
    }

    const rachas = []
    let rachaActual = [ausencias[0]]

    for (let i = 1; i < ausencias.length; i++) {
      const diffDias = Math.floor((ausencias[i].getTime() - rachaActual[rachaActual.length - 1].getTime()) / (1000 * 60 * 60 * 24))

      if (diffDias === 1) {
        // Día consecutivo
        rachaActual.push(ausencias[i])
      } else {
        // Racha terminada
        rachas.push(rachaActual.length)
        rachaActual = [ausencias[i]]
      }
    }
    // Agregar última racha
    rachas.push(rachaActual.length)

    // Contar DÍAS totales en rachas de 2+, 3+, 5+, 10+ días
    const dias2plus = rachas.filter(r => r >= 2).reduce((sum, r) => sum + r, 0)
    const dias3plus = rachas.filter(r => r >= 3).reduce((sum, r) => sum + r, 0)
    const dias5plus = rachas.filter(r => r >= 5).reduce((sum, r) => sum + r, 0)
    const dias10plus = rachas.filter(r => r >= 10).reduce((sum, r) => sum + r, 0)

    return { dias2plus, dias3plus, dias5plus, dias10plus }
  }

  const processDataForMatrix = (empleados: any[], bajas: any[], incidencias: any[]) => {
    // Calcular totales para porcentajes
    const totalEmpleados = empleados.length
    const totalBajas = bajas.length

    // DEBUG: Ver primeros empleados e incidencias para verificar join
    console.log('🔍 DEBUG JOIN:', {
      primerEmpleado: empleados[0]?.numero_empleado,
      tipoNumeroEmpleado: typeof empleados[0]?.numero_empleado,
      primeraIncidencia: incidencias[0]?.emp,
      tipoEmp: typeof incidencias[0]?.emp,
      incidenciasSample: incidencias.slice(0, 3).map(i => ({ emp: i.emp, inci: i.inci }))
    })

    let debugPrinted = false
    return empleados.map(emp => {
      const edad = emp.fecha_nacimiento
        ? Math.floor((new Date().getTime() - new Date(emp.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      const antiguedad = emp.fecha_ingreso
        ? Math.floor((new Date().getTime() - new Date(emp.fecha_ingreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      const tuvoBaja = bajas.some(baja => baja.numero_empleado === emp.numero_empleado) ? 1 : 0

      // CÓDIGOS REALES según DB (verificado con MCP)
      const INCIDENT_CODES = ['FI', 'ENFE', 'PSIN', 'SUSP'] // Incidencias negativas
      const PERMISO_CODES = ['PCON', 'VAC', 'MAT3'] // Permisos/ausencias autorizadas

      const incidenciasEmpleado = incidencias.filter(inc => inc.emp === emp.numero_empleado)

      // DEBUG: Mostrar códigos de incidencia del primer empleado con datos
      if (!debugPrinted && incidenciasEmpleado.length > 0) {
        console.log('🔍 CÓDIGOS DE INCIDENCIA REALES:', {
          numeroEmpleado: emp.numero_empleado,
          totalIncidencias: incidenciasEmpleado.length,
          codigosUnicos: [...new Set(incidenciasEmpleado.map(i => i.inci))],
          primerasMuestras: incidenciasEmpleado.slice(0, 5).map(i => ({ fecha: i.fecha, inci: i.inci }))
        })
        debugPrinted = true
      }

      // Total de TODAS las incidencias (incluye tanto negativas como permisos)
      const totalIncidencias = incidenciasEmpleado.length

      // Separar por tipo de incidencia
      const faltasInjustificadas = incidenciasEmpleado.filter(inc => inc.inci === 'FI').length
      const ausenciasEnfermedad = incidenciasEmpleado.filter(inc => inc.inci === 'ENFE').length
      const permisosSinGoce = incidenciasEmpleado.filter(inc => inc.inci === 'PSIN').length
      const suspensiones = incidenciasEmpleado.filter(inc => inc.inci === 'SUSP').length

      // Permisos autorizados
      const incidenciasVacaciones = incidenciasEmpleado.filter(inc => inc.inci === 'VAC').length
      const permisosConGoce = incidenciasEmpleado.filter(inc => inc.inci === 'PCON').length
      const permisosMaternidad = incidenciasEmpleado.filter(inc => inc.inci === 'MAT3').length

      // Calcular días trabajados estimados (suponiendo 6 días/semana)
      const diasEstimados = 26 // días laborales promedio por mes
      const porcentajeAusentismo = diasEstimados > 0 ? (totalIncidencias / diasEstimados) * 100 : 0

      // Calcular rachas de ausentismo
      const rachas = calcularRachasAusentismo(incidencias, emp.numero_empleado, !debugPrinted)

      // DEBUG: Ver POR QUÉ las rachas están en 0
      if (!debugPrinted) {
        console.log('🔍 DEBUG RACHAS:', {
          numeroEmpleado: emp.numero_empleado,
          totalIncidenciasEmpleado: incidenciasEmpleado.length,
          incidenciasNegativas: incidenciasEmpleado.filter(inc => ['FI', 'ENFE', 'PSIN', 'SUSP'].includes(inc.inci)).length,
          rachasCalculadas: rachas,
          fechasNegativas: incidenciasEmpleado
            .filter(inc => ['FI', 'ENFE', 'PSIN', 'SUSP'].includes(inc.inci))
            .map(inc => inc.fecha)
            .sort()
            .slice(0, 10) // Primeras 10 fechas
        })
        debugPrinted = true
      }

      return {
        // Variables administrativas
        genero_masc: emp.genero?.toLowerCase() === 'masculino' ? 1 : 0,
        edad: edad || 0,
        estado_for: emp.estado && !emp.estado.toLowerCase().includes('nuevo le') ? 1 : 0,
        antiguedad: antiguedad || 0,
        puesto_op: emp.puesto?.toLowerCase().includes('operador') ? 1 : 0,
        tuvo_baja: tuvoBaja,

        // Variables operativas - Incidencias por tipo
        total_inc: totalIncidencias, // Total de TODAS las incidencias (incluye VAC, PCON, MAT3, FI, ENFE, PSIN, SUSP)
        faltas_injust: faltasInjustificadas, // FI
        enfermedad: ausenciasEnfermedad, // ENFE
        perm_sin_goce: permisosSinGoce, // PSIN
        suspensiones: suspensiones, // SUS/SUSP

        // Permisos autorizados
        vacaciones: incidenciasVacaciones, // VAC
        perm_con_goce: permisosConGoce, // PCON
        maternidad: permisosMaternidad, // MAT3

        // Métricas de ausentismo
        pct_ausentismo: Math.min(porcentajeAusentismo, 100),
        turno_noc: emp.turno?.toLowerCase().includes('noche') ? 1 : 0,

        // Rachas de ausentismo por días consecutivos
        ausentismo_2d: rachas.dias2plus,
        ausentismo_3d: rachas.dias3plus,
        ausentismo_5d: rachas.dias5plus,
        ausentismo_10d: rachas.dias10plus,
      }
    }).filter(emp => emp.edad > 0 && emp.antiguedad !== null) // Filtrar registros sin datos válidos
  }

  // Matriz de Variables Operativas (SIMPLIFICADA + ROTACIÓN)
  const createOperationalMatrix = (data: any[]): CorrelationMatrixData => {
    const variables = [
      'Tot. Inc.',
      'Días 2d+',
      'Días 3d+',
      'Días 5d+',
      'Días 10d+',
      'Turno Noct.',
      'ROTACIÓN'
    ]
    const dataKeys = [
      'total_inc',
      'ausentismo_2d',
      'ausentismo_3d',
      'ausentismo_5d',
      'ausentismo_10d',
      'turno_noc',
      'tuvo_baja'
    ]

    const matrix = dataKeys.map(keyA =>
      dataKeys.map(keyB =>
        calculateCorrelation(
          data.map(d => d[keyA]),
          data.map(d => d[keyB])
        )
      )
    )

    return {
      variables: dataKeys,
      matrix,
      labels: variables
    }
  }

  // Matriz de Variables Administrativas (características demográficas/contractuales)
  const createAdministrativeMatrix = (data: any[]): CorrelationMatrixData => {
    const variables = [
      'Género',
      'Edad',
      'Estado For.',
      'Antigüedad',
      'Puesto Op.',
      'ROTACIÓN'
    ]
    const dataKeys = [
      'genero_masc',
      'edad',
      'estado_for',
      'antiguedad',
      'puesto_op',
      'tuvo_baja'
    ]

    const matrix = dataKeys.map(keyA =>
      dataKeys.map(keyB =>
        calculateCorrelation(
          data.map(d => d[keyA]),
          data.map(d => d[keyB])
        )
      )
    )

    return {
      variables: dataKeys,
      matrix,
      labels: variables
    }
  }

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length)
    if (n === 0) return 0

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    return denominator === 0 ? 0 : Math.max(-1, Math.min(1, numerator / denominator))
  }

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation)
    if (correlation > 0.7) return 'bg-red-600 text-white' // Correlación positiva fuerte
    if (correlation > 0.5) return 'bg-red-400 text-white'
    if (correlation > 0.3) return 'bg-red-200 text-gray-800'
    if (correlation > 0.1) return 'bg-red-100 text-gray-700'
    if (correlation > -0.1) return 'bg-gray-100 text-gray-600' // Sin correlación
    if (correlation > -0.3) return 'bg-blue-100 text-gray-700'
    if (correlation > -0.5) return 'bg-blue-200 text-gray-800'
    if (correlation > -0.7) return 'bg-blue-400 text-white'
    return 'bg-blue-600 text-white' // Correlación negativa fuerte
  }

  const renderMatrix = (matrixData: CorrelationMatrixData) => (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Header row - MÁS ALTO PARA QUE SE VEA EL TEXTO */}
        <div className="flex">
          <div className="w-32 h-20 flex items-center justify-center bg-gray-200 border font-semibold text-xs">
            Variables
          </div>
          {matrixData.labels.map((label, index) => (
            <div
              key={index}
              className="w-24 h-20 flex items-center justify-center bg-gray-200 border font-bold text-xs px-1"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              title={label}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {matrixData.matrix.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            <div className="w-32 h-16 flex items-center justify-center bg-gray-200 border font-bold text-xs px-1">
              {matrixData.labels[rowIndex]}
            </div>
            {row.map((correlation, colIndex) => (
              <div
                key={colIndex}
                className={`w-24 h-16 flex items-center justify-center border text-xs font-bold cursor-pointer hover:scale-105 transition-transform ${getCorrelationColor(correlation)}`}
                title={`${matrixData.labels[rowIndex]} vs ${matrixData.labels[colIndex]}: ${correlation.toFixed(3)}\n${getInterpretationText(correlation)}`}
              >
                {correlation.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Leyenda mejorada */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h4 className="font-bold text-sm mb-3 text-center">🎨 Guía de Colores</h4>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="w-6 h-6 bg-red-600 rounded mx-auto mb-1"></div>
            <div className="font-semibold">Positiva Fuerte</div>
            <div className="text-gray-600">+0.7 a +1.0</div>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 bg-gray-300 rounded mx-auto mb-1"></div>
            <div className="font-semibold">Sin Correlación</div>
            <div className="text-gray-600">-0.1 a +0.1</div>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 bg-blue-600 rounded mx-auto mb-1"></div>
            <div className="font-semibold">Negativa Fuerte</div>
            <div className="text-gray-600">-1.0 a -0.7</div>
          </div>
        </div>
        <div className="text-xs text-gray-500 text-center mt-3">
          💡 Pasa el mouse sobre cada celda para ver detalles
        </div>
      </div>
    </div>
  )

  const getInterpretationText = (correlation: number): string => {
    if (correlation > 0.7) return "Correlación muy fuerte positiva"
    if (correlation > 0.5) return "Correlación fuerte positiva"
    if (correlation > 0.3) return "Correlación moderada positiva"
    if (correlation > 0.1) return "Correlación débil positiva"
    if (correlation > -0.1) return "Sin correlación significativa"
    if (correlation > -0.3) return "Correlación débil negativa"
    if (correlation > -0.5) return "Correlación moderada negativa"
    if (correlation > -0.7) return "Correlación fuerte negativa"
    return "Correlación muy fuerte negativa"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔥 Matriz de Correlación - Análisis Predictivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-sm text-gray-500">Calculando correlaciones...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>❌ Error en Matriz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔥 Matriz de Correlación RH ({year})</CardTitle>
        <CardDescription>
          Análisis SIMPLIFICADO: 7 variables operativas (incluye ROTACIÓN) + 6 variables administrativas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border-l-4 border-blue-400">
            <div className="font-bold mb-2">📊 ¿Qué puedes descubrir aquí?</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>• <strong>Variables Operativas:</strong> Total incidencias + rachas de ausentismo (2, 3, 5, 10+ días) + ROTACIÓN</div>
              <div>• <strong>Variables Administrativas:</strong> Edad, género, antigüedad, rotación</div>
              <div>• <strong className="text-red-600">¿Las rachas de ausentismo predicen rotación (bajas)?</strong></div>
              <div>• ¿El turno nocturno correlaciona con ausentismo largo?</div>
            </div>
          </div>

          <Tabs defaultValue="operational" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="operational">⚙️ Variables Operativas</TabsTrigger>
              <TabsTrigger value="administrative">📋 Variables Administrativas</TabsTrigger>
            </TabsList>

            <TabsContent value="operational" className="space-y-4 mt-4">
              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
                <strong>Variables Operativas (SIMPLIFICADAS):</strong> Total Incidencias,
                Días en rachas 2+/3+/5+/10+ días consecutivos, Turno Nocturno, <strong className="text-red-600">ROTACIÓN (Bajas)</strong>
              </div>
              {operationalMatrix && renderMatrix(operationalMatrix)}
            </TabsContent>

            <TabsContent value="administrative" className="space-y-4 mt-4">
              <div className="text-xs text-gray-600 bg-green-50 p-3 rounded">
                <strong>Variables Administrativas:</strong> Género, Edad, Estado Foráneo, Antigüedad, Puesto Operador, Rotación
              </div>
              {administrativeMatrix && renderMatrix(administrativeMatrix)}
            </TabsContent>
          </Tabs>

          <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
            <strong>💡 Tip de interpretación:</strong> Las correlaciones altas ({'>'}0.7 o {'<'}-0.7) indican relaciones fuertes entre variables.
            <div className="mt-2">
              <strong>✅ PREGUNTA CLAVE:</strong> ¿Las rachas de ausentismo predicen la rotación (bajas)? Busca correlación entre "Días 2d+/3d+/5d+/10d+" y "ROTACIÓN".
            </div>
            <div className="mt-2">
              <strong>📊 Variables:</strong> Matriz operativa con 7 variables: Total incidencias + rachas de ausentismo (2+, 3+, 5+, 10+ días) + Turno nocturno + ROTACIÓN.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}