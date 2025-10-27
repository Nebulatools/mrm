'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isMotivoClave } from '@/lib/normalizers'

interface BajasPorMotivoData {
  motivo: string
  enero: number
  febrero: number
  marzo: number
  abril: number
  mayo: number
  junio: number
  julio: number
  agosto: number
  septiembre: number
  octubre: number
  noviembre: number
  diciembre: number
}

interface BajasPorMotivoHeatmapProps {
  data: BajasPorMotivoData[]
  year: number
  motivoFilter?: 'involuntaria' | 'voluntaria'
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const MESES_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

export function BajasPorMotivoHeatmap({ data, year, motivoFilter = 'involuntaria' }: BajasPorMotivoHeatmapProps) {
  // Filtrar datos según el tipo de motivo
  const filteredData = data.filter(row => {
    if (motivoFilter === 'involuntaria') {
      return isMotivoClave(row.motivo);
    } else if (motivoFilter === 'voluntaria') {
      return !isMotivoClave(row.motivo);
    }
    return true; // Si no hay filtro, mostrar todo
  });

  // Calcular el máximo valor para escalar los colores
  const maxValue = Math.max(
    ...filteredData.flatMap(row =>
      MESES.map(mes => row[mes as keyof BajasPorMotivoData] as number)
    ),
    1 // Evitar división por 0
  )

  // Función para obtener el color basado en la intensidad
  const getColorIntensity = (value: number): string => {
    if (value === 0) return 'bg-gray-50'

    const intensity = value / maxValue

    if (intensity <= 0.2) return 'bg-red-100'
    if (intensity <= 0.4) return 'bg-red-200'
    if (intensity <= 0.6) return 'bg-red-300'
    if (intensity <= 0.8) return 'bg-red-400'
    return 'bg-red-500'
  }

  // Función para obtener el color del texto basado en la intensidad
  const getTextColor = (value: number): string => {
    if (value === 0) return 'text-gray-400'

    const intensity = value / maxValue
    return intensity > 0.6 ? 'text-white' : 'text-gray-900'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          🚦 Bajas por Motivo - {year}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Mapa de calor mostrando la cantidad de bajas por motivo y mes
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-gray-700 min-w-[150px]">
                  Motivo
                </th>
                {MESES_LABELS.map((mes, index) => (
                  <th key={index} className="text-center p-2 font-medium text-gray-700 min-w-[50px]">
                    {mes}
                  </th>
                ))}
                <th className="text-center p-2 font-medium text-gray-700 min-w-[60px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, rowIndex) => {
                const total = MESES.reduce((sum, mes) =>
                  sum + (row[mes as keyof BajasPorMotivoData] as number), 0
                )

                return (
                  <tr key={rowIndex} className="border-b border-gray-100">
                    <td className="p-2 font-medium text-gray-900">
                      {row.motivo}
                    </td>
                    {MESES.map((mes, mesIndex) => {
                      const value = row[mes as keyof BajasPorMotivoData] as number
                      return (
                        <td
                          key={mesIndex}
                          className={`p-2 text-center text-sm font-medium rounded-sm mx-1 ${getColorIntensity(value)} ${getTextColor(value)}`}
                          title={`${row.motivo} - ${MESES_LABELS[mesIndex]}: ${value} bajas`}
                        >
                          {value || ''}
                        </td>
                      )
                    })}
                    <td className="p-2 text-center font-bold text-gray-900">
                      {total}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="text-gray-600">Intensidad:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-50 border rounded"></div>
            <span className="text-xs text-gray-500">0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <span className="text-xs text-gray-500">Bajo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <span className="text-xs text-gray-500">Medio</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs text-gray-500">Alto</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}