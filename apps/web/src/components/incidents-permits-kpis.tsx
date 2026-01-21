"use client";

import { useMemo } from "react";
import { KPICard } from "@/components/kpi-card";
import { AlertCircle, Clipboard } from "lucide-react";
import { calculateVariancePercentage } from "@/lib/utils/kpi-helpers";
import { normalizeIncidenciaCode } from "@/lib/normalizers";
import { format } from "date-fns";

// ✅ CATEGORIZACIÓN DE INCIDENCIAS (importado desde constants)
const FALTAS_CODES = new Set(["FI", "SUSP"]);
const SALUD_CODES = new Set(["ENFE", "MAT3", "MAT1"]);
const PERMISOS_CODES = new Set(["PSIN", "PCON", "FEST", "PATER", "JUST"]);
const INCIDENT_CODES = new Set([...FALTAS_CODES, ...SALUD_CODES]);

interface IncidenciaRecord {
  emp: number;
  fecha: string;
  inci: string;
}

interface IncidentsPermitsKPIsProps {
  incidencias: IncidenciaRecord[];
  incidenciasAnterior: IncidenciaRecord[];
  diasLaborablesActual: number;
  diasLaborablesPrev: number;
  currentReferenceDate: Date;
  refreshEnabled?: boolean;
  metricType?: 'percent' | 'count'; // ✅ Soporte para toggle %/#
  showTotal?: boolean; // ✅ Mostrar "Total:" debajo del porcentaje
}

/**
 * Componente compartido que calcula y muestra los KPI cards de Incidencias y Permisos
 * Usado en: tab Resumen y tab Incidencias
 */
export function IncidentsPermitsKPIs({
  incidencias,
  incidenciasAnterior,
  diasLaborablesActual,
  diasLaborablesPrev,
  currentReferenceDate,
  refreshEnabled = false,
  metricType = 'percent',
  showTotal = false
}: IncidentsPermitsKPIsProps) {

  // ✅ Calcular totales actuales
  const { totalIncidencias, totalPermisos } = useMemo(() => {
    let countIncidencias = 0;
    let countPermisos = 0;

    incidencias.forEach(inc => {
      const code = normalizeIncidenciaCode(inc.inci);
      if (!code) return;

      if (INCIDENT_CODES.has(code)) {
        countIncidencias++;
      } else if (PERMISOS_CODES.has(code)) {
        countPermisos++;
      }
    });

    return { totalIncidencias: countIncidencias, totalPermisos: countPermisos };
  }, [incidencias]);

  // ✅ Calcular totales anteriores
  const { totalIncidenciasAnterior, totalPermisosAnterior } = useMemo(() => {
    let countIncidencias = 0;
    let countPermisos = 0;

    incidenciasAnterior.forEach(inc => {
      const code = normalizeIncidenciaCode(inc.inci);
      if (!code) return;

      if (INCIDENT_CODES.has(code)) {
        countIncidencias++;
      } else if (PERMISOS_CODES.has(code)) {
        countPermisos++;
      }
    });

    return { totalIncidenciasAnterior: countIncidencias, totalPermisosAnterior: countPermisos };
  }, [incidenciasAnterior]);

  // ✅ Calcular porcentajes
  const incidenciasPct = diasLaborablesActual > 0 ? (totalIncidencias / diasLaborablesActual) * 100 : 0;
  const incidenciasPctAnterior = diasLaborablesPrev > 0 ? (totalIncidenciasAnterior / diasLaborablesPrev) * 100 : 0;
  const permisosPct = diasLaborablesActual > 0 ? (totalPermisos / diasLaborablesActual) * 100 : 0;
  const permisosPctAnterior = diasLaborablesPrev > 0 ? (totalPermisosAnterior / diasLaborablesPrev) * 100 : 0;

  const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

  // ✅ Valores según el tipo de métrica
  const isPercent = metricType === 'percent';
  const incidenciasValue = isPercent ? Number(incidenciasPct.toFixed(1)) : totalIncidencias;
  const incidenciasAnteriorValue = isPercent ? Number(incidenciasPctAnterior.toFixed(1)) : totalIncidenciasAnterior;
  const permisosValue = isPercent ? Number(permisosPct.toFixed(1)) : totalPermisos;
  const permisosAnteriorValue = isPercent ? Number(permisosPctAnterior.toFixed(1)) : totalPermisosAnterior;

  return (
    <>
      <KPICard
        refreshEnabled={refreshEnabled}
        kpi={{
          name: isPercent ? 'Incidencias (%)' : 'Incidencias (#)',
          category: isPercent ? 'retention' : 'incidents',
          value: incidenciasValue,
          previous_value: incidenciasAnteriorValue,
          variance_percentage: isPercent
            ? calculateVariancePercentage(incidenciasPct, incidenciasPctAnterior)
            : calculateVariancePercentage(totalIncidencias, totalIncidenciasAnterior),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        }}
        icon={<AlertCircle className="h-6 w-6" />}
        secondaryLabel="vs mes anterior"
        secondaryValue={incidenciasAnteriorValue}
        secondaryIsPercent={isPercent}
        hidePreviousValue={true}
        secondaryRows={isPercent && showTotal ? [
          { label: 'Total', value: totalIncidencias, showColon: true }
        ] : undefined}
      />
      <KPICard
        refreshEnabled={refreshEnabled}
        kpi={{
          name: isPercent ? 'Permisos (%)' : 'Permisos (#)',
          category: isPercent ? 'retention' : 'headcount',
          value: permisosValue,
          previous_value: permisosAnteriorValue,
          variance_percentage: isPercent
            ? calculateVariancePercentage(permisosPct, permisosPctAnterior)
            : calculateVariancePercentage(totalPermisos, totalPermisosAnterior),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        }}
        icon={<Clipboard className="h-6 w-6" />}
        secondaryLabel="vs mes anterior"
        secondaryValue={permisosAnteriorValue}
        secondaryIsPercent={isPercent}
        hidePreviousValue={true}
        secondaryRows={isPercent && showTotal ? [
          { label: 'Total', value: totalPermisos, showColon: true }
        ] : undefined}
      />
    </>
  );
}
