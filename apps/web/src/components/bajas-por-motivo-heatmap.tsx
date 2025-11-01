'use client'

import { Fragment, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isMotivoClave } from '@/lib/normalizers'
import { VisualizationContainer } from './visualization-container'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const computeTotal = (row: BajasPorMotivoData) =>
    MESES.reduce((sum, mes) => sum + (row[mes as keyof BajasPorMotivoData] as number), 0)

  const INVOLUNTARIA_MOTIVOS = [
    'Rescisión por disciplina',
    'Rescisión por desempeño',
    'Término del contrato'
  ] as const;

  const emptyRow = Object.fromEntries(MESES.map(mes => [mes, 0])) as Omit<BajasPorMotivoData, 'motivo'>;

  const sections = [
    {
      key: 'involuntaria' as const,
      title: 'Rotación Involuntaria',
      rows: data.filter(row => isMotivoClave(row.motivo))
    },
    {
      key: 'voluntaria' as const,
      title: 'Rotación Voluntaria',
      rows: data.filter(row => !isMotivoClave(row.motivo))
    }
  ]
    .map(section => {
      let rows = [...section.rows];

      if (section.key === 'involuntaria') {
        rows = INVOLUNTARIA_MOTIVOS.map(motivo => {
          const found = rows.find(row => row.motivo === motivo);
          if (found) {
            return found;
          }
          return {
            motivo,
            ...emptyRow
          } as BajasPorMotivoData;
        });
      } else {
        rows.sort((a, b) => computeTotal(b) - computeTotal(a));
      }

      return {
        ...section,
        rows
      };
    })
    .filter(section => section.rows.length > 0)

  const allRows = sections.flatMap(section => section.rows)
  const values = allRows.flatMap(row =>
    MESES.map(mes => row[mes as keyof BajasPorMotivoData] as number)
  )
  const maxValue = Math.max(...values, 1)

  const intensityPalette = useMemo(() => {
    if (isDark) {
      return [
        { bg: 'rgba(148, 163, 184, 0.12)', text: 'rgba(226, 232, 240, 0.55)', border: 'rgba(148, 163, 184, 0.2)' },
        { bg: 'rgba(248, 113, 113, 0.22)', text: '#fdece8', border: 'rgba(248, 113, 113, 0.3)' },
        { bg: 'rgba(239, 68, 68, 0.35)', text: '#fff5f5', border: 'rgba(239, 68, 68, 0.4)' },
        { bg: 'rgba(220, 38, 38, 0.55)', text: '#FEF2F2', border: 'rgba(220, 38, 38, 0.55)' },
        { bg: 'rgba(185, 28, 28, 0.75)', text: '#F8FAFC', border: 'rgba(185, 28, 28, 0.8)' }
      ]
    }

    return [
      { bg: '#f8fafc', text: '#64748b', border: 'rgba(148, 163, 184, 0.35)' },
      { bg: '#fee2e2', text: '#991b1b', border: 'rgba(248, 113, 113, 0.4)' },
      { bg: '#fecaca', text: '#7f1d1d', border: 'rgba(239, 68, 68, 0.3)' },
      { bg: '#fca5a5', text: '#7f1d1d', border: 'rgba(239, 68, 68, 0.35)' },
      { bg: '#ef4444', text: '#fff', border: 'rgba(239, 68, 68, 0.6)' }
    ]
  }, [isDark])

  const getCellStyle = (value: number) => {
    if (value === 0) {
      const zeroPalette = intensityPalette[0]
      return {
        backgroundColor: zeroPalette.bg,
        color: zeroPalette.text,
        border: `1px solid ${zeroPalette.border}`
      }
    }

    const intensity = value / maxValue
    const index = Math.min(intensityPalette.length - 1, Math.max(1, Math.ceil(intensity * (intensityPalette.length - 1))))
    const paletteValue = intensityPalette[index]
    return {
      backgroundColor: paletteValue.bg,
      color: paletteValue.text,
      border: `1px solid ${paletteValue.border}`
    }
  }

  return (
    <Card className={cn('border border-brand-border/40', isDark && 'bg-brand-surface/80 text-brand-ink')}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-brand-ink">
          🚦 Bajas por Motivo - {year}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mapa de calor mostrando la cantidad de bajas por motivo y mes
        </p>
      </CardHeader>
      <CardContent>
        <VisualizationContainer
          title={`Bajas por motivo - ${year}`}
          type="table"
          className="w-full"
          filename={`bajas-por-motivo-${year}`}
        >
          {() => (
            <div className="overflow-x-auto rounded-2xl border border-brand-border/40 bg-card shadow-sm dark:bg-brand-surface/70">
              <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="min-w-[160px] p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-brand-ink/70">
                  Motivo
                </th>
                {MESES_LABELS.map((mes, index) => (
                  <th
                    key={index}
                    className="min-w-[50px] p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-brand-ink/60"
                  >
                    {mes}
                  </th>
                ))}
                <th className="min-w-[70px] p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-brand-ink/70">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={MESES.length + 2} className="p-4 text-center text-sm text-muted-foreground">
                    No hay bajas registradas para el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                sections.map(section => {
                  const sectionTotal = section.rows.reduce((sum, row) => sum + computeTotal(row), 0);

                  return (
                    <Fragment key={section.key}>
                      <tr
                        className={cn(
                          'border-b',
                          motivoFilter === section.key
                            ? (isDark ? 'bg-rose-500/15 border-rose-300/30' : 'bg-red-50 border-red-200')
                            : (isDark ? 'bg-brand-surface/70 border-brand-border/30' : 'bg-slate-100 border-slate-200')
                        )}
                      >
                        <td
                          colSpan={MESES.length + 2}
                          className={cn(
                            'flex items-center justify-between p-3 text-xs font-semibold uppercase tracking-[0.14em]',
                            isDark ? 'text-brand-ink/80' : 'text-slate-700'
                          )}
                        >
                          <span>{section.title}</span>
                          <span className={cn('text-xs font-semibold normal-case', isDark ? 'text-brand-ink/70' : 'text-slate-600')}>
                            Total: {sectionTotal.toLocaleString('es-MX')}
                          </span>
                        </td>
                      </tr>
                      {section.rows.map((row, rowIndex) => {
                        const total = computeTotal(row);

                        return (
                          <tr
                            key={`${section.key}-${rowIndex}`}
                            className={cn('border-b text-sm', isDark ? 'border-brand-border/30' : 'border-slate-200')}
                          >
                            <td className={cn('p-3 font-medium', isDark ? 'text-brand-ink' : 'text-slate-900')}>
                              {row.motivo}
                            </td>
                            {MESES.map((mes, mesIndex) => {
                              const value = row[mes as keyof BajasPorMotivoData] as number;
                              const cellStyle = getCellStyle(value)
                              return (
                                <td
                                  key={mesIndex}
                                  className="mx-1 rounded-lg p-2 text-center text-sm font-semibold transition-colors"
                                  style={cellStyle}
                                  title={`${row.motivo} - ${MESES_LABELS[mesIndex]}: ${value} bajas`}
                                >
                                  {value || ''}
                                </td>
                              );
                            })}
                            <td className={cn('p-2 text-center font-semibold', isDark ? 'text-brand-ink' : 'text-slate-900')}>
                              {total}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              )}
            </tbody>
              </table>
            </div>
          )}
        </VisualizationContainer>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className={cn('font-semibold', isDark ? 'text-brand-ink/80' : 'text-slate-600')}>Intensidad:</span>
          {([0, 1, 2, 3, 4] as const).map((level) => {
            const paletteValue = intensityPalette[Math.min(level, intensityPalette.length - 1)]
            const label = ['0', 'Bajo', 'Medio', 'Alto', 'Crítico'][level]
            return (
              <div key={level} className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: paletteValue.bg, border: `1px solid ${paletteValue.border}` }}
                ></div>
                <span className={cn('text-xs', isDark ? 'text-brand-ink/70' : 'text-slate-500')}>{label}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
