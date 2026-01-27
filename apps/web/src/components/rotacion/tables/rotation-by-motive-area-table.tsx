"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlantillaRecord } from "@/lib/supabase";
import type { MotivoBajaRecord } from "@/lib/types/records";
import { cn } from "@/lib/utils";
import { VisualizationContainer } from "@/components/shared/visualization-container";
import { prettyMotivo, isMotivoClave } from "@/lib/normalizers";
import { useTheme } from "@/components/shared/theme-provider";
import { getTitleWithYear } from "@/lib/filters/year-display";

export type MotivoFilterType = "all" | "voluntaria" | "involuntaria";

interface RotationByMotiveAreaTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  selectedYears?: number[];
  selectedMonths?: number[];
  refreshEnabled?: boolean;
  motivoFilter?: MotivoFilterType;
}

export function RotationByMotiveAreaTable({
  plantilla,
  motivosBaja,
  selectedYears = [],
  selectedMonths = [],
  refreshEnabled = false,
  motivoFilter = "all",
}: RotationByMotiveAreaTableProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { areaData, allMotivos, grandTotal, maxValue } = useMemo(() => {
    // Filter motivos_baja by selected years AND months
    let filteredMotivosBaja = motivosBaja.filter(baja => {
      if (!baja.fecha_baja) return false;
      // ✅ FIX TIMEZONE: Parsear fecha como string
      const fechaStr = String(baja.fecha_baja);
      const [yearStr, monthStr] = fechaStr.split('-');
      const bajaYear = parseInt(yearStr, 10);
      const bajaMonth = parseInt(monthStr, 10);

      if (selectedYears.length > 0 && !selectedYears.includes(bajaYear)) {
        return false;
      }
      if (selectedMonths.length > 0 && !selectedMonths.includes(bajaMonth)) {
        return false;
      }
      return true;
    });

    // Apply motivo filter (voluntaria/involuntaria)
    if (motivoFilter !== "all") {
      filteredMotivosBaja = filteredMotivosBaja.filter(baja => {
        const esInvoluntaria = isMotivoClave(baja.motivo);
        return motivoFilter === "involuntaria" ? esInvoluntaria : !esInvoluntaria;
      });
    }

    // Create lookup map: numero_empleado -> motivo
    const motivosMap = new Map<number, string>();
    filteredMotivosBaja.forEach(baja => {
      motivosMap.set(baja.numero_empleado, baja.motivo);
    });

    // Create set of employee numbers that match the motivo filter
    const filteredEmployeeNumbers = new Set(
      filteredMotivosBaja.map(baja => baja.numero_empleado)
    );

    // Filter plantilla by year/month and motivo filter
    const bajasAll = plantilla.filter(emp => {
      if (!emp.fecha_baja) return false;

      const fechaStr = String(emp.fecha_baja);
      const [yearStr, monthStr] = fechaStr.split('-');
      const bajaYear = parseInt(yearStr, 10);
      const bajaMonth = parseInt(monthStr, 10);

      if (selectedYears.length > 0 && !selectedYears.includes(bajaYear)) {
        return false;
      }
      if (selectedMonths.length > 0 && !selectedMonths.includes(bajaMonth)) {
        return false;
      }

      if (motivoFilter !== "all" && emp.numero_empleado) {
        return filteredEmployeeNumbers.has(emp.numero_empleado);
      }

      return true;
    });

    // Group bajas by area and motivo
    const areaMotivosMap = new Map<string, Record<string, number>>();
    const motivoCounts = new Map<string, number>();

    bajasAll.forEach(emp => {
      const area = emp.area || 'Sin Área';
      const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
      const motivo = prettyMotivo(rawMotivo) || 'No especificado';

      if (!areaMotivosMap.has(area)) {
        areaMotivosMap.set(area, {});
      }

      const areaDataItem = areaMotivosMap.get(area)!;
      areaDataItem[motivo] = (areaDataItem[motivo] || 0) + 1;
      motivoCounts.set(motivo, (motivoCounts.get(motivo) || 0) + 1);
    });

    // ✅ Get ALL motivos sorted by frequency (no limit)
    const allMotivos = Array.from(motivoCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([motivo]) => motivo);

    // Build area data array
    const areaData: { area: string; motivos: Record<string, number>; total: number }[] = [];
    areaMotivosMap.forEach((motivos, area) => {
      const total = Object.values(motivos).reduce((sum, count) => sum + count, 0);
      areaData.push({ area, motivos, total });
    });

    // Sort by total descending
    areaData.sort((a, b) => b.total - a.total);

    const grandTotal = bajasAll.length;

    // Calculate max value for heatmap intensity
    let maxVal = 1;
    areaData.forEach(row => {
      allMotivos.forEach(motivo => {
        const val = row.motivos[motivo] || 0;
        if (val > maxVal) maxVal = val;
      });
    });

    return { areaData, allMotivos, grandTotal, maxValue: maxVal };
  }, [plantilla, motivosBaja, selectedYears, selectedMonths, motivoFilter]);

  // Intensity palette (same as bajas-por-motivo-heatmap)
  const intensityPalette = useMemo(() => {
    if (isDark) {
      return [
        { bg: 'rgba(148, 163, 184, 0.12)', text: 'rgba(226, 232, 240, 0.55)', border: 'rgba(148, 163, 184, 0.2)' },
        { bg: 'rgba(248, 113, 113, 0.22)', text: '#fdece8', border: 'rgba(248, 113, 113, 0.3)' },
        { bg: 'rgba(239, 68, 68, 0.35)', text: '#fff5f5', border: 'rgba(239, 68, 68, 0.4)' },
        { bg: 'rgba(220, 38, 38, 0.55)', text: '#FEF2F2', border: 'rgba(220, 38, 38, 0.55)' },
        { bg: 'rgba(185, 28, 28, 0.75)', text: '#F8FAFC', border: 'rgba(185, 28, 28, 0.8)' }
      ];
    }
    return [
      { bg: '#f8fafc', text: '#64748b', border: 'rgba(148, 163, 184, 0.35)' },
      { bg: '#fee2e2', text: '#991b1b', border: 'rgba(248, 113, 113, 0.4)' },
      { bg: '#fecaca', text: '#7f1d1d', border: 'rgba(239, 68, 68, 0.3)' },
      { bg: '#fca5a5', text: '#7f1d1d', border: 'rgba(239, 68, 68, 0.35)' },
      { bg: '#ef4444', text: '#fff', border: 'rgba(239, 68, 68, 0.6)' }
    ];
  }, [isDark]);

  const getCellStyle = (value: number) => {
    if (value === 0) {
      return {
        backgroundColor: intensityPalette[0].bg,
        color: intensityPalette[0].text,
        border: `1px solid ${intensityPalette[0].border}`
      };
    }
    const intensity = value / maxValue;
    const index = Math.min(intensityPalette.length - 1, Math.max(1, Math.ceil(intensity * (intensityPalette.length - 1))));
    const paletteValue = intensityPalette[index];
    return {
      backgroundColor: paletteValue.bg,
      color: paletteValue.text,
      border: `1px solid ${paletteValue.border}`
    };
  };

  // Calculate column totals for ALL motivos
  const motivoTotals: Record<string, number> = {};
  allMotivos.forEach(motivo => {
    motivoTotals[motivo] = areaData.reduce((sum, row) => sum + (row.motivos[motivo] || 0), 0);
  });

  return (
    <Card className={cn('border border-brand-border/40', isDark && 'bg-brand-surface/80 text-brand-ink')}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-brand-ink">
          🗺️ {getTitleWithYear('Rotación por Motivo y Área', selectedYears)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mapa de calor mostrando la distribución de bajas por área y motivo principal
        </p>
      </CardHeader>
      <CardContent>
        <VisualizationContainer
          title={getTitleWithYear('Rotación por Motivo y Área', selectedYears)}
          type="table"
          className="w-full"
          filename="rotacion-motivo-area"
        >
          {(isFullscreen: boolean) => (
            <div className="overflow-x-auto rounded-2xl border border-brand-border/40 bg-card shadow-sm dark:bg-brand-surface/70">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="min-w-[140px] p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-brand-ink/70">
                      Área
                    </th>
                    {allMotivos.map((motivo, index) => (
                      <th
                        key={index}
                        className="min-w-[80px] max-w-[110px] p-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-brand-ink/60"
                        title={motivo}
                      >
                        {motivo.length > 12 ? motivo.substring(0, 12) + '...' : motivo}
                      </th>
                    ))}
                    <th className="min-w-[60px] p-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-brand-ink/70">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {areaData.length === 0 ? (
                    <tr>
                      <td colSpan={allMotivos.length + 2} className="p-4 text-center text-sm text-muted-foreground">
                        No hay bajas registradas para el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {areaData.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={cn('border-b text-sm', isDark ? 'border-brand-border/30' : 'border-slate-200')}
                        >
                          <td className={cn('p-3 font-medium', isDark ? 'text-brand-ink' : 'text-slate-900')}>
                            {row.area}
                          </td>
                          {allMotivos.map((motivo, colIndex) => {
                            const value = row.motivos[motivo] || 0;
                            const cellStyle = getCellStyle(value);
                            return (
                              <td
                                key={colIndex}
                                className="mx-0.5 rounded-lg p-1.5 text-center text-sm font-semibold transition-colors"
                                style={cellStyle}
                                title={`${row.area} - ${motivo}: ${value} bajas`}
                              >
                                {value || ''}
                              </td>
                            );
                          })}
                          <td className={cn('p-2 text-center font-semibold', isDark ? 'text-brand-ink' : 'text-slate-900')}>
                            {row.total}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className={cn(
                        'border-t-2 font-bold',
                        isDark ? 'bg-brand-surface/70 border-brand-border/50' : 'bg-slate-100 border-slate-300'
                      )}>
                        <td className={cn('p-3 font-bold', isDark ? 'text-brand-ink' : 'text-slate-900')}>
                          TOTAL
                        </td>
                        {allMotivos.map((motivo, index) => (
                          <td key={index} className={cn('p-2 text-center font-bold', isDark ? 'text-brand-ink' : 'text-slate-900')}>
                            {motivoTotals[motivo] || 0}
                          </td>
                        ))}
                        <td className={cn('p-2 text-center font-bold', isDark ? 'text-brand-ink' : 'text-slate-900')}>
                          {grandTotal}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </VisualizationContainer>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className={cn('font-semibold', isDark ? 'text-brand-ink/80' : 'text-slate-600')}>Intensidad:</span>
          {([0, 1, 2, 3, 4] as const).map((level) => {
            const paletteValue = intensityPalette[Math.min(level, intensityPalette.length - 1)];
            const label = ['0', 'Bajo', 'Medio', 'Alto', 'Crítico'][level];
            return (
              <div key={level} className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: paletteValue.bg, border: `1px solid ${paletteValue.border}` }}
                ></div>
                <span className={cn('text-xs', isDark ? 'text-brand-ink/70' : 'text-slate-500')}>{label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
