"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area } from 'recharts';
import { db, type PlantillaRecord, type MotivoBajaRecord } from '@/lib/supabase';
import { createBrowserClient } from '@/lib/supabase-client';
import { endOfMonth, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyFiltersWithScope } from '@/lib/filters/filters';
import { isMotivoClave, normalizeMotivo } from '@/lib/normalizers';
import { VisualizationContainer } from "./shared/visualization-container";
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
  ubicacionesIncidencias?: string[];
}

interface RetentionChartsProps {
  currentDate?: Date;
  currentYear?: number;
  filters?: RetentionFilters;
  motivoFilter?: 'involuntaria' | 'voluntaria' | 'all';
}

const LEGEND_WRAPPER_STYLE: CSSProperties = { paddingTop: 6 };
const legendFormatter = (value: string) => {
  const clean = value.replace(/\s*\(año anterior\)\s*/i, '').trim();
  if (!clean) return null;
  return (
    <span className="text-[11px] font-medium text-muted-foreground">
      {clean}
    </span>
  );
};
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

// Helper functions para bar labels (ahora aceptan color como parámetro)
const createBarLabelRenderer = (fillColor: string) => (props: any) => {
  const { x, y, width, value } = props;
  if (value === null || value === undefined || value === 0) return <></>;

  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 4}
      fill={fillColor}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
    >
      {Math.round(value)}
    </text>
  );
};

const createBarLabelPercentRenderer = (fillColor: string) => (props: any) => {
  const { x, y, width, value } = props;
  if (value === null || value === undefined || value === 0) return <></>;

  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 4}
      fill={fillColor}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
    >
      {`${Math.round(value)}%`}
    </text>
  );
};

