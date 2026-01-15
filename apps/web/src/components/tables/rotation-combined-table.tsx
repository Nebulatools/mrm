"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlantillaRecord } from "@/lib/supabase";
import type { MotivoBajaRecord } from "@/lib/types/records";
import { cn } from "@/lib/utils";
import { VisualizationContainer } from "@/components/visualization-container";
import { normalizeCCToUbicacion, normalizeMotivo, isMotivoClave } from "@/lib/normalizers";
import { parseSupabaseDate } from "@/lib/retention-calculations";
import { endOfMonth, startOfMonth } from "date-fns";
import { isFutureMonth } from "@/lib/date-utils";
import { getYearParenthetical } from "@/lib/filters/year-display";

interface RotationCombinedTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  selectedYears?: number[];
  refreshEnabled?: boolean;
}

interface MetricData {
  ubicacion: string;
  metrica: string;
  months: Record<string, string | number | null>;
  avg: string | number;
}

const MONTHS = [
  { key: 'ene', num: 1, label: 'ENE' },
  { key: 'feb', num: 2, label: 'FEB' },
  { key: 'mar', num: 3, label: 'MAR' },
  { key: 'abr', num: 4, label: 'ABR' },
  { key: 'may', num: 5, label: 'MAY' },
  { key: 'jun', num: 6, label: 'JUN' },
  { key: 'jul', num: 7, label: 'JUL' },
  { key: 'ago', num: 8, label: 'AGO' },
  { key: 'sep', num: 9, label: 'SEP' },
  { key: 'oct', num: 10, label: 'OCT' },
  { key: 'nov', num: 11, label: 'NOV' },
  { key: 'dic', num: 12, label: 'DIC' },
];

const UBICACIONES = ['CAD', 'CORPORATIVO', 'FILIALES'];
const METRICAS = [
  { key: 'activos', label: 'Activos' },
  { key: 'voluntarias', label: 'Bajas Voluntarias' },
  { key: 'involuntarias', label: 'Bajas Involuntarias' },
  { key: 'porcentaje', label: '% Rotación' },
];

