"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricToggle } from "@/components/ui/metric-toggle";
import { VisualizationContainer } from "@/components/shared/visualization-container";
import { normalizeIncidenciaCode } from "@/lib/normalizers";
import type { IncidenciaCSVRecord, PlantillaRecord } from "@/lib/supabase";
import type { RetentionFilterOptions } from "@/lib/filters";
import { applyFiltersWithScope } from "@/lib/filters";
import { getTitleWithYear } from "@/lib/filters/year-display";

interface AbsenteeismTableProps {
  incidencias: IncidenciaCSVRecord[];
  plantilla: PlantillaRecord[];
  currentYear?: number;
  selectedYears?: number[];
  filters?: RetentionFilterOptions;
}

// ✅ AGRUPACIÓN CORRECTA (igual a incidents-tab.tsx líneas 46-49)
const FALTAS_CODES = new Set(["FI", "SUSP"]); // Faltas + Suspensiones
const SALUD_CODES = new Set(["ENFE", "MAT3", "MAT1", "ACCI", "INCA"]); // Enfermedad + Maternales + Accidente + Incapacidad
const PERMISOS_CODES = new Set(["PSIN", "PCON", "FEST", "PATER", "JUST"]); // Todos los permisos (sin VAC)
const VACACIONES_CODES = new Set(["VAC"]); // Vacaciones

