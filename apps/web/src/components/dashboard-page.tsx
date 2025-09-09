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
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [retentionFilters, setRetentionFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: [],
    departments: [],
    areas: []
  });

  const loadDashboardData = useCallback(async (filter: TimeFilter = { period: timePeriod, date: selectedPeriod }, forceRefresh = false) => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      // Clear cache if user manually refreshes
      if (forceRefresh) {
        console.log('🔄 Force refresh - clearing cache');
        kpiCalculator.clearCache();
      }
      
      console.log('📊 Loading KPIs for filter:', filter);
      const kpis = await kpiCalculator.calculateAllKPIs(filter);
      
      // Load plantilla data for dismissal analysis
      console.log('👥 Loading plantilla data...');
      const { data: plantilla, error: plantillaError } = await supabase
        .from('PLANTILLA')
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
  }, [timePeriod, selectedPeriod]);

  // Load data when period or date changes
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      
      console.log('🔄 Loading data for period:', timePeriod, 'date:', selectedPeriod);
      
      try {
        await loadDashboardData({ period: timePeriod, date: selectedPeriod });
      } catch (error) {
        console.error('❌ Load error:', error);
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [timePeriod, selectedPeriod, loadDashboardData]);

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
    
    // Filtrar por departamento
    if (retentionFilters.departments.length > 0) {
      filteredData = filteredData.filter(emp => 
        retentionFilters.departments.includes(emp.departamento)
      );
    }
    
    
    // Filtrar por área
    if (retentionFilters.areas.length > 0) {
      filteredData = filteredData.filter(emp => 
        retentionFilters.areas.includes(emp.area)
      );
    }
    
    // Filtrar por fecha (años y meses)
    if (retentionFilters.years.length > 0 || retentionFilters.months.length > 0) {
      filteredData = filteredData.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        
        // Verificar si el empleado estuvo activo en algún momento en los periodos seleccionados
        const yearMatch = retentionFilters.years.length === 0 || 
          retentionFilters.years.some(year => {
            return fechaIngreso.getFullYear() <= year && 
                   (!fechaBaja || fechaBaja.getFullYear() >= year);
          });
        
        const monthMatch = retentionFilters.months.length === 0 ||
          retentionFilters.months.some(month => {
            // Verificar si el empleado estuvo activo en ese mes (cualquier año)
            const startOfSelectedMonth = new Date(2024, month - 1, 1); // Usar 2024 como año base
            const endOfSelectedMonth = new Date(2024, month, 0);
            
            return (fechaIngreso <= endOfSelectedMonth) && 
                   (!fechaBaja || fechaBaja >= startOfSelectedMonth);
          });
        
        return yearMatch && monthMatch;
      });
    }
    
    return filteredData;
  };

  // Función para calcular KPIs filtrados para retención
  const getFilteredRetentionKPIs = () => {
    const filteredPlantilla = applyRetentionFilters(data.plantilla);
    
    // Calcular Activos Promedio con filtros
    const activosActuales = filteredPlantilla.filter(emp => emp.activo).length;
    
    // Calcular Bajas con filtros (mes actual)
    const currentMonth = selectedPeriod.getMonth();
    const currentYear = selectedPeriod.getFullYear();
    const bajasDelMes = filteredPlantilla.filter(emp => {
      if (!emp.fecha_baja || emp.activo) return false;
      const fechaBaja = new Date(emp.fecha_baja);
      return fechaBaja.getMonth() === currentMonth && fechaBaja.getFullYear() === currentYear;
    }).length;
    
    // Calcular Rotación Mensual con filtros
    const rotacionMensual = activosActuales > 0 ? (bajasDelMes / activosActuales) * 100 : 0;
    
    return {
      activosPromedio: activosActuales,
      bajas: bajasDelMes,
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
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Período: {format(selectedPeriod, 'MMMM yyyy')}
              {!data.loading && (
                <span className="ml-2">
                  • Actualizado: {format(data.lastUpdated, 'dd/MM/yyyy HH:mm')}
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
            {(retentionFilters.years.length > 0 || retentionFilters.months.length > 0 || 
              retentionFilters.departments.length > 0 || retentionFilters.areas.length > 0) && (
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
                    {retentionFilters.departments.map(dept => (
                      <span key={dept} className="bg-green-100 px-2 py-1 rounded text-xs">{dept}</span>
                    ))}
                    {retentionFilters.areas.map(area => (
                      <span key={area} className="bg-orange-100 px-2 py-1 rounded text-xs">{area}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4 KPIs Principales de Retención con filtros aplicados */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Activos Promedio Filtrado */}
              <KPICard 
                kpi={{
                  id: 'activos-prom-filtered',
                  name: 'Activos Prom',
                  category: 'headcount',
                  value: filteredRetentionKPIs.activosPromedio,
                  unit: 'empleados',
                  period: timePeriod,
                  date: selectedPeriod,
                  description: 'Empleados activos promedio (con filtros)'
                }} 
                icon={<Users className="h-6 w-6" />}
              />
              
              {/* Bajas Filtradas */}
              <KPICard 
                kpi={{
                  id: 'bajas-filtered',
                  name: 'Bajas',
                  category: 'retention',
                  value: filteredRetentionKPIs.bajas,
                  unit: 'empleados',
                  period: timePeriod,
                  date: selectedPeriod,
                  description: 'Bajas del período (con filtros)'
                }} 
                icon={<UserMinus className="h-6 w-6" />}
              />

              {/* Rotación Mensual Filtrada */}
              <KPICard 
                kpi={{
                  id: 'rotacion-filtered',
                  name: 'Rotación Mensual',
                  category: 'retention',
                  value: filteredRetentionKPIs.rotacionMensual,
                  unit: '%',
                  period: timePeriod,
                  date: selectedPeriod,
                  description: 'Rotación mensual (con filtros)'
                }} 
                icon={<UserMinus className="h-6 w-6" />}
              />

              {/* Bajas Tempranas (original) */}
              {categorized.retention
                .filter(kpi => kpi.name === 'Bajas Tempranas')
                .map((kpi) => (
                  <KPICard 
                    key={kpi.name} 
                    kpi={kpi} 
                    icon={<UserMinus className="h-6 w-6" />}
                  />
                ))}
            </div>
            
            {/* 3 Gráficas Especializadas de Retención */}
            <RetentionCharts currentDate={selectedPeriod} />

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