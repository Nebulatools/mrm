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
import { prettyMotivo } from "@/lib/normalizers";

interface RotationByMotiveAreaTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  refreshEnabled?: boolean;
}

interface MotiveAreaData {
  area: string;
  motivos: Record<string, number>;
  total: number;
}

export function RotationByMotiveAreaTable({
  plantilla,
  motivosBaja,
  refreshEnabled = false,
}: RotationByMotiveAreaTableProps) {

  const { data, topMotivos, grandTotal } = useMemo(() => {
    // Create map of numero_empleado -> area
    const empleadoAreaMap = new Map<number, string>();
    plantilla.forEach(emp => {
      if (emp.numero_empleado) {
        empleadoAreaMap.set(emp.numero_empleado, emp.area || 'Sin Área');
      }
    });

    // Group bajas by area and motivo
    const areaMotivosMap = new Map<string, Record<string, number>>();
    const motivosSet = new Set<string>();

    motivosBaja.forEach(baja => {
      const area = empleadoAreaMap.get(baja.numero_empleado) || 'Sin Área';
      const motivo = prettyMotivo(baja.motivo || baja.descripcion) || 'No especificado';

      if (!areaMotivosMap.has(area)) {
        areaMotivosMap.set(area, {});
      }

      const areaData = areaMotivosMap.get(area)!;
      areaData[motivo] = (areaData[motivo] || 0) + 1;
      motivosSet.add(motivo);
    });

    // Get top motivos by frequency
    const motivoCounts = new Map<string, number>();
    motivosBaja.forEach(baja => {
      const motivo = prettyMotivo(baja.motivo || baja.descripcion) || 'No especificado';
      motivoCounts.set(motivo, (motivoCounts.get(motivo) || 0) + 1);
    });

    const topMotivos = Array.from(motivoCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([motivo]) => motivo);

    // Build data array
    const data: MotiveAreaData[] = [];
    areaMotivosMap.forEach((motivos, area) => {
      const total = Object.values(motivos).reduce((sum, count) => sum + count, 0);
      data.push({ area, motivos, total });
    });

    // Sort by total descending
    data.sort((a, b) => b.total - a.total);

    const grandTotal = motivosBaja.length;

    return { data, topMotivos, grandTotal };
  }, [plantilla, motivosBaja]);

  // Calculate percentage for each motivo
  const motivoTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.forEach(row => {
      topMotivos.forEach(motivo => {
        totals[motivo] = (totals[motivo] || 0) + (row.motivos[motivo] || 0);
      });
    });
    return totals;
  }, [data, topMotivos]);

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
            Rotación por Motivo y Área
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Distribución de bajas por área y motivo principal
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Rotación por Motivo y Área"
          type="table"
          className="w-full"
          filename="rotacion-motivo-area"
        >
          {() => (
            <div className="overflow-x-auto">
              <Table
                className={cn(
                  "text-sm",
                  refreshEnabled &&
                    "text-brand-ink [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3"
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
                    <TableHead>Área</TableHead>
                    {topMotivos.map(motivo => (
                      <TableHead key={motivo} className="text-right whitespace-nowrap">
                        {motivo.length > 20 ? motivo.substring(0, 20) + '...' : motivo}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody
                  className={cn(
                    refreshEnabled &&
                      "[&_tr]:border-none [&_tr]:odd:bg-card [&_tr]:even:bg-brand-surface/70 [&_tr]:hover:bg-brand-surface-accent/70"
                  )}
                >
                  {data.map((row) => (
                    <TableRow key={row.area}>
                      <TableCell className="font-medium">{row.area}</TableCell>
                      {topMotivos.map(motivo => (
                        <TableCell key={motivo} className="text-right">
                          {row.motivos[motivo] || ''}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    {topMotivos.map(motivo => (
                      <TableCell key={motivo} className="text-right">
                        {motivoTotals[motivo] || 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{grandTotal}</TableCell>
                  </TableRow>
                  {/* Percentage row */}
                  <TableRow className="bg-muted/30 font-semibold text-xs">
                    <TableCell>%</TableCell>
                    {topMotivos.map(motivo => {
                      const pct = grandTotal > 0 ? ((motivoTotals[motivo] || 0) / grandTotal * 100) : 0;
                      return (
                        <TableCell key={motivo} className="text-right">
                          {pct.toFixed(0)}%
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">100%</TableCell>
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
