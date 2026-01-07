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
import { differenceInYears } from "date-fns";

interface AgeGenderTableProps {
  plantilla: PlantillaRecord[];
  refreshEnabled?: boolean;
}

interface AgeRangeData {
  range: string;
  femenino: number;
  masculino: number;
  total: number;
  percentage: number;
  isHighlighted?: boolean;
}

// Age ranges definition
const AGE_RANGES = [
  { min: 18, max: 20, label: '18-20' },
  { min: 21, max: 25, label: '21-25' },
  { min: 26, max: 30, label: '26-30' },
  { min: 31, max: 35, label: '31-35' },
  { min: 36, max: 40, label: '36-40' },
  { min: 41, max: 150, label: '41+' }, // 41+ highlighted
];

export function AgeGenderTable({
  plantilla,
  refreshEnabled = false,
}: AgeGenderTableProps) {

  const ageGenderData = useMemo(() => {
    // Filter active employees only
    const activeEmployees = plantilla.filter(emp => emp.activo);

    // Calculate age for each employee
    const employeesWithAge = activeEmployees.map(emp => {
      const birthDate = emp.fecha_nacimiento ? new Date(emp.fecha_nacimiento) : null;
      const age = birthDate ? differenceInYears(new Date(), birthDate) : null;
      const gender = emp.genero?.trim().toLowerCase() || 'desconocido';

      return { age, gender };
    }).filter(e => e.age !== null && e.age >= 18); // Only employees with valid age

    // Group by age ranges and gender
    const data: AgeRangeData[] = AGE_RANGES.map(range => {
      const inRange = employeesWithAge.filter(e =>
        e.age! >= range.min && e.age! <= range.max
      );

      const femenino = inRange.filter(e =>
        e.gender.includes('femenino')
      ).length;

      const masculino = inRange.filter(e =>
        e.gender.includes('masculino')
      ).length;

      // Total incluye todos (femenino + masculino + desconocido)
      const total = inRange.length;

      return {
        range: range.label,
        femenino,
        masculino,
        total,
        percentage: 0, // Will be calculated after totals
        isHighlighted: range.label === '41+' // Highlight 41+ as per plan
      };
    });

    // Calculate percentages
    const grandTotal = data.reduce((sum, row) => sum + row.total, 0);
    data.forEach(row => {
      row.percentage = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
    });

    // Add totals row
    const totals: AgeRangeData = {
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
            Distribución por Edad y Género
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Análisis demográfico de empleados activos por rango de edad
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Edad por Género"
          type="table"
          className="w-full"
          filename="edad-por-genero"
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
                    <TableHead>Edad</TableHead>
                    <TableHead className="text-right">Femenino</TableHead>
                    <TableHead className="text-right">Masculino</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  className={cn(
                    refreshEnabled &&
                      "[&_tr:last-child]:rounded-b-2xl [&_tr]:border-none [&_tr]:odd:bg-card [&_tr]:even:bg-brand-surface/70 [&_tr]:hover:bg-brand-surface-accent/70"
                  )}
                >
                  {ageGenderData.data.map((row) => (
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
                    <TableCell>{ageGenderData.totals.range}</TableCell>
                    <TableCell className="text-right">{ageGenderData.totals.femenino}</TableCell>
                    <TableCell className="text-right">{ageGenderData.totals.masculino}</TableCell>
                    <TableCell className="text-right">{ageGenderData.totals.total}</TableCell>
                    <TableCell className="text-right">{ageGenderData.totals.percentage.toFixed(0)}%</TableCell>
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
