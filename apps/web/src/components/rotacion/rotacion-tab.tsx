"use client";

import { useState } from "react";
import { Users, UserMinus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICard, KPICardSkeleton } from "@/components/shared/kpi-card";
import { DismissalReasonsTable } from "./dismissal-reasons-table";
import { BajasPorMotivoHeatmap } from "./bajas-por-motivo-heatmap";
import { RetentionCharts } from "./retention-charts";
import { RotationByMotiveAreaTable } from "./tables/rotation-by-motive-area-table";
import { RotationByMotiveSeniorityTable } from "./tables/rotation-by-motive-seniority-table";
import { RotationByMotiveMonthTable } from "./tables/rotation-by-motive-month-table";
import { RotationCombinedTable } from "./tables/rotation-combined-table";
import { AbandonosOtrosSummary } from "./abandonos-otros-summary";
import { SmartNarrative } from "@/components/shared/smart-narrative";
import type { PlantillaRecord } from "@/lib/supabase";
import type { MotivoBajaRecord } from "@/lib/types/records";
import type { RetentionKPIs } from "@/hooks/use-retention-kpis";
import type { RetentionFilterOptions } from "@/lib/filters/filters";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

interface BajasPorMotivoData {
  motivo: string;
  enero: number;
  febrero: number;
  marzo: number;
  abril: number;
  mayo: number;
  junio: number;
  julio: number;
  agosto: number;
  septiembre: number;
  octubre: number;
  noviembre: number;
  diciembre: number;
}

interface RotacionTabProps {
  plantillaFiltered: PlantillaRecord[];
  plantillaRotacionYearScope: PlantillaRecord[];
  plantillaDismissalDetail: PlantillaRecord[];
  bajasData: MotivoBajaRecord[];
  bajasPorMotivoData: BajasPorMotivoData[];
  filteredRetentionKPIs: RetentionKPIs;
  retentionFilters: RetentionFilterOptions;
  selectedPeriod: Date;
  currentYear: number;
  narrativePayload: unknown;
  refreshEnabled: boolean;
  loading: boolean;
}

/**
 * Tab de Rotación - Muestra KPIs de rotación, heatmap y tablas de análisis
 */
