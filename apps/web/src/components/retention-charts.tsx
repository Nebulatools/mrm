"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db, type PlantillaRecord } from '@/lib/supabase';
import { createBrowserClient } from '@/lib/supabase-client';
import { format, subMonths, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { filterByMotivo } from '@/lib/utils/kpi-helpers';
import { applyFiltersWithScope } from '@/lib/filters/filters';
//

interface MonthlyRetentionData {
  mes: string;
  year: number;
  month: number;
  rotacionPorcentaje: number;
  rotacionAcumulada12m: number;
  bajas: number;
  activos: number;
  activosProm: number;
  
  // Temporalidad
  bajasMenor3m: number;
  bajas3a6m: number;
  bajas6a12m: number;
  bajasMas12m: number;
}

interface YearlyComparisonData {
  mes: string;
  [key: string]: number | string;
}

interface RetentionFilters {
  years: number[];
  months: number[];
  departamentos?: string[];
  puestos?: string[];
  clasificaciones?: string[];
  empresas?: string[];
  areas?: string[];
  ubicaciones?: string[];
}

interface RetentionChartsProps {
  currentDate?: Date;
  currentYear?: number;
  filters?: RetentionFilters;
  motivoFilter?: 'involuntaria' | 'voluntaria';
}

export function RetentionCharts({ currentDate = new Date(), currentYear, filters, motivoFilter = 'involuntaria' }: RetentionChartsProps) {
  // Create authenticated Supabase client for RLS filtering
  const supabase = createBrowserClient();

  const [monthlyData, setMonthlyData] = useState<MonthlyRetentionData[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<YearlyComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    loadMonthlyRetentionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, currentYear, supabase, motivoFilter, filters]);

  const loadMonthlyRetentionData = async () => {
    try {
      setLoading(true);
      console.log('🔄 RetentionCharts: Loading monthly retention data...');

      // Cargar empleados SFTP una sola vez para todos los meses (optimización)
      let plantilla = await db.getEmpleadosSFTP(supabase);
      console.log('👥 Empleados SFTP loaded:', plantilla?.length, 'records');
      if (!plantilla) {
        throw new Error('No plantilla data found');
      }

      // ✅ Aplicar filtros generales (sin año/mes) usando helper centralizado
      if (filters) {
        const scopedFilters = {
          years: filters.years || [],
          months: filters.months || [],
          departamentos: filters.departamentos,
          puestos: filters.puestos,
          clasificaciones: filters.clasificaciones,
          empresas: filters.empresas,
          areas: filters.areas,
          ubicaciones: filters.ubicaciones,
          includeInactive: true
        };

        const filteredByScope = applyFiltersWithScope(plantilla, scopedFilters, 'general');

        console.log('🔍 Filtros aplicados a RetentionCharts (GENERAL):', {
          original: plantilla.length,
          filtrado: filteredByScope.length,
          departamentos: filters.departamentos?.length || 0,
          puestos: filters.puestos?.length || 0,
          empresas: filters.empresas?.length || 0,
          areas: filters.areas?.length || 0
        });

        plantilla = filteredByScope;
      }

      // Filtrar por motivo usando función centralizada
      plantilla = filterByMotivo(plantilla, motivoFilter);
      
      // Detectar el rango de años con datos reales de bajas - DINÁMICO
      const hoy = new Date();
      const añoActual = hoy.getFullYear();
      
      const bajasConFecha = plantilla.filter(emp => emp.fecha_baja);
      const años = new Set<number>();
      
      bajasConFecha.forEach(emp => {
        if (emp.fecha_baja) {
          const fechaBaja = new Date(emp.fecha_baja);
          const año = fechaBaja.getFullYear();
          // Solo incluir años con datos reales (no futuros)
          if (año >= 2022 && fechaBaja <= hoy) {
            años.add(año);
          }
        }
      });
      
      // Si no hay bajas, usar solo el año actual
      const years = años.size > 0 ? Array.from(años).sort() : [añoActual];
      console.log('📅 Years with dismissal data:', years);
      
      // Generar datos para todos los años con bajas - SOLO MESES CON DATOS
      const allMonthsData: MonthlyRetentionData[] = [];
      
      for (const year of years) {
        for (let month = 0; month < 12; month++) {
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);
          
          // NO incluir meses futuros
          if (startDate > hoy) {
            continue;
          }
          
          const monthData = await calculateMonthlyRetention(startDate, endDate, plantilla);
          allMonthsData.push({
            ...monthData,
            year,
            month: month + 1
          });
        }
      }
      
      // Calcular rotación acumulada de 12 meses móviles para cada punto
      for (let i = 0; i < allMonthsData.length; i++) {
        const rotacionAcumulada12m = calculateRolling12MonthRotation(allMonthsData, i, plantilla);
        allMonthsData[i].rotacionAcumulada12m = rotacionAcumulada12m;
      }
      
      // No aplicar filtros - mostrar siempre todos los datos históricos (gráficas generales)
      let filteredMonthsData = allMonthsData;
      
      // Preparar datos para comparación por año (año filtrado vs anterior)
      const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const selectedYear = currentYear || new Date().getFullYear();
      const previousYear = selectedYear - 1;
      const lastTwoYears = [previousYear, selectedYear]; // Año anterior y filtrado
      
      const comparisonData: YearlyComparisonData[] = monthNames.map((monthName, index) => {
        const dataByYear: YearlyComparisonData = {
          mes: monthName
        };
        
        // Agregar datos para cada año disponible
        lastTwoYears.forEach(year => {
          const monthData = allMonthsData.find(d => d.year === year && d.month === index + 1);
          if (monthData) {
            dataByYear[`rotacion${year}`] = monthData.rotacionAcumulada12m;
            dataByYear[`bajas${year}`] = monthData.bajas;
            dataByYear[`activos${year}`] = monthData.activos;
          }
        });
        
        return dataByYear;
      });
      
      setMonthlyData(filteredMonthsData);
      setYearlyComparison(comparisonData);
      setAvailableYears(lastTwoYears);
    } catch (error) {
      console.error('Error loading monthly retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRolling12MonthRotation = (monthsData: MonthlyRetentionData[], currentIndex: number, plantilla: PlantillaRecord[]): number => {
    try {
      const currentMonthData = monthsData[currentIndex];
      if (!currentMonthData) return 0;
      
      const currentMonthDate = new Date(currentMonthData.year, currentMonthData.month - 1, 1);
      const startDate12m = subMonths(currentMonthDate, 11);
      const endDate12m = endOfMonth(currentMonthDate);

      const plantillaFiltrada = plantilla;

      // Contar todas las bajas en el período de 12 meses
      const bajasEn12Meses = plantillaFiltrada.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaBaja = new Date(emp.fecha_baja);
        return fechaBaja >= startDate12m && fechaBaja <= endDate12m;
      }).length;

      // Calcular promedio de empleados activos en el período de 12 meses
      const activosInicioRango = plantillaFiltrada.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= startDate12m && (!fechaBaja || fechaBaja > startDate12m);
      }).length;

      const activosFinRango = plantillaFiltrada.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= endDate12m && (!fechaBaja || fechaBaja > endDate12m);
      }).length;

      const promedioActivos12m = (activosInicioRango + activosFinRango) / 2;
      const rotacionAcumulada = promedioActivos12m > 0 ? (bajasEn12Meses / promedioActivos12m) * 100 : 0;
      
      return Number(rotacionAcumulada.toFixed(2));
    } catch (error) {
      console.error('Error calculating rolling 12-month rotation:', error);
      return 0;
    }
  };

  const calculateMonthlyRetention = async (startDate: Date, endDate: Date, plantilla: PlantillaRecord[]): Promise<MonthlyRetentionData> => {
    try {
      // Plantilla ya filtrada por opciones del panel; solo filtrar por fecha ingreso <= fin de mes
      const plantillaFiltered = plantilla.filter(emp => new Date(emp.fecha_ingreso) <= endDate);

      // Empleados al inicio y fin del mes para calcular promedio correcto
      const empleadosInicioMes = plantillaFiltered.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= startDate && (!fechaBaja || fechaBaja > startDate);
      }).length;
      
      const empleadosFinMes = plantillaFiltered.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= endDate && (!fechaBaja || fechaBaja > endDate);
      }).length;
      
      const activosProm = (empleadosInicioMes + empleadosFinMes) / 2;
      
      // Bajas totales en el mes
      const bajasEnMes = plantillaFiltered.filter(p => {
        if (!p.fecha_baja || p.activo) return false;
        const fechaBaja = new Date(p.fecha_baja);
        return fechaBaja >= startDate && fechaBaja <= endDate;
      });

      const bajas = bajasEnMes.length;
      const rotacionPorcentaje = (bajas / (activosProm || 1)) * 100;

      // Calcular bajas por temporalidad
      const bajasMenor3m = bajasEnMes.filter(emp => {
        if (!emp.fecha_baja) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados < 3;
      }).length;

      const bajas3a6m = bajasEnMes.filter(emp => {
        if (!emp.fecha_baja) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 3 && mesesTrabajados < 6;
      }).length;

      const bajas6a12m = bajasEnMes.filter(emp => {
        if (!emp.fecha_baja) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 6 && mesesTrabajados < 12;
      }).length;

      const bajasMas12m = bajasEnMes.filter(emp => {
        if (!emp.fecha_baja) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 12;
      }).length;

      return {
        mes: format(startDate, 'MMM yyyy', { locale: es }),
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        rotacionPorcentaje: Number(rotacionPorcentaje.toFixed(2)),
        rotacionAcumulada12m: 0, // Se calculará después
        bajas,
        activos: empleadosFinMes,
        activosProm: Number(activosProm.toFixed(2)),
        bajasMenor3m,
        bajas3a6m,
        bajas6a12m,
        bajasMas12m
      };
    } catch (error) {
      console.error('Error calculating monthly retention:', error);
      return {
        mes: format(startDate, 'MMM yyyy', { locale: es }),
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        rotacionPorcentaje: 0,
        rotacionAcumulada12m: 0,
        bajas: 0,
        activos: 0,
        activosProm: 0,
        bajasMenor3m: 0,
        bajas3a6m: 0,
        bajas6a12m: 0,
        bajasMas12m: 0
      };
    }
  };

  const CustomTooltip = ({ active, payload, label }: {active?: boolean, payload?: Array<{color: string, name: string, value: number, dataKey: string}>, label?: string}) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="text-sm">
              <span style={{ color: entry.color }}>
                {entry.name}: {
                  entry.dataKey?.includes('Porcentaje') || entry.dataKey?.includes('rotacion') 
                    ? `${entry.value?.toFixed(1)}%` 
                    : entry.value?.toLocaleString()
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <span className="text-gray-500">Cargando...</span>
          </div>
        ))}
      </div>
    );
  }

  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  // Ajustar dinámicamente el dominio del eje Y para la gráfica de rotación acumulada
  const rotationValues = yearlyComparison.flatMap(row =>
    availableYears
      .map(year => row[`rotacion${year}`])
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))
  );

  const minRotation = rotationValues.length ? Math.min(...rotationValues) : 0;
  const maxRotation = rotationValues.length ? Math.max(...rotationValues) : 100;

  let lowerBound = Math.max(0, Math.floor(minRotation - 5));
  let upperBound = Math.min(100, Math.ceil(maxRotation + 5));

  if (upperBound - lowerBound < 10) {
    const padding = (10 - (upperBound - lowerBound)) / 2;
    lowerBound = Math.max(0, Math.floor(lowerBound - padding));
    upperBound = Math.min(100, Math.ceil(upperBound + padding));
  }

  const rotationDomain: [number, number] = [lowerBound, upperBound];
  
  return (
    <div className="space-y-6">
      {/* Primera fila de gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Rotación Acumulada (12 meses móviles) con comparación anual */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-base font-semibold mb-2">Rotación Acumulada (12 meses móviles)</h3>
          <p className="text-sm text-gray-600 mb-4">
            {availableYears.length > 0 
              ? `Comparación ${availableYears[0]} vs ${availableYears[availableYears.length - 1]}`
              : 'Comparación anual'}
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={yearlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Rotación %', angle: -90, position: 'insideLeft' }}
                domain={rotationDomain}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {availableYears.map((year, index) => (
                <Line 
                  key={year}
                  type="monotone" 
                  dataKey={`rotacion${year}`} 
                  stroke={index === 0 ? "#3b82f6" : "#ef4444"} 
                  strokeWidth={2}
                  name={year.toString()}
                  dot={{ fill: index === 0 ? '#3b82f6' : '#ef4444', strokeWidth: 2, r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Rotación Mensual (Múltiples Líneas) */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-base font-semibold mb-2">Rotación Mensual</h3>
          <p className="text-sm text-gray-600 mb-4">Rotación mensual %, bajas y activos por mes</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData.filter(d => {
              const fecha = new Date(d.year, d.month - 1, 1);
              const targetYear = currentYear || new Date().getFullYear();
              return d.year === targetYear && fecha <= new Date();
            })}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="percentage"
                orientation="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Rotación %', angle: -90, position: 'insideLeft' }}
                domain={[0, 10]}
                tickCount={6}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="numbers"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Cantidad', angle: 90, position: 'insideRight' }}
                domain={[0, 'dataMax + 100']}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                yAxisId="percentage"
                type="monotone" 
                dataKey="rotacionPorcentaje" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Rotación %"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
              />
              <Line 
                yAxisId="numbers"
                type="monotone" 
                dataKey="bajas" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Bajas"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
              />
              <Line 
                yAxisId="numbers"
                type="monotone" 
                dataKey="activos" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Activos"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3: Rotación por Temporalidad (Barras Apiladas por Mes) */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-base font-semibold mb-2">Rotación por Temporalidad</h3>
          <p className="text-sm text-gray-600 mb-4">Bajas por tiempo trabajado por mes</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData.filter(d => {
              const fecha = new Date(d.year, d.month - 1, 1);
              const targetYear = currentYear || new Date().getFullYear();
              return d.year === targetYear && fecha <= new Date();
            })}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                width={90}
                label={{
                  value: 'Número de Bajas',
                  angle: -90,
                  position: 'outside',
                  offset: -5,
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="bajasMenor3m" stackId="a" fill="#dc2626" name="< 3 meses" />
              <Bar dataKey="bajas3a6m" stackId="a" fill="#ea580c" name="3-6 meses" />
              <Bar dataKey="bajas6a12m" stackId="a" fill="#d97706" name="6-12 meses" />
              <Bar dataKey="bajasMas12m" stackId="a" fill="#65a30d" name="+12 meses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tablas comparativas lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Tabla comparativa de Rotación Acumulada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tabla Comparativa - Rotación Acumulada 12 Meses Móviles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3" rowSpan={2}>Mes</th>
                    <th className="text-center py-2 px-3 bg-blue-50" colSpan={3}>{availableYears[0] || new Date().getFullYear() - 1}</th>
                    <th className="text-center py-2 px-3 bg-red-50" colSpan={3}>{availableYears[1] || new Date().getFullYear()}</th>
                    <th className="text-center py-2 px-3" rowSpan={2}>Variación</th>
                  </tr>
                  <tr className="border-b">
                    <th className="text-center py-2 px-3 bg-blue-50 text-xs">% Rot. 12M</th>
                    <th className="text-center py-2 px-3 bg-blue-50 text-xs"># Bajas 12M</th>
                    <th className="text-center py-2 px-3 bg-blue-50 text-xs"># Activos</th>
                    <th className="text-center py-2 px-3 bg-red-50 text-xs">% Rot. 12M</th>
                    <th className="text-center py-2 px-3 bg-red-50 text-xs"># Bajas 12M</th>
                    <th className="text-center py-2 px-3 bg-red-50 text-xs"># Activos</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyComparison.map((row, index) => {
                    const year1 = availableYears[0];
                    const year2 = availableYears[availableYears.length - 1];
                    
                    // Buscar datos del mes para cada año en monthlyData
                    const monthIndex = yearlyComparison.indexOf(row);
                    const monthNumber = monthIndex + 1;
                    
                    const monthData1 = monthlyData.find(d => d.year === year1 && d.month === monthNumber);
                    const monthData2 = monthlyData.find(d => d.year === year2 && d.month === monthNumber);
                    
                    // Calcular bajas acumuladas de 12 meses para cada año
                    const getBajas12M = (targetYear: number, targetMonth: number) => {
                      const startDate = new Date(targetYear, targetMonth - 13, 1);
                      
                      let totalBajas = 0;
                      for (let i = 0; i < 12; i++) {
                        const checkMonth = new Date(startDate);
                        checkMonth.setMonth(startDate.getMonth() + i);
                        const data = monthlyData.find(d => 
                          d.year === checkMonth.getFullYear() && 
                          d.month === checkMonth.getMonth() + 1
                        );
                        if (data) totalBajas += data.bajas;
                      }
                      return totalBajas;
                    };
                    
                    const bajas12M_1 = getBajas12M(year1, monthNumber);
                    const bajas12M_2 = getBajas12M(year2, monthNumber);
                    
                    const rotacion1 = typeof row[`rotacion${year1}`] === 'number' ? row[`rotacion${year1}`] as number : 0;
                    const rotacion2 = typeof row[`rotacion${year2}`] === 'number' ? row[`rotacion${year2}`] as number : 0;
                    
                    const variation = rotacion2 && rotacion1 
                      ? ((rotacion2 - rotacion1) / rotacion1 * 100).toFixed(1)
                      : null;
                      
                    return (
                      <tr key={row.mes} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-3 font-medium">{row.mes}</td>
                        <td className="py-2 px-3 text-center text-xs">
                          {rotacion1 ? `${rotacion1.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {bajas12M_1 || '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthData1?.activos ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {rotacion2 ? `${rotacion2.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {bajas12M_2 || '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthData2?.activos ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {variation && (
                            <Badge variant={parseFloat(variation) > 0 ? "destructive" : "default"}>
                              {variation}%
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tabla comparativa de Rotación Mensual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tabla Comparativa - Rotación Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3" rowSpan={2}>Mes</th>
                    <th className="text-center py-2 px-3 bg-blue-50" colSpan={3}>{availableYears[0] || 2024}</th>
                    <th className="text-center py-2 px-3 bg-red-50" colSpan={3}>{availableYears[availableYears.length - 1] || 2025}</th>
                    <th className="text-center py-2 px-3" rowSpan={2}>Variación</th>
                  </tr>
                  <tr className="border-b">
                    <th className="text-center py-2 px-3 bg-blue-50 text-xs">% Rotación</th>
                    <th className="text-center py-2 px-3 bg-blue-50 text-xs"># Bajas</th>
                    <th className="text-center py-2 px-3 bg-blue-50 text-xs"># Activos</th>
                    <th className="text-center py-2 px-3 bg-red-50 text-xs">% Rotación</th>
                    <th className="text-center py-2 px-3 bg-red-50 text-xs"># Bajas</th>
                    <th className="text-center py-2 px-3 bg-red-50 text-xs"># Activos</th>
                  </tr>
                </thead>
                <tbody>
                  {monthNames.map((monthName, index) => {
                    const year1 = availableYears[0] || 2024;
                    const year2 = availableYears[availableYears.length - 1] || 2025;
                    const monthYear1 = monthlyData.find(d => d.year === year1 && d.month === index + 1);
                    const monthYear2 = monthlyData.find(d => d.year === year2 && d.month === index + 1);

                    // Calculate variation percentage for monthly rotation
                    const rotation1 = monthYear1?.rotacionPorcentaje || 0;
                    const rotation2 = monthYear2?.rotacionPorcentaje || 0;
                    const variation = rotation1 && rotation2
                      ? ((rotation2 - rotation1) / rotation1 * 100).toFixed(1)
                      : null;

                    return (
                      <tr key={monthName} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-3 font-medium">{monthName}</td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthYear1?.rotacionPorcentaje ? `${monthYear1.rotacionPorcentaje.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthYear1?.bajas ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthYear1?.activos ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthYear2?.rotacionPorcentaje ? `${monthYear2.rotacionPorcentaje.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthYear2?.bajas ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-xs">
                          {monthYear2?.activos ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {variation && (
                            <Badge variant={parseFloat(variation) > 0 ? "destructive" : "default"}>
                              {variation}%
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
