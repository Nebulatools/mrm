"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db, type PlantillaRecord } from '@/lib/supabase';
import { createBrowserClient } from '@/lib/supabase-client';
import { format, subMonths, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyFiltersWithScope } from '@/lib/filters/filters';
import { isMotivoClave } from '@/lib/normalizers';
import { VisualizationContainer } from "./visualization-container";
import { CHART_COLORS, getModernColor, withOpacity } from '@/lib/chart-colors';
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
  motivoFilter?: 'involuntaria' | 'voluntaria' | 'all';
}

const LEGEND_WRAPPER_STYLE: CSSProperties = { paddingTop: 6 };
const legendFormatter = (value: string) => (
  <span className="text-[11px] font-medium text-slate-600">{value}</span>
);
const TOOLTIP_WRAPPER_STYLE: CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  boxShadow: 'none',
  borderRadius: 0,
  outline: 'none'
};

const YEAR_LINE_COLORS = CHART_COLORS.modernSeries;
const MONTHLY_SERIES_COLORS = {
  rotation: getModernColor(0),
  bajas: getModernColor(2),
  activos: getModernColor(3)
};
const TEMPORALITY_COLORS = [
  getModernColor(0),
  getModernColor(3),
  getModernColor(4),
  getModernColor(2)
];

export function RetentionCharts({ currentDate = new Date(), currentYear, filters, motivoFilter = 'all' }: RetentionChartsProps) {
  // Create authenticated Supabase client for RLS filtering
  const supabase = createBrowserClient();

  const [monthlyData, setMonthlyData] = useState<MonthlyRetentionData[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<YearlyComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const bajaMatchesMotivo = (emp: PlantillaRecord): boolean => {
    if (!emp.fecha_baja) {
      return false;
    }
    const esInvoluntaria = isMotivoClave((emp as any).motivo_baja);
    if (motivoFilter === 'involuntaria') {
      return esInvoluntaria;
    }
    if (motivoFilter === 'voluntaria') {
      return !esInvoluntaria;
    }
    return true; // 'all'
  };

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

      // Detectar el rango de años con datos reales de bajas - DINÁMICO
      const hoy = new Date();
      const añoActual = hoy.getFullYear();
      
      const bajasConFecha = plantilla.filter(emp => bajaMatchesMotivo(emp));
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
        if (!bajaMatchesMotivo(emp)) return false;
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
        if (!bajaMatchesMotivo(p)) return false;
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

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number; dataKey: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
        <p className="text-[11px] font-semibold text-slate-700">{label}</p>
        <div className="mt-1 space-y-1">
          {payload.map((entry, index) => (
            <div key={`tooltip-${entry.dataKey}-${index}`} className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium text-slate-700">{entry.name}</span>
              <span className="ml-auto">
                {entry.dataKey?.toLowerCase().includes('rotacion') || entry.name.toLowerCase().includes('rotación')
                  ? `${Number(entry.value ?? 0).toFixed(1)}%`
                  : Number(entry.value ?? 0).toLocaleString('es-MX')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVariationPill = (rawValue: number | null | undefined) => {
    if (rawValue === null || rawValue === undefined || Number.isNaN(rawValue)) {
      return <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">—</span>;
    }

    const value = Number(rawValue);
    if (value === 0) {
      return <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">0.0%</span>;
    }

    const isIncrease = value > 0;
    const base = isIncrease
      ? { r: 34, g: 197, b: 94 }
      : { r: 239, g: 68, b: 68 };

    const intensity = Math.min(Math.abs(value) / 12, 1);
    const backgroundAlpha = 0.2 + intensity * 0.35;
    const borderAlpha = 0.35 + intensity * 0.3;

    return (
      <span
        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{
          backgroundColor: `rgba(${base.r}, ${base.g}, ${base.b}, ${backgroundAlpha.toFixed(2)})`,
          color: `rgba(${base.r}, ${base.g}, ${base.b}, 0.92)`,
          border: `1px solid rgba(${base.r}, ${base.g}, ${base.b}, ${borderAlpha.toFixed(2)})`
        }}
      >
        {value > 0 ? '+' : ''}
        {value.toFixed(1)}%
      </span>
    );
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
          <VisualizationContainer
            title="Rotación acumulada 12M"
            type="chart"
            className="h-[280px] w-full"
            filename="rotacion-acumulada-12m"
          >
            {(fullscreen) => (
              <div style={{ height: fullscreen ? 360 : 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyComparison}>
                    <CartesianGrid strokeDasharray="4 8" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: '#475569' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#475569' }}
                      label={{ value: 'Rotación %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#334155' } }}
                      domain={rotationDomain}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(0), 0.35) }} content={<CustomTooltip />} wrapperStyle={TOOLTIP_WRAPPER_STYLE} />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {availableYears.map((year, index) => {
                      const color = YEAR_LINE_COLORS[index % YEAR_LINE_COLORS.length];
                      return (
                        <Line
                          key={year}
                          type="monotone"
                          dataKey={`rotacion${year}`}
                          stroke={color}
                          strokeWidth={2.5}
                          name={year.toString()}
                          dot={{ fill: color, strokeWidth: 2, r: 3.5 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </VisualizationContainer>
        </div>

        {/* Gráfico 2: Rotación Mensual (Múltiples Líneas) */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-base font-semibold mb-2">Rotación Mensual</h3>
          <p className="text-sm text-gray-600 mb-4">Rotación mensual %, bajas y activos por mes</p>
          <VisualizationContainer
            title="Rotación mensual"
            type="chart"
            className="h-[280px] w-full"
            filename="rotacion-mensual"
          >
            {(fullscreen) => (
              <div style={{ height: fullscreen ? 360 : 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData.filter(d => {
                    const fecha = new Date(d.year, d.month - 1, 1);
                    const targetYear = currentYear || new Date().getFullYear();
                    return d.year === targetYear && fecha <= new Date();
                  })}>
                    <CartesianGrid strokeDasharray="4 8" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      yAxisId="percentage"
                      orientation="left"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      label={{ value: 'Rotación %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#334155' } }}
                      domain={[0, 10]}
                      tickCount={6}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="numbers"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      label={{ value: 'Cantidad', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#334155' } }}
                      domain={[0, 'dataMax + 100']}
                      allowDecimals={false}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(1), 0.35) }} content={<CustomTooltip />} wrapperStyle={TOOLTIP_WRAPPER_STYLE} />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    <Line 
                      yAxisId="percentage"
                      type="monotone" 
                      dataKey="rotacionPorcentaje" 
                      stroke={MONTHLY_SERIES_COLORS.rotation} 
                      strokeWidth={2.5}
                      name="Rotación %"
                      dot={{ fill: MONTHLY_SERIES_COLORS.rotation, strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      yAxisId="numbers"
                      type="monotone" 
                      dataKey="bajas"
                      stroke={MONTHLY_SERIES_COLORS.bajas} 
                      strokeWidth={2.5}
                      name="Bajas"
                      dot={{ fill: MONTHLY_SERIES_COLORS.bajas, strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      yAxisId="numbers"
                      type="monotone" 
                      dataKey="activos" 
                      stroke={MONTHLY_SERIES_COLORS.activos}
                      strokeWidth={2.5}
                      name="Activos Prom"
                      dot={{ fill: MONTHLY_SERIES_COLORS.activos, strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </VisualizationContainer>
        </div>

        {/* Gráfico 3: Rotación por Temporalidad (Barras Apiladas por Mes) */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-base font-semibold mb-2">Rotación por Temporalidad</h3>
          <p className="text-sm text-gray-600 mb-4">Bajas por tiempo trabajado por mes</p>
          <VisualizationContainer
            title="Rotación por temporalidad"
            type="chart"
            className="h-[280px] w-full"
            filename="rotacion-por-temporalidad"
          >
            {(fullscreen) => (
              <div style={{ height: fullscreen ? 360 : 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData.filter(d => {
                    const fecha = new Date(d.year, d.month - 1, 1);
                    const targetYear = currentYear || new Date().getFullYear();
                    return d.year === targetYear && fecha <= new Date();
                  })}>
                    <CartesianGrid strokeDasharray="4 8" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#475569' }}
                      width={90}
                      label={{
                        value: 'Número de Bajas',
                        angle: -90,
                        position: 'outside',
                        offset: -5,
                        style: { textAnchor: 'middle', fontSize: 11, fill: '#334155' }
                      }}
                    />
                    <Tooltip cursor={{ fill: withOpacity(getModernColor(2), 0.12) }} content={<CustomTooltip />} wrapperStyle={TOOLTIP_WRAPPER_STYLE} />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    <Bar dataKey="bajasMenor3m" stackId="a" fill={TEMPORALITY_COLORS[0]} name="< 3 meses" />
                    <Bar dataKey="bajas3a6m" stackId="a" fill={TEMPORALITY_COLORS[1]} name="3-6 meses" />
                    <Bar dataKey="bajas6a12m" stackId="a" fill={TEMPORALITY_COLORS[2]} name="6-12 meses" />
                    <Bar dataKey="bajasMas12m" stackId="a" fill={TEMPORALITY_COLORS[3]} name="+12 meses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </VisualizationContainer>
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
            <VisualizationContainer
              title="Tabla comparativa - Rotación acumulada"
              type="table"
              className="w-full"
              filename="tabla-rotacion-acumulada"
            >
              {() => (
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
                    
                    const variationValue = rotacion1 > 0 && rotacion2 > 0
                      ? Number(((rotacion2 - rotacion1) / rotacion1) * 100)
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
                          {renderVariationPill(variationValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>

        {/* Tabla comparativa de Rotación Mensual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tabla Comparativa - Rotación Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <VisualizationContainer
              title="Tabla comparativa - Rotación mensual"
              type="table"
              className="w-full"
              filename="tabla-rotacion-mensual"
            >
              {() => (
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
                    const variationValue = rotation1 > 0 && rotation2 > 0
                      ? Number(((rotation2 - rotation1) / rotation1) * 100)
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
                          {renderVariationPill(variationValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
