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
  Filter,
} from "lucide-react";
import { KPICard } from "./kpi-card";
import { KPIChart } from "./kpi-chart";
import { AIInsights } from "./ai-insights";
import { RetroactiveAdjustment } from "./retroactive-adjustment";
import { DismissalReasonsTable } from "./dismissal-reasons-table";
import { RetentionCharts } from "./retention-charts";
import { RetentionFilterPanel, type RetentionFilterOptions } from "./retention-filter-panel";
import { kpiCalculator, type KPIResult, type TimeFilter } from "@/lib/kpi-calculator";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardData {
  kpis: KPIResult[];
  plantilla: any[];
  lastUpdated: Date;
  loading: boolean;
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'annual' | 'last12months' | 'alltime';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    kpis: [],
    plantilla: [],
    lastUpdated: new Date(),
    loading: true
  });
  const [selectedPeriod] = useState<Date>(new Date());
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('alltime');
  
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
  
  
  const [retentionFilters, setRetentionFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: []
  });

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
      const kpis = await kpiCalculator.calculateAllKPIs(effectiveFilter);
      console.log('📈 KPIs received:', kpis?.length, 'items');
      
      // Load plantilla data for dismissal analysis
      console.log('👥 Loading plantilla data...');
      const { data: plantilla, error: plantillaError } = await supabase
        .from('plantilla')
        .select('*');
        
      if (plantillaError) {
        console.warn('⚠️ Error loading plantilla:', plantillaError);
      }
      
      setData({
        kpis: kpis.length > 0 ? kpis : [],
        plantilla: plantilla || [],
        lastUpdated: new Date(),
        loading: false
      });
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error in loadDashboardData:', error);
      setData(prev => ({ ...prev, plantilla: [], loading: false }));
    }
  }, [timePeriod, selectedPeriod, retentionFilters]); // Added retentionFilters to dependencies

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

  // Función para filtrar datos basado en los filtros de retención
  const applyRetentionFilters = (plantillaData: any[]) => {
    if (!plantillaData) return [];
    
    let filteredData = [...plantillaData];
    
    // Filtrar por año (fecha de ingreso o fecha de baja)
    if (retentionFilters.years.length > 0) {
      filteredData = filteredData.filter(emp => {
        const ingresoYear = new Date(emp.fecha_ingreso).getFullYear();
        const bajaYear = emp.fecha_baja ? new Date(emp.fecha_baja).getFullYear() : null;
        
        return retentionFilters.years.includes(ingresoYear) || 
               (bajaYear && retentionFilters.years.includes(bajaYear));
      });
    }
    
    // Filtrar por mes (fecha de ingreso o fecha de baja)
    if (retentionFilters.months.length > 0) {
      filteredData = filteredData.filter(emp => {
        const ingresoMonth = new Date(emp.fecha_ingreso).getMonth() + 1;
        const bajaMonth = emp.fecha_baja ? new Date(emp.fecha_baja).getMonth() + 1 : null;
        
        return retentionFilters.months.includes(ingresoMonth) || 
               (bajaMonth && retentionFilters.months.includes(bajaMonth));
      });
    }
    
    // Filtrar por fecha (años y meses) - versión corregida
    if (retentionFilters.years.length > 0 || retentionFilters.months.length > 0) {
      filteredData = filteredData.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        
        // Si hay filtros de año y mes, verificar combinaciones año-mes
        if (retentionFilters.years.length > 0 && retentionFilters.months.length > 0) {
          return retentionFilters.years.some(year => {
            return retentionFilters.months.some(month => {
              // Verificar si el empleado estuvo activo durante este año-mes específico
              const startOfPeriod = new Date(year, month - 1, 1);
              const endOfPeriod = new Date(year, month, 0);
              
              return (fechaIngreso <= endOfPeriod) && 
                     (!fechaBaja || fechaBaja >= startOfPeriod);
            });
          });
        }
        
        // Si solo hay filtros de año
        if (retentionFilters.years.length > 0 && retentionFilters.months.length === 0) {
          return retentionFilters.years.some(year => {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31);
            
            return (fechaIngreso <= endOfYear) && 
                   (!fechaBaja || fechaBaja >= startOfYear);
          });
        }
        
        // Si solo hay filtros de mes (cualquier año)
        if (retentionFilters.months.length > 0 && retentionFilters.years.length === 0) {
          return retentionFilters.months.some(month => {
            // Verificar en cualquier año si el empleado estuvo activo en ese mes
            const currentYear = new Date().getFullYear();
            for (let year = 2024; year <= currentYear; year++) {
              const startOfPeriod = new Date(year, month - 1, 1);
              const endOfPeriod = new Date(year, month, 0);
              
              if ((fechaIngreso <= endOfPeriod) && 
                  (!fechaBaja || fechaBaja >= startOfPeriod)) {
                return true;
              }
            }
            return false;
          });
        }
        
        return true;
      });
    }
    
    return filteredData;
  };

  // Función para calcular KPIs filtrados para retención
  const getFilteredRetentionKPIs = () => {
    // Solo calcular si tenemos datos de plantilla cargados
    if (!data.plantilla || data.plantilla.length === 0) {
      console.log('🔍 No plantilla data available yet, returning empty KPIs');
      return {
        activosPromedio: 0,
        bajas: 0,
        rotacionMensual: 0
      };
    }
    
    const filteredPlantilla = applyRetentionFilters(data.plantilla);
    
    console.log('🔍 Calculating filtered KPIs:');
    console.log('📊 Total employees in plantilla:', data.plantilla.length);
    console.log('📊 Filtered employees:', filteredPlantilla.length);
    console.log('🎯 Active filters:', retentionFilters);
    
    // Calcular Activos Promedio con filtros
    const activosActuales = filteredPlantilla.filter(emp => emp.activo).length;
    
    // Calcular Bajas usando los filtros en lugar de selectedPeriod
    let bajasTotal = 0;
    
    if (retentionFilters.years.length > 0 && retentionFilters.months.length > 0) {
      // Si hay filtros específicos de año y mes, calcular bajas para esas combinaciones
      for (const year of retentionFilters.years) {
        for (const month of retentionFilters.months) {
          const bajasEnPeriodo = filteredPlantilla.filter(emp => {
            if (!emp.fecha_baja || emp.activo) return false;
            const fechaBaja = new Date(emp.fecha_baja);
            return fechaBaja.getMonth() === (month - 1) && fechaBaja.getFullYear() === year;
          }).length;
          bajasTotal += bajasEnPeriodo;
        }
      }
    } else {
      // Si no hay filtros específicos, usar el período actual (comportamiento original)
      const currentMonth = selectedPeriod.getMonth();
      const currentYear = selectedPeriod.getFullYear();
      bajasTotal = filteredPlantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaBaja = new Date(emp.fecha_baja);
        return fechaBaja.getMonth() === currentMonth && fechaBaja.getFullYear() === currentYear;
      }).length;
    }
    
    console.log('📉 Bajas calculated:', bajasTotal);
    console.log('👥 Activos calculated:', activosActuales);
    
    // Calcular Rotación Mensual con filtros
    const rotacionMensual = activosActuales > 0 ? (bajasTotal / activosActuales) * 100 : 0;
    
    return {
      activosPromedio: activosActuales,
      bajas: bajasTotal,
      rotacionMensual: Number(rotacionMensual.toFixed(2))
    };
  };

  const filteredRetentionKPIs = getFilteredRetentionKPIs();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard MRM - KPIs de RRHH
              {data.loading && (
                <span className="ml-3 text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Cargando datos...
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Período: {timePeriod === 'alltime' ? 'Todos los períodos' : format(selectedPeriod, 'MMMM yyyy')}
              {!data.loading && (
                <span className="ml-2">
                  • Actualizado: {format(data.lastUpdated, 'dd/MM/yyyy HH:mm')}
                  • {data.kpis.length} KPIs • {data.plantilla.length} empleados
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Información del dashboard - filtros van abajo */}
          </div>
        </div>
      </div>

      {/* Filtros debajo del header */}
      <div className="px-6 pb-2">
        <RetentionFilterPanel 
          onFiltersChange={setRetentionFilters}
        />
      </div>


      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="headcount">Personal</TabsTrigger>
            <TabsTrigger value="incidents">Incidencias</TabsTrigger>
            <TabsTrigger value="retention">Retención</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
            <TabsTrigger value="ai-insights">IA Generativa</TabsTrigger>
            <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.kpis.slice(0, 4).map((kpi) => (
                <Card key={kpi.name} className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {kpi.name}
                      </CardTitle>
                      {getTrendIcon(kpi.variance_percentage)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">
                        {kpi.category === 'costs' ? `$${kpi.value.toLocaleString()}` : kpi.value.toLocaleString()}
                      </div>
                      {kpi.variance_percentage !== undefined && (
                        <Badge variant={getTrendColor(kpi.variance_percentage)}>
                          {kpi.variance_percentage > 0 ? '+' : ''}{kpi.variance_percentage.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    {kpi.target && (
                      <div className="mt-1 text-xs text-gray-500">
                        Meta: {kpi.target.toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enhanced Charts - 3 types per category */}
            <div className="space-y-8">
              {/* Headcount Charts */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  📊 Análisis de Personal - Múltiples Perspectivas
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Tendencias</CardTitle>
                      <p className="text-sm text-gray-600">Evolución temporal</p>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.headcount} 
                        type="trend" 
                        height={250}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Distribución</CardTitle>
                      <p className="text-sm text-gray-600">Proporción por métrica</p>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.headcount} 
                        type="pie" 
                        height={250}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Comparativo</CardTitle>
                      <p className="text-sm text-gray-600">Actual vs anterior</p>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.headcount} 
                        type="stacked-bar" 
                        height={250}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Incidents Charts */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  ⚠️ Análisis de Incidencias - Múltiples Perspectivas
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Barras Acumuladas</CardTitle>
                      <p className="text-sm text-gray-600">Comparación apilada</p>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.incidents} 
                        type="stacked-bar" 
                        height={250}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Distribución Circular</CardTitle>
                      <p className="text-sm text-gray-600">Proporción de incidentes</p>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.incidents} 
                        type="pie" 
                        height={250}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Tendencia Área</CardTitle>
                      <p className="text-sm text-gray-600">Evolución de incidentes</p>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.incidents} 
                        type="area" 
                        height={250}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Summary Overview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  📈 Resumen Ejecutivo - Vista General
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Métricas de Retención</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.retention} 
                        type="line" 
                        height={300}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Productividad</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <KPIChart 
                        data={categorized.productivity} 
                        type="bar" 
                        height={300}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Headcount Tab */}
          <TabsContent value="headcount" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {categorized.headcount.map((kpi) => (
                <KPICard 
                  key={kpi.name} 
                  kpi={kpi} 
                  icon={<Users className="h-6 w-6" />}
                />
              ))}
            </div>
            
            {/* 3 Chart Types for Headcount */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tendencias</CardTitle>
                  <p className="text-sm text-gray-600">Evolución temporal</p>
                </CardHeader>
                <CardContent>
                  <KPIChart 
                    data={categorized.headcount} 
                    type="trend" 
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Distribución</CardTitle>
                  <p className="text-sm text-gray-600">Proporción por métrica</p>
                </CardHeader>
                <CardContent>
                  <KPIChart 
                    data={categorized.headcount} 
                    type="pie" 
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Comparativo</CardTitle>
                  <p className="text-sm text-gray-600">Actual vs anterior</p>
                </CardHeader>
                <CardContent>
                  <KPIChart 
                    data={categorized.headcount} 
                    type="stacked-bar" 
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {categorized.incidents.map((kpi) => (
                <KPICard 
                  key={kpi.name} 
                  kpi={kpi} 
                  icon={<Calendar className="h-6 w-6" />}
                />
              ))}
            </div>
            
            {/* 3 Chart Types for Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tendencias</CardTitle>
                  <p className="text-sm text-gray-600">Evolución temporal</p>
                </CardHeader>
                <CardContent>
                  <KPIChart 
                    data={categorized.incidents} 
                    type="trend" 
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Distribución</CardTitle>
                  <p className="text-sm text-gray-600">Proporción por métrica</p>
                </CardHeader>
                <CardContent>
                  <KPIChart 
                    data={categorized.incidents} 
                    type="pie" 
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Comparativo</CardTitle>
                  <p className="text-sm text-gray-600">Actual vs anterior</p>
                </CardHeader>
                <CardContent>
                  <KPIChart 
                    data={categorized.incidents} 
                    type="stacked-bar" 
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-6">
            {/* Mostrar filtros aplicados */}
            {(retentionFilters.years.length > 0 || retentionFilters.months.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filtros aplicados:</span>
                  <div className="flex flex-wrap gap-1">
                    {retentionFilters.years.map(year => (
                      <span key={year} className="bg-blue-100 px-2 py-1 rounded text-xs">{year}</span>
                    ))}
                    {retentionFilters.months.map(month => (
                      <span key={month} className="bg-blue-100 px-2 py-1 rounded text-xs">
                        {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][month-1]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5 KPIs Principales de Retención con filtros aplicados */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Activos Promedio */}
              <KPICard 
                kpi={{
                  id: 'activos-prom-filtered',
                  name: 'Activos Promedio',
                  category: 'headcount',
                  value: filteredRetentionKPIs.activosPromedio,
                  unit: 'empleados',
                  period: timePeriod,
                  date: selectedPeriod,
                  description: 'Promedio de empleados activos'
                }} 
                icon={<Users className="h-6 w-6" />}
              />
              
              {/* Bajas */}
              <KPICard 
                kpi={{
                  id: 'bajas-filtered',
                  name: 'Bajas',
                  category: 'retention',
                  value: filteredRetentionKPIs.bajas,
                  unit: 'empleados',
                  period: timePeriod,
                  date: selectedPeriod,
                  description: 'Total de bajas en el período'
                }} 
                icon={<UserMinus className="h-6 w-6" />}
              />
              
              {/* Bajas Tempranas */}
              <KPICard 
                kpi={{
                  id: 'bajas-tempranas-filtered',
                  name: 'Bajas Tempranas',
                  category: 'retention',
                  value: categorized.retention.find(k => k.name === 'Bajas Tempranas')?.value || 0,
                  unit: 'empleados',
                  period: timePeriod,
                  date: selectedPeriod,
                  description: 'Bajas con menos de 3 meses'
                }} 
                icon={<UserMinus className="h-6 w-6" />}
              />

              {/* Rotación Mensual */}
              <KPICard 
                kpi={{
                  id: 'rotacion-filtered',
                  name: 'Rotación Mensual',
                  category: 'retention',
                  value: filteredRetentionKPIs.rotacionMensual,
                  unit: '%',
                  period: timePeriod,
                  date: selectedPeriod,
                  description: 'Porcentaje de rotación mensual'
                }} 
                icon={<TrendingUp className="h-6 w-6" />}
              />
              
              {/* Rotación Acumulada */}
              <KPICard 
                kpi={{
                  id: 'rotacion-acumulada-filtered',
                  name: 'Rotación Acumulada',
                  category: 'retention',
                  value: data.kpis.find(k => k.name === 'Rotación Acumulada')?.value || 0,
                  unit: '%',
                  period: '12 meses',
                  date: selectedPeriod,
                  description: 'Rotación últimos 12 meses'
                }} 
                icon={<TrendingDown className="h-6 w-6" />}
              />
            </div>
            
            {/* 3 Gráficas Especializadas de Retención */}
            <RetentionCharts currentDate={selectedPeriod} filters={retentionFilters} />

            {/* Tabla de Bajas por Motivo y Listado Detallado */}
            <DismissalReasonsTable plantilla={applyRetentionFilters(data.plantilla || [])} />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Tendencias</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comparación mes a mes de todos los indicadores
                </p>
              </CardHeader>
              <CardContent>
                <KPIChart 
                  data={data.kpis} 
                  type="line" 
                  height={500}
                  showAll={true}
                />
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
}