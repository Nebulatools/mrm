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
import { VisualizationContainer } from "@/components/shared/visualization-container";
import { prettyMotivo } from "@/lib/normalizers";
import { getYearParenthetical } from "@/lib/filters/year-display";
import { isFutureMonth } from "@/lib/date-utils";

interface RotationByMotiveMonthTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  selectedYears?: number[];
  refreshEnabled?: boolean;
}

interface MotiveMonthData {
  motivo: string;
  months: Record<string, number | null>;
  total: number;
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

export function RotationByMotiveMonthTable({
  plantilla,
  motivosBaja,
  selectedYears = [],
  refreshEnabled = false,
}: RotationByMotiveMonthTableProps) {

  const { data, grandTotal } = useMemo(() => {
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

    // SOURCE: empleados_sftp (plantilla) - filter by fecha_baja AND selected years in one pass
    // CRITICAL: Must filter by same years as filteredMotivosBaja to ensure data consistency
    const bajasYear = plantilla.filter(emp => {
      if (!emp.fecha_baja) return false;

      // Apply same year filter as motivosBaja for data integrity
      if (selectedYears.length > 0) {
        const bajaYear = new Date(emp.fecha_baja).getFullYear();
        return selectedYears.includes(bajaYear);
      }

      return true;
    });

    // Group by motivo and month
    const motivoMonthMap = new Map<string, Record<string, number | null>>();

    bajasYear.forEach(emp => {
      // JOIN: Get motivo from motivos_baja lookup by numero_empleado
      const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
      const motivo = prettyMotivo(rawMotivo) || 'No especificado';
      const fecha = new Date(emp.fecha_baja!);
      const month = fecha.getMonth() + 1; // 1-12

      const monthKey = MONTHS.find(m => m.num === month)?.key || '';
      if (!monthKey) return;

      if (!motivoMonthMap.has(motivo)) {
        motivoMonthMap.set(motivo, {});
      }

      const motivoData = motivoMonthMap.get(motivo)!;
      motivoData[monthKey] = ((motivoData[monthKey] as number) || 0) + 1;
    });

    // Get top motivos by frequency
    const motivoCounts = new Map<string, number>();
    bajasYear.forEach(emp => {
      // JOIN: Get motivo from motivos_baja lookup by numero_empleado
      const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
      const motivo = prettyMotivo(rawMotivo) || 'No especificado';
      motivoCounts.set(motivo, (motivoCounts.get(motivo) || 0) + 1);
    });

    const topMotivos = Array.from(motivoCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([motivo]) => motivo);

    // Mark future months as null (based on first selected year or current year)
    const refYear = selectedYears.length > 0 ? selectedYears[0] : new Date().getFullYear();
    topMotivos.forEach(motivo => {
      MONTHS.forEach(month => {
        if (isFutureMonth(refYear, month.num)) {
          const months = motivoMonthMap.get(motivo);
          if (months) months[month.key] = null;
        }
      });
    });

    // Build data array for top motivos only
    const data: MotiveMonthData[] = topMotivos.map(motivo => {
      const months = motivoMonthMap.get(motivo) || {};
      const validValues = Object.values(months).filter((v): v is number => v !== null);
      const total = validValues.reduce((sum, count) => sum + count, 0);
      return { motivo, months, total };
    });

    const grandTotal = bajasYear.length;

    return { data, grandTotal };
  }, [plantilla, motivosBaja, selectedYears]);

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    MONTHS.forEach(month => {
      const hasNull = data.some(row => row.months[month.key] === null);
      if (hasNull) {
        totals[month.key] = null;
      } else {
        totals[month.key] = data.reduce((sum, row) => sum + ((row.months[month.key] as number) || 0), 0);
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
            Motivo de Baja por Mes{getYearParenthetical(selectedYears)}
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Distribución mensual de bajas por motivo principal
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Motivo de Baja por Mes"
          type="table"
          className="w-full"
          filename="motivo-baja-mes"
        >
          {(isFullscreen: boolean) => (
            <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
              <Table className={cn("table-corporate", isFullscreen ? "text-base" : "text-sm")}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Motivo</TableHead>
                    {MONTHS.map(month => (
                      <TableHead key={month.key} className="text-right text-xs">
                        {month.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.motivo}>
                      <TableCell className="font-medium whitespace-nowrap text-xs">
                        {row.motivo.length > 22 ? row.motivo.substring(0, 22) + '...' : row.motivo}
                      </TableCell>
                      {MONTHS.map(month => (
                        <TableCell key={month.key} className="text-right">
                          {row.months[month.key] === null ? '-' : (row.months[month.key] || '')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-gray-200 dark:bg-slate-700 font-bold border-t-2 border-corporate-red/60 dark:border-orange-500/60">
                    <TableCell className="font-bold">Total general</TableCell>
                    {MONTHS.map(month => (
                      <TableCell key={month.key} className="text-right font-bold">
                        {monthlyTotals[month.key] === null ? '-' : (monthlyTotals[month.key] || '')}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">{grandTotal}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </VisualizationContainer>
      </CardContent>
    </Card>
  );
}
