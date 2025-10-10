"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter } from 'recharts';
import { KPICard, KPICardSkeleton } from "./kpi-card";
import { AIInsights } from "./ai-insights";
import { RetroactiveAdjustment } from "./retroactive-adjustment";
import { DismissalReasonsTable } from "./dismissal-reasons-table";
import { BajasPorMotivoHeatmap } from "./bajas-por-motivo-heatmap";
import { RetentionCharts } from "./retention-charts";
import IncidentsTab from "./incidents-tab";
import { CorrelationMatrix } from "./correlation-matrix";
import { RetentionFilterPanel } from "./filter-panel";
import { SummaryComparison } from "./summary-comparison";
import { UserMenu } from "./user-menu";
import { applyRetentionFilters, type RetentionFilterOptions } from "@/lib/filters/retention";
import { kpiCalculator, type KPIResult, type TimeFilter } from "@/lib/kpi-calculator";
import { db, type PlantillaRecord } from "@/lib/supabase";
import { createBrowserClient } from "@/lib/supabase-client";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { isMotivoClave } from "@/lib/normalizers";
import { cn } from "@/lib/utils";
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

  // Removed unused sanitizeChip function
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    plantilla: [],
    lastUpdated: new Date(),
    loading: true
  });
  const [selectedPeriod] = useState<Date>(new Date());
  const [timePeriod] = useState<TimePeriod>('alltime');
  const [bajasPorMotivoData, setBajasPorMotivoData] = useState<BajasPorMotivoData[]>([]);
  const [bajasData, setBajasData] = useState<any[]>([]);
  const [incidenciasData, setIncidenciasData] = useState<any[]>([]);

  const [retentionFilters, setRetentionFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: [],
    departamentos: [],
    puestos: [],
    clasificaciones: [],
    ubicaciones: []
  });

  // Calcular año actual basado en filtros
  const currentYear = retentionFilters.years.length > 0
    ? retentionFilters.years[0] // Usar primer año seleccionado
    : new Date().getFullYear(); // Fallback al año actual

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

  // Cargar datos del mapa de calor
  useEffect(() => {
    const loadBajasPorMotivo = async () => {
      try {
        console.log('🔥 Loading bajas por motivo for year:', currentYear);
        const data = await kpiCalculator.getBajasPorMotivoYMes(currentYear, supabase);
        setBajasPorMotivoData(data);
      } catch (error) {
        console.error('Error loading bajas por motivo data:', error);
      }
    };

    loadBajasPorMotivo();
  }, [currentYear, supabase]);
  

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

  const getTrendIcon = (variance?: number) => {
    if (!variance || Math.abs(variance) < 1) return null;
    return variance > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getTrendColor = (variance?: number) => {
    if (!variance || Math.abs(variance) < 1) return "secondary";
    return variance > 0 ? "destructive" : "default";
  };

  const categorizeKPIs = (kpis: KPIResult[]) => {
    const categorized = {
      headcount: kpis.filter(kpi => kpi.category === 'headcount'),
      incidents: kpis.filter(kpi => kpi.category === 'incidents'),
      retention: kpis.filter(kpi => kpi.category === 'retention'),
      productivity: kpis.filter(kpi => kpi.category === 'productivity'),
      period: kpis.filter(kpi => kpi.category === 'period')
    };
    console.log('Categorized KPIs:', categorized);
    return categorized;
  };

  const categorized = categorizeKPIs(data.kpis);

  // Use shared filter util
  const filterPlantilla = (plantillaData: PlantillaRecord[]) => {
    const filtered = applyRetentionFilters(plantillaData, retentionFilters);
    console.log('🎯 Dashboard - Applying filters:');
    console.log('📊 Original plantilla:', plantillaData.length);
    console.log('🔍 Active filters:', retentionFilters);
    console.log('📋 Filtered plantilla:', filtered.length);
    return filtered;
  };

  // Special filter for 12-month rolling calculations (no month restriction)
  // Removed unused filterPlantillaFor12Months function

  // No filters for general company rotation (should match table value)
  const noFiltersForGeneralRotation = (plantillaData: PlantillaRecord[]) => {
    // Use ALL employees for general company rotation calculation
    return plantillaData;
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
  const activosNow = plantillaFiltered.filter(e => e.activo).length;
  const bajasTotal = plantillaFiltered.filter(e => !!e.fecha_baja).length;
  // Ingresos: contrataciones históricas y del mes actual
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ingresosHistorico = plantillaFiltered.filter(e => {
    const fi = new Date(e.fecha_ingreso);
    return !isNaN(fi.getTime());
  }).length;
  const ingresosMes = plantillaFiltered.filter(e => {
    const fi = new Date(e.fecha_ingreso);
    return !isNaN(fi.getTime()) && fi >= startMonth && fi <= endMonth;
  }).length;
  // Antigüedad promedio (meses) sobre activos
  const activeEmployees = plantillaFiltered.filter(e => e.activo);
  const antigPromMeses = activeEmployees.length > 0 
    ? Math.round(activeEmployees.reduce((acc, e) => acc + monthsBetween(e.fecha_antiguedad || e.fecha_ingreso), 0) / activeEmployees.length)
    : 0;
  // Empleados con antigüedad < 3 meses (activos)
  const menores3m = activeEmployees.filter(e => monthsBetween(e.fecha_antiguedad || e.fecha_ingreso) < 3).length;

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
    activeEmployees.forEach(e => {
      const key = e.departamento || 'Sin Departamento';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([departamento, count]) => ({ departamento, count })).sort((a,b)=> b.count - a.count);
  })();

  // Headcount por Área (barras verticales)
  const hcAreaData = (() => {
    const map = new Map<string, number>();
    activeEmployees.forEach(e => {
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
    activeEmployees.forEach(e => {
      const area = e.area || 'Sin Área';
      const m = monthsBetween(e.fecha_antiguedad || e.fecha_ingreso);
      const b = bins(m);
      if (!map.has(area)) map.set(area, { '<3m': 0, '3-6m': 0, '6-12m': 0, '12m+': 0 });
      map.get(area)![b as '<3m' | '3-6m' | '6-12m' | '12m+']++;
    });
    return Array.from(map.entries()).map(([area, counts]) => ({ area, ...counts }));
  })();

  // Función para calcular KPIs filtrados para retención
  const getFilteredRetentionKPIs = () => {
    // Solo calcular si tenemos datos de plantilla cargados
    if (!data.plantilla || data.plantilla.length === 0) {
      console.log('🔍 No plantilla data available yet, returning empty KPIs');
      return {
        activosPromedio: 0,
        bajas: 0,
        bajasTempranas: 0,
        rotacionMensual: 0,
        rotacionAcumulada: 0,
        rotacionAnioActual: 0,
        // secundarios
        bajasClaves: 0,
        rotacionMensualClaves: 0,
        rotacionAcumuladaClaves: 0,
        rotacionAnioActualClaves: 0,
      } as any;
    }
    
    const filteredPlantilla = filterPlantilla(data.plantilla);
    
    // Calcular Activos actuales
    // const activosActuales = filteredPlantilla.filter(emp => emp.activo).length;
    
    // Calcular TODAS las Bajas (empleados con fecha_baja)
    const bajasTotal = filteredPlantilla.filter(emp => {
      return emp.fecha_baja !== null && emp.fecha_baja !== undefined;
    }).length;
    
    // Calcular Bajas del periodo actual para rotación mensual
    const currentMonth = selectedPeriod.getMonth();
    const currentYear = selectedPeriod.getFullYear();
    const inicioMes = new Date(currentYear, currentMonth, 1);
    const finMes = new Date(currentYear, currentMonth + 1, 0);
    
    // Bajas del mes actual
    const bajasDelMes = filteredPlantilla.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fechaBaja = new Date(emp.fecha_baja);
      return fechaBaja >= inicioMes && fechaBaja <= finMes;
    }).length;
    const bajasDelMesClaves = filteredPlantilla.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fechaBaja = new Date(emp.fecha_baja);
      return fechaBaja >= inicioMes && fechaBaja <= finMes && isMotivoClave((emp as any).motivo_baja);
    }).length;
    
    // Calcular empleados al inicio y fin del mes para el promedio
    const empleadosInicioMes = filteredPlantilla.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      return fechaIngreso <= inicioMes && (!fechaBaja || fechaBaja > inicioMes);
    }).length;
    
    const empleadosFinMes = filteredPlantilla.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      return fechaIngreso <= finMes && (!fechaBaja || fechaBaja > finMes);
    }).length;
    
    const activosPromedio = (empleadosInicioMes + empleadosFinMes) / 2;
    
    console.log('📊 Empleados inicio mes:', empleadosInicioMes);
    console.log('📊 Empleados fin mes:', empleadosFinMes);
    console.log('📊 Activos promedio:', activosPromedio);
    console.log('📉 Bajas del mes:', bajasDelMes);
    console.log('📉 Bajas totales histórico:', bajasTotal);
    
    // Calcular Bajas Tempranas (menos de 3 meses)
    const bajasTempranas = filteredPlantilla.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = new Date(emp.fecha_baja);
      const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return mesesTrabajados < 3;
    }).length;
    
    // Calcular Rotación Mensual = (Bajas del mes / Activos promedio) * 100
    const rotacionMensual = activosPromedio > 0 ? (bajasDelMes / activosPromedio) * 100 : 0;
    const rotacionMensualClaves = activosPromedio > 0 ? (bajasDelMesClaves / activosPromedio) * 100 : 0;
    
    // Calcular Rotación Acumulada (últimos 12 meses) - GENERAL DE EMPRESA
    const filteredPlantilla12m = noFiltersForGeneralRotation(data.plantilla);
    const hace12Meses = new Date(currentYear, currentMonth - 11, 1);
    const finPeriodo12m = new Date(currentYear, currentMonth + 1, 0);

    const bajasUltimos12Meses = filteredPlantilla12m.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fechaBaja = new Date(emp.fecha_baja);
      return fechaBaja >= hace12Meses && fechaBaja <= finPeriodo12m;
    }).length;
    const bajasUltimos12MesesClaves = filteredPlantilla12m.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fechaBaja = new Date(emp.fecha_baja);
      return fechaBaja >= hace12Meses && fechaBaja <= finPeriodo12m && isMotivoClave((emp as any).motivo_baja);
    }).length;

    // Calcular promedio de activos para los 12 meses (sin restricción de mes)
    const empleadosInicio12m = filteredPlantilla12m.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      return fechaIngreso <= hace12Meses && (!fechaBaja || fechaBaja > hace12Meses);
    }).length;

    const empleadosFin12m = filteredPlantilla12m.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      return fechaIngreso <= finMes && (!fechaBaja || fechaBaja > finMes);
    }).length;

    const activosPromedio12m = (empleadosInicio12m + empleadosFin12m) / 2;

    const rotacionAcumulada = activosPromedio12m > 0 ? (bajasUltimos12Meses / activosPromedio12m) * 100 : 0;
    const rotacionAcumuladaClaves = activosPromedio12m > 0 ? (bajasUltimos12MesesClaves / activosPromedio12m) * 100 : 0;

    // Rotación Año Actual (Ene a mes actual) - general de empresa
    const filteredPlantillaYTD = noFiltersForGeneralRotation(data.plantilla);
    const inicioAnio = new Date(currentYear, 0, 1);
    const finAnioPeriodo = finMes;

    const bajasYTD = filteredPlantillaYTD.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fechaBaja = new Date(emp.fecha_baja);
      return fechaBaja >= inicioAnio && fechaBaja <= finAnioPeriodo;
    }).length;
    const bajasYTDClaves = filteredPlantillaYTD.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fechaBaja = new Date(emp.fecha_baja);
      return fechaBaja >= inicioAnio && fechaBaja <= finAnioPeriodo && isMotivoClave((emp as any).motivo_baja);
    }).length;

    const empleadosInicioYTD = filteredPlantillaYTD.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      return fechaIngreso <= inicioAnio && (!fechaBaja || fechaBaja > inicioAnio);
    }).length;
    const empleadosFinYTD = filteredPlantillaYTD.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      return fechaIngreso <= finAnioPeriodo && (!fechaBaja || fechaBaja > finAnioPeriodo);
    }).length;
    const activosPromedioYTD = (empleadosInicioYTD + empleadosFinYTD) / 2;
    const rotacionAnioActual = activosPromedioYTD > 0 ? (bajasYTD / activosPromedioYTD) * 100 : 0;
    const rotacionAnioActualClaves = activosPromedioYTD > 0 ? (bajasYTDClaves / activosPromedioYTD) * 100 : 0;

    // Bajas Clave (total sobre data filtrada)
    const bajasClavesTotal = filteredPlantilla.filter(emp => emp.fecha_baja && isMotivoClave((emp as any).motivo_baja)).length;
    
    
    return {
      activosPromedio: Math.round(activosPromedio),
      bajas: bajasTotal,
      bajasTempranas: bajasTempranas,
      rotacionMensual: Number(rotacionMensual.toFixed(1)),
      rotacionAcumulada: Number(rotacionAcumulada.toFixed(1)),
      rotacionAnioActual: Number(rotacionAnioActual.toFixed(1)),
      // secundarios
      bajasClaves: bajasClavesTotal,
      rotacionMensualClaves: Number(rotacionMensualClaves.toFixed(1)),
      rotacionAcumuladaClaves: Number(rotacionAcumuladaClaves.toFixed(1)),
      rotacionAnioActualClaves: Number(rotacionAnioActualClaves.toFixed(1)),
    } as any;
  };

  const filteredRetentionKPIs = getFilteredRetentionKPIs();
  const periodLabel =
    timePeriod === "alltime"
      ? "Todos los períodos"
      : format(selectedPeriod, "MMMM yyyy", { locale: es });
  const lastUpdatedDisplay = !data.loading
    ? format(data.lastUpdated, "dd/MM/yyyy HH:mm")
    : null;
  const tabTriggerClass = refreshEnabled
    ? "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
    : undefined;
  const elevatedCardClass = refreshEnabled
    ? "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow"
    : undefined;
  const elevatedCardHeaderClass = refreshEnabled ? "pb-6" : undefined;
  const elevatedTitleClass = refreshEnabled ? "font-heading text-brand-ink" : undefined;
  const elevatedSubtleTextClass = refreshEnabled ? "text-brand-ink/70" : undefined;

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        refreshEnabled ? "bg-brand-surface text-brand-ink" : "bg-gray-50 dark:bg-gray-900"
      )}
    >
      <header
        className={cn(
          "border-b bg-white dark:bg-gray-800",
          refreshEnabled && "border-brand-border/60 bg-white/90 shadow-sm backdrop-blur"
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
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-ink/60">
                Panel de Talento
              </span>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-heading text-4xl tracking-tight text-brand-ink">
                      Dashboard MRM · KPIs de RRHH
                    </h1>
                    {data.loading ? (
                      <span className="inline-flex h-7 w-28 animate-pulse rounded-full bg-brand-muted" />
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-none bg-brand-surface-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-ink/80"
                      >
                        Datos al día
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink/60">
                    <span className="inline-flex items-center gap-2 rounded-full border border-brand-border/50 bg-white/80 px-4 py-1 text-[11px] text-brand-ink/70">
                      Período: {periodLabel}
                    </span>
                    {lastUpdatedDisplay ? (
                      <>
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-border/50 bg-white/80 px-4 py-1 text-[11px] text-brand-ink/70">
                          Actualizado: {lastUpdatedDisplay}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-border/50 bg-white/80 px-4 py-1 text-[11px] text-brand-ink/70">
                          {data.kpis.length} KPIs
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-border/50 bg-white/80 px-4 py-1 text-[11px] text-brand-ink/70">
                          {data.plantilla.length} empleados
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex h-4 w-24 animate-pulse rounded-full bg-brand-muted" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end">
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
                      • {data.kpis.length} KPIs • {data.plantilla.length} empleados
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
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
          className={refreshEnabled ? "mx-auto max-w-5xl" : undefined}
        />
      </section>

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
              Retención
            </TabsTrigger>
            <TabsTrigger value="trends" className={tabTriggerClass}>
              Tendencias
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className={tabTriggerClass}>
              IA Generativa
            </TabsTrigger>
            <TabsTrigger value="adjustments" className={tabTriggerClass}>
              Ajustes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Nuevo Resumen Comparativo */}
          <TabsContent value="overview" className="space-y-6">
            <SummaryComparison
              plantilla={data.plantilla}
              bajas={bajasData}
              incidencias={incidenciasData}
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
                <>
                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{ name: 'Activos', category: 'headcount', value: activosNow, period_start: '', period_end: '' }}
                    icon={<Users className="h-6 w-6" />}
                  />
                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{ name: 'Bajas', category: 'headcount', value: bajasTotal, period_start: '', period_end: '' }}
                    icon={<UserMinus className="h-6 w-6" />}
                  />
                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Ingresos',
                      category: 'headcount',
                      value: ingresosHistorico,
                      period_start: '1900-01-01',
                      period_end: new Date().toISOString().slice(0, 10)
                    }}
                    icon={<TrendingUp className="h-6 w-6" />}
                  />
                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{ name: 'Antigüedad Promedio (meses)', category: 'headcount', value: antigPromMeses, period_start: '', period_end: '' }}
                    icon={<Calendar className="h-6 w-6" />}
                  />
                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{ name: 'Empl. < 3 meses', category: 'headcount', value: menores3m, period_start: '', period_end: '' }}
                    icon={<Calendar className="h-6 w-6" />}
                  />
                </>
              )}
            </div>

            {/* Gráficas intermedias: Clasificación, Género, Edad (scatter) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>Clasificación</CardTitle>
                  <p className={cn("text-sm text-gray-600", elevatedSubtleTextClass)}>
                    Confianza vs Sindicalizado
                  </p>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={classCounts} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>Género</CardTitle>
                  <p className={cn("text-sm text-gray-600", elevatedSubtleTextClass)}>
                    Hombre / Mujer
                  </p>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={genderCounts} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>
                    Distribución por Edad
                  </CardTitle>
                  <p className={cn("text-sm text-gray-600", elevatedSubtleTextClass)}>
                    Gráfica de dispersión
                  </p>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <ScatterChart margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="age" name="Edad" unit=" años" type="number" allowDecimals={false} />
                        <YAxis dataKey="count" name="# Empleados" type="number" allowDecimals={false} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={ageScatterData} fill="#ef4444" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
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
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={hcDeptData} margin={{ left: 16, right: 16, top: 8, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="departamento" tick={false} height={20} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>HC por Área</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={hcAreaData} margin={{ left: 16, right: 16, top: 8, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="area" tick={false} height={20} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(elevatedCardClass)}>
                <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
                  <CardTitle className={cn("text-base", elevatedTitleClass)}>
                    Antigüedad por Área
                  </CardTitle>
                  <p className={cn("text-sm text-gray-600", elevatedSubtleTextClass)}>
                    Barras horizontales por grupos
                  </p>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={seniorityByArea} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="area" type="category" width={120} />
                        <Legend />
                        <Tooltip />
                        <Bar dataKey="<3m" stackId="a" fill="#22c55e" />
                        <Bar dataKey="3-6m" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="6-12m" stackId="a" fill="#a855f7" />
                        <Bar dataKey="12m+" stackId="a" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-6">
            <IncidentsTab plantilla={filterPlantilla(data.plantilla || [])} currentYear={currentYear} />
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-6">
            {/* Explicación de rotación voluntaria */}
            <div
              className={cn(
                "rounded border-l-4 border-blue-400 bg-gray-50 p-2 text-xs text-gray-500 dark:bg-gray-800",
                refreshEnabled && "border-brand-border/80 bg-brand-surface-accent/70 text-brand-ink/70"
              )}
            >
              <strong>Rotación voluntaria:</strong> Rescisión por desempeño, Rescisión por disciplina, Término del contrato
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
                      name: 'Bajas',
                      category: 'retention',
                      value: filteredRetentionKPIs.bajas,
                      period_start: '1900-01-01',
                      period_end: new Date().toISOString().split('T')[0]
                    }}
                    icon={<UserMinus className="h-6 w-6" />}
                    secondaryLabel="Voluntaria"
                    secondaryValue={filteredRetentionKPIs.bajasClaves}
                  />

                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Rotación Mensual',
                      category: 'retention',
                      value: filteredRetentionKPIs.rotacionMensual,
                      period_start: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth(), 1)
                        .toISOString()
                        .split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<TrendingUp className="h-6 w-6" />}
                    secondaryLabel="Motivos clave"
                    secondaryValue={filteredRetentionKPIs.rotacionMensualClaves}
                    secondaryIsPercent
                  />

                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Rotación Acumulada',
                      category: 'retention',
                      value: filteredRetentionKPIs.rotacionAcumulada,
                      period_start: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() - 11, 1)
                        .toISOString()
                        .split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<TrendingDown className="h-6 w-6" />}
                    secondaryLabel="Motivos clave"
                    secondaryValue={filteredRetentionKPIs.rotacionAcumuladaClaves}
                    secondaryIsPercent
                  />

                  <KPICard
                    refreshEnabled={refreshEnabled}
                    kpi={{
                      name: 'Rotación Año Actual',
                      category: 'retention',
                      value: filteredRetentionKPIs.rotacionAnioActual,
                      period_start: new Date(selectedPeriod.getFullYear(), 0, 1).toISOString().split('T')[0],
                      period_end: new Date(selectedPeriod.getFullYear(), selectedPeriod.getMonth() + 1, 0)
                        .toISOString()
                        .split('T')[0]
                    }}
                    icon={<TrendingDown className="h-6 w-6" />}
                    secondaryLabel="Motivos clave"
                    secondaryValue={filteredRetentionKPIs.rotacionAnioActualClaves}
                    secondaryIsPercent
                  />
                </>
              )}
            </div>
            
            {/* 3 Gráficas Especializadas de Retención */}
            <RetentionCharts currentDate={selectedPeriod} currentYear={currentYear} />

            {/* Mapa de Calor de Bajas por Motivo */}
            <BajasPorMotivoHeatmap
              data={bajasPorMotivoData}
              year={currentYear}
            />

            {/* Tabla de Bajas por Motivo y Listado Detallado */}
            <DismissalReasonsTable
              plantilla={data.plantilla || []}
              refreshEnabled={refreshEnabled}
            />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <CorrelationMatrix year={currentYear} />
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-6">
            <AIInsights kpis={data.kpis} period={timePeriod} />
          </TabsContent>

          {/* Retroactive Adjustments Tab */}
          <TabsContent value="adjustments" className="space-y-6">
            <RetroactiveAdjustment 
              kpis={data.kpis} 
              onAdjustmentMade={() => loadDashboardData({ period: timePeriod, date: selectedPeriod }, true)}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