export function RotationCombinedTable({
  plantilla,
  motivosBaja,
  selectedYears = [],
  refreshEnabled = false,
}: RotationCombinedTableProps) {

  // Use first selected year for monthly calculations, or current year if none selected
  const currentYear = selectedYears.length > 0 ? selectedYears[0] : new Date().getFullYear();

  const data = useMemo(() => {
    // Filter motivos_baja by the same years as the bajas being analyzed
    // This ensures we only use motivos from the matching year period
    const filteredMotivosBaja = selectedYears.length > 0
      ? motivosBaja.filter(baja => {
          if (!baja.fecha_baja) return false;
          const bajaYear = new Date(baja.fecha_baja).getFullYear();
          return selectedYears.includes(bajaYear);
        })
      : motivosBaja;

    // Create lookup map: numero_empleado -> motivo from filtered motivos_baja table
    const motivosMap = new Map<number, string>();
    filteredMotivosBaja.forEach(baja => {
      motivosMap.set(baja.numero_empleado, baja.motivo);
    });

    // SOURCE: empleados_sftp (plantilla) - filter bajas for the selected years
    const bajasYear = plantilla.filter(emp => {
      if (!emp.fecha_baja) return false;
      if (selectedYears.length === 0) return true; // No year filter = show all
      const fecha = new Date(emp.fecha_baja);
      return selectedYears.includes(fecha.getFullYear());
    });

    // First calculate all metrics by ubicacion
    const metricsByUbicacion: Record<string, any> = {};

    UBICACIONES.forEach(ubicacion => {
      metricsByUbicacion[ubicacion] = {
        activos: { months: {}, values: [] },
        voluntarias: { months: {}, values: [] },
        involuntarias: { months: {}, values: [] },
        porcentaje: { months: {}, values: [] },
      };

      MONTHS.forEach(month => {
        const monthStart = startOfMonth(new Date(currentYear, month.num - 1, 1));
        const monthEnd = endOfMonth(monthStart);

        // Skip future months
        if (isFutureMonth(currentYear, month.num)) {
          metricsByUbicacion[ubicacion].activos.months[month.key] = null;
          metricsByUbicacion[ubicacion].voluntarias.months[month.key] = null;
          metricsByUbicacion[ubicacion].involuntarias.months[month.key] = null;
          metricsByUbicacion[ubicacion].porcentaje.months[month.key] = null;
          return;
        }

        // Calculate headcount
        const headcountStart = plantilla.filter(emp => {
          const cc = (emp as any).cc || '';
          const empUbicacion = normalizeCCToUbicacion(cc);
          if (empUbicacion !== ubicacion) return false;

          const fechaIngreso = parseSupabaseDate(emp.fecha_ingreso);
          if (!fechaIngreso || fechaIngreso > monthStart) return false;

          const fechaBaja = parseSupabaseDate(emp.fecha_baja);
          return !fechaBaja || fechaBaja > monthStart;
        }).length;

        const headcountEnd = plantilla.filter(emp => {
          const cc = (emp as any).cc || '';
          const empUbicacion = normalizeCCToUbicacion(cc);
          if (empUbicacion !== ubicacion) return false;

          const fechaIngreso = parseSupabaseDate(emp.fecha_ingreso);
          if (!fechaIngreso || fechaIngreso > monthEnd) return false;

          const fechaBaja = parseSupabaseDate(emp.fecha_baja);
          return !fechaBaja || fechaBaja > monthEnd;
        }).length;

        const avgHeadcount = (headcountStart + headcountEnd) / 2;
        const roundedHeadcount = Math.round(avgHeadcount);
        metricsByUbicacion[ubicacion].activos.months[month.key] = roundedHeadcount;
        metricsByUbicacion[ubicacion].activos.values.push(roundedHeadcount);

        // Count bajas for this location and month
        const bajasMes = bajasYear.filter(emp => {
          const cc = (emp as any).cc || '';
          const empUbicacion = normalizeCCToUbicacion(cc);
          if (empUbicacion !== ubicacion) return false;

          const fecha = new Date(emp.fecha_baja!);
          const monthNum = fecha.getMonth() + 1;
          return monthNum === month.num;
        });

        // INVOLUNTARIAS = use isMotivoClave from normalizers
        // JOIN: Get motivo from motivos_baja lookup by numero_empleado
        const involuntarias = bajasMes.filter(emp => {
          const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
          const motivo = normalizeMotivo(rawMotivo || '');
          return isMotivoClave(motivo);
        }).length;

        const voluntarias = bajasMes.length - involuntarias;

        metricsByUbicacion[ubicacion].voluntarias.months[month.key] = voluntarias;
        metricsByUbicacion[ubicacion].voluntarias.values.push(voluntarias);

        metricsByUbicacion[ubicacion].involuntarias.months[month.key] = involuntarias;
        metricsByUbicacion[ubicacion].involuntarias.values.push(involuntarias);

        const rotacion = avgHeadcount > 0 ? (bajasMes.length / avgHeadcount) * 100 : 0;
        const rotacionStr = rotacion > 0 ? rotacion.toFixed(1) + '%' : '';
        metricsByUbicacion[ubicacion].porcentaje.months[month.key] = rotacionStr;
        if (rotacion > 0) {
          metricsByUbicacion[ubicacion].porcentaje.values.push(rotacion);
        }
      });
    });

    // Now build result array grouped by METRICA first
    const result: MetricData[] = [];

    METRICAS.forEach(metrica => {
      UBICACIONES.forEach(ubicacion => {
        const metricData = metricsByUbicacion[ubicacion][metrica.key];

        let avg: string | number = 0;
        if (metrica.key === 'porcentaje') {
          avg = metricData.values.length > 0
            ? (metricData.values.reduce((sum: number, v: number) => sum + v, 0) / metricData.values.length).toFixed(1) + '%'
            : '';
        } else {
          avg = metricData.values.length > 0
            ? Math.round(metricData.values.reduce((sum: number, v: number) => sum + v, 0) / metricData.values.length)
            : 0;
        }

        result.push({
          ubicacion,
          metrica: metrica.label,
          months: metricData.months,
          avg,
        });
      });
    });

    return result;
  }, [plantilla, motivosBaja, currentYear, selectedYears]);

  // Calculate monthly totals/averages
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, Record<string, string | number>> = {};

    METRICAS.forEach(metrica => {
      totals[metrica.key] = {};

      MONTHS.forEach(month => {
        const values: number[] = [];

        data.forEach(row => {
          if (row.metrica === metrica.label) {
            const val = row.months[month.key];
            if (typeof val === 'number') {
              values.push(val);
            } else if (typeof val === 'string' && val) {
              const num = parseFloat(val.replace('%', ''));
              if (!isNaN(num)) values.push(num);
            }
          }
        });

        if (metrica.key === 'porcentaje') {
          totals[metrica.key][month.key] = values.length > 0
            ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1) + '%'
            : '';
        } else {
          totals[metrica.key][month.key] = values.length > 0
            ? values.reduce((sum, v) => sum + v, 0)
            : 0;
        }
      });

      // Calculate average
      const avgValues: number[] = [];
      Object.values(totals[metrica.key]).forEach(val => {
        if (typeof val === 'number') {
          avgValues.push(val);
        } else if (typeof val === 'string' && val) {
          const num = parseFloat(val.replace('%', ''));
          if (!isNaN(num)) avgValues.push(num);
        }
      });

      if (metrica.key === 'porcentaje') {
        totals[metrica.key].avg = avgValues.length > 0
          ? (avgValues.reduce((sum, v) => sum + v, 0) / avgValues.length).toFixed(1) + '%'
          : '';
      } else {
        totals[metrica.key].avg = avgValues.length > 0
          ? Math.round(avgValues.reduce((sum, v) => sum + v, 0) / avgValues.length)
          : 0;
      }
    });

    return totals;
  }, [data]);

  return (
    <Card
      className={cn(
        "border border-border bg-card shadow-sm",
        refreshEnabled &&
          "rounded-2xl border-brand-border/50 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface/80"
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-col gap-3",
          refreshEnabled && "pb-6"
        )}
      >
        <div className="space-y-2">
          <CardTitle
            className={cn(
              "flex items-center gap-2 text-lg",
              refreshEnabled && "font-heading text-xl text-brand-ink dark:text-white"
            )}
          >
            Rotación por Ubicación - Resumen Anual{getYearParenthetical(selectedYears)}
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Métricas mensuales de rotación por ubicación: activos, bajas voluntarias, involuntarias y porcentaje
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Rotación por Ubicación - Resumen Anual"
          type="table"
          className="w-full"
          filename="rotacion-ubicacion-resumen-anual"
        >
          {(isFullscreen) => (
            <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
              <Table className={cn("table-corporate", isFullscreen ? "text-base" : "text-sm")}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">MÉTRICA</TableHead>
                    <TableHead className="whitespace-nowrap">UBICACIÓN</TableHead>
                    {MONTHS.map(month => (
                      <TableHead key={month.key} className="text-right text-xs">
                        {month.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">PROMEDIO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {METRICAS.map((metrica) => (
                    <>
                      {data
                        .filter((row) => row.metrica === metrica.label)
                        .map((row, idx) => {
                          const isFirstLocation = idx === 0;
                          const isPercentageRow = row.metrica === '% Rotación';

                          return (
                            <TableRow
                              key={`${row.metrica}-${row.ubicacion}`}
                            >
                              {isFirstLocation && (
                                <TableCell
                                  rowSpan={4}
                                  className="font-bold text-xs align-middle bg-gray-100"
                                >
                                  {row.metrica}
                                </TableCell>
                              )}
                              <TableCell className="text-xs">
                                {row.ubicacion}
                              </TableCell>
                              {MONTHS.map(month => (
                                <TableCell
                                  key={month.key}
                                  className={cn(
                                    "text-right",
                                    isPercentageRow && "font-medium"
                                  )}
                                >
                                  {row.months[month.key] || ''}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-semibold">
                                {row.avg}
                              </TableCell>
                            </TableRow>
                          );
                        })}

                      {/* Total row for this metric */}
                      <TableRow
                        key={`total-${metrica.key}`}
                        className="bg-gray-200 font-bold border-t-2 border-b-2 border-corporate-red/60"
                      >
                        <TableCell className="font-bold text-xs">TOTAL</TableCell>
                        {MONTHS.map(month => (
                          <TableCell key={month.key} className="text-right font-bold">
                            {monthlyTotals[metrica.key][month.key] || ''}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold">
                          {monthlyTotals[metrica.key].avg}
                        </TableCell>
                      </TableRow>
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </VisualizationContainer>
      </CardContent>
    </Card>
  );
}
