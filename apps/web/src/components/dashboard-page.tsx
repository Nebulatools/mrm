"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserMinus,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData, type TimePeriod } from "@/hooks/use-dashboard-data";
import { usePlantillaFilters } from "@/hooks/use-plantilla-filters";
import { useRetentionKPIs } from "@/hooks/use-retention-kpis";
import IncidentsTab from "./incidents-tab";
import { RetentionFilterPanel } from "./shared/filter-panel";
import { SummaryComparison } from "./summary-comparison";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { SmartNarrative } from "./shared/smart-narrative";
import { PersonalTab } from "./tabs/personal-tab";
import { RotacionTab } from "./tabs/rotacion-tab";
import { applyFiltersWithScope, type RetentionFilterOptions } from "@/lib/filters/filters";
import { kpiCalculator, type KPIResult } from "@/lib/kpi-calculator";
import { db } from "@/lib/supabase";
import { format, endOfMonth, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { calculateVariancePercentage } from "@/lib/utils/kpi-helpers";
import { VisualizationExportProvider } from "@/context/visualization-export-context";
import { countActiveFilters, getDetailedFilterLines, getFilterSummary } from "@/lib/filters/summary";

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

const DASHBOARD_UI_REFRESH_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_DASHBOARD_UI_REFRESH === "true";

export function DashboardPage() {
  const refreshEnabled = DASHBOARD_UI_REFRESH_ENABLED;
  const { isAdmin } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ==================== STATE ====================
  const [selectedPeriod, setSelectedPeriod] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [timePeriod] = useState<TimePeriod>("monthly");
  const [bajasPorMotivoData, setBajasPorMotivoData] = useState<BajasPorMotivoData[]>([]);
  const [incidentsKpiSnapshot, setIncidentsKpiSnapshot] = useState<{
    incidencias: number;
    incidenciasAnterior: number;
    permisos: number;
    permisosAnterior: number;
    incidenciasPct: number;
    incidenciasAnteriorPct: number;
    permisosPct: number;
    permisosAnteriorPct: number;
  } | null>(null);

  const [retentionFilters, setRetentionFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: [],
    departamentos: [],
    puestos: [],
    clasificaciones: [],
    ubicaciones: [],
    ubicacionesIncidencias: [],
  });

  // ==================== HOOKS ====================
  const { data, bajasData, incidenciasData, supabase } = useDashboardData({
    timePeriod,
    selectedPeriod,
    retentionFilters,
  });

  const {
    plantillaFiltered,
    plantillaFilteredYearScope,
    plantillaFilteredGeneral,
    plantillaRotacionYearScope,
    plantillaDismissalDetail,
    bajasFiltered,
    incidenciasFiltered,
  } = usePlantillaFilters({
    plantilla: data.plantilla,
    bajasData,
    incidenciasData,
    retentionFilters,
    selectedPeriod,
  });

  const filteredRetentionKPIs = useRetentionKPIs({
    plantilla: data.plantilla,
    plantillaFilteredYearScope: plantillaRotacionYearScope,
    retentionFilters,
    selectedPeriod,
  });

  // ==================== COMPUTED VALUES ====================
  const filtersSummary = useMemo(
    () => getFilterSummary(retentionFilters),
    [retentionFilters]
  );
  const filtersDetailedLines = useMemo(
    () => getDetailedFilterLines(retentionFilters),
    [retentionFilters]
  );
  const filtersCount = useMemo(
    () => countActiveFilters(retentionFilters),
    [retentionFilters]
  );

  // Dataset dates for period calculation
  const datasetDates = useMemo(() => {
    const dates: Date[] = [];
    if (data.lastUpdated) {
      const lastUpdate = new Date(data.lastUpdated);
      if (!Number.isNaN(lastUpdate.getTime())) {
        dates.push(lastUpdate);
      }
    }

    (data.plantilla || []).forEach((emp) => {
      if (emp.fecha_ingreso) {
        const ingreso = new Date(emp.fecha_ingreso);
        if (!Number.isNaN(ingreso.getTime())) {
          dates.push(ingreso);
        }
      }
      if (emp.fecha_baja) {
        const baja = new Date(emp.fecha_baja);
        if (!Number.isNaN(baja.getTime())) {
          dates.push(baja);
        }
      }
    });

    return dates;
  }, [data.lastUpdated, data.plantilla]);

  const earliestDatasetDate = useMemo(() => {
    if (datasetDates.length === 0) return null;
    const minTimestamp = Math.min(...datasetDates.map((date) => date.getTime()));
    return new Date(minTimestamp);
  }, [datasetDates]);

  const fallbackReferenceDate = useMemo(() => {
    if (datasetDates.length === 0) return new Date();
    const maxTimestamp = Math.max(...datasetDates.map((date) => date.getTime()));
    return new Date(maxTimestamp);
  }, [datasetDates]);

  const latestCompleteMonthStart = useMemo(() => {
    const reference = fallbackReferenceDate;
    const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const monthEnd = endOfMonth(monthStart);
    const monthIsComplete = reference.getTime() >= monthEnd.getTime();

    if (monthIsComplete) return monthStart;
    if (!earliestDatasetDate) return monthStart;

    const earliestMonthStart = new Date(
      earliestDatasetDate.getFullYear(),
      earliestDatasetDate.getMonth(),
      1
    );
    const previousMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);

    if (previousMonthStart.getTime() < earliestMonthStart.getTime()) {
      return monthStart;
    }

    return previousMonthStart;
  }, [earliestDatasetDate, fallbackReferenceDate]);

  const computedSelectedPeriod = useMemo(() => {
    const fallbackMonth = latestCompleteMonthStart;

    const rawYears = Array.isArray(retentionFilters.years)
      ? retentionFilters.years.filter((year) => Number.isFinite(year))
      : [];
    const rawMonths = Array.isArray(retentionFilters.months)
      ? retentionFilters.months.filter(
          (month) => Number.isFinite(month) && month >= 1 && month <= 12
        )
      : [];

    const hasYears = rawYears.length > 0;
    const hasMonths = rawMonths.length > 0;

    if (hasYears && hasMonths) {
      const year = Math.max(...rawYears);
      const month = Math.max(...rawMonths);
      return new Date(year, month - 1, 1);
    }

    if (hasYears) {
      const year = Math.max(...rawYears);
      const month =
        year === fallbackMonth.getFullYear()
          ? fallbackMonth.getMonth() + 1
          : 12;
      return new Date(year, month - 1, 1);
    }

    if (hasMonths) {
      const month = Math.max(...rawMonths);
      return new Date(fallbackMonth.getFullYear(), month - 1, 1);
    }

    return fallbackMonth;
  }, [latestCompleteMonthStart, retentionFilters]);

  const currentYear = useMemo(() => {
    if (retentionFilters.years.length > 0) {
      const numericYears = retentionFilters.years.filter((year) => Number.isFinite(year));
      if (numericYears.length > 0) {
        return Math.max(...numericYears);
      }
    }
    return selectedPeriod.getFullYear();
  }, [retentionFilters.years, selectedPeriod]);

  // ==================== HEADCOUNT CALCULATIONS ====================
  const monthsBetween = (startStr?: string | null, end: Date = new Date()) => {
    if (!startStr) return 0;
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return 0;
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const total = years * 12 + months + (end.getDate() >= start.getDate() ? 0 : -1);
    return Math.max(0, total);
  };

  const headcountComparisonBase = plantillaFilteredGeneral.length > 0 ? plantillaFilteredGeneral : plantillaFiltered;

  const currentPeriodStart = startOfDay(new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth(), 1));
  const currentPeriodEnd = endOfMonth(currentPeriodStart);
  const previousPeriodStart = startOfDay(new Date(currentPeriodStart.getFullYear(), currentPeriodStart.getMonth() - 1, 1));
  const previousPeriodEnd = endOfMonth(previousPeriodStart);

  const isActiveOnDate = (employee: any, reference: Date) => {
    const ingreso = employee.fecha_ingreso ? new Date(employee.fecha_ingreso) : null;
    if (!ingreso || Number.isNaN(ingreso.getTime()) || ingreso > reference) {
      return false;
    }
    if (!employee.fecha_baja) {
      return true;
    }
    const baja = new Date(employee.fecha_baja);
    return Number.isNaN(baja.getTime()) ? true : baja > reference;
  };

  const activeEmployeesCurrent = headcountComparisonBase.filter(emp => isActiveOnDate(emp, currentPeriodEnd));
  const activeEmployeesPrevious = headcountComparisonBase.filter(emp => isActiveOnDate(emp, previousPeriodEnd));

  const activosFinMes = activeEmployeesCurrent.length;
  const activosFinMesPrev = activeEmployeesPrevious.length;

  const ingresosMes = headcountComparisonBase.filter(emp => {
    const fi = emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : null;
    return !!fi && !Number.isNaN(fi.getTime()) && fi >= currentPeriodStart && fi <= currentPeriodEnd;
  }).length;
  const ingresosMesPrev = headcountComparisonBase.filter(emp => {
    const fi = emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : null;
    return !!fi && !Number.isNaN(fi.getTime()) && fi >= previousPeriodStart && fi <= previousPeriodEnd;
  }).length;

  const antigPromMesesActual = activeEmployeesCurrent.length > 0
    ? activeEmployeesCurrent.reduce((acc, emp) => acc + monthsBetween(emp.fecha_antiguedad || emp.fecha_ingreso, currentPeriodEnd), 0) / activeEmployeesCurrent.length
    : 0;
  const antigPromMesesPrev = activeEmployeesPrevious.length > 0
    ? activeEmployeesPrevious.reduce((acc, emp) => acc + monthsBetween(emp.fecha_antiguedad || emp.fecha_ingreso, previousPeriodEnd), 0) / activeEmployeesPrevious.length
    : 0;

  const menores3mActual = activeEmployeesCurrent.filter(emp => monthsBetween(emp.fecha_antiguedad || emp.fecha_ingreso, currentPeriodEnd) < 3).length;
  const menores3mPrev = activeEmployeesPrevious.filter(emp => monthsBetween(emp.fecha_antiguedad || emp.fecha_ingreso, previousPeriodEnd) < 3).length;

  const formatISODate = (date: Date) => format(date, "yyyy-MM-dd");

  const bajasTotalesMes =
    (filteredRetentionKPIs?.bajasVoluntarias ?? 0) +
    (filteredRetentionKPIs?.bajasInvoluntarias ?? 0);
  const bajasTotalesMesAnterior =
    (filteredRetentionKPIs?.bajasVoluntariasAnterior ?? 0) +
    (filteredRetentionKPIs?.bajasInvoluntariasAnterior ?? 0);

  // ==================== KPI CARDS ====================
  const headcountKpiCards: {
    icon: ReactNode;
    kpi: KPIResult;
    secondaryRows?: { label: string; value: number; isPercent?: boolean; noWrap?: boolean; showColon?: boolean }[];
  }[] = [
    {
      icon: <Users className="h-6 w-6" />,
      kpi: {
        name: "Activos al cierre",
        category: "headcount",
        value: activosFinMes,
        previous_value: activosFinMesPrev,
        variance_percentage: calculateVariancePercentage(activosFinMes, activosFinMesPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd),
      },
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      kpi: {
        name: "Ingresos (Mes)",
        category: "headcount",
        value: ingresosMes,
        previous_value: ingresosMesPrev,
        variance_percentage: calculateVariancePercentage(ingresosMes, ingresosMesPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd),
      },
    },
    {
      icon: <UserMinus className="h-6 w-6" />,
      kpi: {
        name: "Bajas (Mes)",
        category: "headcount",
        value: bajasTotalesMes,
        previous_value: bajasTotalesMesAnterior,
        variance_percentage: calculateVariancePercentage(bajasTotalesMes, bajasTotalesMesAnterior),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd),
      },
      secondaryRows: [
        { label: "Voluntarias", value: filteredRetentionKPIs?.bajasVoluntarias ?? 0 },
        { label: "Involuntarias", value: filteredRetentionKPIs?.bajasInvoluntarias ?? 0 },
      ],
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      kpi: {
        name: "Antigüedad Promedio (meses)",
        category: "headcount",
        value: antigPromMesesActual,
        previous_value: antigPromMesesPrev,
        variance_percentage: calculateVariancePercentage(antigPromMesesActual, antigPromMesesPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd),
      },
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      kpi: {
        name: "Empl. < 3 meses",
        category: "headcount",
        value: menores3mActual,
        previous_value: menores3mPrev,
        variance_percentage: calculateVariancePercentage(menores3mActual, menores3mPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd),
      },
    },
  ];

  // ==================== EFFECTS ====================
  const hasAppliedDefaultPeriod = useRef(false);

  useEffect(() => {
    if (data.loading || datasetDates.length === 0) return;
    if (hasAppliedDefaultPeriod.current) return;

    setRetentionFilters((prev) => {
      const hasYearSelection = Array.isArray(prev.years) && prev.years.length > 0;
      const hasMonthSelection = Array.isArray(prev.months) && prev.months.length > 0;

      if (hasYearSelection && hasMonthSelection) {
        hasAppliedDefaultPeriod.current = true;
        return prev;
      }

      hasAppliedDefaultPeriod.current = true;
      const defaultYear = latestCompleteMonthStart.getFullYear();
      const defaultMonth = latestCompleteMonthStart.getMonth() + 1;

      return {
        ...prev,
        years: hasYearSelection ? prev.years : [defaultYear],
        months: hasMonthSelection ? prev.months : [defaultMonth],
      };
    });
  }, [data.loading, datasetDates.length, latestCompleteMonthStart]);

  useEffect(() => {
    if (!computedSelectedPeriod) return;
    setSelectedPeriod((prev) => {
      const prevYear = prev.getFullYear();
      const prevMonth = prev.getMonth();
      const nextYear = computedSelectedPeriod.getFullYear();
      const nextMonth = computedSelectedPeriod.getMonth();
      if (prevYear === nextYear && prevMonth === nextMonth) {
        return prev;
      }
      return new Date(nextYear, nextMonth, 1);
    });
  }, [computedSelectedPeriod]);

  // Load bajas por motivo for heatmap
  useEffect(() => {
    const loadBajasPorMotivo = async () => {
      try {
        console.log("🔥 Loading bajas por motivo for year:", currentYear);

        const plantilla = await db.getEmpleadosSFTP(supabase);

        // ✅ CRITICAL FIX: Para el heatmap, NO aplicar filtros de departamento/puesto/etc.
        // Solo aplicar año e includeInactive para obtener TODAS las bajas del año
        // Los filtros de departamento/puesto se deben aplicar DENTRO del heatmap si es necesario
        const plantillaFiltrada = applyFiltersWithScope(
          plantilla,
          {
            years: [currentYear],
            months: [], // Required by RetentionFilterOptions
            includeInactive: true, // ✅ MUST include bajas for accurate heatmap
            // NO incluir otros filtros (departamentos, puestos, etc.)
          },
          "year-only"
        );

        const heatmapData = await kpiCalculator.getBajasPorMotivoYMesFromPlantilla(
          plantillaFiltrada,
          currentYear,
          supabase
        );
        setBajasPorMotivoData(heatmapData);

        console.log("🗺️ Mapa de Calor filtrado:", {
          original: plantilla.length,
          filtrado: plantillaFiltrada.length,
          año: currentYear,
        });
      } catch (error) {
        console.error("Error loading bajas por motivo data:", error);
      }
    };

    loadBajasPorMotivo();
  }, [currentYear, supabase, retentionFilters]);

  // ==================== DISPLAY VALUES ====================
  const periodLabel = format(selectedPeriod, "MMMM yyyy", { locale: es });
  const lastUpdatedDisplay = !data.loading
    ? format(data.lastUpdated, "dd/MM/yyyy HH:mm")
    : null;

  const tabTriggerClass = refreshEnabled
    ? "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
    : undefined;

  const visualizationExportContextValue = useMemo(
    () => ({
      filters: retentionFilters,
      filtersSummary: filtersSummary?.length ? filtersSummary : null,
      filtersDetailedLines,
      filtersCount,
      periodLabel,
      lastUpdatedLabel: lastUpdatedDisplay,
    }),
    [retentionFilters, filtersSummary, filtersDetailedLines, filtersCount, periodLabel, lastUpdatedDisplay]
  );

  const narrativePayload = useMemo(
    () => ({
      periodLabel,
      filtersSummary,
      filtersCount,
      section: "retention",
      kpis: {
        ...filteredRetentionKPIs,
        bajasTotalesMes,
        bajasTotalesMesAnterior,
      },
      headcount: {
        activosFinMes,
        activosFinMesPrev,
        ingresosMes,
        ingresosMesPrev,
        antigPromMesesActual,
        antigPromMesesPrev,
      },
      dataSources: {
        empleados_sftp: {
          rows: data.plantilla.length,
          fields: ["departamento", "area", "turno", "fecha_ingreso", "fecha_baja", "clasificacion"],
          comment: "Maestro de empleados usado para headcount y cohortes",
        },
        motivos_baja: {
          rows: bajasData.length,
          fields: ["tipo", "motivo", "descripcion", "fecha_baja"],
        },
        incidencias: {
          rows: incidenciasData.length,
          fields: ["inci", "turno", "fecha", "horario", "status"],
        },
      },
    }),
    [
      periodLabel,
      filtersSummary,
      filtersCount,
      filteredRetentionKPIs,
      bajasTotalesMes,
      bajasTotalesMesAnterior,
      activosFinMes,
      activosFinMesPrev,
      ingresosMes,
      ingresosMesPrev,
      antigPromMesesActual,
      antigPromMesesPrev,
      data.plantilla.length,
      bajasData.length,
      incidenciasData.length,
    ]
  );

  // ==================== RENDER ====================
  return (
    <div
      className={cn(
        "min-h-screen transition-colors bg-background text-foreground",
        refreshEnabled && "bg-brand-surface text-brand-ink"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "border-b bg-card",
          refreshEnabled &&
            (isDark
              ? "border-brand-border/60 bg-brand-surface/95 shadow-sm backdrop-blur"
              : "border-brand-border/60 bg-white/90 shadow-sm backdrop-blur")
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4",
            refreshEnabled &&
              "mx-auto max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between sm:gap-8 lg:px-10"
          )}
        >
          {refreshEnabled ? (
            <div className="flex w-full flex-col gap-4">
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.28em]",
                  refreshEnabled && (isDark ? "text-brand-ink/70" : "text-brand-ink/60")
                )}
              >
                Panel de Talento
              </span>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1
                      className={cn(
                        "font-heading text-4xl tracking-tight",
                        refreshEnabled && (isDark ? "text-white" : "text-brand-ink")
                      )}
                    >
                      Dashboard MRM · KPIs de RRHH
                    </h1>
                    {data.loading ? (
                      <span className="inline-flex h-7 w-28 animate-pulse rounded-full bg-brand-muted" />
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-none px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                          refreshEnabled &&
                            (isDark
                              ? "bg-brand-surface-accent/80 text-brand-ink"
                              : "bg-brand-surface-accent text-brand-ink/80")
                        )}
                      >
                        Datos al día
                      </Badge>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em]",
                      refreshEnabled && (isDark ? "text-brand-ink/70" : "text-brand-ink/60")
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[11px]",
                        refreshEnabled &&
                          (isDark
                            ? "border-brand-border/40 bg-brand-surface/70 text-brand-ink/80"
                            : "border-brand-border/50 bg-white/90 text-brand-ink/70")
                      )}
                    >
                      Período: {periodLabel}
                    </span>
                    {lastUpdatedDisplay && (
                      <>
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[11px]",
                            refreshEnabled &&
                              (isDark
                                ? "border-brand-border/40 bg-brand-surface/70 text-brand-ink/80"
                                : "border-brand-border/50 bg-white/90 text-brand-ink/70")
                          )}
                        >
                          Actualizado: {lastUpdatedDisplay}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[11px]",
                            refreshEnabled &&
                              (isDark
                                ? "border-brand-border/40 bg-brand-surface/70 text-brand-ink/80"
                                : "border-brand-border/50 bg-white/90 text-brand-ink/70")
                          )}
                        >
                          {data.kpis.length} KPIs
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <ThemeToggle />
                  <UserMenu />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Dashboard MRM - KPIs de RRHH
                  {data.loading && (
                    <span className="ml-3 rounded bg-blue-100 px-2 py-1 text-sm text-blue-800">
                      Cargando datos...
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Período: {periodLabel}
                  {!data.loading && (
                    <span className="ml-2">
                      • Actualizado: {lastUpdatedDisplay}• {data.kpis.length} KPIs
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <UserMenu />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Filter Panel */}
      <section
        className={cn(
          "px-6 pb-2",
          refreshEnabled && "mx-auto max-w-7xl px-6 pb-4 pt-4 lg:px-10"
        )}
      >
        <RetentionFilterPanel
          onFiltersChange={setRetentionFilters}
          refreshEnabled={refreshEnabled}
          className="w-full"
        />
      </section>

      {/* Main Content */}
      <VisualizationExportProvider value={visualizationExportContextValue}>
        <main
          className={cn(
            "p-6",
            refreshEnabled && "mx-auto max-w-7xl px-6 pb-12 pt-6 lg:px-10"
          )}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList
              className={cn(
                refreshEnabled &&
                  "w-full flex-wrap gap-2 rounded-full bg-brand-surface-accent/80 p-2 text-brand-ink shadow-brand/10"
              )}
            >
              <TabsTrigger value="overview" className={tabTriggerClass}>
                Resumen
              </TabsTrigger>
              <TabsTrigger value="headcount" className={tabTriggerClass}>
                Personal
              </TabsTrigger>
              <TabsTrigger value="incidents" className={tabTriggerClass}>
                Incidencias
              </TabsTrigger>
              <TabsTrigger value="retention" className={tabTriggerClass}>
                Rotación
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <SmartNarrative
                data={narrativePayload}
                section="overview"
                refreshEnabled={refreshEnabled}
                className="shadow-md"
                title="Narrativa IA · Resumen"
              />
              <SummaryComparison
                plantilla={plantillaFiltered}
                plantillaYearScope={plantillaFilteredYearScope}
                plantillaGeneral={plantillaFilteredGeneral}
                bajas={bajasFiltered}
                incidencias={incidenciasFiltered}
                selectedYear={retentionFilters.years.length > 0 ? retentionFilters.years[0] : undefined}
                selectedMonth={retentionFilters.months.length > 0 ? retentionFilters.months[0] : undefined}
                referenceDate={selectedPeriod}
                retentionKPIsOverride={{
                  rotacionMensual: filteredRetentionKPIs.rotacionMensualVoluntaria,
                  rotacionMensualAnterior: filteredRetentionKPIs.rotacionMensualVoluntariaAnterior,
                  rotacionMensualSameMonthPrevYear:
                    (filteredRetentionKPIs as any).rotacionMensualVoluntariaSameMonthPrevYear ??
                    filteredRetentionKPIs.rotacionMensualVoluntariaAnterior,
                  rotacionAcumulada: filteredRetentionKPIs.rotacionAcumuladaVoluntaria,
                  rotacionAcumuladaAnterior: filteredRetentionKPIs.rotacionAcumuladaVoluntariaAnterior,
                  rotacionAnioActual: filteredRetentionKPIs.rotacionAnioActualVoluntaria,
                  rotacionAnioActualAnterior: filteredRetentionKPIs.rotacionAnioActualVoluntariaAnterior,
                }}
                incidentsKPIsOverride={incidentsKpiSnapshot || undefined}
                refreshEnabled={refreshEnabled}
              />
            </TabsContent>

            {/* Personal Tab */}
            <TabsContent value="headcount" className="space-y-6">
              <PersonalTab
                plantillaFiltered={plantillaFiltered}
                activeEmployeesCurrent={activeEmployeesCurrent}
                headcountKpiCards={headcountKpiCards}
                narrativePayload={narrativePayload}
                refreshEnabled={refreshEnabled}
                loading={data.loading}
              />
            </TabsContent>

            {/* Incidents Tab */}
            <TabsContent value="incidents" className="space-y-6">
              <SmartNarrative
                data={narrativePayload}
                section="incidents"
                refreshEnabled={refreshEnabled}
                className="shadow-md"
                title="Narrativa IA · Incidencias"
              />
              <IncidentsTab
                plantilla={plantillaFiltered}
                plantillaAnual={plantillaFilteredYearScope}
                currentYear={retentionFilters.years.length > 0 ? retentionFilters.years[0] : undefined}
                selectedYears={retentionFilters.years}
                selectedMonths={retentionFilters.months}
                initialIncidencias={incidenciasFiltered}
                onKPIsUpdate={setIncidentsKpiSnapshot}
              />
            </TabsContent>

            {/* Retention Tab */}
            <TabsContent value="retention" className="space-y-6">
              <RotacionTab
                plantillaFiltered={plantillaFiltered}
                plantillaRotacionYearScope={plantillaRotacionYearScope}
                plantillaDismissalDetail={plantillaDismissalDetail}
                bajasData={bajasData}
                bajasPorMotivoData={bajasPorMotivoData}
                filteredRetentionKPIs={filteredRetentionKPIs}
                retentionFilters={retentionFilters}
                selectedPeriod={selectedPeriod}
                currentYear={currentYear}
                narrativePayload={narrativePayload}
                refreshEnabled={refreshEnabled}
                loading={data.loading}
              />
            </TabsContent>
          </Tabs>
        </main>
      </VisualizationExportProvider>
    </div>
  );
}
