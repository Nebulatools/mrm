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

interface RotationByMotiveAreaTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  selectedYears?: number[];
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
  selectedYears = [],
  refreshEnabled = false,
}: RotationByMotiveAreaTableProps) {

  const { data, topMotivos, grandTotal } = useMemo(() => {
    // Filter motivos_baja by selected years for data integrity
    const filteredMotivosBaja = selectedYears.length > 0
      ? motivosBaja.filter(baja => {
          if (!baja.fecha_baja) return false;
          const bajaYear = new Date(baja.fecha_baja).getFullYear();
          return selectedYears.includes(bajaYear);
        })
      : motivosBaja;

    // 🔍 DEBUG: Log data counts for verification
    console.log('🔍 [RotationByMotiveAreaTable] Debug Data:', {
      componentName: 'rotation-by-motive-area-table',
      plantillaTotal: plantilla.length,
      motivosBajaTotal: motivosBaja.length,
      filteredMotivosBajaCount: filteredMotivosBaja.length,
      selectedYears,
      december2025InMotivosBaja: motivosBaja.filter(b => {
        if (!b.fecha_baja) return false;
        const d = new Date(b.fecha_baja);
        return d.getFullYear() === 2025 && d.getMonth() === 11;
      }).length,
    });

    // Create lookup map: numero_empleado -> motivo from filtered motivos_baja
    const motivosMap = new Map<number, string>();
    filteredMotivosBaja.forEach(baja => {
      motivosMap.set(baja.numero_empleado, baja.motivo);
    });

    // SOURCE: empleados_sftp (plantilla) - filter employees with fecha_baja AND by selected years
    // CRITICAL: Must filter by same years as filteredMotivosBaja to ensure data consistency
    const bajasAll = plantilla.filter(emp => {
      if (!emp.fecha_baja) return false;

      // Apply same year filter as motivosBaja for data integrity
      if (selectedYears.length > 0) {
        const bajaYear = new Date(emp.fecha_baja).getFullYear();
        return selectedYears.includes(bajaYear);
      }

      return true;
    });

    // 🔍 DEBUG: Log filtered bajas counts
    console.log('🔍 [RotationByMotiveAreaTable] Filtered Bajas:', {
      bajasAllCount: bajasAll.length,
      december2025InBajasAll: bajasAll.filter(emp => {
        if (!emp.fecha_baja) return false;
        const d = new Date(emp.fecha_baja);
        return d.getFullYear() === 2025 && d.getMonth() === 11;
      }).length,
      motivosMapSize: filteredMotivosBaja.length,
    });

    // Group bajas by area and motivo
    const areaMotivosMap = new Map<string, Record<string, number>>();
    const motivosSet = new Set<string>();

    bajasAll.forEach(emp => {
      const area = emp.area || 'Sin Área';
      // JOIN: Get motivo from motivos_baja lookup by numero_empleado
      const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
      const motivo = prettyMotivo(rawMotivo) || 'No especificado';

      if (!areaMotivosMap.has(area)) {
        areaMotivosMap.set(area, {});
      }

      const areaData = areaMotivosMap.get(area)!;
      areaData[motivo] = (areaData[motivo] || 0) + 1;
      motivosSet.add(motivo);
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

    // Build data array
    const data: MotiveAreaData[] = [];
    areaMotivosMap.forEach((motivos, area) => {
      const total = Object.values(motivos).reduce((sum, count) => sum + count, 0);
      data.push({ area, motivos, total });
    });

    // Sort by total descending
    data.sort((a, b) => b.total - a.total);

    const grandTotal = bajasAll.length;

    return { data, topMotivos, grandTotal };
  }, [plantilla, motivosBaja, selectedYears]);

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
          {(isFullscreen) => (
            <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
              <Table className={cn("table-corporate", isFullscreen ? "text-base" : "text-sm")}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Área</TableHead>
                    {topMotivos.map(motivo => (
                      <TableHead key={motivo} className="text-right whitespace-nowrap">
                        {motivo.length > 20 ? motivo.substring(0, 20) + '...' : motivo}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                  <TableRow className="bg-gray-200 dark:bg-slate-700 font-bold border-t-2 border-corporate-red/60 dark:border-orange-500/60">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    {topMotivos.map(motivo => (
                      <TableCell key={motivo} className="text-right font-bold">
                        {motivoTotals[motivo] || 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">{grandTotal}</TableCell>
                  </TableRow>
                  {/* Percentage row */}
                  <TableRow className="bg-gray-100 dark:bg-slate-800 font-semibold text-xs">
                    <TableCell className="font-bold">%</TableCell>
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
