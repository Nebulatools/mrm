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

export function CorrelationMatrix({ year = new Date().getFullYear() }: CorrelationMatrixProps) {
  const [masterMatrix, setMasterMatrix] = useState<CorrelationMatrixData | null>(null)
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
      const processedData = processDataForMatrix(empleadosData, bajasData, incidenciasData)

      // Crear matriz maestra
      const matrix = createMasterMatrix(processedData)
      setMasterMatrix(matrix)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular matriz')
    } finally {
      setLoading(false)
    }
  }

  const processDataForMatrix = (empleados: any[], bajas: any[], incidencias: any[]) => {
    // Calcular totales para porcentajes
    const totalEmpleados = empleados.length
    const totalBajas = bajas.length

    return empleados.map(emp => {
      const edad = emp.fecha_nacimiento
        ? Math.floor((new Date().getTime() - new Date(emp.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      const antiguedad = emp.fecha_ingreso
        ? Math.floor((new Date().getTime() - new Date(emp.fecha_ingreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      const tuvoBaja = bajas.some(baja => baja.numero_empleado === emp.numero_empleado) ? 1 : 0

      const incidenciasEmpleado = incidencias.filter(inc => inc.emp === emp.numero_empleado)
      const totalIncidencias = incidenciasEmpleado.length
      const incidenciasFaltas = incidenciasEmpleado.filter(inc => inc.inci === 'FJ' || inc.inci === 'FI').length
      const incidenciasVacaciones = incidenciasEmpleado.filter(inc => inc.inci === 'VAC').length
      const incidenciasPermisos = incidenciasEmpleado.filter(inc => inc.inci === 'INC').length

      // Calcular días trabajados estimados (suponiendo 6 días/semana)
      const diasEstimados = 26 // días laborales promedio por mes
      const porcentajeAusentismo = diasEstimados > 0 ? (totalIncidencias / diasEstimados) * 100 : 0

      return {
        genero_masc: emp.genero?.toLowerCase() === 'masculino' ? 1 : 0,
        edad: edad || 0, // Valores reales sin truncar
        estado_for: emp.estado && !emp.estado.toLowerCase().includes('nuevo le') ? 1 : 0, // CORREGIDO: Nuevo León es local
        antiguedad: antiguedad || 0, // Valores reales sin truncar
        puesto_op: emp.puesto?.toLowerCase().includes('operador') ? 1 : 0,
        turno_noc: emp.turno?.toLowerCase().includes('noche') ? 1 : 0,
        total_inc: totalIncidencias, // Sin truncar - valores reales
        faltas: incidenciasFaltas, // Sin truncar
        vacaciones: incidenciasVacaciones, // Sin truncar
        permisos: incidenciasPermisos, // Sin truncar
        tuvo_baja: tuvoBaja,
        pct_ausentismo: Math.min(porcentajeAusentismo, 100) // % de ausentismo (0-100)
      }
    }).filter(emp => emp.edad > 0 && emp.antiguedad !== null) // Filtrar registros sin datos válidos
  }

  const createMasterMatrix = (data: any[]): CorrelationMatrixData => {
    const variables = ['Género', 'Edad', 'Estado Foráneo', 'Antigüedad', 'Puesto Oper.', 'Turno Noct.', 'Tot. Incidenc.', 'Faltas', 'Vacaciones', 'Permisos', 'ROTACIÓN', '% AUSENTISMO']
    const dataKeys = ['genero_masc', 'edad', 'estado_for', 'antiguedad', 'puesto_op', 'turno_noc', 'total_inc', 'faltas', 'vacaciones', 'permisos', 'tuvo_baja', 'pct_ausentismo']

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
        <CardTitle>🔥 Matriz Maestra de Correlación RH ({year})</CardTitle>
        <CardDescription>
          Análisis completo con valores reales sin normalización - Nuevo León como ubicación base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border-l-4 border-blue-400">
            <div className="font-bold mb-2">📊 ¿Qué puedes descubrir aquí?</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>• ¿El turno nocturno aumenta las faltas?</div>
              <div>• ¿Los empleados jóvenes rotan más?</div>
              <div>• ¿La gente foránea (fuera de NL) falta más?</div>
              <div>• ¿Más incidencias = mayor rotación?</div>
            </div>
          </div>

          {masterMatrix && renderMatrix(masterMatrix)}

          <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
            <strong>💡 Tip de interpretación:</strong> Las últimas dos columnas (ROTACIÓN y % AUSENTISMO)
            son las más importantes - te dicen qué variables predicen mejor estos resultados críticos.
            <div className="mt-2">
              <strong>✅ Mejoras aplicadas:</strong> Valores reales sin truncar, Estado Foráneo = fuera de Nuevo León,
              Ausentismo como % de días laborales.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}