export function RotacionTab({
  plantillaFiltered,
  plantillaRotacionYearScope,
  plantillaDismissalDetail,
  bajasData,
  bajasPorMotivoData,
  filteredRetentionKPIs,
  retentionFilters,
  selectedPeriod,
  currentYear,
  narrativePayload,
  refreshEnabled,
  loading,
}: RotacionTabProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Toggle para filtrar visualizaciones por rotación involuntaria vs voluntaria
  const [motivoFilterType, setMotivoFilterType] = useState<
    "all" | "involuntaria" | "voluntaria"
  >("voluntaria");

  return (
    <div className="space-y-6">
      {/* Explicación de rotación involuntaria */}
      <div
        className={cn(
          "rounded border-l-4 border-blue-400 bg-gray-50 p-2 text-xs text-gray-500 dark:bg-gray-800",
          refreshEnabled &&
            "border-brand-border/80 bg-brand-surface-accent/70 text-brand-ink/70"
        )}
      >
        <strong>Rotación involuntaria:</strong> Rescisión por desempeño,
        Rescisión por disciplina, Término del contrato
      </div>

      <SmartNarrative
        data={narrativePayload}
        section="retention"
        refreshEnabled={refreshEnabled}
        className="shadow-md"
      />

      {/* 5 KPIs Principales de Retención con filtros aplicados */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 items-stretch">
        {refreshEnabled && loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <KPICardSkeleton key={`retention-skeleton-${index}`} refreshEnabled />
          ))
        ) : (
          <>
            <KPICard
              refreshEnabled={refreshEnabled}
              kpi={{
                name: "Activos Promedio",
                category: "headcount",
                value: filteredRetentionKPIs.activosPromedio,
                previous_value: filteredRetentionKPIs.activosPromedioAnterior,
                variance_percentage:
                  filteredRetentionKPIs.activosPromedioVariacion,
                period_start: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth(),
                  1
                )
                  .toISOString()
                  .split("T")[0],
                period_end: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth() + 1,
                  0
                )
                  .toISOString()
                  .split("T")[0],
              }}
              icon={<Users className="h-6 w-6" />}
            />

            <KPICard
              refreshEnabled={refreshEnabled}
              kpi={{
                name: "Bajas Voluntarias",
                category: "headcount",
                value: filteredRetentionKPIs.bajasVoluntarias,
                previous_value: filteredRetentionKPIs.bajasVoluntariasAnterior,
                variance_percentage:
                  filteredRetentionKPIs.bajasVoluntariasVariacion,
                period_start: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth(),
                  1
                )
                  .toISOString()
                  .split("T")[0],
                period_end: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth() + 1,
                  0
                )
                  .toISOString()
                  .split("T")[0],
              }}
              icon={<UserMinus className="h-6 w-6" />}
              secondaryLabel="Bajas Involuntarias"
              secondaryValue={filteredRetentionKPIs.bajasInvoluntarias}
            />

            <KPICard
              refreshEnabled={refreshEnabled}
              kpi={{
                name: "Rotación Mensual Voluntaria",
                category: "retention",
                value: filteredRetentionKPIs.rotacionMensualVoluntaria,
                previous_value:
                  filteredRetentionKPIs.rotacionMensualVoluntariaAnterior,
                variance_percentage:
                  filteredRetentionKPIs.rotacionMensualVoluntariaVariacion,
                period_start: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth(),
                  1
                )
                  .toISOString()
                  .split("T")[0],
                period_end: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth() + 1,
                  0
                )
                  .toISOString()
                  .split("T")[0],
              }}
              icon={<TrendingUp className="h-6 w-6" />}
              secondaryRows={[
                {
                  label: "Rot. Involuntaria",
                  value: filteredRetentionKPIs.rotacionMensualClaves,
                  isPercent: true,
                  noWrap: true,
                },
                {
                  label: "Rot. Total",
                  value: filteredRetentionKPIs.rotacionMensual,
                  isPercent: true,
                  noWrap: true,
                },
              ]}
            />

            <KPICard
              refreshEnabled={refreshEnabled}
              kpi={{
                name: "Rotación Acumulada Voluntaria",
                category: "retention",
                value: filteredRetentionKPIs.rotacionAcumuladaVoluntaria,
                previous_value:
                  filteredRetentionKPIs.rotacionAcumuladaVoluntariaAnterior,
                variance_percentage:
                  filteredRetentionKPIs.rotacionAcumuladaVoluntariaVariacion,
                period_start: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth() - 11,
                  1
                )
                  .toISOString()
                  .split("T")[0],
                period_end: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth() + 1,
                  0
                )
                  .toISOString()
                  .split("T")[0],
              }}
              icon={<TrendingDown className="h-6 w-6" />}
              secondaryRows={[
                {
                  label: "Rot. Involuntaria",
                  value: filteredRetentionKPIs.rotacionAcumuladaClaves,
                  isPercent: true,
                  noWrap: true,
                },
                {
                  label: "Rot. Total",
                  value: filteredRetentionKPIs.rotacionAcumulada,
                  isPercent: true,
                  noWrap: true,
                },
              ]}
            />

            <KPICard
              refreshEnabled={refreshEnabled}
              kpi={{
                name: "Rotación Año Actual Voluntaria",
                category: "retention",
                value: filteredRetentionKPIs.rotacionAnioActualVoluntaria,
                previous_value:
                  filteredRetentionKPIs.rotacionAnioActualVoluntariaAnterior,
                variance_percentage:
                  filteredRetentionKPIs.rotacionAnioActualVoluntariaVariacion,
                period_start: new Date(selectedPeriod.getFullYear(), 0, 1)
                  .toISOString()
                  .split("T")[0],
                period_end: new Date(
                  selectedPeriod.getFullYear(),
                  selectedPeriod.getMonth() + 1,
                  0
                )
                  .toISOString()
                  .split("T")[0],
              }}
              icon={<TrendingDown className="h-6 w-6" />}
              secondaryRows={[
                {
                  label: "Rot. Involuntaria",
                  value: filteredRetentionKPIs.rotacionAnioActualClaves,
                  isPercent: true,
                  noWrap: true,
                },
                {
                  label: "Rot. Total",
                  value: filteredRetentionKPIs.rotacionAnioActual,
                  isPercent: true,
                  noWrap: true,
                },
              ]}
            />
          </>
        )}
      </div>

      {/* Toggle para filtrar visualizaciones por motivo */}
      <div
        className={cn(
          "flex items-center justify-center gap-4 rounded-lg border bg-card p-4",
          refreshEnabled &&
            (isDark
              ? "rounded-2xl border-brand-border/40 bg-brand-surface/70 shadow-brand/10"
              : "rounded-2xl border-brand-border/40 bg-brand-surface-accent/60 shadow-brand/10")
        )}
      >
        <span
          className={cn(
            "text-sm font-medium",
            refreshEnabled &&
              (isDark
                ? "font-heading text-xs uppercase tracking-[0.12em] text-brand-ink"
                : "font-heading text-xs uppercase tracking-[0.12em] text-brand-ink/80")
          )}
        >
          Filtrar gráficas de rotación:
        </span>
        <div className="flex gap-2">
          {(
            [
              { key: "voluntaria", label: "Rotación Voluntaria" },
              { key: "involuntaria", label: "Rotación Involuntaria" },
              { key: "all", label: "Rotación Total" },
            ] as const
          ).map((option) => (
            <Button
              key={option.key}
              variant={
                motivoFilterType === option.key
                  ? refreshEnabled
                    ? "cta"
                    : "default"
                  : "outline"
              }
              size="sm"
              onClick={() => setMotivoFilterType(option.key)}
              className={cn(
                "transition-all",
                refreshEnabled && "rounded-full font-semibold",
                motivoFilterType === option.key &&
                  refreshEnabled &&
                  "shadow-brand"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 3 Gráficas Especializadas de Retención */}
      <RetentionCharts
        currentDate={selectedPeriod}
        currentYear={currentYear}
        filters={{
          years: retentionFilters.years,
          months: retentionFilters.months,
          departamentos: retentionFilters.departamentos,
          puestos: retentionFilters.puestos,
          clasificaciones: retentionFilters.clasificaciones,
          empresas: retentionFilters.empresas,
          areas: retentionFilters.areas,
          ubicaciones: retentionFilters.ubicaciones,
        }}
        motivoFilter={motivoFilterType}
      />

      {/* Mapa de Calor de Bajas por Motivo */}
      <BajasPorMotivoHeatmap
        data={bajasPorMotivoData}
        selectedYears={retentionFilters.years}
      />

      <AbandonosOtrosSummary referenceDate={selectedPeriod} />

      {/* New Rotation Analysis Tables */}
      <div className="grid grid-cols-1 gap-6">
        <RotationByMotiveAreaTable
          plantilla={plantillaRotacionYearScope}
          motivosBaja={bajasData}
          selectedYears={retentionFilters.years}
          refreshEnabled={refreshEnabled}
        />
        <RotationByMotiveSeniorityTable
          plantilla={plantillaRotacionYearScope}
          motivosBaja={bajasData}
          selectedYears={retentionFilters.years}
          refreshEnabled={refreshEnabled}
        />
        <RotationByMotiveMonthTable
          plantilla={plantillaRotacionYearScope}
          motivosBaja={bajasData}
          selectedYears={retentionFilters.years}
          refreshEnabled={refreshEnabled}
        />
      </div>

      {/* Location-Based Rotation Combined Table */}
      <div className="mt-6">
        <RotationCombinedTable
          plantilla={plantillaRotacionYearScope}
          motivosBaja={bajasData}
          selectedYears={retentionFilters.years}
          refreshEnabled={refreshEnabled}
        />
      </div>

      {/* Tabla de Bajas por Motivo y Listado Detallado */}
      <DismissalReasonsTable
        plantilla={
          plantillaDismissalDetail.length > 0
            ? plantillaDismissalDetail
            : plantillaFiltered
        }
        refreshEnabled={refreshEnabled}
      />
    </div>
  );
}
