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
import type { PlantillaRecord, MotivoBajaRecord } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { VisualizationContainer } from "@/components/visualization-container";
import { normalizeCCToUbicacion, isMotivoClave } from "@/lib/normalizers";
import type { RetentionFilterOptions } from "@/lib/filters/filters";
import { applyFiltersWithScope } from "@/lib/filters/filters";

interface RotationBajasVoluntariasTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  year?: number;
  refreshEnabled?: boolean;
  filters?: RetentionFilterOptions;
}

interface LocationMonthData {
  ubicacion: string;
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

const UBICACIONES = ['CAD', 'CORPORATIVO', 'FILIALES', 'OTROS'];

export function RotationBajasVoluntariasTable({
  plantilla,
  motivosBaja,
  year,
  refreshEnabled = false,
  filters,
}: RotationBajasVoluntariasTableProps) {

  const currentYear = year || new Date().getFullYear();

  const data = useMemo(() => {
    const plantillaFiltered = filters
      ? applyFiltersWithScope(plantilla, filters, 'general')
      : plantilla;

    // Create employee map with ubicacion
    const empleadoMap = new Map<number, string>();
    plantillaFiltered.forEach(emp => {
      const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
      const cc = (emp as any).cc || '';
      const ubicacion = normalizeCCToUbicacion(cc);
      empleadoMap.set(numero, ubicacion);
    });

    // Filter bajas for the selected year (voluntary only)
    const bajasYear = motivosBaja.filter(baja => {
      const fecha = new Date(baja.fecha_baja);
      if (fecha.getFullYear() !== currentYear) return false;

      // Only voluntary bajas (not isMotivoClave)
      const motivo = baja.motivo || baja.descripcion || '';
      return !isMotivoClave(motivo);
    });

    // Group by ubicacion and month
    const locationMonthMap = new Map<string, Record<string, number>>();

    // Initialize all locations
    UBICACIONES.forEach(ubicacion => {
      locationMonthMap.set(ubicacion, {});
    });

    bajasYear.forEach(baja => {
      const numero = Number(baja.numero_empleado);
      const ubicacion = empleadoMap.get(numero) || 'OTROS';
      const fecha = new Date(baja.fecha_baja);
      const month = fecha.getMonth() + 1; // 1-12

      const monthKey = MONTHS.find(m => m.num === month)?.key || '';
      if (!monthKey) return;

      const locationData = locationMonthMap.get(ubicacion);
      if (locationData) {
        locationData[monthKey] = (locationData[monthKey] || 0) + 1;
      }
    });

    // Build data array
    const result: LocationMonthData[] = UBICACIONES.map(ubicacion => {
      const months = locationMonthMap.get(ubicacion) || {};
      const total = Object.values(months).reduce((sum, count) => sum + count, 0);
      return { ubicacion, months, total };
    });

    return result;
  }, [plantilla, motivosBaja, currentYear, filters]);

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

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return data.reduce((sum, row) => sum + row.total, 0);
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
            Bajas Voluntarias por Ubicación ({currentYear})
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Distribución mensual de bajas voluntarias por ubicación
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Bajas Voluntarias por Ubicación"
          type="table"
          className="w-full"
          filename="bajas-voluntarias-ubicacion"
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
                    <TableHead className="text-right font-bold">Total</TableHead>
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
                          {row.months[month.key] || ''}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
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
