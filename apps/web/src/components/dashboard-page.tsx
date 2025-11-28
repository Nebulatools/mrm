"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, LabelList } from 'recharts';
import { KPICard, KPICardSkeleton } from "./kpi-card";
import { DismissalReasonsTable } from "./dismissal-reasons-table";
import { BajasPorMotivoHeatmap } from "./bajas-por-motivo-heatmap";
import { RetentionCharts } from "./retention-charts";
import IncidentsTab from "./incidents-tab";
import { RetentionFilterPanel } from "./filter-panel";
import { SummaryComparison } from "./summary-comparison";
import { AbandonosOtrosSummary } from "./abandonos-otros-summary";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModelTrendsTab } from "./model-trends-tab";
import { applyFiltersWithScope, type RetentionFilterOptions } from "@/lib/filters/filters";
import { kpiCalculator, type KPIResult, type TimeFilter } from "@/lib/kpi-calculator";
import { db, type PlantillaRecord, type IncidenciaCSVRecord } from "@/lib/supabase";
import { createBrowserClient } from "@/lib/supabase-client";
import { format, endOfMonth, startOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
// 🆕 Import helper functions
import {
  calculateActivosPromedio,
  calculateBajasTempranas,
  calcularRotacionConDesglose,
  calcularRotacionAcumulada12mConDesglose,
  calcularRotacionYTDConDesglose,
  calculateVariancePercentage
} from "@/lib/utils/kpi-helpers";
import { VisualizationContainer } from "./visualization-container";
import { countActiveFilters, getDetailedFilterLines, getFilterSummary } from "@/lib/filters/summary";
import { VisualizationExportProvider } from "@/context/visualization-export-context";
import { Separator } from "@/components/ui/separator";
//

interface DashboardData {
  kpis: KPIResult[];
  plantilla: PlantillaRecord[];
  lastUpdated: Date;
  loading: boolean;
}

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

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'annual' | 'last12months' | 'alltime';

const DASHBOARD_UI_REFRESH_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_DASHBOARD_UI_REFRESH === "true";

export function DashboardPage() {
  // Create authenticated Supabase client for RLS filtering
  const supabase = createBrowserClient();
  const refreshEnabled = DASHBOARD_UI_REFRESH_ENABLED;
  const { isAdmin } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chartAxisColor = isDark ? "#F8FAFC" : "#334155";
  const chartSecondaryAxisColor = isDark ? "#CBD5F5" : "#64748b";
  const chartGridColor = isDark ? "rgba(148, 163, 184, 0.25)" : "#e2e8f0";
  const chartTooltipBg = isDark ? "hsl(var(--card))" : "#FFFFFF";
  const chartTooltipBorder = isDark ? "rgba(148, 163, 184, 0.35)" : "#e2e8f0";
  const chartTooltipLabelColor = isDark ? "#E2E8F0" : "#0f172a";
  const chartTooltipShadow = isDark ? "0 16px 45px -20px rgba(8, 14, 26, 0.65)" : "0 10px 35px -15px rgba(15, 23, 42, 0.35)";

  // Removed unused sanitizeChip function
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    plantilla: [],
    lastUpdated: new Date(),
    loading: true
  });
  const [selectedPeriod, setSelectedPeriod] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [timePeriod] = useState<TimePeriod>('monthly');
  const [bajasPorMotivoData, setBajasPorMotivoData] = useState<BajasPorMotivoData[]>([]);
  const [bajasData, setBajasData] = useState<any[]>([]);
  const [incidenciasData, setIncidenciasData] = useState<IncidenciaCSVRecord[]>([]);

  // Toggle para filtrar visualizaciones por rotación involuntaria vs voluntaria
  const [motivoFilterType, setMotivoFilterType] = useState<'all' | 'involuntaria' | 'voluntaria'>('all');
  const [incidentsKpiSnapshot, setIncidentsKpiSnapshot] = useState<{
    incidencias: number;
    incidenciasAnterior: number;
    permisos: number;
    permisosAnterior: number;
  } | null>(null);

  const [retentionFilters, setRetentionFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: [],
    departamentos: [],
    puestos: [],
    clasificaciones: [],
    ubicaciones: []
  });
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
    if (datasetDates.length === 0) {
      return null;
    }
    const minTimestamp = Math.min(...datasetDates.map((date) => date.getTime()));
    return new Date(minTimestamp);
  }, [datasetDates]);

  const fallbackReferenceDate = useMemo(() => {
    if (datasetDates.length === 0) {
      return new Date();
    }
    const maxTimestamp = Math.max(...datasetDates.map((date) => date.getTime()));
    return new Date(maxTimestamp);
  }, [datasetDates]);

  const latestCompleteMonthStart = useMemo(() => {
    const reference = fallbackReferenceDate;
    const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const monthEnd = endOfMonth(monthStart);
    const monthIsComplete = reference.getTime() >= monthEnd.getTime();

    if (monthIsComplete) {
      return monthStart;
    }

    if (!earliestDatasetDate) {
      return monthStart;
    }

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
  }, [fallbackReferenceDate, latestCompleteMonthStart, retentionFilters]);

  const hasAppliedDefaultPeriod = useRef(false);

  useEffect(() => {
    if (data.loading || datasetDates.length === 0) {
      return;
    }

    if (hasAppliedDefaultPeriod.current) {
      return;
    }

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
    if (!computedSelectedPeriod) {
      return;
    }
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

  const currentYear = useMemo(() => {
    if (retentionFilters.years.length > 0) {
      const numericYears = retentionFilters.years.filter((year) => Number.isFinite(year));
      if (numericYears.length > 0) {
        return Math.max(...numericYears);
      }
    }
    return selectedPeriod.getFullYear();
  }, [retentionFilters.years, selectedPeriod]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/api/kpis?period=${timePeriod}&date=${selectedPeriod.toISOString()}`);
        const result = await response.json();
        
        if (result.success) {
          setData({
            kpis: result.data.kpis || [],
            plantilla: result.data.plantilla || [],
            lastUpdated: new Date(result.data.lastUpdated),
            loading: false
          });
        } else {
          throw new Error(result.error || 'API failed');
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };
    
    loadData();
  }, [timePeriod, selectedPeriod]);

  // Cargar bajas e incidencias para el resumen comparativo
  useEffect(() => {
    const loadBajasIncidencias = async () => {
      try {
        const [bajas, incidencias] = await Promise.all([
          db.getMotivosBaja(undefined, undefined, supabase),
          db.getIncidenciasCSV(undefined, undefined, supabase)
        ]);
        setBajasData(bajas);
        setIncidenciasData(incidencias);
      } catch (error) {
        console.error('Error loading bajas/incidencias:', error);
      }
    };

    loadBajasIncidencias();
  }, [supabase]);

  // Cargar datos del mapa de calor con filtros (excepto mes)
  useEffect(() => {
    const loadBajasPorMotivo = async () => {
      try {
        console.log('🔥 Loading bajas por motivo for year:', currentYear);

        // ✅ Cargar empleados y aplicar filtros (excepto mes)
        const plantilla = await db.getEmpleadosSFTP(supabase);

        // Aplicar filtros con alcance YEAR-ONLY (año sí, mes no)
        const plantillaFiltrada = applyFiltersWithScope(
          plantilla,
          {
            ...retentionFilters,
            years: [currentYear],
          },
          'year-only'
        );

        // Calcular datos del mapa de calor con plantilla filtrada
        const data = await kpiCalculator.getBajasPorMotivoYMesFromPlantilla(plantillaFiltrada, currentYear);
        setBajasPorMotivoData(data);

        console.log('🗺️ Mapa de Calor filtrado:', {
          original: plantilla.length,
          filtrado: plantillaFiltrada.length,
          año: currentYear,
          aplicaFiltros: 'Depto, Puesto, Empresa, Área (NO mes)'
        });
      } catch (error) {
        console.error('Error loading bajas por motivo data:', error);
      }
    };

    loadBajasPorMotivo();
  }, [currentYear, supabase, retentionFilters]);
  

  const loadDashboardData = useCallback(async (filter: TimeFilter = { period: timePeriod, date: selectedPeriod }, forceRefresh = false) => {
    console.log('🔥 loadDashboardData CALLED! Filter:', filter);
    
    // Apply retention filters if they are selected
    let effectiveFilter = { ...filter };
    if (retentionFilters.years.length > 0 || retentionFilters.months.length > 0) {
      console.log('🎯 Applying retention filters:', retentionFilters);
      effectiveFilter = { period: 'alltime', date: new Date() }; // Use all data when custom filters applied
    }
    
    try {
      console.log('🚀 Starting loadDashboardData with effective filter:', effectiveFilter);
      setData(prev => ({ ...prev, loading: true }));
      
      // Clear cache if user manually refreshes
      if (forceRefresh) {
        console.log('🔄 Force refresh - clearing cache');
        kpiCalculator.clearCache();
      }
      
      console.log('📊 Loading KPIs for filter:', effectiveFilter);
      const kpis = await kpiCalculator.calculateAllKPIs(effectiveFilter, supabase);
      console.log('📈 KPIs received:', kpis?.length, 'items');

      // Load empleados_sftp data for dismissal analysis
      console.log('👥 Loading empleados_sftp data...');
      const empleadosData = await db.getEmpleadosSFTP(supabase);
      console.log('✅ Loaded', empleadosData.length, 'employees from empleados_sftp');
      
      setData({
        kpis: kpis.length > 0 ? kpis : [],
        plantilla: empleadosData || [],
        lastUpdated: new Date(),
        loading: false
      });
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error in loadDashboardData:', error);
      setData(prev => ({ ...prev, plantilla: [], loading: false }));
    }
  }, [timePeriod, selectedPeriod, retentionFilters, supabase]); // Added supabase to dependencies

  // REMOVED: Duplicated useEffect moved up
  // Use shared filter util
  const filterPlantilla = (plantillaData: PlantillaRecord[]) => {
    const filtered = applyFiltersWithScope(plantillaData, retentionFilters, 'specific');
    console.log('🎯 Dashboard - Applying filters:');
    console.log('📊 Original plantilla:', plantillaData.length);
    console.log('🔍 Active filters:', retentionFilters);
    console.log('📋 Filtered plantilla:', filtered.length);
    return filtered;
  };

  // ======= Headcount (Personal) derived metrics and datasets =======
  const getAge = (fechaNacimiento?: string | null) => {
    if (!fechaNacimiento) return null;
    const d = new Date(fechaNacimiento);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return age;
  };

  const monthsBetween = (startStr?: string | null, end: Date = new Date()) => {
    if (!startStr) return 0;
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return 0;
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const total = years * 12 + months + (end.getDate() >= start.getDate() ? 0 : -1);
    return Math.max(0, total);
  };

  const plantillaFiltered = filterPlantilla(data.plantilla || []);

  const plantillaFilteredYearScope = useMemo(() => {
    if (!data.plantilla || data.plantilla.length === 0) return [];
    const scoped = applyFiltersWithScope(data.plantilla, {
      ...retentionFilters,
      includeInactive: true,
    }, 'year-only');
    console.log('📊 Plantilla (sin mes) para tendencia de incidencias:', scoped.length);
    return scoped;
  }, [data.plantilla, retentionFilters]);

  const plantillaDismissalDetail = useMemo(() => {
    if (!plantillaFilteredYearScope || plantillaFilteredYearScope.length === 0) {
      return [];
    }
    const targetYear = selectedPeriod.getFullYear();
    const targetMonth = selectedPeriod.getMonth() + 1;
    const targetKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    return plantillaFilteredYearScope.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fecha = typeof emp.fecha_baja === 'string'
        ? emp.fecha_baja.slice(0, 7)
        : new Date(emp.fecha_baja).toISOString().slice(0, 7);
      return fecha === targetKey;
    });
  }, [plantillaFilteredYearScope, selectedPeriod]);

  const plantillaFilteredGeneral = useMemo(() => {
    if (!data.plantilla || data.plantilla.length === 0) return [];
    const scoped = applyFiltersWithScope(data.plantilla, {
      ...retentionFilters,
      includeInactive: true,
    }, 'general');
    console.log('🌐 Plantilla sin filtros temporales (para acumulados):', scoped.length);
    return scoped;
  }, [data.plantilla, retentionFilters]);

  // ✅ NUEVO: Filtrar bajas e incidencias basándose en empleados filtrados
  const empleadosFiltradosIds = new Set(plantillaFiltered.map(e => e.numero_empleado || Number(e.emp_id)));
  const bajasFiltered = bajasData.filter(b => empleadosFiltradosIds.has(b.numero_empleado));
  const incidenciasFiltered = incidenciasData
    .filter((i) => empleadosFiltradosIds.has(i.emp))
    .map((i) => ({
      emp: i.emp,
      fecha: i.fecha,
      inci: i.inci ?? i.incidencia ?? '',
      incidencia: i.incidencia ?? null
    }));

  const headcountComparisonBase = plantillaFilteredGeneral.length > 0 ? plantillaFilteredGeneral : plantillaFiltered;

  const currentPeriodStart = startOfDay(new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth(), 1));
  const currentPeriodEnd = endOfMonth(currentPeriodStart);
  const previousPeriodStart = startOfDay(new Date(currentPeriodStart.getFullYear(), currentPeriodStart.getMonth() - 1, 1));
  const previousPeriodEnd = endOfMonth(previousPeriodStart);

  const isActiveOnDate = (employee: PlantillaRecord, reference: Date) => {
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

  const formatISODate = (date: Date) => format(date, 'yyyy-MM-dd');

  // Clasificación: horizontal bar
  const classCounts = (() => {
    const map = new Map<string, number>();
    plantillaFiltered.forEach(e => {
      const key = (e.clasificacion || 'Sin Clasificación').toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  })();

  // Género: horizontal bar
  const genderCounts = (() => {
    const norm = (g?: string | null) => {
      const s = (g || '').toString().trim().toUpperCase();
      if (["H", "HOMBRE", "M", "MASCULINO"].includes(s)) return "HOMBRE";
      if (["M", "MUJER", "F", "FEMENINO"].includes(s)) return "MUJER";
      return s || 'NO ESPECIFICADO';
    };
    const map = new Map<string, number>();
    plantillaFiltered.forEach(e => {
      const key = norm((e as any).genero);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  })();

  // Edad: scatter de distribución por edad (conteo por edad)
  const ageScatterData = (() => {
    const map = new Map<number, number>();
    plantillaFiltered.forEach(e => {
      const age = getAge((e as any).fecha_nacimiento);
      if (age !== null && age >= 0 && age <= 100) {
        map.set(age, (map.get(age) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([age, count]) => ({ age, count }));
  })();

  // Headcount por Departamento (barras verticales)
  const hcDeptData = (() => {
    const map = new Map<string, number>();
    activeEmployeesCurrent.forEach(e => {
      const key = e.departamento || 'Sin Departamento';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([departamento, count]) => ({ departamento, count })).sort((a,b)=> b.count - a.count);
  })();

  // Headcount por Área (barras verticales)
  const hcAreaData = (() => {
    const map = new Map<string, number>();
    activeEmployeesCurrent.forEach(e => {
      const key = e.area || 'Sin Área';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([area, count]) => ({ area, count })).sort((a,b)=> b.count - a.count);
  })();

  // Antigüedad por Área (barras horizontales apiladas por bins)
  const seniorityByArea = (() => {
    const bins = (months: number) => {
      if (months < 3) return '<3m';
      if (months < 6) return '3-6m';
      if (months < 12) return '6-12m';
      return '12m+';
    };
    const map = new Map<string, { ['<3m']: number; ['3-6m']: number; ['6-12m']: number; ['12m+']: number }>();
    activeEmployeesCurrent.forEach(e => {
      const area = e.area || 'Sin Área';
      const m = monthsBetween(e.fecha_antiguedad || e.fecha_ingreso);
      const b = bins(m);
      if (!map.has(area)) map.set(area, { '<3m': 0, '3-6m': 0, '6-12m': 0, '12m+': 0 });
      map.get(area)![b as '<3m' | '3-6m' | '6-12m' | '12m+']++;
    });
    return Array.from(map.entries()).map(([area, counts]) => ({ area, ...counts }));
  })();

  // ============================================================================
  // 🆕 FUNCIÓN REFACTORIZADA: Calcular KPIs filtrados para retención
  // Usa funciones helper centralizadas para eliminar duplicación
  // ⚠️ ACTUALIZACIÓN: Ahora TODAS las métricas usan filtros específicos
  // ============================================================================
  const getFilteredRetentionKPIs = () => {
    // Solo calcular si tenemos datos de plantilla cargados
    if (!data.plantilla || data.plantilla.length === 0) {
      console.log('🔍 No plantilla data available yet, returning empty KPIs');
      return {
        activosPromedio: 0,
        activosPromedioAnterior: 0,
        activosPromedioVariacion: 0,
        bajasTempranas: 0,
        bajasVoluntarias: 0,
        bajasVoluntariasAnterior: 0,
        bajasVoluntariasVariacion: 0,
        bajasInvoluntarias: 0,
        bajasInvoluntariasAnterior: 0,
        bajasInvoluntariasVariacion: 0,
        rotacionMensual: 0,
        rotacionMensualAnterior: 0,
        rotacionMensualVariacion: 0,
        rotacionMensualClaves: 0,
        rotacionMensualClavesAnterior: 0,
        rotacionMensualClavesVariacion: 0,
        rotacionAcumulada: 0,
        rotacionAcumuladaAnterior: 0,
        rotacionAcumuladaVariacion: 0,
        rotacionAcumuladaClaves: 0,
        rotacionAcumuladaClavesAnterior: 0,
        rotacionAcumuladaClavesVariacion: 0,
        rotacionAnioActual: 0,
        rotacionAnioActualAnterior: 0,
        rotacionAnioActualVariacion: 0,
        rotacionAnioActualClaves: 0,
        rotacionAnioActualClavesAnterior: 0,
        rotacionAnioActualClavesVariacion: 0,
      } as any;
    }

    console.log('🎯 Calculando KPIs de retención con filtros ESPECÍFICOS...');

    const filteredPlantilla = filterPlantilla(data.plantilla);

    // Para cálculos del mes actual usamos datos filtrados por año
    const longTermPlantilla =
      plantillaFilteredYearScope.length > 0
        ? plantillaFilteredYearScope
        : filteredPlantilla;

    // Para comparativos año anterior necesitamos plantilla SIN filtro de año
    // pero CON filtros de departamento, puesto, área, empresa, etc.
    const plantillaForComparison = applyFiltersWithScope(data.plantilla, {
      ...retentionFilters,
      years: [], // NO filtrar por año para permitir comparativos históricos
      includeInactive: true,
    }, 'general');

    const currentMonth = selectedPeriod.getMonth();
    const currentYear = selectedPeriod.getFullYear();
    const inicioMes = new Date(currentYear, currentMonth, 1);
    const finMes = new Date(currentYear, currentMonth + 1, 0);
    const previousReference = new Date(currentYear, currentMonth - 1, 1);
    const previousYearReference = new Date(currentYear - 1, currentMonth, 1);
    const inicioMesAnterior = new Date(previousReference.getFullYear(), previousReference.getMonth(), 1);
    const finMesAnterior = new Date(previousReference.getFullYear(), previousReference.getMonth() + 1, 0);

    // Activos promedio del mes (y comparación)
    const activosPromedioActual = calculateActivosPromedio(longTermPlantilla, inicioMes, finMes);
    const activosPromedioPrevio = calculateActivosPromedio(longTermPlantilla, inicioMesAnterior, finMesAnterior);

    // Bajas tempranas históricas (se mantiene para reportes auxiliares)
    const bajasTempranas = calculateBajasTempranas(longTermPlantilla);

    // Rotación mensual con desglose voluntaria/involuntaria
    const rotacionMensualActual = calcularRotacionConDesglose(longTermPlantilla, inicioMes, finMes);
    const rotacionMensualPrevio = calcularRotacionConDesglose(longTermPlantilla, inicioMesAnterior, finMesAnterior);

    // Rotación acumulada y YTD con sus comparativos
    // Usar plantillaForComparison para permitir comparativos con años anteriores
    const rotacionAcumuladaActual = calcularRotacionAcumulada12mConDesglose(plantillaForComparison, selectedPeriod);
    const rotacionAcumuladaPrevio = calcularRotacionAcumulada12mConDesglose(plantillaForComparison, previousYearReference);
    const rotacionYTDActual = calcularRotacionYTDConDesglose(plantillaForComparison, selectedPeriod);
    const rotacionYTDPrevio = calcularRotacionYTDConDesglose(plantillaForComparison, previousYearReference);

    const rotMensualInv = Number(rotacionMensualActual.involuntaria.toFixed(1));
    const rotMensualVol = Number(rotacionMensualActual.voluntaria.toFixed(1));
    const rotMensualTotal = Number(rotacionMensualActual.total.toFixed(1));
    const rotMensualInvPrev = Number(rotacionMensualPrevio.involuntaria.toFixed(1));
    const rotMensualVolPrev = Number(rotacionMensualPrevio.voluntaria.toFixed(1));
    const rotMensualTotalPrev = Number(rotacionMensualPrevio.total.toFixed(1));

    const rotAcumuladaInv = Number(rotacionAcumuladaActual.involuntaria.toFixed(1));
    const rotAcumuladaVol = Number(rotacionAcumuladaActual.voluntaria.toFixed(1));
    const rotAcumuladaTotal = Number(rotacionAcumuladaActual.total.toFixed(1));
    const rotAcumuladaInvPrev = Number(rotacionAcumuladaPrevio.involuntaria.toFixed(1));
    const rotAcumuladaVolPrev = Number(rotacionAcumuladaPrevio.voluntaria.toFixed(1));
    const rotAcumuladaTotalPrev = Number(rotacionAcumuladaPrevio.total.toFixed(1));

    const rotYTDInv = Number(rotacionYTDActual.involuntaria.toFixed(1));
    const rotYTDVol = Number(rotacionYTDActual.voluntaria.toFixed(1));
    const rotYTDTotal = Number(rotacionYTDActual.total.toFixed(1));
    const rotYTDInvPrev = Number(rotacionYTDPrevio.involuntaria.toFixed(1));
    const rotYTDVolPrev = Number(rotacionYTDPrevio.voluntaria.toFixed(1));
    const rotYTDTotalPrev = Number(rotacionYTDPrevio.total.toFixed(1));

    const bajasVoluntariasMes = rotacionMensualActual.bajasVoluntarias;
    const bajasVoluntariasMesPrev = rotacionMensualPrevio.bajasVoluntarias;
    const bajasInvoluntariasMes = rotacionMensualActual.bajasInvoluntarias;
    const bajasInvoluntariasMesPrev = rotacionMensualPrevio.bajasInvoluntarias;

    console.log('✅ KPIs calculados con desglose voluntario/involuntario:', {
      rotacionMensualTotal: `${rotMensualTotal}%`,
      rotacionMensualInv: `${rotMensualInv}%`,
      rotacionAcumuladaTotal: `${rotAcumuladaTotal}%`,
      rotacionYTDTotal: `${rotYTDTotal}%`
    });

    return {
      activosPromedio: Math.round(activosPromedioActual),
      activosPromedioAnterior: Math.round(activosPromedioPrevio),
      activosPromedioVariacion: calculateVariancePercentage(activosPromedioActual, activosPromedioPrevio),
      bajasTempranas,
      bajasVoluntarias: bajasVoluntariasMes,
      bajasVoluntariasAnterior: bajasVoluntariasMesPrev,
      bajasVoluntariasVariacion: calculateVariancePercentage(bajasVoluntariasMes, bajasVoluntariasMesPrev),
      bajasInvoluntarias: bajasInvoluntariasMes,
      bajasInvoluntariasAnterior: bajasInvoluntariasMesPrev,
      bajasInvoluntariasVariacion: calculateVariancePercentage(bajasInvoluntariasMes, bajasInvoluntariasMesPrev),
      rotacionMensual: rotMensualTotal,
      rotacionMensualAnterior: rotMensualTotalPrev,
      rotacionMensualVariacion: calculateVariancePercentage(rotMensualTotal, rotMensualTotalPrev),
      rotacionMensualClaves: rotMensualInv,
      rotacionMensualClavesAnterior: rotMensualInvPrev,
      rotacionMensualClavesVariacion: calculateVariancePercentage(rotMensualInv, rotMensualInvPrev),
      rotacionMensualVoluntaria: rotMensualVol,
      rotacionMensualVoluntariaAnterior: rotMensualVolPrev,
      rotacionMensualVoluntariaVariacion: calculateVariancePercentage(rotMensualVol, rotMensualVolPrev),
      rotacionAcumulada: rotAcumuladaTotal,
      rotacionAcumuladaAnterior: rotAcumuladaTotalPrev,
      rotacionAcumuladaVariacion: calculateVariancePercentage(rotAcumuladaTotal, rotAcumuladaTotalPrev),
      rotacionAcumuladaClaves: rotAcumuladaInv,
      rotacionAcumuladaClavesAnterior: rotAcumuladaInvPrev,
      rotacionAcumuladaClavesVariacion: calculateVariancePercentage(rotAcumuladaInv, rotAcumuladaInvPrev),
      rotacionAcumuladaVoluntaria: rotAcumuladaVol,
      rotacionAcumuladaVoluntariaAnterior: rotAcumuladaVolPrev,
      rotacionAcumuladaVoluntariaVariacion: calculateVariancePercentage(rotAcumuladaVol, rotAcumuladaVolPrev),
      rotacionAnioActual: rotYTDTotal,
      rotacionAnioActualAnterior: rotYTDTotalPrev,
      rotacionAnioActualVariacion: calculateVariancePercentage(rotYTDTotal, rotYTDTotalPrev),
      rotacionAnioActualClaves: rotYTDInv,
      rotacionAnioActualClavesAnterior: rotYTDInvPrev,
      rotacionAnioActualClavesVariacion: calculateVariancePercentage(rotYTDInv, rotYTDInvPrev),
      rotacionAnioActualVoluntaria: rotYTDVol,
      rotacionAnioActualVoluntariaAnterior: rotYTDVolPrev,
      rotacionAnioActualVoluntariaVariacion: calculateVariancePercentage(rotYTDVol, rotYTDVolPrev),
    } as any;
  };

  const filteredRetentionKPIs = getFilteredRetentionKPIs();
  const bajasTotalesMes =
    (filteredRetentionKPIs?.bajasVoluntarias ?? 0) +
    (filteredRetentionKPIs?.bajasInvoluntarias ?? 0);
  const bajasTotalesMesAnterior =
    (filteredRetentionKPIs?.bajasVoluntariasAnterior ?? 0) +
    (filteredRetentionKPIs?.bajasInvoluntariasAnterior ?? 0);
  const headcountKpiCards: {
    icon: ReactNode;
    kpi: KPIResult;
    secondaryRows?: { label: string; value: number; isPercent?: boolean; noWrap?: boolean; showColon?: boolean }[];
  }[] = [
    {
      icon: <Users className="h-6 w-6" />,
      kpi: {
        name: 'Activos al cierre',
        category: 'headcount',
        value: activosFinMes,
        previous_value: activosFinMesPrev,
        variance_percentage: calculateVariancePercentage(activosFinMes, activosFinMesPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd)
      }
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      kpi: {
        name: 'Ingresos (Mes)',
        category: 'headcount',
        value: ingresosMes,
        previous_value: ingresosMesPrev,
        variance_percentage: calculateVariancePercentage(ingresosMes, ingresosMesPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd)
      }
    },
    {
      icon: <UserMinus className="h-6 w-6" />,
      kpi: {
        name: 'Bajas (Mes)',
        category: 'retention',
        value: bajasTotalesMes,
        previous_value: bajasTotalesMesAnterior,
        variance_percentage: calculateVariancePercentage(bajasTotalesMes, bajasTotalesMesAnterior),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd)
      },
      secondaryRows: [
        { label: 'Voluntarias', value: filteredRetentionKPIs?.bajasVoluntarias ?? 0 },
        { label: 'Involuntarias', value: filteredRetentionKPIs?.bajasInvoluntarias ?? 0 }
      ]
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      kpi: {
        name: 'Antigüedad Promedio (meses)',
        category: 'headcount',
        value: antigPromMesesActual,
        previous_value: antigPromMesesPrev,
        variance_percentage: calculateVariancePercentage(antigPromMesesActual, antigPromMesesPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd)
      }
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      kpi: {
        name: 'Empl. < 3 meses',
        category: 'headcount',
        value: menores3mActual,
        previous_value: menores3mPrev,
        variance_percentage: calculateVariancePercentage(menores3mActual, menores3mPrev),
        period_start: formatISODate(currentPeriodStart),
        period_end: formatISODate(currentPeriodEnd)
      }
    }
  ];
  const periodLabel = format(selectedPeriod, "MMMM yyyy", { locale: es });
  const lastUpdatedDisplay = !data.loading
    ? format(data.lastUpdated, "dd/MM/yyyy HH:mm")
    : null;
  const tabTriggerClass = refreshEnabled
    ? "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
    : undefined;
  const elevatedCardClass = refreshEnabled
    ? "rounded-2xl border border-brand-border/50 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface/80"
    : undefined;
  const elevatedCardHeaderClass = refreshEnabled ? "pb-6" : undefined;
  const elevatedTitleClass = refreshEnabled ? "font-heading text-brand-ink dark:text-white" : undefined;
  const elevatedSubtleTextClass = refreshEnabled ? "text-brand-ink/70 dark:text-brand-ink/70" : undefined;
  const visualizationExportContextValue = useMemo(
    () => ({
      filters: retentionFilters,
      filtersSummary: filtersSummary?.length ? filtersSummary : null,
      filtersDetailedLines,
      filtersCount,
      periodLabel,
      lastUpdatedLabel: lastUpdatedDisplay,
    }),
    [
      retentionFilters,
      filtersSummary,
      filtersDetailedLines,
      filtersCount,
      periodLabel,
      lastUpdatedDisplay,
    ]
  );

  return (
    <div
      className={cn(
        "min-h-screen transition-colors bg-background text-foreground",
        refreshEnabled && "bg-brand-surface text-brand-ink"
      )}
    >
      <header
        className={cn(
          "border-b bg-card",
          refreshEnabled && (isDark
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
                          refreshEnabled && (isDark
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
                        refreshEnabled && (isDark
                          ? "border-brand-border/40 bg-brand-surface/70 text-brand-ink/80"
                          : "border-brand-border/50 bg-white/90 text-brand-ink/70")
                      )}
                    >
                      Período: {periodLabel}
                    </span>
                    {lastUpdatedDisplay ? (
                      <>
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[11px]",
                            refreshEnabled && (isDark
                              ? "border-brand-border/40 bg-brand-surface/70 text-brand-ink/80"
                              : "border-brand-border/50 bg-white/90 text-brand-ink/70")
                          )}
                        >
                          Actualizado: {lastUpdatedDisplay}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[11px]",
                            refreshEnabled && (isDark
                              ? "border-brand-border/40 bg-brand-surface/70 text-brand-ink/80"
                              : "border-brand-border/50 bg-white/90 text-brand-ink/70")
                          )}
                        >
                          {data.kpis.length} KPIs
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex h-4 w-24 animate-pulse rounded-full bg-brand-muted" />
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
                      • Actualizado: {lastUpdatedDisplay}
                      • {data.kpis.length} KPIs
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
            {isAdmin && (
              <TabsTrigger value="trends" className={tabTriggerClass}>
                Tendencias
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab - Nuevo Resumen Comparativo */}
          <TabsContent value="overview" className="space-y-6">
            <SummaryComparison
              plantilla={plantillaFiltered}
              plantillaYearScope={plantillaFilteredYearScope}
              bajas={bajasFiltered}
              incidencias={incidenciasFiltered}
              selectedYear={retentionFilters.years.length > 0 ? retentionFilters.years[0] : undefined}
              selectedMonth={retentionFilters.months.length > 0 ? retentionFilters.months[0] : undefined}
              referenceDate={selectedPeriod}
              retentionKPIsOverride={{
                rotacionMensual: filteredRetentionKPIs.rotacionMensual,
                rotacionMensualAnterior: filteredRetentionKPIs.rotacionMensualAnterior,
                rotacionAcumulada: filteredRetentionKPIs.rotacionAcumulada,
                rotacionAcumuladaAnterior: filteredRetentionKPIs.rotacionAcumuladaAnterior,
                rotacionAnioActual: filteredRetentionKPIs.rotacionAnioActual,
                rotacionAnioActualAnterior: filteredRetentionKPIs.rotacionAnioActualAnterior
              }}
              incidentsKPIsOverride={incidentsKpiSnapshot || undefined}
              refreshEnabled={refreshEnabled}
            />
          </TabsContent>

          {/* Headcount Tab */}
          <TabsContent value="headcount" className="space-y-6">
            {/* 5 KPIs solicitados */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              {refreshEnabled && data.loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <KPICardSkeleton key={`headcount-skeleton-${index}`} refreshEnabled />
                ))
              ) : (
                headcountKpiCards.map(({ kpi, icon, secondaryRows }, index) => (
                  <KPICard
                    key={`headcount-kpi-${index}`}
                    refreshEnabled={refreshEnabled}
                    kpi={kpi}
                    icon={icon}
                    secondaryRows={secondaryRows}
                  />
                ))
              )}
            </div>

            {/* Gráficas intermedias: Clasificación, Género, Edad (scatter) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>Clasificación</CardTitle>
                  <p className={cn("text-sm text-muted-foreground", elevatedSubtleTextClass)}>
                    Confianza vs Sindicalizado
                  </p>
                </CardHeader>
                <CardContent>
                  <VisualizationContainer
                    title="Clasificación del personal"
                    type="chart"
                    className="h-[340px] w-full"
                    filename="clasificacion-personal"
                  >
                    {(fullscreen) => (
                      <div style={{ width: '100%', height: fullscreen ? 420 : 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={classCounts}
                            margin={{ top: 32, right: 32, bottom: 40, left: 16 }}
                          >
                            <CartesianGrid
                              strokeDasharray="4 8"
                              stroke={chartGridColor}
                              strokeOpacity={0.65}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: chartAxisColor }}
                              interval={0}
                              tickMargin={12}
                            />
                            <YAxis
                              type="number"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: chartSecondaryAxisColor }}
                              allowDecimals={false}
                              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                            />
                            <Tooltip
                              cursor={{ fill: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.08)" }}
                              contentStyle={{
                                borderRadius: 12,
                                borderColor: chartTooltipBorder,
                                backgroundColor: chartTooltipBg,
                                boxShadow: chartTooltipShadow,
                              }}
                              labelStyle={{ fontWeight: 600, color: chartTooltipLabelColor }}
                              formatter={(value: number) => value.toLocaleString("es-MX")}
                            />
                            <defs>
                              <linearGradient id="classificationGradient" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#0ea5e9" />
                                <stop offset="100%" stopColor="#6366f1" />
                              </linearGradient>
                            </defs>
                            <Bar
                              dataKey="value"
                              fill="url(#classificationGradient)"
                              radius={[12, 12, 0, 0]}
                              maxBarSize={68}
                            >
                              <LabelList
                                dataKey="value"
                                position="top"
                                formatter={(value: number) => value.toLocaleString("es-MX")}
                                style={{ fill: chartTooltipLabelColor, fontWeight: 600, fontSize: 12 }}
                                offset={14}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </VisualizationContainer>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>Género</CardTitle>
                  <p className={cn("text-sm text-muted-foreground", elevatedSubtleTextClass)}>
                    Hombre / Mujer
                  </p>
                </CardHeader>
                <CardContent>
                  <VisualizationContainer
                    title="Distribución por género"
                    type="chart"
                    className="h-[340px] w-full"
                    filename="genero-personal"
                  >
                    {(fullscreen) => (
                      <div style={{ width: '100%', height: fullscreen ? 420 : 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={genderCounts}
                            margin={{ top: 32, right: 32, bottom: 40, left: 16 }}
                          >
                            <CartesianGrid
                              strokeDasharray="4 8"
                              stroke={chartGridColor}
                              strokeOpacity={0.65}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: chartAxisColor }}
                              interval={0}
                              tickMargin={12}
                            />
                            <YAxis
                              type="number"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: chartSecondaryAxisColor }}
                              allowDecimals={false}
                              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                            />
                            <Tooltip
                              cursor={{ fill: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.08)" }}
                              contentStyle={{
                                borderRadius: 12,
                                borderColor: chartTooltipBorder,
                                backgroundColor: chartTooltipBg,
                                boxShadow: chartTooltipShadow,
                              }}
                              labelStyle={{ fontWeight: 600, color: chartTooltipLabelColor }}
                              formatter={(value: number) => value.toLocaleString("es-MX")}
                            />
                            <defs>
                              <linearGradient id="genderGradient" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#34d399" />
                                <stop offset="100%" stopColor="#22d3ee" />
                              </linearGradient>
                            </defs>
                            <Bar
                              dataKey="value"
                              fill="url(#genderGradient)"
                              radius={[12, 12, 0, 0]}
                              maxBarSize={68}
                            >
                              <LabelList
                                dataKey="value"
                                position="top"
                                formatter={(value: number) => value.toLocaleString("es-MX")}
                                style={{ fill: chartTooltipLabelColor, fontWeight: 600, fontSize: 12 }}
                                offset={14}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </VisualizationContainer>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>
                    Distribución por Edad
                  </CardTitle>
                  <p className={cn("text-sm text-muted-foreground", elevatedSubtleTextClass)}>
                    Gráfica de dispersión
                  </p>
                </CardHeader>
                <CardContent>
                  <VisualizationContainer
                    title="Distribución por edad"
                    type="chart"
                    className="h-[300px] w-full"
                    filename="distribucion-edad"
                  >
                    {(fullscreen) => (
                      <div style={{ width: '100%', height: fullscreen ? 340 : 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis
                          dataKey="age"
                          name="Edad"
                          unit=" años"
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: chartAxisColor, fontSize: 12 }}
                        />
                        <YAxis
                          dataKey="count"
                          name="# Empleados"
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: chartSecondaryAxisColor, fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3', stroke: isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.45)' }}
                          contentStyle={{
                            borderRadius: 12,
                            borderColor: chartTooltipBorder,
                            backgroundColor: chartTooltipBg,
                            boxShadow: chartTooltipShadow
                          }}
                          labelStyle={{ fontWeight: 600, color: chartTooltipLabelColor }}
                        />
                        <Scatter data={ageScatterData} fill="#ef4444" />
                      </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </VisualizationContainer>
                </CardContent>
              </Card>
            </div>

            {/* Gráficas inferiores: HC por Depto, HC por Área, Antigüedad por Área */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>
                    HC por Departamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VisualizationContainer
                    title="Headcount por departamento"
                    type="chart"
                    className="h-[320px] w-full"
                    filename="hc-por-departamento"
                  >
                    {(fullscreen) => (
                      <div style={{ width: '100%', height: fullscreen ? 360 : 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hcDeptData} margin={{ left: 16, right: 16, top: 8, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis dataKey="departamento" tick={false} height={20} />
                        <YAxis allowDecimals={false} tick={{ fill: chartAxisColor, fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.08)" }}
                          contentStyle={{
                            borderRadius: 12,
                            borderColor: chartTooltipBorder,
                            backgroundColor: chartTooltipBg,
                            boxShadow: chartTooltipShadow
                          }}
                          labelStyle={{ fontWeight: 600, color: chartTooltipLabelColor }}
                          formatter={(value: number) => value.toLocaleString("es-MX")}
                        />
                        <Bar dataKey="count" fill="#6366f1" />
                      </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </VisualizationContainer>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>HC por Área</CardTitle>
                </CardHeader>
                <CardContent>
                  <VisualizationContainer
                    title="Headcount por área"
                    type="chart"
                    className="h-[320px] w-full"
                    filename="hc-por-area"
                  >
                    {(fullscreen) => (
                      <div style={{ width: '100%', height: fullscreen ? 360 : 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hcAreaData} margin={{ left: 16, right: 16, top: 8, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis dataKey="area" tick={false} height={20} />
                        <YAxis allowDecimals={false} tick={{ fill: chartAxisColor, fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.08)" }}
                          contentStyle={{
                            borderRadius: 12,
                            borderColor: chartTooltipBorder,
                            backgroundColor: chartTooltipBg,
                            boxShadow: chartTooltipShadow
                          }}
                          labelStyle={{ fontWeight: 600, color: chartTooltipLabelColor }}
                          formatter={(value: number) => value.toLocaleString("es-MX")}
                        />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </VisualizationContainer>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>
                    Antigüedad por Área
                  </CardTitle>
                  <p className={cn("text-sm text-muted-foreground", elevatedSubtleTextClass)}>
                    Barras horizontales por grupos
                  </p>
                </CardHeader>
                <CardContent>
                  <VisualizationContainer
                    title="Antigüedad por área"
                    type="chart"
                    className="h-[320px] w-full"
                    filename="antiguedad-por-area"
                  >
                    {(fullscreen) => (
                      <div style={{ width: '100%', height: fullscreen ? 360 : 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={seniorityByArea} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: chartAxisColor, fontSize: 12 }} />
                        <YAxis dataKey="area" type="category" width={120} tick={{ fill: chartAxisColor, fontSize: 12 }} />
                        <Legend wrapperStyle={{ color: chartAxisColor }} />
                        <Tooltip
                          cursor={{ fill: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.06)" }}
                          contentStyle={{
                            borderRadius: 12,
                            borderColor: chartTooltipBorder,
                            backgroundColor: chartTooltipBg,
                            boxShadow: chartTooltipShadow
                          }}
                          labelStyle={{ fontWeight: 600, color: chartTooltipLabelColor }}
                          formatter={(value: number) => value.toLocaleString("es-MX")}
                        />
                        <Bar dataKey="<3m" stackId="a" fill="#22c55e" />
                        <Bar dataKey="3-6m" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="6-12m" stackId="a" fill="#a855f7" />
                        <Bar dataKey="12m+" stackId="a" fill="#ef4444" />
                      </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </VisualizationContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-6">
            <IncidentsTab
              plantilla={plantillaFiltered}
              plantillaAnual={plantillaFilteredYearScope}
              currentYear={retentionFilters.years.length > 0 ? retentionFilters.years[0] : undefined}
              selectedMonths={retentionFilters.months}
              initialIncidencias={incidenciasData}
              onKPIsUpdate={setIncidentsKpiSnapshot}
            />
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-6">
            {/* Explicación de rotación involuntaria */}
            <div
              className={cn(
                "rounded border-l-4 border-blue-400 bg-gray-50 p-2 text-xs text-gray-500 dark:bg-gray-800",
                refreshEnabled && "border-brand-border/80 bg-brand-surface-accent/70 text-brand-ink/70"
              )}
            >
              <strong>Rotación involuntaria:</strong> Rescisión por desempeño, Rescisión por disciplina, Término del contrato
            </div>

            {/* 5 KPIs Principales de Retención con filtros aplicados */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {refreshEnabled && data.loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <KPICardSkeleton key={`retention-skeleton-${index}`} refreshEnabled />
                ))
              ) : (
                <>
                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Activos Promedio',
                      category: 'headcount',
                      value: filteredRetentionKPIs.activosPromedio,
                      previous_value: filteredRetentionKPIs.activosPromedioAnterior,
                      variance_percentage: filteredRetentionKPIs.activosPromedioVariacion,
                      period_start: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth(), 1)
                        .toISOString()
                        .split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<Users className="h-6 w-6" />}
                  />

                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Bajas Voluntarias',
                      category: 'retention',
                      value: filteredRetentionKPIs.bajasVoluntarias,
                      previous_value: filteredRetentionKPIs.bajasVoluntariasAnterior,
                      variance_percentage: filteredRetentionKPIs.bajasVoluntariasVariacion,
                      period_start: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth(), 1)
                        .toISOString()
                        .split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<UserMinus className="h-6 w-6" />}
                    secondaryLabel="Bajas Involuntarias"
                    secondaryValue={filteredRetentionKPIs.bajasInvoluntarias}
                  />

                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Rotación Mensual',
                      category: 'retention',
                      value: filteredRetentionKPIs.rotacionMensual,
                      previous_value: filteredRetentionKPIs.rotacionMensualAnterior,
                      variance_percentage: filteredRetentionKPIs.rotacionMensualVariacion,
                      period_start: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth(), 1)
                        .toISOString()
                        .split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<TrendingUp className="h-6 w-6" />}
                    secondaryRows={[
                      {
                        label: 'Rot. Involuntaria',
                        value: filteredRetentionKPIs.rotacionMensualClaves,
                        isPercent: true,
                        noWrap: true
                      },
                      {
                        label: 'Rot. Voluntaria',
                        value: filteredRetentionKPIs.rotacionMensualVoluntaria,
                        isPercent: true,
                        noWrap: true
                      }
                    ]}
                  />

                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Rotación Acumulada',
                      category: 'retention',
                      value: filteredRetentionKPIs.rotacionAcumulada,
                      previous_value: filteredRetentionKPIs.rotacionAcumuladaAnterior,
                      variance_percentage: filteredRetentionKPIs.rotacionAcumuladaVariacion,
                      period_start: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() - 11, 1)
                        .toISOString()
                        .split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<TrendingDown className="h-6 w-6" />}
                    secondaryRows={[
                      {
                        label: 'Rot. Involuntaria',
                        value: filteredRetentionKPIs.rotacionAcumuladaClaves,
                        isPercent: true,
                        noWrap: true
                      },
                      {
                        label: 'Rot. Voluntaria',
                        value: filteredRetentionKPIs.rotacionAcumuladaVoluntaria,
                        isPercent: true,
                        noWrap: true
                      }
                    ]}
                  />

                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Rotación Año Actual',
                      category: 'retention',
                      value: filteredRetentionKPIs.rotacionAnioActual,
                      previous_value: filteredRetentionKPIs.rotacionAnioActualAnterior,
                      variance_percentage: filteredRetentionKPIs.rotacionAnioActualVariacion,
                      period_start: new Date(selectedPeriod.getFullYear(), 0, 1).toISOString().split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<TrendingDown className="h-6 w-6" />}
                    secondaryRows={[
                      {
                        label: 'Rot. Involuntaria',
                        value: filteredRetentionKPIs.rotacionAnioActualClaves,
                        isPercent: true,
                        noWrap: true
                      },
                      {
                        label: 'Rot. Voluntaria',
                        value: filteredRetentionKPIs.rotacionAnioActualVoluntaria,
                        isPercent: true,
                        noWrap: true
                      }
                    ]}
                  />
                </>
              )}
            </div>

            {/* Toggle para filtrar visualizaciones por motivo */}
            <div
              className={cn(
                "flex items-center justify-center gap-4 rounded-lg border bg-card p-4",
                refreshEnabled && (isDark
                  ? "rounded-2xl border-brand-border/40 bg-brand-surface/70 shadow-brand/10"
                  : "rounded-2xl border-brand-border/40 bg-brand-surface-accent/60 shadow-brand/10")
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  refreshEnabled && (isDark
                    ? "font-heading text-xs uppercase tracking-[0.12em] text-brand-ink"
                    : "font-heading text-xs uppercase tracking-[0.12em] text-brand-ink/80")
                )}
              >
                Filtrar gráficas de rotación:
              </span>
              <div className="flex gap-2">
                {([
                  { key: 'all', label: 'Rotación Total' },
                  { key: 'voluntaria', label: 'Rotación Voluntaria' },
                  { key: 'involuntaria', label: 'Rotación Involuntaria' }
                ] as const).map(option => (
                  <Button
                    key={option.key}
                    variant={motivoFilterType === option.key ? (refreshEnabled ? 'cta' : 'default') : 'outline'}
                    size="sm"
                    onClick={() => setMotivoFilterType(option.key)}
                    className={cn(
                      "transition-all",
                      refreshEnabled && "rounded-full font-semibold",
                      motivoFilterType === option.key && refreshEnabled && "shadow-brand"
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
                ubicaciones: retentionFilters.ubicaciones
              }}
              motivoFilter={motivoFilterType}
            />

            {/* Mapa de Calor de Bajas por Motivo */}
            <BajasPorMotivoHeatmap
              data={bajasPorMotivoData}
              year={currentYear}
            />

            <AbandonosOtrosSummary referenceDate={selectedPeriod} />

            {/* Tabla de Bajas por Motivo y Listado Detallado */}
            <DismissalReasonsTable
              plantilla={plantillaDismissalDetail.length > 0 ? plantillaDismissalDetail : plantillaFiltered}
              refreshEnabled={refreshEnabled}
            />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <ModelTrendsTab />
          </TabsContent>
          </Tabs>
        </main>
      </VisualizationExportProvider>
    </div>
  );
}
