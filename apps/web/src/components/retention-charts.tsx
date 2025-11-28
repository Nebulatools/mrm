"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db, type PlantillaRecord, type MotivoBajaRecord } from '@/lib/supabase';
import { createBrowserClient } from '@/lib/supabase-client';
import { subMonths, endOfMonth, startOfMonth, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyFiltersWithScope } from '@/lib/filters/filters';
import { isMotivoClave, normalizeMotivo } from '@/lib/normalizers';
import { VisualizationContainer } from "./visualization-container";
import { CHART_COLORS, getModernColor, withOpacity } from '@/lib/chart-colors';
import { useTheme } from "@/components/theme-provider";
import {
  calculateMonthlyRetention,
  parseSupabaseDate,
  bajaMatchesMotivo,
  type MonthlyRetentionData,
  type BajaEvento
} from '@/lib/retention-calculations';
//

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
  <span className="text-[11px] font-medium text-muted-foreground">{value}</span>
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
  '#4f46e5', // <3m
  '#0ea5e9', // 3-6m
  '#14b8a6', // 6-12m
  '#f97316'  // +12m
];

export function RetentionCharts({ currentDate = new Date(), currentYear, filters, motivoFilter = 'all' }: RetentionChartsProps) {
  // Create authenticated Supabase client for RLS filtering
  const supabase = createBrowserClient();

  const [monthlyData, setMonthlyData] = useState<MonthlyRetentionData[]>([]);
  const [allMonthlyData, setAllMonthlyData] = useState<MonthlyRetentionData[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<YearlyComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const axisPrimaryColor = isDark ? "#E2E8F0" : "#0f172a";
  const axisSecondaryColor = isDark ? "#CBD5F5" : "#64748b";
  const axisMutedColor = isDark ? "#CBD5F5" : "#475569";
  const gridStrokeColor = isDark ? "rgba(148, 163, 184, 0.25)" : "#E2E8F0";
  const tooltipBackground = isDark ? "hsl(var(--card))" : "#FFFFFF";
  const tooltipBorder = isDark ? "rgba(148, 163, 184, 0.35)" : "#E2E8F0";
  const tooltipLabelColor = isDark ? "#E2E8F0" : "#0f172a";
  const tooltipTextColor = isDark ? "#CBD5F5" : "#475569";
  const tooltipShadow = isDark ? "0 16px 45px -20px rgba(8, 14, 26, 0.65)" : "0 10px 35px -15px rgba(15, 23, 42, 0.35)";

  useEffect(() => {
    loadMonthlyRetentionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, currentYear, supabase, motivoFilter, filters]);

  const loadMonthlyRetentionData = async () => {
    try {
      // Solo mostrar loading completo en carga inicial, después usar chartsLoading
      const isInitialLoad = allMonthlyData.length === 0;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setChartsLoading(true);
      }

      console.log('🔄 RetentionCharts: Loading monthly retention data...');

      // Cargar empleados y motivos de baja en paralelo (optimización)
      const [plantillaRaw, motivosRaw] = await Promise.all([
        db.getEmpleadosSFTP(supabase),
        db.getMotivosBaja(undefined, undefined, supabase)
      ]);

      let plantilla = (plantillaRaw || []) as PlantillaRecord[];
      const motivos = (motivosRaw || []) as MotivoBajaRecord[];

      console.log('👥 Empleados SFTP loaded:', plantilla?.length, 'records');
      console.log('📄 Motivos de baja loaded:', motivos.length, 'records');

      if (!plantilla || plantilla.length === 0) {
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

      const empleadosMap = new Map<number, PlantillaRecord>();
      plantilla.forEach(emp => {
        const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
        if (Number.isFinite(numero)) {
          empleadosMap.set(numero, emp);
        }
      });

      const bajaEventos: BajaEvento[] = motivos
        .filter(evento => {
          const numero = Number(evento.numero_empleado);
          return Number.isFinite(numero) && empleadosMap.has(numero) && evento.fecha_baja;
        })
        .map(evento => {
          const numero = Number(evento.numero_empleado);
          const motivoNormalizado = normalizeMotivo(evento.descripcion || evento.motivo || '');
          return {
            numero_empleado: numero,
            fecha_baja: evento.fecha_baja,
            motivo_normalizado: motivoNormalizado || 'Otra razón'
          };
        });

      // Detectar el rango de años con datos reales de bajas - DINÁMICO
      const hoy = new Date();
      const añoActual = hoy.getFullYear();

      const bajasConFecha = plantilla.filter(emp => bajaMatchesMotivo(emp, 'all'));
      const años = new Set<number>();

      bajasConFecha.forEach(emp => {
        const fechaBaja = parseSupabaseDate(emp.fecha_baja);
        if (!fechaBaja) {
          return;
        }
        const año = fechaBaja.getFullYear();
        // Solo incluir años con datos reales (no futuros)
        if (año >= 2022 && fechaBaja <= hoy) {
          años.add(año);
        }
      });

      // Si no hay bajas, usar solo el año actual
      const years = años.size > 0 ? Array.from(años).sort() : [añoActual];
      console.log('📅 Years with dismissal data:', years);

      // Generar datos mensuales completos (sin filtro por motivo) y versión filtrada para el toggle
      const allMonthsData: MonthlyRetentionData[] = [];
      const motiveMonthsData: MonthlyRetentionData[] = [];

      for (const year of years) {
        for (let month = 0; month < 12; month++) {
          const baseDate = new Date(year, month, 1);
          const startDate = startOfMonth(baseDate);
          const endDate = endOfMonth(baseDate);

          // NO incluir meses futuros
          if (startDate > hoy) {
            continue;
          }

          const monthDataAll = await calculateMonthlyRetention(startDate, endDate, plantilla, 'all', bajaEventos);
          const monthEntryAll: MonthlyRetentionData = {
            ...monthDataAll,
            year,
            month: month + 1
          };

          allMonthsData.push(monthEntryAll);

          if (motivoFilter === 'all') {
            motiveMonthsData.push(monthEntryAll);
          } else {
            const monthDataFiltered = await calculateMonthlyRetention(startDate, endDate, plantilla, motivoFilter, bajaEventos);
            motiveMonthsData.push({
              ...monthDataFiltered,
              year,
              month: month + 1
            });
          }
        }
      }

      // Calcular rotación acumulada de 12 meses móviles para cada conjunto
      for (let i = 0; i < allMonthsData.length; i++) {
        allMonthsData[i].rotacionAcumulada12m = calculateRolling12MonthRotation(allMonthsData, i, plantilla, 'all', bajaEventos);
      }
      for (let i = 0; i < motiveMonthsData.length; i++) {
        motiveMonthsData[i].rotacionAcumulada12m = calculateRolling12MonthRotation(motiveMonthsData, i, plantilla, motivoFilter, bajaEventos);
      }

      const filteredMonthsData = motivoFilter === 'all' ? allMonthsData : motiveMonthsData;
      
      // Preparar datos para comparación por año (año filtrado vs anterior)
      const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const selectedYear = currentYear || new Date().getFullYear();
      const previousYear = selectedYear - 1;
      const lastTwoYears = [previousYear, selectedYear]; // Año anterior y filtrado
      
      const comparisonData: YearlyComparisonData[] = monthNames.map((monthName, index) => {
        const dataByYear: YearlyComparisonData = {
          mes: monthName
        };

        // Agregar datos para cada año disponible usando los datos filtrados por motivo
        lastTwoYears.forEach(year => {
          const monthData = filteredMonthsData.find(d => d.year === year && d.month === index + 1);
          if (monthData) {
            dataByYear[`rotacion${year}`] = monthData.rotacionAcumulada12m;
            dataByYear[`bajas${year}`] = monthData.bajas;
            dataByYear[`activos${year}`] = monthData.activos;
          }
        });

        return dataByYear;
      });
      
      setMonthlyData(filteredMonthsData);
      setAllMonthlyData(allMonthsData);
      setYearlyComparison(comparisonData);
      setAvailableYears(lastTwoYears);
    } catch (error) {
      console.error('Error loading monthly retention data:', error);
    } finally {
      setLoading(false);
      setChartsLoading(false);
    }
  };

  const calculateRolling12MonthRotation = (
    monthsData: MonthlyRetentionData[],
    currentIndex: number,
    plantilla: PlantillaRecord[],
    motive: 'involuntaria' | 'voluntaria' | 'all',
    bajaEventos?: BajaEvento[]
  ): number => {
    try {
      const currentMonthData = monthsData[currentIndex];
      if (!currentMonthData) return 0;
      
      const currentMonthDate = startOfMonth(new Date(currentMonthData.year, currentMonthData.month - 1, 1));
      const startDate12m = startOfDay(subMonths(currentMonthDate, 11));
      const endDate12m = endOfMonth(currentMonthDate);

      const plantillaFiltrada = plantilla;
      const empleadosMap = new Map<number, PlantillaRecord>();
      plantillaFiltrada.forEach(emp => {
        const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
        if (Number.isFinite(numero)) {
          empleadosMap.set(numero, emp);
        }
      });

      // Contar todas las bajas en el período de 12 meses
      let bajasEn12Meses: number;

      if (bajaEventos && bajaEventos.length > 0) {
        const eventosSet = new Set<string>();
        bajaEventos.forEach(evento => {
          const numero = Number(evento.numero_empleado);
          if (!Number.isFinite(numero)) return;
          const empleado = empleadosMap.get(numero);
          if (!empleado) return;
          const fechaBaja = parseSupabaseDate(evento.fecha_baja);
          if (!fechaBaja) return;
          if (fechaBaja < startDate12m || fechaBaja > endDate12m) return;
          if (!bajaMatchesMotivo(empleado, motive, evento.motivo_normalizado)) return;
          eventosSet.add(`${numero}-${fechaBaja.toISOString().slice(0, 10)}`);
        });
        bajasEn12Meses = eventosSet.size;
      } else {
        bajasEn12Meses = plantillaFiltrada.filter(emp => {
          if (!emp.fecha_baja) return false;
          if (!bajaMatchesMotivo(emp, motive)) return false;
          const fechaBaja = parseSupabaseDate(emp.fecha_baja);
          if (!fechaBaja) return false;
          return fechaBaja >= startDate12m && fechaBaja <= endDate12m;
        }).length;
      }

      // Calcular promedio de empleados activos en el período de 12 meses
      const activosInicioRango = plantillaFiltrada.filter(emp => {
        const fechaIngreso = parseSupabaseDate(emp.fecha_ingreso);
        if (!fechaIngreso || fechaIngreso > startDate12m) {
          return false;
        }
        const fechaBaja = parseSupabaseDate(emp.fecha_baja);
        return !fechaBaja || fechaBaja > startDate12m;
      }).length;

      const activosFinRango = plantillaFiltrada.filter(emp => {
        const fechaIngreso = parseSupabaseDate(emp.fecha_ingreso);
        if (!fechaIngreso || fechaIngreso > endDate12m) {
          return false;
        }
        const fechaBaja = parseSupabaseDate(emp.fecha_baja);
        return !fechaBaja || fechaBaja > endDate12m;
      }).length;

      const promedioActivos12m = (activosInicioRango + activosFinRango) / 2;
      const rotacionAcumulada = promedioActivos12m > 0 ? (bajasEn12Meses / promedioActivos12m) * 100 : 0;
      
      return Number(rotacionAcumulada.toFixed(2));
    } catch (error) {
      console.error('Error calculating rolling 12-month rotation:', error);
      return 0;
    }
  };

  // Helper para tablas: usa monthlyData (filtrado/toggle) para recalcular bajas 12M, promedio de activos 12M y rotación coherente
  const compute12mStats = (targetYear: number, targetMonth: number) => {
    const windowEntries: MonthlyRetentionData[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(targetYear, targetMonth - 1 - i, 1);
      const entry = monthlyData.find(
        (m) => m.year === d.getFullYear() && m.month === d.getMonth() + 1
      );
      if (entry) windowEntries.push(entry);
    }
    const bajas12m = windowEntries.reduce((acc, m) => acc + (m.bajas || 0), 0);
    const activosProm12m = windowEntries.length
      ? windowEntries.reduce((acc, m) => acc + (m.activos || 0), 0) / windowEntries.length
      : 0;
    const rotacion12m = activosProm12m > 0 ? (bajas12m / activosProm12m) * 100 : null;
    return {
      bajas12m,
      activosProm12m: activosProm12m > 0 ? Math.round(activosProm12m) : null,
      rotacion12m,
    };
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number; dataKey: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div
        className="rounded-xl border px-3 py-2 shadow-lg"
        style={{
          borderColor: tooltipBorder,
          backgroundColor: tooltipBackground,
          boxShadow: tooltipShadow
        }}
      >
        <p className="text-[11px] font-semibold" style={{ color: tooltipLabelColor }}>
          {label}
        </p>
        <div className="mt-1 space-y-1">
          {payload.map((entry, index) => (
            <div
              key={`tooltip-${entry.dataKey}-${index}`}
              className="flex items-center gap-2 text-[11px]"
              style={{ color: tooltipTextColor }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-medium" style={{ color: tooltipLabelColor }}>
                {entry.name}
              </span>
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
      return (
        <span
          className="rounded-full px-2.5 py-[5px] text-[11px] font-medium"
          style={{
            backgroundColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.18)",
            color: isDark ? "#CBD5F5" : "#475569",
            border: `1px solid ${isDark ? "rgba(148, 163, 184, 0.32)" : "rgba(148, 163, 184, 0.45)"}`
          }}
        >
          —
        </span>
      );
    }

    const value = Number(rawValue);
    if (value === 0) {
      return (
        <span
          className="rounded-full px-2.5 py-[5px] text-[11px] font-medium"
          style={{
            backgroundColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.18)",
            color: isDark ? "#CBD5F5" : "#475569",
            border: `1px solid ${isDark ? "rgba(148, 163, 184, 0.32)" : "rgba(148, 163, 184, 0.45)"}`
          }}
        >
          0.0%
        </span>
      );
    }

    const isIncrease = value > 0;
    const base = isIncrease
      ? { r: 34, g: 197, b: 94 }
      : { r: 239, g: 68, b: 68 };

    const intensity = Math.min(Math.abs(value) / 12, 1);
    const backgroundAlpha = 0.22 + intensity * 0.32;
    const borderAlpha = 0.4 + intensity * 0.28;
    const lightTextColor = isIncrease ? "#166534" : "#991B1B";

    return (
      <span
        className="rounded-full px-2.5 py-[5px] text-[11px] font-semibold"
        style={{
          backgroundColor: `rgba(${base.r}, ${base.g}, ${base.b}, ${backgroundAlpha.toFixed(2)})`,
          color: isDark ? "#F8FAFC" : lightTextColor,
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 bg-slate-100/80 p-4 animate-pulse dark:border-slate-700/70 dark:bg-slate-800/60"
            >
              <span className="text-muted-foreground dark:text-slate-300">Cargando...</span>
            </div>
          ))}
        </div>
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
      {/* Primera fila de gráficas - con borde sutil para distinguir del resto */}
      <div className="relative rounded-2xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-50/30 to-transparent p-4 dark:border-blue-400/20 dark:from-blue-950/20">
        {/* Loading overlay para las gráficas */}
        {chartsLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Actualizando gráficas...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Rotación Acumulada (12 meses móviles) con comparación anual */}
        <div className="rounded-lg border bg-card p-4 shadow-sm dark:border-brand-border/40 dark:bg-brand-surface-accent/70">
          <h3 className="text-base font-semibold mb-2">Rotación Acumulada (12 meses móviles)</h3>
          <p className="mb-4 text-sm text-muted-foreground">
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
                    <CartesianGrid strokeDasharray="4 8" stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: axisSecondaryColor }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisMutedColor }}
                      label={{ value: 'Rotación %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisPrimaryColor } }}
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
        <div className="rounded-lg border bg-card p-4 shadow-sm dark:border-brand-border/40 dark:bg-brand-surface-accent/70">
          <h3 className="text-base font-semibold mb-2">Rotación Mensual</h3>
          <p className="mb-4 text-sm text-muted-foreground">Rotación mensual %, bajas y activos por mes</p>
          <VisualizationContainer
            title="Rotación mensual"
            type="chart"
            className="h-[280px] w-full"
            filename="rotacion-mensual"
          >
            {(fullscreen) => (
              <div style={{ height: fullscreen ? 360 : 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData.filter(d => {
                      const fecha = new Date(d.year, d.month - 1, 1);
                      const targetYear = currentYear || new Date().getFullYear();
                      return d.year === targetYear && fecha <= new Date();
                    })}
                  >
                    <CartesianGrid strokeDasharray="4 8" stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: axisSecondaryColor }}
                      angle={0}
                      tickMargin={10}
                      height={38}
                    />
                    <YAxis
                      yAxisId="percentage"
                      orientation="left"
                      tick={{ fontSize: 11, fill: axisMutedColor }}
                      label={{ value: 'Rotación %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisPrimaryColor } }}
                      domain={[0, 10]}
                      tickCount={6}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="numbers"
                      orientation="right"
                      tick={{ fontSize: 11, fill: axisMutedColor }}
                      label={{ value: 'Cantidad', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: axisPrimaryColor } }}
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
        <div className="rounded-lg border bg-card p-4 shadow-sm dark:border-brand-border/40 dark:bg-brand-surface-accent/70">
          <h3 className="text-base font-semibold mb-2">Rotación por Temporalidad</h3>
          <p className="mb-4 text-sm text-muted-foreground">Bajas por tiempo trabajado por mes</p>
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
                    <CartesianGrid strokeDasharray="4 8" stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: axisSecondaryColor }}
                      angle={0}
                      tickMargin={10}
                      height={38}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisMutedColor }}
                      width={90}
                      label={{
                        value: 'Número de Bajas',
                        angle: -90,
                        position: 'outside',
                        offset: -5,
                        style: { textAnchor: 'middle', fontSize: 11, fill: axisPrimaryColor }
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
            <div className="relative w-full overflow-x-auto min-w-[780px]">
              <table className="w-full table-auto border-separate border-spacing-0 text-xs text-foreground md:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-800/60">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm" rowSpan={2}>Mes</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm bg-blue-100 dark:bg-blue-500/20" colSpan={3}>{availableYears[0] || new Date().getFullYear() - 1}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm bg-red-100 dark:bg-red-500/20" colSpan={3}>{availableYears[1] || new Date().getFullYear()}</th>
                    <th className="min-w-[90px] px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm" rowSpan={2}>Variación</th>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700/70">
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15">% Rot. 12M</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15"># Bajas 12M</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15"># Activos</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15">% Rot. 12M</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Bajas 12M</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Activos</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyComparison.map((row, index) => {
                    const year1 = availableYears[0];
                    const year2 = availableYears[availableYears.length - 1];
                    const monthNumber = index + 1;

                    const stats1 = compute12mStats(year1, monthNumber);
                    const stats2 = compute12mStats(year2, monthNumber);

                    const rotacion1 = stats1.rotacion12m;
                    const rotacion2 = stats2.rotacion12m;

                    const variationValue =
                      rotacion1 !== null && rotacion1 > 0 && rotacion2 !== null
                        ? Number(((rotacion2 - rotacion1) / rotacion1) * 100)
                        : null;

                    return (
                      <tr
                        key={row.mes}
                        className={index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-800/40' : ''}
                      >
                        <td className="px-3 py-2 text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">{row.mes}</td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {rotacion1 !== null ? `${rotacion1.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {stats1.bajas12m || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {stats1.activosProm12m ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {rotacion2 !== null ? `${rotacion2.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {stats2.bajas12m || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {stats2.activosProm12m ?? '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
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
            <div className="relative w-full overflow-x-auto min-w-[780px]">
              <table className="w-full table-auto border-separate border-spacing-0 text-xs text-foreground md:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-800/60">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm" rowSpan={2}>Mes</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm bg-blue-100 dark:bg-blue-500/20" colSpan={3}>{availableYears[0] || 2024}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm bg-red-100 dark:bg-red-500/20" colSpan={3}>{availableYears[availableYears.length - 1] || 2025}</th>
                    <th className="min-w-[90px] px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm" rowSpan={2}>Variación</th>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700/70">
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15">% Rotación</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15"># Bajas</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15"># Activos</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15">% Rotación</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Bajas</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Activos</th>
                  </tr>
                </thead>
                <tbody>
                  {monthNames.map((monthName, index) => {
                    const year1 = availableYears[0] || 2024;
                    const year2 = availableYears[availableYears.length - 1] || 2025;
                    const monthYear1 = monthlyData.find(d => d.year === year1 && d.month === index + 1);
                    const monthYear2 = monthlyData.find(d => d.year === year2 && d.month === index + 1);

                    const rotation1 = monthYear1?.rotacionPorcentaje || 0;
                    const rotation2 = monthYear2?.rotacionPorcentaje || 0;
                    const variationValue = rotation1 > 0 && rotation2 > 0
                      ? Number(((rotation2 - rotation1) / rotation1) * 100)
                      : null;

                    return (
                      <tr
                        key={monthName}
                        className={index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-800/40' : ''}
                      >
                        <td className="px-3 py-2 text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">{monthName}</td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {monthYear1?.rotacionPorcentaje ? `${monthYear1.rotacionPorcentaje.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {monthYear1?.bajas ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {monthYear1?.activos ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {monthYear2?.rotacionPorcentaje ? `${monthYear2.rotacionPorcentaje.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {monthYear2?.bajas ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm">
                          {monthYear2?.activos ?? '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
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
