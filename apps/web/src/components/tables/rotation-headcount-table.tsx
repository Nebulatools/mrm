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
import type { RetentionFilterOptions } from "@/lib/filters/filters";
import { cn } from "@/lib/utils";
import { VisualizationContainer } from "@/components/visualization-container";
import { normalizeCCToUbicacion } from "@/lib/normalizers";
import { parseSupabaseDate } from "@/lib/retention-calculations";
import { applyFiltersWithScope } from "@/lib/filters/filters";
import { endOfMonth } from "date-fns";
import { isFutureMonth } from "@/lib/date-utils";

interface RotationHeadcountTableProps {
  plantilla: PlantillaRecord[];
  year?: number;
  filters?: RetentionFilterOptions;
  refreshEnabled?: boolean;
}

interface LocationMonthData {
  ubicacion: string;
  months: Record<string, number | null>;
  avg: number;
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

const UBICACIONES = ['CAD', 'CORPORATIVO', 'FILIALES', 'OTROS'];

export function RotationHeadcountTable({
  plantilla,
  year,
  filters,
  refreshEnabled = false,
}: RotationHeadcountTableProps) {

  const currentYear = year || new Date().getFullYear();

  const data = useMemo(() => {
    // ✅ Aplicar filtros con scope 'general' (departamento, área, empresa)
    // Excluye mes y año porque la tabla muestra 12 meses
    const plantillaFiltered = filters
      ? applyFiltersWithScope(plantilla, filters, 'general')
      : plantilla;

    const locationMonthMap = new Map<string, Record<string, number | null>>();

    // Initialize all locations
    UBICACIONES.forEach(ubicacion => {
      locationMonthMap.set(ubicacion, {});
    });

    // Calculate headcount for each location and month
    MONTHS.forEach(month => {
      // Skip future months
      if (isFutureMonth(currentYear, month.num)) {
        UBICACIONES.forEach(ub => { locationMonthMap.get(ub)![month.key] = null; });
        return;
      }

      const monthEnd = endOfMonth(new Date(currentYear, month.num - 1, 1));

      UBICACIONES.forEach(ubicacion => {
        const headcount = plantillaFiltered.filter(emp => {
          const cc = (emp as any).cc || '';
          const empUbicacion = normalizeCCToUbicacion(cc);
          if (empUbicacion !== ubicacion) return false;

          const fechaIngreso = parseSupabaseDate(emp.fecha_ingreso);
          if (!fechaIngreso || fechaIngreso > monthEnd) return false;

          const fechaBaja = parseSupabaseDate(emp.fecha_baja);
          return !fechaBaja || fechaBaja > monthEnd;
        }).length;

        const locationData = locationMonthMap.get(ubicacion)!;
        locationData[month.key] = headcount;
      });
    });

    // Build data array
    const result: LocationMonthData[] = UBICACIONES.map(ubicacion => {
      const months = locationMonthMap.get(ubicacion) || {};
      const validValues = Object.values(months).filter((v): v is number => v !== null);
      const avg = validValues.length > 0 ? Math.round(validValues.reduce((sum, val) => sum + val, 0) / validValues.length) : 0;
      return { ubicacion, months, avg };
    });

    return result;
  }, [plantilla, currentYear, filters]);

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    data.forEach(row => {
      MONTHS.forEach(month => {
        const val = row.months[month.key];
        if (val === null) {
          if (totals[month.key] === undefined) totals[month.key] = null;
        } else {
          totals[month.key] = (totals[month.key] || 0) + val;
        }
      });
    });
    return totals;
  }, [data]);

  // Calculate average total
  const avgTotal = useMemo(() => {
    const validValues = Object.values(monthlyTotals).filter((v): v is number => v !== null);
    return validValues.length > 0 ? Math.round(validValues.reduce((sum, val) => sum + val, 0) / validValues.length) : 0;
  }, [monthlyTotals]);

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
            Headcount por Ubicación ({currentYear})
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Número de empleados activos al final de cada mes
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Headcount por Ubicación"
          type="table"
          className="w-full"
          filename="headcount-ubicacion"
        >
          {(isFullscreen) => (
            <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
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
                  <TableRow
                    className={cn(
                      refreshEnabled &&
                        "border-none [&_th:first-child]:rounded-tl-2xl [&_th:last-child]:rounded-tr-2xl"
                    )}
                  >
                    <TableHead className="whitespace-nowrap">Ubicación</TableHead>
                    {MONTHS.map(month => (
                      <TableHead key={month.key} className="text-right text-xs">
                        {month.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  className={cn(
                    refreshEnabled &&
                      "[&_tr:last-child]:rounded-b-2xl [&_tr]:border-none [&_tr]:odd:bg-card [&_tr]:even:bg-brand-surface/70 [&_tr]:hover:bg-brand-surface-accent/70"
                  )}
                >
                  {data.map((row) => (
                    <TableRow key={row.ubicacion}>
                      <TableCell className="font-medium whitespace-nowrap text-xs">
                        {row.ubicacion}
                      </TableCell>
                      {MONTHS.map(month => (
                        <TableCell key={month.key} className="text-right">
                          {row.months[month.key] === null ? '-' : (row.months[month.key] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.avg}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    {MONTHS.map(month => (
                      <TableCell key={month.key} className="text-right">
                        {monthlyTotals[month.key] === null ? '-' : (monthlyTotals[month.key] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{avgTotal}</TableCell>
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
