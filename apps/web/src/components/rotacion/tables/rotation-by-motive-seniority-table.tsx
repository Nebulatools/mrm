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
import { prettyMotivo, isMotivoClave } from "@/lib/normalizers";
import { differenceInMonths } from "date-fns";

export type MotivoFilterType = "all" | "voluntaria" | "involuntaria";

interface RotationByMotiveSeniorityTableProps {
  plantilla: PlantillaRecord[];
  motivosBaja: MotivoBajaRecord[];
  selectedYears?: number[];
  selectedMonths?: number[];
  refreshEnabled?: boolean;
  motivoFilter?: MotivoFilterType;
}

interface MotiveSeniorityData {
  motivo: string;
  seniorityBuckets: Record<string, number>;
  total: number;
  esInvoluntaria: boolean;
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
  selectedYears,
  selectedMonths = [],
  refreshEnabled = false,
  motivoFilter = "all",
}: RotationByMotiveSeniorityTableProps) {

  const { data, grandTotal } = useMemo(() => {
    // Filter motivosBaja by selected years AND months
    let motivosFiltered = motivosBaja.filter(baja => {
      if (!baja.fecha_baja) return false;
      // ✅ FIX TIMEZONE: Parsear fecha como string
      const fechaStr = String(baja.fecha_baja);
      const [yearStr, monthStr] = fechaStr.split('-');
      const bajaYear = parseInt(yearStr, 10);
      const bajaMonth = parseInt(monthStr, 10);

      // Apply year filter if selected
      if (selectedYears && selectedYears.length > 0 && !selectedYears.includes(bajaYear)) {
        return false;
      }
      // Apply month filter if selected
      if (selectedMonths.length > 0 && !selectedMonths.includes(bajaMonth)) {
        return false;
      }
      return true;
    });

    // Apply motivo filter (voluntaria/involuntaria)
    if (motivoFilter !== "all") {
      motivosFiltered = motivosFiltered.filter(baja => {
        const esInvoluntaria = isMotivoClave(baja.motivo);
        return motivoFilter === "involuntaria" ? esInvoluntaria : !esInvoluntaria;
      });
    }

    // Create set of employee numbers that match the motivo filter
    const filteredEmployeeNumbers = new Set(
      motivosFiltered.map(baja => baja.numero_empleado)
    );

    // Create lookup map: numero_empleado -> motivo from filtered motivos_baja
    const motivosMap = new Map<number, string>();
    motivosFiltered.forEach(baja => {
      motivosMap.set(baja.numero_empleado, baja.motivo);
    });

    // SOURCE: empleados_sftp (plantilla) - filter by fecha_baja and selected years/months
    const bajasAll = plantilla.filter(emp => {
      if (!emp.fecha_baja || !emp.fecha_ingreso) return false;

      // ✅ FIX TIMEZONE: Parsear fecha como string
      const fechaStr = String(emp.fecha_baja);
      const [yearStr, monthStr] = fechaStr.split('-');
      const bajaYear = parseInt(yearStr, 10);
      const bajaMonth = parseInt(monthStr, 10);

      // Apply year filter
      if (selectedYears && selectedYears.length > 0 && !selectedYears.includes(bajaYear)) {
        return false;
      }
      // Apply month filter
      if (selectedMonths.length > 0 && !selectedMonths.includes(bajaMonth)) {
        return false;
      }
      // Apply motivo filter - only include employees whose motivo matches
      if (motivoFilter !== "all" && emp.numero_empleado) {
        return filteredEmployeeNumbers.has(emp.numero_empleado);
      }
      return true;
    });

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

    // Get ALL motivos with their raw values for classification
    const motivoRawMap = new Map<string, string>(); // prettyMotivo -> rawMotivo
    const motivoCounts = new Map<string, number>();
    bajasAll.forEach(emp => {
      const rawMotivo = emp.numero_empleado ? motivosMap.get(emp.numero_empleado) : undefined;
      const motivo = prettyMotivo(rawMotivo) || 'No especificado';
      motivoCounts.set(motivo, (motivoCounts.get(motivo) || 0) + 1);
      if (rawMotivo && !motivoRawMap.has(motivo)) {
        motivoRawMap.set(motivo, rawMotivo);
      }
    });

    // ✅ Get ALL motivos (no limit) sorted by frequency
    const allMotivos = Array.from(motivoCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([motivo]) => motivo);

    // Build data array for ALL motivos with type classification
    const data: MotiveSeniorityData[] = allMotivos.map(motivo => {
      const seniorityBuckets = motivoSeniorityMap.get(motivo) || {};
      const total = Object.values(seniorityBuckets).reduce((sum, count) => sum + count, 0);
      const rawMotivo = motivoRawMap.get(motivo) || motivo;
      const esInvoluntaria = isMotivoClave(rawMotivo);
      return { motivo, seniorityBuckets, total, esInvoluntaria };
    });

    // Sort: Involuntaria first, then Voluntaria, each sorted by total descending
    data.sort((a, b) => {
      if (a.esInvoluntaria !== b.esInvoluntaria) {
        return a.esInvoluntaria ? -1 : 1; // Involuntaria first
      }
      return b.total - a.total; // Then by total descending
    });

    const grandTotal = bajasAll.length;

    return { data, grandTotal };
  }, [plantilla, motivosBaja, selectedYears, selectedMonths, motivoFilter]);

  // Calculate column totals (all, involuntaria, voluntaria)
  const { columnTotals, involuntariaTotals, voluntariaTotals, involuntariaTotal, voluntariaTotal } = useMemo(() => {
    const totals: Record<string, number> = {};
    const invTotals: Record<string, number> = {};
    const volTotals: Record<string, number> = {};
    let invTotal = 0;
    let volTotal = 0;

    data.forEach(row => {
      SENIORITY_BUCKETS.forEach(bucket => {
        const val = row.seniorityBuckets[bucket.key] || 0;
        totals[bucket.key] = (totals[bucket.key] || 0) + val;
        if (row.esInvoluntaria) {
          invTotals[bucket.key] = (invTotals[bucket.key] || 0) + val;
        } else {
          volTotals[bucket.key] = (volTotals[bucket.key] || 0) + val;
        }
      });
      if (row.esInvoluntaria) {
        invTotal += row.total;
      } else {
        volTotal += row.total;
      }
    });

    return {
      columnTotals: totals,
      involuntariaTotals: invTotals,
      voluntariaTotals: volTotals,
      involuntariaTotal: invTotal,
      voluntariaTotal: volTotal
    };
  }, [data]);

  // Separate data by type
  const involuntariaData = data.filter(d => d.esInvoluntaria);
  const voluntariaData = data.filter(d => !d.esInvoluntaria);

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
          {(isFullscreen: boolean) => (
            <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
              <Table className={cn("table-corporate", isFullscreen ? "text-base" : "text-sm")}>
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
                  {/* === SECCIÓN INVOLUNTARIA === */}
                  {involuntariaData.length > 0 && (
                    <>
                      <TableRow className="bg-red-50 dark:bg-red-950/30">
                        <TableCell className="font-bold text-red-700 dark:text-red-400 py-2">
                          Rotación Involuntaria
                        </TableCell>
                        {SENIORITY_BUCKETS.map(bucket => (
                          <TableCell key={bucket.key} className="text-right font-bold text-red-700 dark:text-red-400 py-2">
                            {involuntariaTotals[bucket.key] || ''}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold text-red-700 dark:text-red-400 py-2">
                          {involuntariaTotal}
                        </TableCell>
                      </TableRow>
                      {involuntariaData.map((row) => (
                        <TableRow key={row.motivo}>
                          <TableCell className="font-medium whitespace-nowrap pl-6">
                            {row.motivo.length > 30 ? row.motivo.substring(0, 30) + '...' : row.motivo}
                          </TableCell>
                          {SENIORITY_BUCKETS.map(bucket => (
                            <TableCell key={bucket.key} className="text-right">
                              {row.seniorityBuckets[bucket.key] || ''}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold">{row.total}</TableCell>
                        </TableRow>
                      ))}
                      {/* Subtotal Involuntaria - ya se muestra en la cabecera */}
                    </>
                  )}

                  {/* === SECCIÓN VOLUNTARIA === */}
                  {voluntariaData.length > 0 && (
                    <>
                      <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                        <TableCell className="font-bold text-blue-700 dark:text-blue-400 py-2">
                          Rotación Voluntaria
                        </TableCell>
                        {SENIORITY_BUCKETS.map(bucket => (
                          <TableCell key={bucket.key} className="text-right font-bold text-blue-700 dark:text-blue-400 py-2">
                            {voluntariaTotals[bucket.key] || ''}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400 py-2">
                          {voluntariaTotal}
                        </TableCell>
                      </TableRow>
                      {voluntariaData.map((row) => (
                        <TableRow key={row.motivo}>
                          <TableCell className="font-medium whitespace-nowrap pl-6">
                            {row.motivo.length > 30 ? row.motivo.substring(0, 30) + '...' : row.motivo}
                          </TableCell>
                          {SENIORITY_BUCKETS.map(bucket => (
                            <TableCell key={bucket.key} className="text-right">
                              {row.seniorityBuckets[bucket.key] || ''}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold">{row.total}</TableCell>
                        </TableRow>
                      ))}
                      {/* Subtotal Voluntaria - ya se muestra en la cabecera */}
                    </>
                  )}

                  {/* === TOTAL GENERAL === */}
                  <TableRow className="bg-gray-200 dark:bg-slate-700 font-bold border-t-2 border-corporate-red/60 dark:border-orange-500/60">
                    <TableCell className="font-bold">TOTAL GENERAL</TableCell>
                    {SENIORITY_BUCKETS.map(bucket => (
                      <TableCell key={bucket.key} className="text-right font-bold">
                        {columnTotals[bucket.key] || 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">{grandTotal}</TableCell>
                  </TableRow>
                  {/* Percentage row */}
                  <TableRow className="bg-gray-100 dark:bg-slate-800 font-semibold text-xs">
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
