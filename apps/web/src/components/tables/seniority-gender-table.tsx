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
import { cn } from "@/lib/utils";
import { VisualizationContainer } from "@/components/visualization-container";
import { differenceInMonths, differenceInYears } from "date-fns";

interface SeniorityGenderTableProps {
  plantilla: PlantillaRecord[];
  refreshEnabled?: boolean;
}

interface SeniorityRangeData {
  range: string;
  femenino: number;
  masculino: number;
  total: number;
  percentage: number;
  isHighlighted?: boolean;
}

// Seniority ranges definition (based on fecha_ingreso)
const SENIORITY_RANGES = [
  { minMonths: 0, maxMonths: 1, label: 'Menor de 1 mes' },
  { minMonths: 1, maxMonths: 3, label: '1 a 3 meses' },
  { minMonths: 3, maxMonths: 6, label: '3 a 6 meses' },
  { minMonths: 6, maxMonths: 12, label: '6 meses a 1 año' },
  { minMonths: 12, maxMonths: 36, label: '1-3 años' }, // Highlighted as per plan
  { minMonths: 36, maxMonths: 60, label: '3-5 años' },
  { minMonths: 60, maxMonths: 9999, label: 'más de 5 años' },
];

export function SeniorityGenderTable({
  plantilla,
  refreshEnabled = false,
}: SeniorityGenderTableProps) {

  const seniorityGenderData = useMemo(() => {
    // Filter active employees only
    const activeEmployees = plantilla.filter(emp => emp.activo);

    // Calculate seniority (months) for each employee
    const employeesWithSeniority = activeEmployees.map(emp => {
      const hireDate = emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : null;
      const months = hireDate ? differenceInMonths(new Date(), hireDate) : null;
      const gender = emp.genero?.trim().toLowerCase() || 'desconocido';

      return { months, gender };
    }).filter(e => e.months !== null && e.months >= 0); // Only employees with valid seniority

    // Group by seniority ranges and gender
    const data: SeniorityRangeData[] = SENIORITY_RANGES.map(range => {
      const inRange = employeesWithSeniority.filter(e =>
        e.months! >= range.minMonths && e.months! < range.maxMonths
      );

      const femenino = inRange.filter(e =>
        e.gender.includes('femenino')
      ).length;

      const masculino = inRange.filter(e =>
        e.gender.includes('masculino')
      ).length;

      const total = femenino + masculino;

      return {
        range: range.label,
        femenino,
        masculino,
        total,
        percentage: 0, // Will be calculated after totals
        isHighlighted: range.label === '1-3 años' // Highlight 1-3 años as per plan
      };
    });

    // Calculate percentages
    const grandTotal = data.reduce((sum, row) => sum + row.total, 0);
    data.forEach(row => {
      row.percentage = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
    });

    // Add totals row
    const totals: SeniorityRangeData = {
      range: 'Total',
      femenino: data.reduce((sum, row) => sum + row.femenino, 0),
      masculino: data.reduce((sum, row) => sum + row.masculino, 0),
      total: grandTotal,
      percentage: 100,
    };

    return { data, totals };
  }, [plantilla]);

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
            Distribución por Antigüedad y Género
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Análisis de antigüedad de empleados activos por género
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Antigüedad por Género"
          type="table"
          className="w-full"
          filename="antiguedad-por-genero"
        >
          {() => (
            <div className="overflow-x-auto">
              <Table
                className={cn(
                  refreshEnabled &&
                    "text-sm text-brand-ink [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3"
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
                    <TableHead>Antigüedad</TableHead>
                    <TableHead className="text-right">Femenino</TableHead>
                    <TableHead className="text-right">Masculino</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  className={cn(
                    refreshEnabled &&
                      "[&_tr]:border-none [&_tr]:odd:bg-card [&_tr]:even:bg-brand-surface/70 [&_tr]:hover:bg-brand-surface-accent/70"
                  )}
                >
                  {seniorityGenderData.data.map((row) => (
                    <TableRow
                      key={row.range}
                      className={cn(
                        row.isHighlighted && "bg-orange-50 dark:bg-orange-950/20 font-semibold"
                      )}
                    >
                      <TableCell className="font-medium">{row.range}</TableCell>
                      <TableCell className="text-right">{row.femenino}</TableCell>
                      <TableCell className="text-right">{row.masculino}</TableCell>
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                      <TableCell className="text-right">{row.percentage.toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>{seniorityGenderData.totals.range}</TableCell>
                    <TableCell className="text-right">{seniorityGenderData.totals.femenino}</TableCell>
                    <TableCell className="text-right">{seniorityGenderData.totals.masculino}</TableCell>
                    <TableCell className="text-right">{seniorityGenderData.totals.total}</TableCell>
                    <TableCell className="text-right">{seniorityGenderData.totals.percentage.toFixed(0)}%</TableCell>
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