export function RetentionCharts({ currentDate = new Date(), currentYear, filters, motivoFilter = 'all' }: RetentionChartsProps) {
  // Create authenticated Supabase client for RLS filtering
  const supabase = createBrowserClient();

  const [monthlyData, setMonthlyData] = useState<MonthlyRetentionData[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<YearlyComparisonData[]>([]);
  const [monthlyDataByMotivo, setMonthlyDataByMotivo] = useState<Record<'all' | 'voluntaria' | 'involuntaria', MonthlyRetentionData[]>>({
    all: [],
    voluntaria: [],
    involuntaria: []
  });
  const [yearlyComparisonByMotivo, setYearlyComparisonByMotivo] = useState<Record<'all' | 'voluntaria' | 'involuntaria', YearlyComparisonData[]>>({
    all: [],
    voluntaria: [],
    involuntaria: []
  });
  const [availableYearsByMotivo, setAvailableYearsByMotivo] = useState<Record<'all' | 'voluntaria' | 'involuntaria', number[]>>({
    all: [],
    voluntaria: [],
    involuntaria: []
  });
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

  // Create bar label renderers with theme-aware colors
  const renderBarLabel = createBarLabelRenderer(axisMutedColor);
  const renderBarLabelPercent = createBarLabelPercentRenderer(axisMutedColor);

  useEffect(() => {
    loadMonthlyRetentionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, currentYear, supabase, filters]);

  useEffect(() => {
    // Cambiar datasets en memoria sin recalcular cuando se cambia el toggle
    const nextMonthly = monthlyDataByMotivo[motivoFilter] || [];
    const nextComparison = yearlyComparisonByMotivo[motivoFilter] || [];
    const nextYears = availableYearsByMotivo[motivoFilter] || [];
    setMonthlyData(nextMonthly);
    setYearlyComparison(nextComparison);
    setAvailableYears(nextYears);
  }, [motivoFilter, monthlyDataByMotivo, yearlyComparisonByMotivo, availableYearsByMotivo]);

  const loadMonthlyRetentionData = async () => {
    try {
      // Solo mostrar loading completo en carga inicial, después usar chartsLoading
      const isInitialLoad = monthlyData.length === 0;
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

      // Enriquecer registros con valores ya parseados para evitar reprocesar en cada mes
      const plantillaEnriched = plantilla.map(emp => ({
        ...emp,
        _fecha_ingreso: parseSupabaseDate(emp.fecha_ingreso),
        _fecha_baja: parseSupabaseDate(emp.fecha_baja),
        _motivo_normalizado: normalizeMotivo((emp as any).motivo_baja || '')
      }));
      plantilla = plantillaEnriched;

      const empleadosMap = new Map<number, PlantillaRecord>();
      plantilla.forEach(emp => {
        const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
        if (Number.isFinite(numero)) {
          empleadosMap.set(numero, emp);
        }
      });

      // ✅ CRITICAL FIX: Incluir TODAS las bajas de motivos_baja, sin filtrar por empleadosMap
      // Esto asegura que todas las bajas se cuenten, incluso si el empleado fue filtrado
      // por departamento/puesto/etc. El conteo correcto se hace en calculateMonthlyRetention
      const bajaEventos: BajaEvento[] = motivos
        .filter(evento => {
          const numero = Number(evento.numero_empleado);
          // Solo validar que el número sea válido y que haya fecha_baja
          // NO filtrar por empleadosMap.has(numero) - eso excluye bajas válidas
          return Number.isFinite(numero) && evento.fecha_baja;
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
      const selectedYear = currentYear || añoActual;

      // ✅ CORREGIDO: Generar ventana de 36 meses para cálculo correcto de 12M móviles
      const allMonthsData: MonthlyRetentionData[] = [];
      const voluntariaMonthsData: MonthlyRetentionData[] = [];
      const involuntariaMonthsData: MonthlyRetentionData[] = [];

      // Generar 3 ventanas de 12 meses (36 meses total):
      // Para calcular 12M móviles del año anterior necesitamos datos de 2 años atrás
      // Ejemplo: Para 12M móviles de ene 2024, necesitamos feb 2023 - ene 2024
      for (let yearOffset = 2; yearOffset >= 0; yearOffset--) {
        for (let offset = 11; offset >= 0; offset--) {
          const baseDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - offset - (yearOffset * 12),
            1
          );
          const startDate = startOfMonth(baseDate);
          const endDate = endOfMonth(baseDate);

          // NO incluir meses futuros
          if (startDate > hoy) {
            continue;
          }

          const year = baseDate.getFullYear();
          const month = baseDate.getMonth() + 1;

          const [monthDataAll, monthDataVol, monthDataInv] = await Promise.all([
            calculateMonthlyRetention(startDate, endDate, plantilla, 'all', bajaEventos),
            calculateMonthlyRetention(startDate, endDate, plantilla, 'voluntaria', bajaEventos),
            calculateMonthlyRetention(startDate, endDate, plantilla, 'involuntaria', bajaEventos),
          ]);

          allMonthsData.push({ ...monthDataAll, year, month });
          voluntariaMonthsData.push({ ...monthDataVol, year, month });
          involuntariaMonthsData.push({ ...monthDataInv, year, month });
        }
      }

      // Calcular rotación acumulada de 12 meses móviles (misma lógica original)
      for (let i = 0; i < allMonthsData.length; i++) {
        allMonthsData[i].rotacionAcumulada12m = calculateRolling12MonthRotation(allMonthsData, i, plantilla, 'all', bajaEventos);
      }
      for (let i = 0; i < voluntariaMonthsData.length; i++) {
        voluntariaMonthsData[i].rotacionAcumulada12m = calculateRolling12MonthRotation(voluntariaMonthsData, i, plantilla, 'voluntaria', bajaEventos);
      }
      for (let i = 0; i < involuntariaMonthsData.length; i++) {
        involuntariaMonthsData[i].rotacionAcumulada12m = calculateRolling12MonthRotation(involuntariaMonthsData, i, plantilla, 'involuntaria', bajaEventos);
      }

      // Calcular rotación YTD (Year To Date - desde enero hasta el mes actual)
      for (let i = 0; i < allMonthsData.length; i++) {
        allMonthsData[i].rotacionYTD = calculateYTDRotation(allMonthsData, i, plantilla, 'all', bajaEventos);
      }
      for (let i = 0; i < voluntariaMonthsData.length; i++) {
        voluntariaMonthsData[i].rotacionYTD = calculateYTDRotation(voluntariaMonthsData, i, plantilla, 'voluntaria', bajaEventos);
      }
      for (let i = 0; i < involuntariaMonthsData.length; i++) {
        involuntariaMonthsData[i].rotacionYTD = calculateYTDRotation(involuntariaMonthsData, i, plantilla, 'involuntaria', bajaEventos);
      }

      // ✅ CORREGIDO: buildComparison con ventana móvil + comparación año anterior
      const buildComparison = (filteredMonthsData: MonthlyRetentionData[]) => {
        const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

        // ✅ FIX: Usar año seleccionado (o actual) y su año anterior para comparación
        // Esto asegura que siempre comparemos el año que el usuario está viendo vs el anterior
        const targetYear = selectedYear;
        const previousYear = targetYear - 1;
        const lastTwoYears = [previousYear, targetYear];

        // Agrupar datos por mes (index 0-11) combinando datos de ambos años
        const comparisonData: YearlyComparisonData[] = monthNames.map((monthName, monthIndex) => {
          const dataByYear: YearlyComparisonData = { mes: monthName };

          // Para cada año, buscar el dato correspondiente a este mes
          lastTwoYears.forEach(year => {
            const monthData = filteredMonthsData.find(d =>
              d.year === year && d.month === (monthIndex + 1)
            );

            if (monthData) {
              dataByYear[`rotacion${year}`] = monthData.rotacionAcumulada12m;
              dataByYear[`rotacionYTD${year}`] = monthData.rotacionYTD ?? 0;
              dataByYear[`bajas${year}`] = monthData.bajas;
              dataByYear[`activos${year}`] = monthData.activos;
            }
          });

          return dataByYear;
        });

        return { comparisonData, lastTwoYears };
      };

      const comparisonAll = buildComparison(allMonthsData);
      const comparisonVol = buildComparison(voluntariaMonthsData);
      const comparisonInv = buildComparison(involuntariaMonthsData);

      setMonthlyDataByMotivo({
        all: allMonthsData,
        voluntaria: voluntariaMonthsData,
        involuntaria: involuntariaMonthsData
      });

      setYearlyComparisonByMotivo({
        all: comparisonAll.comparisonData,
        voluntaria: comparisonVol.comparisonData,
        involuntaria: comparisonInv.comparisonData
      });

      setAvailableYearsByMotivo({
        all: comparisonAll.lastTwoYears,
        voluntaria: comparisonVol.lastTwoYears,
        involuntaria: comparisonInv.lastTwoYears
      });
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

      // Contar todas las bajas en el período de 12 meses
      // SOURCE: motivos_baja (bajaEventos) - fecha_baja and motivo
      const eventosSet = new Set<string>();

      // ✅ CORRECTO: Usar bajaEventos (motivos_baja) como fuente principal
      if (bajaEventos && bajaEventos.length > 0) {
        bajaEventos.forEach(evento => {
          const fechaBajaParsed = parseSupabaseDate(evento.fecha_baja);
          if (!fechaBajaParsed) return;
          if (fechaBajaParsed < startDate12m || fechaBajaParsed > endDate12m) return;

          const numero = evento.numero_empleado;
          if (!Number.isFinite(numero)) return;

          const empleado = plantilla.find(emp => {
            const empNumero = Number((emp as any).numero_empleado ?? emp.emp_id);
            return empNumero === numero;
          });

          const motivoNormalizado = evento.motivo_normalizado || 'Otra razón';

          // Solo validar motivo si tenemos el empleado
          if (empleado && !bajaMatchesMotivo(empleado, motive, motivoNormalizado)) return;
          // Si NO tenemos empleado pero el motive es 'all', incluir la baja de todas formas
          if (!empleado && motive !== 'all') return;

          const key = `${numero}-${fechaBajaParsed.toISOString().slice(0, 10)}`;
          eventosSet.add(key);
        });
      } else {
        // FALLBACK: Si no hay bajaEventos, usar empleados_sftp (comportamiento anterior)
        plantilla.forEach(emp => {
          const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
          if (!fechaBaja) return;
          if (fechaBaja < startDate12m || fechaBaja > endDate12m) return;

          const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
          if (!Number.isFinite(numero)) return;

          const motivoNormalizado = (emp as any)._motivo_normalizado ?? normalizeMotivo((emp as any).motivo_baja || '');

          if (!bajaMatchesMotivo(emp, motive, motivoNormalizado)) return;
          eventosSet.add(`${numero}-${fechaBaja.toISOString().slice(0, 10)}`);
        });
      }

      const bajasEn12Meses = eventosSet.size;

      // Calcular promedio de empleados activos en el período de 12 meses
      const activosInicioRango = plantilla.filter(emp => {
        const fechaIngreso = (emp as any)._fecha_ingreso ?? parseSupabaseDate(emp.fecha_ingreso);
        if (!fechaIngreso || fechaIngreso > startDate12m) {
          return false;
        }
        const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
        return !fechaBaja || fechaBaja > startDate12m;
      }).length;

      const activosFinRango = plantilla.filter(emp => {
        const fechaIngreso = (emp as any)._fecha_ingreso ?? parseSupabaseDate(emp.fecha_ingreso);
        if (!fechaIngreso || fechaIngreso > endDate12m) {
          return false;
        }
        const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
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

  const calculateYTDRotation = (
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
      // YTD: desde enero del mismo año hasta el mes actual
      const startDateYTD = new Date(currentMonthData.year, 0, 1); // 1 de enero del año
      const endDateYTD = endOfMonth(currentMonthDate);

      // Contar todas las bajas en el período YTD
      // SOURCE: motivos_baja (bajaEventos) - fecha_baja and motivo
      const eventosSet = new Set<string>();

      // ✅ CORRECTO: Usar bajaEventos (motivos_baja) como fuente principal
      if (bajaEventos && bajaEventos.length > 0) {
        bajaEventos.forEach(evento => {
          const fechaBajaParsed = parseSupabaseDate(evento.fecha_baja);
          if (!fechaBajaParsed) return;
          if (fechaBajaParsed < startDateYTD || fechaBajaParsed > endDateYTD) return;

          const numero = evento.numero_empleado;
          if (!Number.isFinite(numero)) return;

          const empleado = plantilla.find(emp => {
            const empNumero = Number((emp as any).numero_empleado ?? emp.emp_id);
            return empNumero === numero;
          });

          const motivoNormalizado = evento.motivo_normalizado || 'Otra razón';

          // Solo validar motivo si tenemos el empleado
          if (empleado && !bajaMatchesMotivo(empleado, motive, motivoNormalizado)) return;
          // Si NO tenemos empleado pero el motive es 'all', incluir la baja de todas formas
          if (!empleado && motive !== 'all') return;

          const key = `${numero}-${fechaBajaParsed.toISOString().slice(0, 10)}`;
          eventosSet.add(key);
        });
      } else {
        // FALLBACK: Si no hay bajaEventos, usar empleados_sftp (comportamiento anterior)
        plantilla.forEach(emp => {
          const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
          if (!fechaBaja) return;
          if (fechaBaja < startDateYTD || fechaBaja > endDateYTD) return;

          const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
          if (!Number.isFinite(numero)) return;

          const motivoNormalizado = (emp as any)._motivo_normalizado ?? normalizeMotivo((emp as any).motivo_baja || '');

          if (!bajaMatchesMotivo(emp, motive, motivoNormalizado)) return;
          eventosSet.add(`${numero}-${fechaBaja.toISOString().slice(0, 10)}`);
        });
      }

      const bajasYTD = eventosSet.size;

      // Calcular promedio de empleados activos en el período YTD
      const activosInicioRango = plantilla.filter(emp => {
        const fechaIngreso = (emp as any)._fecha_ingreso ?? parseSupabaseDate(emp.fecha_ingreso);
        if (!fechaIngreso || fechaIngreso > startDateYTD) {
          return false;
        }
        const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
        return !fechaBaja || fechaBaja > startDateYTD;
      }).length;

      const activosFinRango = plantilla.filter(emp => {
        const fechaIngreso = (emp as any)._fecha_ingreso ?? parseSupabaseDate(emp.fecha_ingreso);
        if (!fechaIngreso || fechaIngreso > endDateYTD) {
          return false;
        }
        const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
        return !fechaBaja || fechaBaja > endDateYTD;
      }).length;

      const promedioActivosYTD = (activosInicioRango + activosFinRango) / 2;
      const rotacionYTD = promedioActivosYTD > 0 ? (bajasYTD / promedioActivosYTD) * 100 : 0;

      return Number(rotacionYTD.toFixed(2));
    } catch (error) {
      console.error('Error calculating YTD rotation:', error);
      return 0;
    }
  };

  // Helper para tablas: usa monthlyData (filtrado/toggle) para recalcular bajas 12M, promedio de activos 12M y rotación coherente
  const compute12mStats = (targetYear: number, targetMonth: number) => {
    // No mostrar datos para meses futuros que aún no han ocurrido
    const now = new Date();
    const targetDate = new Date(targetYear, targetMonth - 1, 1);
    if (targetDate > now) {
      return { bajas12m: null, activosProm12m: null, rotacion12m: null };
    }

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

    // Detectar si es el gráfico de Rotación por Temporalidad (stacked bars)
    const temporalityDataKeys = ['bajasMenor3m', 'bajas3a6m', 'bajas6a12m', 'bajasMas12m'];
    const isTemporalityChart = payload.some(e => temporalityDataKeys.includes(e.dataKey));
    const temporalityTotal = isTemporalityChart
      ? payload.reduce((sum, e) => sum + (Number(e.value) || 0), 0)
      : 0;

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
          {/* Total para gráfico de Temporalidad */}
          {isTemporalityChart && (
            <div
              className="flex items-center gap-2 text-[11px] pt-1 mt-1 border-t"
              style={{ color: tooltipTextColor, borderColor: tooltipBorder }}
            >
              <span className="h-2 w-2 shrink-0" />
              <span className="font-bold" style={{ color: tooltipLabelColor }}>
                Total
              </span>
              <span className="ml-auto font-bold">
                {temporalityTotal.toLocaleString('es-MX')}
              </span>
            </div>
          )}
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
    // ✅ INVERTIDO: Para rotación, positivo = rojo (malo), negativo = verde (bueno)
    const base = isIncrease
      ? { r: 239, g: 68, b: 68 }    // Rojo para aumento (malo)
      : { r: 34, g: 197, b: 94 };   // Verde para disminución (bueno)

    const intensity = Math.min(Math.abs(value) / 12, 1);
    const backgroundAlpha = 0.28 + intensity * 0.38;  // Más visible
    const borderAlpha = 0.5 + intensity * 0.35;       // Más visible
    const lightTextColor = isIncrease ? "#991B1B" : "#166534";

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

  const selectedYearForCharts = availableYears[availableYears.length - 1];
  const previousYearForCharts = availableYears.length > 1 ? availableYears[0] : undefined;

  const selectedYearForMonthly = currentYear || new Date().getFullYear();
  const previousYearForMonthly = selectedYearForMonthly - 1;
  const now = new Date();

  const monthlyChartData = monthNames
    .map((monthName, index) => {
      const monthIndex = index + 1;
      const currentEntry = monthlyData.find(d => {
        const fecha = new Date(d.year, d.month - 1, 1);
        return d.year === selectedYearForMonthly && d.month === monthIndex && fecha <= now;
      });
      const previousEntry = monthlyData.find(d => {
        const fecha = new Date(d.year, d.month - 1, 1);
        return d.year === previousYearForMonthly && d.month === monthIndex && fecha <= now;
      });

      // ✅ SIEMPRE INCLUIR EL MES - no filtrar meses sin datos
      return {
        mes: monthName,  // Usar solo monthName para no mostrar el año en eje X
        rotacionActual: currentEntry?.rotacionPorcentaje ?? null,
        rotacionAnterior: previousEntry?.rotacionPorcentaje ?? null
      };
    });

  // ✅ Dataset para gráfico de 12M Móviles con eje X dinámico
  // Muestra los últimos 12 meses reales (ej: "ene", "feb"... "dic")
  const rolling12MChartData = (() => {
    const windowStart = subMonths(currentDate, 11);
    const last12Months = monthlyData
      .filter(d => {
        const dataDate = new Date(d.year, d.month - 1, 1);
        return dataDate >= startOfMonth(windowStart) && dataDate <= endOfMonth(currentDate);
      })
      .sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, 1);
        const dateB = new Date(b.year, b.month - 1, 1);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-12);

    // ✅ ASEGURAR QUE SIEMPRE HAYA 12 MESES - llenar con null si faltan
    const result: Array<{ mes: string; rotacionAcumulada: number | null; year: number; month: number }> = [];

    for (let offset = 11; offset >= 0; offset--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear();
      const monthLabel = monthNames[targetDate.getMonth()];

      const existingData = last12Months.find(d => d.year === targetYear && d.month === targetMonth);

      result.push({
        mes: monthLabel,
        rotacionAcumulada: existingData?.rotacionAcumulada12m ?? null,
        year: targetYear,
        month: targetMonth
      });
    }

    return result;
  })();

  // Dataset para comparación año anterior en 12M móviles
  const rolling12MPreviousYearData = (() => {
    const windowStart = subMonths(currentDate, 23);
    const windowEnd = subMonths(currentDate, 12);

    const previousYearMonths = monthlyData
      .filter(d => {
        const dataDate = new Date(d.year, d.month - 1, 1);
        return dataDate >= startOfMonth(windowStart) && dataDate <= endOfMonth(windowEnd);
      })
      .sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, 1);
        const dateB = new Date(b.year, b.month - 1, 1);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-12);

    const dataMap = new Map<number, number>();
    previousYearMonths.forEach(d => {
      dataMap.set(d.month, d.rotacionAcumulada12m ?? 0);
    });
    return dataMap;
  })();

  // Combinar datos actuales con año anterior para el gráfico de 12M
  const rolling12MCombinedData = rolling12MChartData.map(d => ({
    ...d,
    rotacionAnterior: rolling12MPreviousYearData.get(d.month) ?? null
  }));

  // Calcular los años para la leyenda del gráfico de 12M
  const rolling12MYearActual = rolling12MChartData.length > 0
    ? rolling12MChartData[rolling12MChartData.length - 1].year
    : currentDate.getFullYear();
  const rolling12MYearAnterior = rolling12MYearActual - 1;
  
  return (
    <div className="space-y-6">
      {/* Primera fila de gráficas - con borde sutil para distinguir del resto */}
      <div className="relative rounded-2xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-50/30 to-transparent p-4 dark:border-blue-400/20 dark:from-blue-950/20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Rotación Acumulada (12 meses móviles) con eje X DINÁMICO */}
        <div className="rounded-lg border bg-card p-4 shadow-sm h-full dark:border-brand-border/40 dark:bg-brand-surface-accent/70">
          <h3 className="text-base font-semibold mb-2">Rotación Acumulada (12 meses móviles)</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {rolling12MCombinedData.length > 0
              ? `Ventana móvil: ${rolling12MCombinedData[0]?.mes} - ${rolling12MCombinedData[rolling12MCombinedData.length - 1]?.mes}`
              : 'Últimos 12 meses'}
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
                  <ComposedChart data={rolling12MCombinedData}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 10, fill: axisSecondaryColor }}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisMutedColor }}
                      label={{ value: 'Rotación %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisPrimaryColor } }}
                      domain={rotationDomain}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(0), 0.35) }} content={<CustomTooltip />} wrapperStyle={TOOLTIP_WRAPPER_STYLE} />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    <Area
                      type="monotone"
                      dataKey="rotacionAnterior"
                      name={`${rolling12MYearAnterior}`}
                      stroke={withOpacity('#94a3b8', 0.9)}
                      fill={withOpacity('#94a3b8', 0.25)}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3, fill: '#94a3b8' }}
                      legendType="none"
                      connectNulls={true}
                    />
                    <Bar
                      dataKey="rotacionAcumulada"
                      name={`${rolling12MYearActual}`}
                      fill={getModernColor(0)}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                      label={renderBarLabelPercent}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </VisualizationContainer>
        </div>

        {/* Gráfico 2: Rotación - Lo que va del Año */}
        <div className="rounded-lg border bg-card p-4 shadow-sm h-full dark:border-brand-border/40 dark:bg-brand-surface-accent/70">
          <h3 className="text-base font-semibold mb-2">Rotación - Lo que va del Año</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Rotación acumulada de enero a la fecha
          </p>
          <VisualizationContainer
            title="Rotación YTD"
            type="chart"
            className="h-[280px] w-full"
            filename="rotacion-ytd"
          >
            {(fullscreen) => (
              <div style={{ height: fullscreen ? 360 : 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearlyComparison}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: axisSecondaryColor }}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisMutedColor }}
                      label={{ value: 'Rotación %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisPrimaryColor } }}
                      domain={rotationDomain}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(0), 0.35) }} content={<CustomTooltip />} wrapperStyle={TOOLTIP_WRAPPER_STYLE} />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {previousYearForCharts && (
                      <Area
                        type="monotone"
                        dataKey={`rotacionYTD${previousYearForCharts}`}
                        name={`${previousYearForCharts} (año anterior)`}
                        stroke={withOpacity('#94a3b8', 0.9)}
                        fill={withOpacity('#94a3b8', 0.25)}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: '#94a3b8' }}
                        legendType="none"
                        connectNulls={true}
                      />
                    )}
                    {selectedYearForCharts && (
                      <Bar
                        dataKey={`rotacionYTD${selectedYearForCharts}`}
                        name={`${selectedYearForCharts}`}
                        fill={getModernColor(0)}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={18}
                        label={renderBarLabelPercent}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </VisualizationContainer>
        </div>

        {/* Gráfico 4: Rotación Mensual (Múltiples Líneas) */}
        <div className="rounded-lg border bg-card p-4 shadow-sm h-full dark:border-brand-border/40 dark:bg-brand-surface-accent/70">
          <h3 className="text-base font-semibold mb-2">Rotación Mensual</h3>
          <p className="mb-4 text-sm text-muted-foreground">Rotación mensual % con comparativo del año anterior</p>
          <VisualizationContainer
            title="Rotación mensual"
            type="chart"
            className="h-[280px] w-full"
            filename="rotacion-mensual"
          >
            {(fullscreen) => (
              <div style={{ height: fullscreen ? 360 : 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: axisSecondaryColor }}
                      angle={0}
                      tickMargin={10}
                      height={38}
                      interval={0}
                      tickFormatter={(value: string) => {
                        // Quitar año del mes (ej: "ene 25" → "ene")
                        return value.replace(/\s*\d{2,4}\s*$/, '').trim();
                      }}
                    />
                    <YAxis
                      orientation="left"
                      tick={{ fontSize: 11, fill: axisMutedColor }}
                      label={{ value: 'Rotación %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisPrimaryColor } }}
                      domain={[0, 10]}
                      tickCount={6}
                      allowDecimals={false}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(1), 0.35) }} content={<CustomTooltip />} wrapperStyle={TOOLTIP_WRAPPER_STYLE} />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {previousYearForMonthly && (
                      <Area
                        type="monotone"
                        dataKey="rotacionAnterior"
                        name={`${previousYearForMonthly} (año anterior)`}
                        stroke={withOpacity('#94a3b8', 0.9)}
                        fill={withOpacity('#94a3b8', 0.25)}
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3, fill: '#94a3b8' }}
                        legendType="none"
                        connectNulls={true}
                      />
                    )}
                    <Bar
                      dataKey="rotacionActual"
                      name={selectedYearForMonthly.toString()}
                      fill={MONTHLY_SERIES_COLORS.rotation}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={22}
                      label={renderBarLabelPercent}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </VisualizationContainer>
        </div>

        {/* Gráfico 3: Rotación por Temporalidad (Barras Apiladas por Mes) */}
        <div className="rounded-lg border bg-card p-4 shadow-sm h-full dark:border-brand-border/40 dark:bg-brand-surface-accent/70">
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
                    // FIX: Usar el año de currentDate (fecha seleccionada) en lugar del año del sistema
                    const targetYear = currentYear || currentDate?.getFullYear() || new Date().getFullYear();
                    const referenceDate = currentDate || new Date();
                    return d.year === targetYear && fecha <= referenceDate;
                  })}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridStrokeColor} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: axisSecondaryColor }}
                      angle={0}
                      tickMargin={10}
                      height={38}
                      tickFormatter={(value: string) => {
                        // Quitar año del mes (ej: "ene 25" → "ene")
                        return value.replace(/\s*\d{2,4}\s*$/, '').trim();
                      }}
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
                    <Bar dataKey="bajasMenor3m" stackId="a" fill={TEMPORALITY_COLORS[0]} name="< 3 meses" />
                    <Bar dataKey="bajas3a6m" stackId="a" fill={TEMPORALITY_COLORS[1]} name="3-6 meses" />
                    <Bar dataKey="bajas6a12m" stackId="a" fill={TEMPORALITY_COLORS[2]} name="6-12 meses" />
                    <Bar dataKey="bajasMas12m" stackId="a" fill={TEMPORALITY_COLORS[3]} name="+12 meses" label={renderBarLabel} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: TEMPORALITY_COLORS[0] }}
                    />
                    <span>{"< 3 meses"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: TEMPORALITY_COLORS[1] }}
                    />
                    <span>3-6 meses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: TEMPORALITY_COLORS[2] }}
                    />
                    <span>6-12 meses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: TEMPORALITY_COLORS[3] }}
                    />
                    <span>+12 meses</span>
                  </div>
                </div>
              </div>
            )}
          </VisualizationContainer>
        </div>
        </div>
      </div>

      {/* Tablas comparativas lado a lado */}
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 2xl:grid-cols-2 gap-8 auto-rows-max items-start">
        {/* Tabla comparativa de Rotación Acumulada */}
        <Card className="h-full w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tabla Comparativa - Rotación Acumulada 12 Meses Móviles</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <VisualizationContainer
              title="Tabla comparativa - Rotación acumulada"
              type="table"
              className="w-full"
              filename="tabla-rotacion-acumulada"
            >
              {(isFullscreen) => (
            <div className="relative w-full overflow-visible rounded-xl border border-slate-200/70 shadow-sm dark:border-slate-700/60">
              <table className="w-full table-auto border-separate border-spacing-0 text-xs text-foreground md:text-sm whitespace-normal">
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
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15"># Activos prom 12M</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15">% Rot. 12M</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Bajas 12M</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Activos prom 12M</th>
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
                        className={index % 2 === 0 ? 'bg-gray-50/60 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}
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
        <Card className="h-full w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tabla Comparativa - Rotación Mensual</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <VisualizationContainer
              title="Tabla comparativa - Rotación mensual"
              type="table"
              className="w-full"
              filename="tabla-rotacion-mensual"
            >
              {(isFullscreen) => (
            <div className="relative w-full overflow-visible rounded-xl border border-slate-200/70 shadow-sm dark:border-slate-700/60">
              <table className="w-full table-auto border-separate border-spacing-0 text-xs text-foreground md:text-sm whitespace-normal">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-800/60">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm" rowSpan={2}>Mes</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm bg-blue-100 dark:bg-blue-500/20" colSpan={3}>{availableYears[0] || new Date().getFullYear() - 1}</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm bg-red-100 dark:bg-red-500/20" colSpan={3}>{availableYears[availableYears.length - 1] || new Date().getFullYear()}</th>
                    <th className="min-w-[90px] px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-slate-100 md:text-sm" rowSpan={2}>Variación</th>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700/70">
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15">% Rotación</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15"># Bajas</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-blue-50 dark:bg-blue-500/15"># Activos (fin de mes)</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15">% Rotación</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Bajas</th>
                    <th className="px-3 py-1.5 text-center text-[11px] font-semibold text-brand-ink dark:text-slate-100 md:text-xs bg-red-50 dark:bg-red-500/15"># Activos (fin de mes)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthNames.map((monthName, index) => {
                    const year1 = availableYears[0] || new Date().getFullYear() - 1;
                    const year2 = availableYears[availableYears.length - 1] || new Date().getFullYear();
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
                        className={index % 2 === 0 ? 'bg-gray-50/60 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}
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
