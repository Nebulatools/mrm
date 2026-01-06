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
import type { MotivoBajaRecord } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { VisualizationContainer } from "@/components/visualization-container";
import { prettyMotivo } from "@/lib/normalizers";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RotationByMotiveMonthTableProps {
  motivosBaja: MotivoBajaRecord[];
  year?: number;
  refreshEnabled?: boolean;
}

interface MotiveMonthData {
  motivo: string;
  months: Record<string, number>;
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
  motivosBaja,
  year,
  refreshEnabled = false,
}: RotationByMotiveMonthTableProps) {

  const currentYear = year || new Date().getFullYear();

  const { data, grandTotal } = useMemo(() => {
    // Filter bajas for the selected year
    const bajasYear = motivosBaja.filter(baja => {
      const fecha = new Date(baja.fecha_baja);
      return fecha.getFullYear() === currentYear;
    });

    // Group by motivo and month
    const motivoMonthMap = new Map<string, Record<string, number>>();

    bajasYear.forEach(baja => {
      const motivo = prettyMotivo(baja.motivo || baja.descripcion) || 'No especificado';
      const fecha = new Date(baja.fecha_baja);
      const month = fecha.getMonth() + 1; // 1-12

      const monthKey = MONTHS.find(m => m.num === month)?.key || '';
      if (!monthKey) return;

      if (!motivoMonthMap.has(motivo)) {
        motivoMonthMap.set(motivo, {});
      }

      const motivoData = motivoMonthMap.get(motivo)!;
      motivoData[monthKey] = (motivoData[monthKey] || 0) + 1;
    });

    // Get top motivos by frequency
    const motivoCounts = new Map<string, number>();
    bajasYear.forEach(baja => {
      const motivo = prettyMotivo(baja.motivo || baja.descripcion) || 'No especificado';
      motivoCounts.set(motivo, (motivoCounts.get(motivo) || 0) + 1);
    });

    const topMotivos = Array.from(motivoCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([motivo]) => motivo);

    // Build data array for top motivos only
    const data: MotiveMonthData[] = topMotivos.map(motivo => {
      const months = motivoMonthMap.get(motivo) || {};
      const total = Object.values(months).reduce((sum, count) => sum + count, 0);
      return { motivo, months, total };
    });

    const grandTotal = bajasYear.length;

    return { data, grandTotal };
  }, [motivosBaja, currentYear]);

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.forEach(row => {
      MONTHS.forEach(month => {
        totals[month.key] = (totals[month.key] || 0) + (row.months[month.key] || 0);
      });
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
            📅 Motivo de Baja por Mes ({currentYear})
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
          {() => (
            <div className="overflow-x-auto">
              <Table
                className={cn(
                  "text-sm",
                  refreshEnabled &&
                    "text-brand-ink [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:py-2"
                )}
              >
                <TableHeader
                  className={cn(
                    refreshEnabled &&
                      "[&_th]:bg-brand-surface-accent [&_th]:font-heading [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-brand-ink"
                  )}
                >
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
                          {row.months[month.key] || ''}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total general</TableCell>
                    {MONTHS.map(month => (
                      <TableCell key={month.key} className="text-right">
                        {monthlyTotals[month.key] || ''}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{grandTotal}</TableCell>
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
