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
import { prettyMotivo } from "@/lib/normalizers";
import { differenceInMonths } from "date-fns";

interface RotationByMotiveSeniorityTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  refreshEnabled?: boolean;
}

interface MotiveSeniorityData {
  motivo: string;
  seniorityBuckets: Record<string, number>;
  total: number;
}

// Seniority buckets based on plan
const SENIORITY_BUCKETS = [
  { key: '0-1mes', min: 0, max: 1, label: '0-1 mes' },
  { key: '1-3meses', min: 1, max: 3, label: '1-3 meses' },
  { key: '3-6meses', min: 3, max: 6, label: '3-6 meses' },
  { key: '6m-1año', min: 6, max: 12, label: '6m-1 año' },
  { key: '1-3años', min: 12, max: 36, label: '1-3 años' },
  { key: '3-5años', min: 36, max: 60, label: '3-5 años' },
  { key: '5+años', min: 60, max: 9999, label: '5+ años' },
];

export function RotationByMotiveSeniorityTable({
  plantilla,
  motivosBaja,
  refreshEnabled = false,
}: RotationByMotiveSeniorityTableProps) {

  const { data, grandTotal } = useMemo(() => {
    // This table shows all-time data (no year filter) - seniority patterns are historical
    // Create lookup map: numero_empleado -> motivo from motivos_baja table
    const motivosMap = new Map<number, string>();
    motivosBaja.forEach(baja => {
      motivosMap.set(baja.numero_empleado, baja.motivo);
    });

    // SOURCE: empleados_sftp (plantilla) - filter only employees with fecha_baja
    const bajasAll = plantilla.filter(emp => emp.fecha_baja && emp.fecha_ingreso);

    // Group bajas by motivo and seniority at termination
    const motivoSeniorityMap = new Map<string, Record<string, number>>();

    bajasAll.forEach(emp => {
      // JOIN: Get motivo from motivos_baja lookup by numero_empleado
      const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
      const motivo = prettyMotivo(rawMotivo) || 'No especificado';

      const months = differenceInMonths(new Date(emp.fecha_baja!), new Date(emp.fecha_ingreso!));

      // Find appropriate bucket
      const bucket = SENIORITY_BUCKETS.find(b => months >= b.min && months < b.max);
      if (!bucket) return;

      if (!motivoSeniorityMap.has(motivo)) {
        motivoSeniorityMap.set(motivo, {});
      }

      const motivoData = motivoSeniorityMap.get(motivo)!;
      motivoData[bucket.key] = (motivoData[bucket.key] || 0) + 1;
    });

    // Get top motivos by frequency
    const motivoCounts = new Map<string, number>();
    bajasAll.forEach(emp => {
      // JOIN: Get motivo from motivos_baja lookup by numero_empleado
      const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
      const motivo = prettyMotivo(rawMotivo) || 'No especificado';
      motivoCounts.set(motivo, (motivoCounts.get(motivo) || 0) + 1);
    });

    const topMotivos = Array.from(motivoCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([motivo]) => motivo);

    // Build data array for top motivos only
    const data: MotiveSeniorityData[] = topMotivos.map(motivo => {
      const seniorityBuckets = motivoSeniorityMap.get(motivo) || {};
      const total = Object.values(seniorityBuckets).reduce((sum, count) => sum + count, 0);
      return { motivo, seniorityBuckets, total };
    });

    const grandTotal = bajasAll.length;

    return { data, grandTotal };
  }, [plantilla, motivosBaja]);

  // Calculate column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.forEach(row => {
      SENIORITY_BUCKETS.forEach(bucket => {
        totals[bucket.key] = (totals[bucket.key] || 0) + (row.seniorityBuckets[bucket.key] || 0);
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
            Rotación por Motivo y Antigüedad
          </CardTitle>
          <p
            className={cn(
              "text-sm text-muted-foreground",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            Distribución de bajas por motivo y antigüedad al momento de la baja
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
        <VisualizationContainer
          title="Rotación por Motivo y Antigüedad"
          type="table"
          className="w-full"
          filename="rotacion-motivo-antiguedad"
        >
          {() => (
            <div className="overflow-x-auto">
              <Table className="table-corporate text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    {SENIORITY_BUCKETS.map(bucket => (
                      <TableHead key={bucket.key} className="text-right whitespace-nowrap text-xs">
                        {bucket.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.motivo}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {row.motivo.length > 25 ? row.motivo.substring(0, 25) + '...' : row.motivo}
                      </TableCell>
                      {SENIORITY_BUCKETS.map(bucket => (
                        <TableCell key={bucket.key} className="text-right">
                          {row.seniorityBuckets[bucket.key] || ''}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-gray-200 font-bold border-t-2 border-corporate-red/60">
                    <TableCell className="font-bold">Total</TableCell>
                    {SENIORITY_BUCKETS.map(bucket => (
                      <TableCell key={bucket.key} className="text-right font-bold">
                        {columnTotals[bucket.key] || 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">{grandTotal}</TableCell>
                  </TableRow>
                  {/* Percentage row */}
                  <TableRow className="bg-gray-100 font-semibold text-xs">
                    <TableCell className="font-bold">%</TableCell>
                    {SENIORITY_BUCKETS.map(bucket => {
                      const pct = grandTotal > 0 ? ((columnTotals[bucket.key] || 0) / grandTotal * 100) : 0;
                      return (
                        <TableCell key={bucket.key} className="text-right">
                          {pct > 0 ? pct.toFixed(0) + '%' : ''}
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