const MONTH_LABELS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export function AbsenteeismTable({
  incidencias,
  plantilla,
  currentYear,
  selectedYears = [],
  filters
}: AbsenteeismTableProps) {
  const [metricType, setMetricType] = useState<"count" | "percent">("percent");

  // Filtrar incidencias según año y empleados de la plantilla filtrada
  const filteredIncidencias = useMemo(() => {
    const plantillaFiltered = filters
      ? applyFiltersWithScope(plantilla, filters, 'general')
      : plantilla;

    const empleadosEnPlantilla = new Set(
      plantillaFiltered.map(e => (e as any).numero_empleado || e.id)
    );

    return incidencias.filter((inc) => {
      if (currentYear !== undefined) {
        if (!inc.fecha) return false;
        const fecha = new Date(inc.fecha);
        if (fecha.getFullYear() !== currentYear) return false;
      }
      return empleadosEnPlantilla.has(inc.emp);
    });
  }, [incidencias, plantilla, currentYear, filters]);

  // ✅ Función para calcular días activos de un empleado (igual que incidents-tab.tsx)
  const calcularDiasActivo = (emp: PlantillaRecord, start: Date, end: Date): number => {
    const ingreso = new Date(emp.fecha_ingreso);
    const baja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
    const effectiveStart = ingreso > start ? ingreso : start;
    const effectiveEnd = baja && baja < end ? baja : end;
    if (effectiveEnd < effectiveStart) return 0;
    return differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
  };

  // Calcular datos por mes
  const tableData = useMemo(() => {
    const plantillaFiltered = filters
      ? applyFiltersWithScope(plantilla, filters, 'general')
      : plantilla;

    const year = currentYear || new Date().getFullYear();

    // ✅ CORRECCIÓN: Calcular DÍAS LABORADOS sumando días activos de CADA empleado
    const diasLaboradosPorMes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      // Sumar días activos de cada empleado en el mes
      return plantillaFiltered.reduce((acc, emp) => {
        return acc + calcularDiasActivo(emp, start, end);
      }, 0);
    });

    // Agrupar incidencias por motivo y mes (4 grupos)
    const dataByMotivo: Record<string, number[]> = {
      'VACACIONES': new Array(12).fill(0),
      'FALTAS': new Array(12).fill(0),
      'SALUD': new Array(12).fill(0),
      'PERMISOS': new Array(12).fill(0),
    };

    filteredIncidencias.forEach(inc => {
      if (!inc.fecha) return;
      const fecha = new Date(inc.fecha);
      const month = fecha.getMonth(); // 0-11
      const code = normalizeIncidenciaCode(inc.inci);

      if (VACACIONES_CODES.has(code)) {
        dataByMotivo['VACACIONES'][month]++;
      } else if (FALTAS_CODES.has(code)) {
        dataByMotivo['FALTAS'][month]++;
      } else if (SALUD_CODES.has(code)) {
        dataByMotivo['SALUD'][month]++;
      } else if (PERMISOS_CODES.has(code)) {
        dataByMotivo['PERMISOS'][month]++;
      }
    });

    // Calcular totales de incidencias por mes
    const totales = new Array(12).fill(0);
    Object.keys(dataByMotivo).forEach(motivo => {
      dataByMotivo[motivo].forEach((value, idx) => {
        totales[idx] += value;
      });
    });

    // ✅ JORNADAS NETAS = Días activos - Total incidencias
    const jornadasNetas = diasLaboradosPorMes.map((dias, idx) => dias - totales[idx]);

    // Convertir a porcentajes si es necesario
    const finalData: Record<string, (number | string)[]> = {};
    Object.keys(dataByMotivo).forEach(motivo => {
      finalData[motivo] = dataByMotivo[motivo].map((count, idx) => {
        if (metricType === "percent") {
          const dias = diasLaboradosPorMes[idx];
          return dias > 0 ? ((count / dias) * 100).toFixed(0) + '%' : '0%';
        }
        return count;
      });
    });

    finalData['TOTAL'] = totales.map((count, idx) => {
      if (metricType === "percent") {
        const dias = diasLaboradosPorMes[idx];
        return dias > 0 ? ((count / dias) * 100).toFixed(2) + '%' : '0.00%';
      }
      return count;
    });

    return { dataByMotivo: finalData, diasLaboradosPorMes, jornadasNetas, year };
  }, [filteredIncidencias, plantilla, currentYear, metricType, filters]);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">
            {getTitleWithYear('Ausentismos por motivo', selectedYears)}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Días activos: Suma de días de todos los empleados | Desglose por motivo
          </p>
        </div>
        <MetricToggle value={metricType} onChange={setMetricType} size="sm" />
      </CardHeader>
      <CardContent>
        <VisualizationContainer
          title={`Ausentismo ${metricType === "percent" ? "(porcentaje)" : "(cantidad)"}`}
          type="table"
          className="w-full"
          filename="tabla-ausentismo-mensual"
        >
          {(isFullscreen) => (
            <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
              <Table className={cn("table-corporate", isFullscreen ? "text-base" : "text-sm")}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] font-bold">Motivo</TableHead>
                    {MONTH_LABELS.map((month, idx) => (
                      <TableHead key={idx} className="text-center min-w-[65px] font-bold">
                        {month}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Fila de DÍAS ACTIVOS */}
                  <TableRow className="bg-blue-100 dark:bg-blue-900/30 font-semibold">
                    <TableCell className="font-bold">DÍAS ACTIVOS</TableCell>
                    {tableData.diasLaboradosPorMes.map((dias, idx) => (
                      <TableCell key={idx} className="text-center">
                        {dias.toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Filas de motivos (4 grupos en el orden de la imagen) */}
                  <TableRow>
                    <TableCell className="font-medium">VACACIONES</TableCell>
                    {(tableData.dataByMotivo['VACACIONES'] as (number | string)[]).map((val, idx) => (
                      <TableCell key={idx} className="text-center">
                        {val}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">FALTAS</TableCell>
                    {(tableData.dataByMotivo['FALTAS'] as (number | string)[]).map((val, idx) => (
                      <TableCell key={idx} className="text-center">
                        {val}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">SALUD</TableCell>
                    {(tableData.dataByMotivo['SALUD'] as (number | string)[]).map((val, idx) => (
                      <TableCell key={idx} className="text-center">
                        {val}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">PERMISOS</TableCell>
                    {(tableData.dataByMotivo['PERMISOS'] as (number | string)[]).map((val, idx) => (
                      <TableCell key={idx} className="text-center">
                        {val}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Fila de TOTAL */}
                  <TableRow className="bg-yellow-100 dark:bg-yellow-900/30 font-semibold">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    {(tableData.dataByMotivo['TOTAL'] as (number | string)[]).map((val, idx) => (
                      <TableCell key={idx} className="text-center">
                        {val}
                      </TableCell>
                    ))}
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
