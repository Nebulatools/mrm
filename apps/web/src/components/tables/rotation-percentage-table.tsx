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
import { normalizeCCToUbicacion } from "@/lib/normalizers";
import { parseSupabaseDate } from "@/lib/retention-calculations";
import { endOfMonth, startOfMonth } from "date-fns";
import type { RetentionFilterOptions } from "@/lib/filters/filters";
import { applyFiltersWithScope } from "@/lib/filters/filters";

interface RotationPercentageTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  year?: number;
  refreshEnabled?: boolean;
  filters?: RetentionFilterOptions;
}

interface LocationMonthData {
  ubicacion: string;
  months: Record<string, string>; // Percentage as string
  avg: string;
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

export function RotationPercentageTable({
  plantilla,
  motivosBaja,
  year,
  refreshEnabled = false,
  filters,
}: RotationPercentageTableProps) {

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

    // Filter bajas for the selected year
    const bajasYear = motivosBaja.filter(baja => {
      const fecha = new Date(baja.fecha_baja);
      return fecha.getFullYear() === currentYear;
    });

    // Calculate rotation percentage for each location and month
    const locationMonthMap = new Map<string, Record<string, string>>();

    // Initialize all locations
    UBICACIONES.forEach(ubicacion => {
      locationMonthMap.set(ubicacion, {});
    });

    MONTHS.forEach(month => {
      const monthStart = startOfMonth(new Date(currentYear, month.num - 1, 1));
      const monthEnd = endOfMonth(monthStart);

      UBICACIONES.forEach(ubicacion => {
        // Count bajas for this location and month
        const bajas = bajasYear.filter(baja => {
          const numero = Number(baja.numero_empleado);
          const empUbicacion = empleadoMap.get(numero) || 'OTROS';
          if (empUbicacion !== ubicacion) return false;

          const fecha = new Date(baja.fecha_baja);
          const monthNum = fecha.getMonth() + 1;
          return monthNum === month.num;
        }).length;

        // Calculate headcount at month start and end
        const headcountStart = plantillaFiltered.filter(emp => {
          const cc = (emp as any).cc || '';
          const empUbicacion = normalizeCCToUbicacion(cc);
          if (empUbicacion !== ubicacion) return false;

          const fechaIngreso = parseSupabaseDate(emp.fecha_ingreso);
          if (!fechaIngreso || fechaIngreso > monthStart) return false;

          const fechaBaja = parseSupabaseDate(emp.fecha_baja);
          return !fechaBaja || fechaBaja > monthStart;
        }).length;

        const headcountEnd = plantillaFiltered.filter(emp => {
          const cc = (emp as any).cc || '';
          const empUbicacion = normalizeCCToUbicacion(cc);
          if (empUbicacion !== ubicacion) return false;

          const fechaIngreso = parseSupabaseDate(emp.fecha_ingreso);
          if (!fechaIngreso || fechaIngreso > monthEnd) return false;

          const fechaBaja = parseSupabaseDate(emp.fecha_baja);
          return !fechaBaja || fechaBaja > monthEnd;
        }).length;

        // Calculate average headcount
        const avgHeadcount = (headcountStart + headcountEnd) / 2;

        // Calculate rotation percentage
        const rotacion = avgHeadcount > 0 ? (bajas / avgHeadcount) * 100 : 0;

        const locationData = locationMonthMap.get(ubicacion)!;
        locationData[month.key] = rotacion > 0 ? rotacion.toFixed(1) + '%' : '';
      });
    });

    // Build data array
    const result: LocationMonthData[] = UBICACIONES.map(ubicacion => {
      const months = locationMonthMap.get(ubicacion) || {};

      // Calculate average rotation
      const values: number[] = [];
      Object.values(months).forEach(val => {
        if (val) {
          const num = parseFloat(val.replace('%', ''));
          if (!isNaN(num)) values.push(num);
        }
      });
      const avg = values.length > 0
        ? (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1) + '%'
        : '';

      return { ubicacion, months, avg };
    });

    return result;
  }, [plantilla, motivosBaja, currentYear, filters]);

  // Calculate monthly averages
  const monthlyAverages = useMemo(() => {
    const averages: Record<string, string> = {};

    MONTHS.forEach(month => {
      const values: number[] = [];
      data.forEach(row => {
        const val = row.months[month.key];
        if (val) {
          const num = parseFloat(val.replace('%', ''));
          if (!isNaN(num)) values.push(num);
        }
      });

      if (values.length > 0) {
        const avg = (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1) + '%';
        averages[month.key] = avg;
      } else {
        averages[month.key] = '';
      }
    });

    return averages;
  }, [data]);

  // Calculate overall average
  const overallAvg = useMemo(() => {
    const values: number[] = [];
    data.forEach(row => {
      if (row.avg) {
        const num = parseFloat(row.avg.replace('%', ''));
        if (!isNaN(num)) values.push(num);
      }
    });
    return values.length > 0
      ? (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1) + '%'
      : '';
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
            % Rotación por Ubicación ({currentYear})
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Porcentaje mensual de rotación por ubicación
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="% Rotación por Ubicación"
          type="table"
          className="w-full"
          filename="rotacion-porcentaje-ubicacion"
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
                          {row.months[month.key] || ''}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.avg}</TableCell>
                    </TableRow>
                  ))}
                  {/* Averages row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Promedio</TableCell>
                    {MONTHS.map(month => (
                      <TableCell key={month.key} className="text-right">
                        {monthlyAverages[month.key] || ''}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{overallAvg}</TableCell>
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
