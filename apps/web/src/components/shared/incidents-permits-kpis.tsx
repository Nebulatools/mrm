"use client";

import { useMemo } from "react";
import { KPICard } from "@/components/shared/kpi-card";
import { AlertCircle, Heart } from "lucide-react";
import { calculateVariancePercentage } from "@/lib/utils/kpi-helpers";
import { normalizeIncidenciaCode } from "@/lib/normalizers";
import { format } from "date-fns";

// ✅ CATEGORIZACIÓN según especificación del usuario (Enero 2026):
// - Faltas: FI (Falta Injustificada), SUSP (Suspensión), PSIN (Permiso Sin Goce)
// - Salud: ENFE (Enfermedad), MAT1/MAT3 (Maternidad), ACCI (Accidente), INCA (Incapacidad)
const FALTAS_CODES = new Set(["FI", "SUSP", "PSIN"]);
const SALUD_CODES = new Set(["ENFE", "MAT1", "MAT3", "ACCI", "INCA"]);

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
  // Override de porcentajes para consistencia exacta entre tabs
  faltasPctOverride?: number;
  faltasPctAnteriorOverride?: number;
  saludPctOverride?: number;
  saludPctAnteriorOverride?: number;
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
  showTotal = false,
  faltasPctOverride,
  faltasPctAnteriorOverride,
  saludPctOverride,
  saludPctAnteriorOverride
}: IncidentsPermitsKPIsProps) {

  // ✅ Calcular totales actuales: Faltas + Salud (según nueva especificación)
  const { totalFaltas, totalSalud } = useMemo(() => {
    let countFaltas = 0;
    let countSalud = 0;

    incidencias.forEach(inc => {
      const code = normalizeIncidenciaCode(inc.inci);
      if (!code) return;

      if (FALTAS_CODES.has(code)) {
        countFaltas++;
      } else if (SALUD_CODES.has(code)) {
        countSalud++;
      }
    });

    return { totalFaltas: countFaltas, totalSalud: countSalud };
  }, [incidencias]);

  // ✅ Calcular totales anteriores: Faltas + Salud
  const { totalFaltasAnterior, totalSaludAnterior } = useMemo(() => {
    let countFaltas = 0;
    let countSalud = 0;

    incidenciasAnterior.forEach(inc => {
      const code = normalizeIncidenciaCode(inc.inci);
      if (!code) return;

      if (FALTAS_CODES.has(code)) {
        countFaltas++;
      } else if (SALUD_CODES.has(code)) {
        countSalud++;
      }
    });

    return { totalFaltasAnterior: countFaltas, totalSaludAnterior: countSalud };
  }, [incidenciasAnterior]);

  // Usar overrides de Incidencias tab si están disponibles, sino calcular localmente
  const faltasPct = faltasPctOverride ?? (diasLaborablesActual > 0 ? (totalFaltas / diasLaborablesActual) * 100 : 0);
  const faltasPctAnterior = faltasPctAnteriorOverride ?? (diasLaborablesPrev > 0 ? (totalFaltasAnterior / diasLaborablesPrev) * 100 : 0);
  const saludPct = saludPctOverride ?? (diasLaborablesActual > 0 ? (totalSalud / diasLaborablesActual) * 100 : 0);
  const saludPctAnterior = saludPctAnteriorOverride ?? (diasLaborablesPrev > 0 ? (totalSaludAnterior / diasLaborablesPrev) * 100 : 0);

  const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

  // ✅ Valores según el tipo de métrica
  const isPercent = metricType === 'percent';
  const faltasValue = isPercent ? Number(faltasPct.toFixed(2)) : totalFaltas;
  const faltasAnteriorValue = isPercent ? Number(faltasPctAnterior.toFixed(2)) : totalFaltasAnterior;
  const saludValue = isPercent ? Number(saludPct.toFixed(2)) : totalSalud;
  const saludAnteriorValue = isPercent ? Number(saludPctAnterior.toFixed(2)) : totalSaludAnterior;

  return (
    <>
      <KPICard
        refreshEnabled={refreshEnabled}
        kpi={{
          name: isPercent ? 'Faltas (%)' : 'Faltas (#)',
          category: isPercent ? 'retention' : 'incidents',
          value: faltasValue,
          previous_value: faltasAnteriorValue,
          variance_percentage: isPercent
            ? calculateVariancePercentage(faltasPct, faltasPctAnterior)
            : calculateVariancePercentage(totalFaltas, totalFaltasAnterior),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        }}
        icon={<AlertCircle className="h-6 w-6" />}
        secondaryLabel="vs mes anterior"
        secondaryValue={faltasAnteriorValue}
        secondaryIsPercent={isPercent}
        hidePreviousValue={true}
        secondaryRows={isPercent && showTotal ? [
          { label: 'Total', value: totalFaltas, showColon: true }
        ] : undefined}
      />
      <KPICard
        refreshEnabled={refreshEnabled}
        kpi={{
          name: isPercent ? 'Salud (%)' : 'Salud (#)',
          category: isPercent ? 'retention' : 'headcount',
          value: saludValue,
          previous_value: saludAnteriorValue,
          variance_percentage: isPercent
            ? calculateVariancePercentage(saludPct, saludPctAnterior)
            : calculateVariancePercentage(totalSalud, totalSaludAnterior),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        }}
        icon={<Heart className="h-6 w-6" />}
        secondaryLabel="vs mes anterior"
        secondaryValue={saludAnteriorValue}
        secondaryIsPercent={isPercent}
        hidePreviousValue={true}
        secondaryRows={isPercent && showTotal ? [
          { label: 'Total', value: totalSalud, showColon: true }
        ] : undefined}
      />
    </>
  );
}
