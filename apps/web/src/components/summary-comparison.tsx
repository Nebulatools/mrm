'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingDown, AlertCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps, TooltipPayload } from 'recharts';
import { isMotivoClave, normalizeIncidenciaCode } from '@/lib/normalizers';
import { cn } from '@/lib/utils';
import type { PlantillaRecord } from '@/lib/supabase';
import {
  calculateActivosPromedio,
  calculateVariancePercentage,
  calcularRotacionConDesglose,
  calcularRotacionAcumulada12mConDesglose,
  calcularRotacionYTDConDesglose
} from '@/lib/utils/kpi-helpers';
import { VisualizationContainer } from '@/components/visualization-container';
import { CHART_COLORS, getModernColor, withOpacity } from '@/lib/chart-colors';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { KPICard } from '@/components/kpi-card';
import { useTheme } from '@/components/theme-provider';

interface BajaRecord {
  numero_empleado: number;
  fecha_baja: string;
  tipo: string;
  motivo: string;
}

interface IncidenciaRecord {
  emp: number;
  fecha: string;
  inci: string;
}

interface SummaryComparisonProps {
  plantilla: PlantillaRecord[];
  plantillaYearScope?: PlantillaRecord[];
  bajas: BajaRecord[];
  incidencias: IncidenciaRecord[];
  selectedYear?: number;    // ✅ Opcional: undefined = SIN filtro (mostrar TODO)
  selectedMonth?: number;   // ✅ Opcional: undefined = SIN filtro (mostrar TODO)
  referenceDate?: Date;
  refreshEnabled?: boolean;
  retentionKPIsOverride?: {
    rotacionMensual: number;
    rotacionMensualAnterior: number;
    rotacionAcumulada: number;
    rotacionAcumuladaAnterior: number;
    rotacionAnioActual: number;
    rotacionAnioActualAnterior: number;
  };
  incidentsKPIsOverride?: {
    incidencias: number;
    incidenciasAnterior: number;
    permisos: number;
    permisosAnterior: number;
  };
}

type IncidenciaWithDescription = IncidenciaRecord & { incidencia?: string | null };

// ✅ Códigos de incidencias y permisos (igual que en incidents-tab.tsx)
const INCIDENT_CODES = new Set(["FI", "SUS", "PSIN", "ENFE"]);
const PERMISO_CODES = new Set(["PCON", "VAC", "MAT3", "MAT1", "JUST"]);

const formatMonthLabel = (date: Date) => {
  const monthLabel = date.toLocaleDateString('es-MX', { month: 'short' });
  const cleanedLabel = monthLabel.replace('.', '').trim();
  const monthWithCase = `${cleanedLabel.charAt(0).toUpperCase()}${cleanedLabel.slice(1)}`;
  return `${monthWithCase} ${date.getFullYear().toString().slice(-2)}`;
};

const NEGOCIO_COLOR_PALETTE = CHART_COLORS.modernSeries;
const LEGEND_WRAPPER_STYLE: CSSProperties = { paddingTop: 8 };
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
const getTooltipContentStyle = (isDark: boolean): CSSProperties => ({
  borderRadius: 12,
  borderColor: isDark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0',
  backgroundColor: isDark ? 'hsl(var(--card))' : '#FFFFFF',
  padding: '10px 12px',
  boxShadow: isDark ? '0 16px 45px -20px rgba(8, 14, 26, 0.65)' : '0 12px 32px -18px rgba(15, 23, 42, 0.35)'
});
const getTooltipLabelStyle = (isDark: boolean): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: isDark ? '#E2E8F0' : '#334155'
});
const TENURE_COLORS = [
  '#4f46e5', // indigo 600
  '#0ea5e9', // sky 500
  '#14b8a6', // teal 500
  '#f97316', // orange 500
  '#f43f5e', // rose 500
];

const createSummaryTooltip = (
  valueFormatter: (entry: TooltipPayload, index: number) => string,
  nameFormatter: ((entry: TooltipPayload, index: number) => string) | undefined,
  isDark: boolean
) =>
  ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const borderColor = isDark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0';
    const backgroundColor = isDark ? 'hsl(var(--card))' : '#FFFFFF';
    const boxShadow = isDark
      ? '0 16px 45px -20px rgba(8, 14, 26, 0.65)'
      : '0 16px 45px -20px rgba(15, 23, 42, 0.45)';
    const textClass = isDark ? 'text-slate-100' : 'text-slate-700';

    return (
      <div
        className="rounded-xl border px-3 py-2 shadow-lg"
        style={{
          borderColor,
          backgroundColor,
          boxShadow
        }}
      >
        <p className={cn("text-[11px] font-semibold", textClass)}>{label}</p>
        <div className="mt-1 space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`${entry.dataKey}-${index}`} className={cn("flex items-center gap-2 text-[11px]", textClass)}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color ?? getModernColor(index) }} />
              <span className={cn("flex-1 truncate font-medium", textClass)}>
                {nameFormatter ? nameFormatter(entry, index) : String(entry.name ?? '')}
              </span>
              <span className={cn("ml-auto font-semibold", textClass)}>
                {valueFormatter(entry, index)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

const sanitizeSeriesKey = (label: string) => {
  const base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return base || 'serie';
};

type NegocioSeriesConfig = {
  label: string;
  key: string;
  empleadosRotacion: PlantillaRecord[];
  empleadoIds: Set<number>;
};

export function SummaryComparison({
  plantilla,
  plantillaYearScope,
  bajas,
  incidencias,
  selectedYear,
  selectedMonth,
  referenceDate: referenceDateProp,
  refreshEnabled = false,
  retentionKPIsOverride,
  incidentsKPIsOverride
}: SummaryComparisonProps) {

  const plantillaRotacion = plantillaYearScope && plantillaYearScope.length > 0 ? plantillaYearScope : plantilla;

  const negocioSeriesConfig = useMemo<NegocioSeriesConfig[]>(() => {
    const entries = new Map<string, { label: string; empleadosRotacion: PlantillaRecord[]; empleadoIds: Set<number> }>();

    const register = (emp: PlantillaRecord | undefined, includeInRotacion: boolean) => {
      if (!emp) return;
      const rawLabel = typeof emp.empresa === 'string' && emp.empresa.trim().length > 0 ? emp.empresa.trim() : 'Sin Negocio';
      let entry = entries.get(rawLabel);
      if (!entry) {
        entry = { label: rawLabel, empleadosRotacion: [], empleadoIds: new Set<number>() };
        entries.set(rawLabel, entry);
      }
      if (includeInRotacion) {
        entry.empleadosRotacion.push(emp);
      }
      const numero = Number((emp as any).numero_empleado ?? (emp as any).emp_id);
      if (!Number.isNaN(numero)) {
        entry.empleadoIds.add(numero);
      }
    };

    (plantillaRotacion || []).forEach(emp => register(emp, true));
    (plantilla || []).forEach(emp => register(emp, false));

    if (entries.size === 0) {
      entries.set('Sin Negocio', { label: 'Sin Negocio', empleadosRotacion: [], empleadoIds: new Set<number>() });
    }

    const configs: NegocioSeriesConfig[] = Array.from(entries.values()).map((entry, index) => {
      const keyBase = sanitizeSeriesKey(entry.label || `Negocio ${index + 1}`);
      return {
        label: entry.label || `Negocio ${index + 1}`,
        key: keyBase || `negocio_${index}`,
        empleadosRotacion: entry.empleadosRotacion,
        empleadoIds: entry.empleadoIds
      };
    });

    const seenKeys = new Set<string>();
    configs.forEach((config, index) => {
      let keyCandidate = config.key;
      while (seenKeys.has(keyCandidate)) {
        keyCandidate = `${config.key}_${index}`;
      }
      config.key = keyCandidate;
      seenKeys.add(keyCandidate);
    });

    configs.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
    return configs;
  }, [plantillaRotacion, plantilla]);

  const [motivoFilterType, setMotivoFilterType] = useState<'involuntaria' | 'voluntaria'>('involuntaria');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#E2E8F0' : '#475569';
  const axisLabelColor = isDark ? '#E2E8F0' : '#334155';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0';
  const tooltipContentStyle = getTooltipContentStyle(isDark);
  const tooltipLabelStyle = getTooltipLabelStyle(isDark);

  const referenceDate = useMemo(() => {
    const today = new Date();

    if (referenceDateProp) {
      return new Date(referenceDateProp.getFullYear(), referenceDateProp.getMonth(), 1);
    }

    const targetYear = selectedYear ?? today.getFullYear();

    let targetMonth: number;
    if (selectedMonth !== undefined) {
      targetMonth = selectedMonth - 1;
    } else if (targetYear === today.getFullYear()) {
      targetMonth = today.getMonth();
    } else {
      targetMonth = 11;
    }

    const candidate = new Date(targetYear, targetMonth, 1);
    if (candidate > today) {
      return today;
    }

    return candidate;
  }, [referenceDateProp, selectedYear, selectedMonth]);

  const rotationSeries = useMemo(() => {
    const baseDate = referenceDate;
    const points: Array<{
      key: string;
      label: string;
      month: number;
      year: number;
      negocios: Record<string, {
        mensual: ReturnType<typeof calcularRotacionConDesglose>;
        rolling: ReturnType<typeof calcularRotacionAcumulada12mConDesglose>;
        ytd: ReturnType<typeof calcularRotacionYTDConDesglose>;
      }>;
    }> = [];

    for (let offset = 11; offset >= 0; offset--) {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
      const startDate = new Date(current.getFullYear(), current.getMonth(), 1);
      const endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0);

      const negociosData: Record<string, {
        mensual: ReturnType<typeof calcularRotacionConDesglose>;
        rolling: ReturnType<typeof calcularRotacionAcumulada12mConDesglose>;
        ytd: ReturnType<typeof calcularRotacionYTDConDesglose>;
      }> = {};

      negocioSeriesConfig.forEach(({ key, empleadosRotacion }) => {
        const plantillaNegocio = empleadosRotacion.length > 0 ? empleadosRotacion : [];
        const mensual = calcularRotacionConDesglose(plantillaNegocio, startDate, endDate);
        const rolling = calcularRotacionAcumulada12mConDesglose(plantillaNegocio, endDate);
        const ytd = calcularRotacionYTDConDesglose(plantillaNegocio, endDate);
        negociosData[key] = { mensual, rolling, ytd };
      });

      points.push({
        key: `${current.getFullYear()}-${current.getMonth() + 1}`,
        label: formatMonthLabel(current),
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        negocios: negociosData
      });
    }

    return points;
  }, [negocioSeriesConfig, referenceDate]);

  const empleadoNegocioMap = useMemo(() => {
    const map = new Map<number, string>();
    negocioSeriesConfig.forEach(({ key, empleadoIds }) => {
      empleadoIds.forEach(id => {
        map.set(id, key);
      });
    });
    return map;
  }, [negocioSeriesConfig]);

  const incidenciasPermisosSeries = useMemo(() => {
    if (!incidencias || incidencias.length === 0) {
      return [] as Array<{
        mes: string;
        month: number;
        year: number;
        negocios: Record<string, { incidencias: number; permisos: number }>;
      }>;
    }

    const baseDate = referenceDate;
    const series: Array<{
      mes: string;
      month: number;
      year: number;
      negocios: Record<string, { incidencias: number; permisos: number }>;
    }> = [];

    for (let offset = 11; offset >= 0; offset--) {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
      const startDate = new Date(current.getFullYear(), current.getMonth(), 1);
      const endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

      const negociosCounts: Record<string, { incidencias: number; permisos: number }> = {};
      negocioSeriesConfig.forEach(({ key }) => {
        negociosCounts[key] = { incidencias: 0, permisos: 0 };
      });

      incidencias.forEach((inc) => {
        const empleadoId = Number(inc.emp);
        if (Number.isNaN(empleadoId)) return;
        const negocioKey = empleadoNegocioMap.get(empleadoId);
        if (!negocioKey) return;

        const fechaInc = new Date(inc.fecha);
        if (fechaInc < startDate || fechaInc > endDate) return;

        const code = normalizeIncidenciaCode(inc.inci);
        if (code && INCIDENT_CODES.has(code)) {
          negociosCounts[negocioKey].incidencias += 1;
        } else if (code && PERMISO_CODES.has(code)) {
          negociosCounts[negocioKey].permisos += 1;
        }
      });

      series.push({
        mes: formatMonthLabel(current),
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        negocios: negociosCounts
      });
    }

    return series;
  }, [incidencias, empleadoNegocioMap, negocioSeriesConfig, referenceDate]);

  // ✅ ACTUALIZADO: Calcular antigüedad en meses y categorizar según nuevas especificaciones
  const getAntiguedadMeses = (fechaIngreso: string): number => {
    const ingreso = new Date(fechaIngreso);
    const hoy = new Date();
    const diffTime = hoy.getTime() - ingreso.getTime();
    return Math.floor(diffTime / (30.44 * 24 * 60 * 60 * 1000)); // Promedio de días por mes
  };

  // ✅ ACTUALIZADO: Clasificar antigüedad según nuevas categorías
  // NUEVAS CATEGORÍAS: 0-3 meses, 3-6 meses, 6-12 meses, 1-3 años, +3 años
  const clasificarAntiguedad = (meses: number): string => {
    if (meses < 3) return '0-3 meses';
    if (meses < 6) return '3-6 meses';
    if (meses < 12) return '6-12 meses';
    if (meses < 36) return '1-3 años'; // 1-3 años = 12-36 meses
    return '+3 años';
  };

  // ✅ ELIMINADA función duplicada - ahora usa funciones centralizadas de kpi-helpers.ts

  // Calcular KPIs para un mes específico tomando como base el mes de referencia
  const calcularKPIsDelMes = (
    grupo: PlantillaRecord[],
    baseDataset: PlantillaRecord[] | undefined,
    referencia: Date
  ) => {
    const periodoInicio = startOfMonth(referencia);
    const periodoFin = endOfMonth(referencia);

    const base = baseDataset && baseDataset.length > 0 ? baseDataset : grupo;

    const empleadosActivos = grupo.filter(emp => {
      const fechaIngreso = emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : null;
      if (!fechaIngreso || Number.isNaN(fechaIngreso.getTime()) || fechaIngreso > periodoFin) {
        return false;
      }

      if (!emp.fecha_baja) {
        return true;
      }

      const fechaBaja = new Date(emp.fecha_baja);
      if (Number.isNaN(fechaBaja.getTime())) {
        return true;
      }

      return fechaBaja >= periodoFin;
    }).length;

    const rotacionMensual = calcularRotacionConDesglose(base, periodoInicio, periodoFin);
    const rotacionAcumuladaDesglose = calcularRotacionAcumulada12mConDesglose(base, periodoFin);
    const rotacionAnioActualDesglose = calcularRotacionYTDConDesglose(base, periodoFin);

    const empleadosIds = new Set(
      grupo
        .map(e => {
          const numero = Number(e.numero_empleado ?? e.emp_id);
          return Number.isNaN(numero) ? null : numero;
        })
        .filter((v): v is number => v !== null)
    );

    const incidenciasDelMes = incidencias.filter(inc => {
      if (!empleadosIds.has(inc.emp)) return false;
      const fechaInc = new Date(inc.fecha);
      if (Number.isNaN(fechaInc.getTime())) return false;
      return fechaInc >= periodoInicio && fechaInc <= periodoFin;
    });

    let totalIncidencias = 0;
    let permisos = 0;

    incidenciasDelMes.forEach(inc => {
      const code = normalizeIncidenciaCode(inc.inci);
      const descripcion = ((inc as IncidenciaWithDescription).incidencia ?? '').toLowerCase();

      if (code && INCIDENT_CODES.has(code)) {
        totalIncidencias += 1;
        return;
      }

      if (code && PERMISO_CODES.has(code)) {
        permisos += 1;
        return;
      }

      if (descripcion.includes('permiso')) {
        permisos += 1;
      }
    });

    console.log('📊 Tab Resumen - KPIs calculados:', {
      periodo: referencia.toISOString().slice(0, 10),
      rotacionMensual: `${rotacionMensual.total.toFixed(1)}%`,
      rotacionAcumulada: `${rotacionAcumuladaDesglose.total.toFixed(1)}%`,
      rotacionAnioActual: `${rotacionAnioActualDesglose.total.toFixed(1)}%`,
      incidencias: totalIncidencias,
      permisos
    });

    const result = {
      empleadosActivos,
      rotacionMensual: rotacionMensual.total,
      rotacionAcumulada: rotacionAcumuladaDesglose.total,
      rotacionAnioActual: rotacionAnioActualDesglose.total,
      incidencias: totalIncidencias,
      permisos
    };

    if (retentionKPIsOverride) {
      result.rotacionMensual = retentionKPIsOverride.rotacionMensual;
      result.rotacionAcumulada = retentionKPIsOverride.rotacionAcumulada;
      result.rotacionAnioActual = retentionKPIsOverride.rotacionAnioActual;
    }

    if (incidentsKPIsOverride) {
      result.incidencias = incidentsKPIsOverride.incidencias;
      result.permisos = incidentsKPIsOverride.permisos;
    }

    return result;
  };

  // Calcular ausentismo
  const calcularAusentismo = (grupo: PlantillaRecord[]) => {
    const empleadosIds = grupo.map(e => e.numero_empleado || Number(e.emp_id));
    const incidenciasGrupo = incidencias.filter(i => empleadosIds.includes(i.emp));

    const permisos = incidenciasGrupo.filter(i =>
      i.inci?.toUpperCase() === 'INC' ||
      i.inci?.toUpperCase().includes('PERMISO')
    ).length;

    const faltas = incidenciasGrupo.filter(i =>
      i.inci?.toUpperCase() === 'FJ' ||
      i.inci?.toUpperCase() === 'FI'
    ).length;

    return {
      total: incidenciasGrupo.length,
      permisos,
      faltas,
      otros: incidenciasGrupo.length - permisos - faltas
    };
  };

  // Preparar datos por NEGOCIO
  const datosPorNegocio = () => {
    const negocios = [...new Set(plantilla.map(e => e.empresa))].filter(Boolean);

    return negocios.map(negocio => {
      // ✅ CORREGIDO: Incluir TODOS los empleados (activos Y dados de baja)
      // para que calcularRotacion() pueda encontrar las bajas
      const empleados = plantilla.filter(e => (e.empresa || '') === negocio);

      // ✅ ACTUALIZADO: Activos por antigüedad usando nueva clasificación (solo empleados activos)
      const empleadosActivos = empleados.filter(e => e.activo);
      const porAntiguedad = empleadosActivos.reduce((acc, emp) => {
        const meses = getAntiguedadMeses(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(meses);
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const hoy = new Date();
      const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const mesFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

      return {
        nombre: negocio || 'Sin Negocio',
        total: empleadosActivos.length, // Solo activos para el conteo
        antiguedad: porAntiguedad,
        rotacion: {
          mensual: calcularRotacionConDesglose(empleados, mesInicio, mesFin),
          doce_meses: calcularRotacionAcumulada12mConDesglose(empleados, hoy),
          ytd: calcularRotacionYTDConDesglose(empleados, hoy)
        },
        ausentismo: calcularAusentismo(empleados)
      };
    });
  };

  // Preparar datos por ÁREA
  const datosPorArea = () => {
    const areas = [...new Set(plantilla.map(e => e.area))].filter(Boolean);

    return areas.map(area => {
      // ✅ CORREGIDO: Incluir TODOS los empleados (activos Y dados de baja)
      const empleados = plantilla.filter(e => (e.area || '') === area);

      // ✅ ACTUALIZADO: Activos por antigüedad usando nueva clasificación (solo empleados activos)
      const empleadosActivos = empleados.filter(e => e.activo);
      const porAntiguedad = empleadosActivos.reduce((acc, emp) => {
        const meses = getAntiguedadMeses(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(meses);
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const hoy = new Date();
      const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const mesFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

      return {
        nombre: area || 'Sin Área',
        total: empleadosActivos.length, // Solo activos
        antiguedad: porAntiguedad,
        rotacion: {
          mensual: calcularRotacionConDesglose(empleados, mesInicio, mesFin),
          doce_meses: calcularRotacionAcumulada12mConDesglose(empleados, hoy),
          ytd: calcularRotacionYTDConDesglose(empleados, hoy)
        },
        ausentismo: calcularAusentismo(empleados)
      };
    });
  };

  // Preparar datos por DEPARTAMENTO
  const datosPorDepartamento = () => {
    const departamentos = [...new Set(plantilla.map(e => e.departamento))].filter(Boolean);

    return departamentos.map(depto => {
      // ✅ CORREGIDO: Incluir TODOS los empleados (activos Y dados de baja)
      const empleados = plantilla.filter(e => e.departamento === depto);

      // ✅ ACTUALIZADO: Activos por antigüedad usando nueva clasificación (solo empleados activos)
      const empleadosActivos = empleados.filter(e => e.activo);
      const porAntiguedad = empleadosActivos.reduce((acc, emp) => {
        const meses = getAntiguedadMeses(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(meses);
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const hoy = new Date();
      const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const mesFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

      return {
        nombre: depto,
        total: empleadosActivos.length, // Solo activos
        antiguedad: porAntiguedad,
        rotacion: {
          mensual: calcularRotacionConDesglose(empleados, mesInicio, mesFin),
          doce_meses: calcularRotacionAcumulada12mConDesglose(empleados, hoy),
          ytd: calcularRotacionYTDConDesglose(empleados, hoy)
        },
        ausentismo: calcularAusentismo(empleados)
      };
    });
  };

  const renderSeccion = (datos: ReturnType<typeof datosPorNegocio>, tipoGrupo: 'negocio' | 'area' | 'departamento') => {
    // ✅ CORREGIDO: Los KPIs de arriba (Incidencias, Permisos) usan TODA la plantilla filtrada
    // No deben reagruparse, ya vienen filtrados desde dashboard-page.tsx
    // Calcular KPIs del mes actual y anterior para comparación usando TODA la plantilla filtrada
    const kpisActuales = calcularKPIsDelMes(plantilla, plantillaRotacion, referenceDate);
    const kpisPrevMonth = calcularKPIsDelMes(plantilla, plantillaRotacion, subMonths(referenceDate, 1));
    const kpisPrevYear = calcularKPIsDelMes(plantilla, plantillaRotacion, subMonths(referenceDate, 12));

    if (retentionKPIsOverride) {
      kpisPrevMonth.rotacionMensual = retentionKPIsOverride.rotacionMensualAnterior;
      kpisPrevYear.rotacionAcumulada = retentionKPIsOverride.rotacionAcumuladaAnterior;
      kpisPrevYear.rotacionAnioActual = retentionKPIsOverride.rotacionAnioActualAnterior;
    }

    if (incidentsKPIsOverride) {
      kpisPrevMonth.incidencias = incidentsKPIsOverride.incidenciasAnterior;
      kpisPrevMonth.permisos = incidentsKPIsOverride.permisosAnterior;
    }

    const effectiveReference = referenceDate ?? new Date();
    const currentMonthStart = startOfMonth(effectiveReference);
    const currentMonthEnd = endOfMonth(effectiveReference);
    const rollingWindowStart = startOfMonth(subMonths(effectiveReference, 11));
    const currentYearStart = new Date(effectiveReference.getFullYear(), 0, 1);
    const summaryCardItems = [
      {
        key: 'empleados-activos',
        icon: <Users className="h-6 w-6" />,
        secondaryLabel: 'vs mes anterior',
        secondaryValue: kpisPrevMonth.empleadosActivos,
        hidePreviousValue: true,
        kpi: {
          name: 'Empleados Activos',
          category: 'headcount',
          value: kpisActuales.empleadosActivos,
          previous_value: kpisPrevMonth.empleadosActivos,
          variance_percentage: calculateVariancePercentage(kpisActuales.empleadosActivos, kpisPrevMonth.empleadosActivos),
          period_start: format(currentMonthStart, 'yyyy-MM-dd'),
          period_end: format(currentMonthEnd, 'yyyy-MM-dd')
        }
      },
      {
        key: 'rotacion-mensual',
        icon: <TrendingDown className="h-6 w-6" />,
        secondaryLabel: 'vs mes anterior',
        secondaryValue: kpisPrevMonth.rotacionMensual,
        hidePreviousValue: true,
        kpi: {
          name: 'Rotación Mensual',
          category: 'retention',
          value: kpisActuales.rotacionMensual,
          previous_value: kpisPrevMonth.rotacionMensual,
          variance_percentage: calculateVariancePercentage(kpisActuales.rotacionMensual, kpisPrevMonth.rotacionMensual),
          period_start: format(currentMonthStart, 'yyyy-MM-dd'),
          period_end: format(currentMonthEnd, 'yyyy-MM-dd')
        }
      },
      {
        key: 'rotacion-acumulada',
        icon: <TrendingDown className="h-6 w-6" />,
        hidePreviousValue: true,
        secondaryRows: [
          {
            label: 'vs mes año ant.',
            value: kpisPrevYear.rotacionAcumulada,
            isPercent: true,
            showColon: false
          }
        ],
        kpi: {
          name: 'Rotación Acumulada',
          category: 'retention',
          value: kpisActuales.rotacionAcumulada,
          previous_value: kpisPrevYear.rotacionAcumulada,
          variance_percentage: calculateVariancePercentage(kpisActuales.rotacionAcumulada, kpisPrevYear.rotacionAcumulada),
          period_start: format(rollingWindowStart, 'yyyy-MM-dd'),
          period_end: format(currentMonthEnd, 'yyyy-MM-dd')
        },
        secondaryIsPercent: true
      },
      {
        key: 'rotacion-anio-actual',
        icon: <TrendingDown className="h-6 w-6" />,
        hidePreviousValue: true,
        secondaryRows: [
          {
            label: 'vs mes año ant.',
            value: kpisPrevYear.rotacionAnioActual,
            isPercent: true,
            showColon: false
          }
        ],
        kpi: {
          name: 'Rotación Año Actual',
          category: 'retention',
          value: kpisActuales.rotacionAnioActual,
          previous_value: kpisPrevYear.rotacionAnioActual,
          variance_percentage: calculateVariancePercentage(kpisActuales.rotacionAnioActual, kpisPrevYear.rotacionAnioActual),
          period_start: format(currentYearStart, 'yyyy-MM-dd'),
          period_end: format(currentMonthEnd, 'yyyy-MM-dd')
        },
        secondaryIsPercent: true
      },
      {
        key: 'incidencias',
        icon: <AlertCircle className="h-6 w-6" />,
        secondaryLabel: 'vs mes anterior',
        secondaryValue: kpisPrevMonth.incidencias,
        hidePreviousValue: true,
        kpi: {
          name: 'Incidencias',
          category: 'incidents',
          value: kpisActuales.incidencias,
          previous_value: kpisPrevMonth.incidencias,
          variance_percentage: calculateVariancePercentage(kpisActuales.incidencias, kpisPrevMonth.incidencias),
          period_start: format(currentMonthStart, 'yyyy-MM-dd'),
          period_end: format(currentMonthEnd, 'yyyy-MM-dd')
        }
      },
      {
        key: 'permisos',
        icon: <TrendingUp className="h-6 w-6" />,
        secondaryLabel: 'vs mes anterior',
        secondaryValue: kpisPrevMonth.permisos,
        hidePreviousValue: true,
        kpi: {
          name: 'Permisos',
          category: 'incidents',
          value: kpisActuales.permisos,
          previous_value: kpisPrevMonth.permisos,
          variance_percentage: calculateVariancePercentage(kpisActuales.permisos, kpisPrevMonth.permisos),
          period_start: format(currentMonthStart, 'yyyy-MM-dd'),
          period_end: format(currentMonthEnd, 'yyyy-MM-dd')
        }
      }
    ];

    // Preparar datos para gráfico de activos por antigüedad
    const datosActivos = datos.map(d => {
      // Acortar nombres muy largos pero mantener legibilidad
      let nombreCorto = d.nombre;
      if (nombreCorto.length > 18) {
        // Tomar primeras 2 palabras o primeros 15 caracteres
        const palabras = nombreCorto.split(' ');
        if (palabras.length > 1) {
          nombreCorto = palabras.slice(0, 2).join(' ');
          if (nombreCorto.length > 18) {
            nombreCorto = nombreCorto.substring(0, 15) + '...';
          }
        } else {
          nombreCorto = nombreCorto.substring(0, 15) + '...';
        }
      }

      return {
        nombre: nombreCorto,
        nombreCompleto: d.nombre, // Para tooltip
        total: d.total,
        '0-3 meses': d.antiguedad['0-3 meses'] || 0,
        '3-6 meses': d.antiguedad['3-6 meses'] || 0,
        '6-12 meses': d.antiguedad['6-12 meses'] || 0,
        '1-3 años': d.antiguedad['1-3 años'] || 0,
        '+3 años': d.antiguedad['+3 años'] || 0,
      };
    });

    const rotationLabel = motivoFilterType === 'involuntaria' ? 'Rotación Involuntaria' : 'Rotación Voluntaria';
    const getRotationValue = (input?: { involuntaria?: number; voluntaria?: number; total?: number }) => {
      if (!input) return 0;
      if (motivoFilterType === 'involuntaria') {
        return input.involuntaria ?? 0;
      }
      if (motivoFilterType === 'voluntaria') {
        return input.voluntaria ?? 0;
      }
      return input.total ?? 0;
    };

    const monthlyChartData = rotationSeries.map(point => {
      const row: Record<string, number | string> = { mes: point.label };
      negocioSeriesConfig.forEach(({ key }) => {
        const value = getRotationValue(point.negocios[key]?.mensual);
        row[key] = Number(value.toFixed(2));
      });
      return row;
    });

    const rollingChartData = rotationSeries.map(point => {
      const row: Record<string, number | string> = { mes: point.label };
      negocioSeriesConfig.forEach(({ key }) => {
        const value = getRotationValue(point.negocios[key]?.rolling);
        row[key] = Number(value.toFixed(2));
      });
      return row;
    });

    const currentYear = new Date().getFullYear();
    let ytdSeries = rotationSeries.filter(point => point.year === currentYear);
    if (ytdSeries.length === 0) {
      ytdSeries = rotationSeries;
    }

    const ytdChartData = ytdSeries.map(point => {
      const row: Record<string, number | string> = { mes: point.label };
      negocioSeriesConfig.forEach(({ key }) => {
        const value = getRotationValue(point.negocios[key]?.ytd);
        row[key] = Number(value.toFixed(2));
      });
      return row;
    });

    const hasSeriesData = (data: Array<Record<string, any>>) =>
      data.some(row => negocioSeriesConfig.some(({ key }) => (Number(row[key]) || 0) > 0));

    const hasMonthlyData = hasSeriesData(monthlyChartData);
    const hasRollingData = hasSeriesData(rollingChartData);
    const hasYtdData = hasSeriesData(ytdChartData);

    const incidenciasChartData = incidenciasPermisosSeries.map(point => {
      const row: Record<string, number | string> = { mes: point.mes };
      negocioSeriesConfig.forEach(({ key }) => {
        const value = point.negocios[key]?.incidencias ?? 0;
        row[key] = value;
      });
      return row;
    });

    const permisosChartData = incidenciasPermisosSeries.map(point => {
      const row: Record<string, number | string> = { mes: point.mes };
      negocioSeriesConfig.forEach(({ key }) => {
        const value = point.negocios[key]?.permisos ?? 0;
        row[key] = value;
      });
      return row;
    });

    const hasIncidenciasSeries = hasSeriesData(incidenciasChartData);
    const hasPermisosSeries = hasSeriesData(permisosChartData);

    const monthlyTooltipContent = createSummaryTooltip(
      (entry) => `${Number(entry.value ?? 0).toFixed(1)}%`,
      (entry) => `${entry.name} · ${rotationLabel}`,
      isDark
    );
    const rollingTooltipContent = createSummaryTooltip(
      (entry) => `${Number(entry.value ?? 0).toFixed(1)}%`,
      (entry) => `${entry.name} · ${rotationLabel} (12m)`,
      isDark
    );
    const ytdTooltipContent = createSummaryTooltip(
      (entry) => `${Number(entry.value ?? 0).toFixed(1)}%`,
      (entry) => `${entry.name} · ${rotationLabel} (YTD)`,
      isDark
    );
    const incidenciasTooltipContent = createSummaryTooltip(
      (entry) => `${Number(entry.value ?? 0).toLocaleString('es-MX')} registros`,
      (entry) => `${entry.name} · Incidencias`,
      isDark
    );
    const permisosTooltipContent = createSummaryTooltip(
      (entry) => `${Number(entry.value ?? 0).toLocaleString('es-MX')} registros`,
      (entry) => `${entry.name} · Permisos`,
      isDark
    );

    return (
      <div className={cn("space-y-6", refreshEnabled && "space-y-8")}>
        {/* KPI CARDS CON SEMAFORIZACIÓN */}
        <div
          className={cn(
            "grid gap-4",
            refreshEnabled
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          )}
        >
          {summaryCardItems.map(({ key, kpi, icon, secondaryLabel, secondaryValue, secondaryIsPercent, secondaryRows, hidePreviousValue }) => (
            <KPICard
              key={key}
              refreshEnabled={refreshEnabled}
              kpi={kpi}
              icon={icon}
              secondaryLabel={secondaryLabel}
              secondaryValue={secondaryValue}
              secondaryIsPercent={secondaryIsPercent}
              secondaryRows={secondaryRows}
              hidePreviousValue={hidePreviousValue}
            />
          ))}
        </div>

        {/* 1. ACTIVOS POR ANTIGÜEDAD - DISEÑO MEJORADO */}
        <Card
          className={cn(
            refreshEnabled &&
              "rounded-2xl border border-brand-border/60 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface-accent/70"
          )}
        >
          <CardHeader className={cn("pb-3", refreshEnabled && "pb-4")}>
            <CardTitle className={cn("flex items-center gap-2 text-base", refreshEnabled && "font-heading text-brand-ink")}>
              <Users className="h-4 w-4" />
              Empleados Activos por Antigüedad
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(refreshEnabled && "pt-0")}>
            <VisualizationContainer
              title="Empleados activos por antigüedad"
              type="chart"
              className="h-[360px] w-full"
              filename="activos-por-antiguedad"
            >
              {(fullscreen) => (
                <div style={{ height: fullscreen ? 420 : 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datosActivos}
                margin={{ top: 5, right: 20, left: 10, bottom: 65 }}
                barSize={datosActivos.length > 5 ? undefined : 80}
              >
                <CartesianGrid strokeDasharray="4 8" stroke={gridColor} />
                <XAxis
                  dataKey="nombre"
                  angle={-35}
                  textAnchor="end"
                  height={75}
                  interval={0}
                  tick={{ fontSize: 11, fill: axisColor }}
                />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} />
                <Tooltip
                  cursor={{ fill: withOpacity(getModernColor(0), 0.12) }}
                  wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(value: any, name: string, props: any) => {
                    const total = props.payload.total || 0;
                    const percentage = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
                    return [`${value} (${percentage}%)`, name];
                  }}
                  labelFormatter={(label: string, payload: any) => {
                    if (payload && payload.length > 0 && payload[0].payload.nombreCompleto) {
                      return `${payload[0].payload.nombreCompleto} · Total ${payload[0].payload.total || 0}`;
                    }
                    return label;
                  }}
                />
                <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                <Bar dataKey="0-3 meses" stackId="a" fill={TENURE_COLORS[0]} />
                <Bar dataKey="3-6 meses" stackId="a" fill={TENURE_COLORS[1]} />
                <Bar dataKey="6-12 meses" stackId="a" fill={TENURE_COLORS[2]} />
                <Bar dataKey="1-3 años" stackId="a" fill={TENURE_COLORS[3]} />
                <Bar dataKey="+3 años" stackId="a" fill={TENURE_COLORS[4]} radius={[4, 4, 0, 0]} />
              </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>

        {/* Toggle para rotación */}
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
            refreshEnabled &&
              (isDark
                ? "border-brand-border/40 bg-brand-surface/70 shadow-brand/10"
                : "border-brand-border/40 bg-brand-surface-accent/60 shadow-brand/10")
          )}
        >
          <span
            className={cn(
              "text-sm font-medium",
              refreshEnabled
                ? isDark
                  ? "font-heading text-xs uppercase tracking-[0.12em] text-brand-ink"
                  : "font-heading text-xs uppercase tracking-[0.12em] text-brand-ink/80"
                : "text-muted-foreground dark:text-brand-ink/80"
            )}
          >
            Filtrar visualizaciones por:
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={motivoFilterType === 'involuntaria' ? (refreshEnabled ? 'cta' : 'default') : 'outline'}
              size="sm"
              onClick={() => setMotivoFilterType('involuntaria')}
              className={cn(
                "transition-all",
                refreshEnabled && "rounded-full font-semibold",
                motivoFilterType === 'involuntaria' && refreshEnabled && "shadow-brand"
              )}
            >
              Rotación Involuntaria
            </Button>
            <Button
              variant={motivoFilterType === 'voluntaria' ? (refreshEnabled ? 'cta' : 'default') : 'outline'}
              size="sm"
              onClick={() => setMotivoFilterType('voluntaria')}
              className={cn(
                "transition-all",
                refreshEnabled && "rounded-full font-semibold",
                motivoFilterType === 'voluntaria' && refreshEnabled && "shadow-brand"
              )}
            >
              Rotación Voluntaria
            </Button>
          </div>
        </div>

        {/* 2. ROTACIÓN */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Rotación Mensual */}
          <Card
            className={cn(
              refreshEnabled &&
                "rounded-2xl border border-brand-border/60 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface-accent/70"
            )}
          >
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <TrendingDown className="h-4 w-4" />
                Rotación Mensual
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              {!hasMonthlyData ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Sin bajas registradas en los últimos meses</p>
                    <p className="mt-1 text-xs text-muted-foreground opacity-80">
                      Último corte: {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ) : (
                <VisualizationContainer
                  title={`Rotación mensual (${rotationLabel.toLowerCase()})`}
                  type="chart"
                  className="h-[320px] w-full"
                  filename="rotacion-mensual-summary"
                >
                  {(fullscreen) => (
                    <div style={{ height: fullscreen ? 380 : 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridColor} />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11, fill: axisColor }} />
                    <YAxis
                      label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisLabelColor } }}
                      tick={{ fontSize: 11, fill: axisColor }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(0), 0.35) }}
                      content={monthlyTooltipContent}
                      wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                    />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {negocioSeriesConfig.map((config, index) => {
                      const color = NEGOCIO_COLOR_PALETTE[index % NEGOCIO_COLOR_PALETTE.length];
                      return (
                        <Line
                          key={`${config.key}-mensual`}
                          type="monotone"
                          dataKey={config.key}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ fill: color, r: 3.5 }}
                          name={config.label}
                        />
                      );
                    })}
                  </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </VisualizationContainer>
              )}
            </CardContent>
          </Card>

          {/* Rotación 12 Meses Móviles */}
          <Card
            className={cn(
              refreshEnabled &&
                "rounded-2xl border border-brand-border/60 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface-accent/70"
            )}
          >
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <TrendingDown className="h-4 w-4" />
                12 Meses Móviles
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              {!hasRollingData ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Sin información suficiente para calcular 12 meses móviles</p>
                  </div>
                </div>
              ) : (
                <VisualizationContainer
                  title={`Rotación 12 meses móviles (${rotationLabel.toLowerCase()})`}
                  type="chart"
                  className="h-[320px] w-full"
                  filename="rotacion-12m-summary"
                >
                  {(fullscreen) => (
                    <div style={{ height: fullscreen ? 380 : 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rollingChartData}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridColor} />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11, fill: axisColor }} />
                    <YAxis
                      label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisLabelColor } }}
                      tick={{ fontSize: 11, fill: axisColor }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(1), 0.35) }}
                      content={rollingTooltipContent}
                      wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                    />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {negocioSeriesConfig.map((config, index) => {
                      const color = NEGOCIO_COLOR_PALETTE[index % NEGOCIO_COLOR_PALETTE.length];
                      return (
                        <Line
                          key={`${config.key}-rolling`}
                          type="monotone"
                          dataKey={config.key}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ fill: color, r: 3.5 }}
                          name={config.label}
                        />
                      );
                    })}
                  </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </VisualizationContainer>
              )}
            </CardContent>
          </Card>

          {/* Rotación Año Actual (YTD) */}
          <Card
            className={cn(
              refreshEnabled &&
                "rounded-2xl border border-brand-border/60 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface-accent/70"
            )}
          >
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <TrendingDown className="h-4 w-4" />
                Lo que va del Año
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              {!hasYtdData ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Sin datos del año en curso para mostrar</p>
                  </div>
                </div>
              ) : (
                <VisualizationContainer
                  title={`Rotación acumulada del año (${rotationLabel.toLowerCase()})`}
                  type="chart"
                  className="h-[320px] w-full"
                  filename="rotacion-ytd-summary"
                >
                  {(fullscreen) => (
                    <div style={{ height: fullscreen ? 380 : 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ytdChartData}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridColor} />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11, fill: axisColor }} />
                    <YAxis
                      label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisLabelColor } }}
                      tick={{ fontSize: 11, fill: axisColor }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(2), 0.35) }}
                      content={ytdTooltipContent}
                      wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                    />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {negocioSeriesConfig.map((config, index) => {
                      const color = NEGOCIO_COLOR_PALETTE[index % NEGOCIO_COLOR_PALETTE.length];
                      return (
                        <Line
                          key={`${config.key}-ytd`}
                          type="monotone"
                          dataKey={config.key}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ fill: color, r: 3.5 }}
                          name={config.label}
                        />
                      );
                    })}
                  </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </VisualizationContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 2.b Incidencias y Permisos 12 Meses */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            className={cn(
              refreshEnabled &&
                "rounded-2xl border border-brand-border/60 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface-accent/70"
            )}
          >
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <AlertCircle className="h-4 w-4" />
                Incidencias - Últimos 12 meses
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              {!hasIncidenciasSeries ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Sin incidencias registradas en los últimos 12 meses</p>
                  </div>
                </div>
              ) : (
                <VisualizationContainer
                  title="Incidencias - últimos 12 meses"
                  type="chart"
                  className="h-[320px] w-full"
                  filename="incidencias-12m-summary"
                >
                  {(fullscreen) => (
                    <div style={{ height: fullscreen ? 380 : 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incidenciasChartData}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridColor} />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11, fill: axisColor }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisColor }}
                      label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisLabelColor } }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(3), 0.35) }}
                      content={incidenciasTooltipContent}
                      wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                    />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {negocioSeriesConfig.map((config, index) => {
                      const color = NEGOCIO_COLOR_PALETTE[index % NEGOCIO_COLOR_PALETTE.length];
                      return (
                        <Line
                          key={`${config.key}-incidencias`}
                          type="monotone"
                          dataKey={config.key}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ fill: color, r: 3.5 }}
                          name={config.label}
                        />
                      );
                    })}
                  </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </VisualizationContainer>
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              refreshEnabled &&
                "rounded-2xl border border-brand-border/60 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface-accent/70"
            )}
          >
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <TrendingUp className="h-4 w-4" />
                Permisos - Últimos 12 meses
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              {!hasPermisosSeries ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Sin permisos registrados en los últimos 12 meses</p>
                  </div>
                </div>
              ) : (
                <VisualizationContainer
                  title="Permisos - últimos 12 meses"
                  type="chart"
                  className="h-[320px] w-full"
                  filename="permisos-12m-summary"
                >
                  {(fullscreen) => (
                    <div style={{ height: fullscreen ? 380 : 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={permisosChartData}>
                    <CartesianGrid strokeDasharray="4 8" stroke={gridColor} />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11, fill: axisColor }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: axisColor }}
                      label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: axisLabelColor } }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(4), 0.35) }}
                      content={permisosTooltipContent}
                      wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                    />
                    <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                    {negocioSeriesConfig.map((config, index) => {
                      const color = NEGOCIO_COLOR_PALETTE[index % NEGOCIO_COLOR_PALETTE.length];
                      return (
                        <Line
                          key={`${config.key}-permisos`}
                          type="monotone"
                          dataKey={config.key}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ fill: color, r: 3.5 }}
                          name={config.label}
                        />
                      );
                    })}
                  </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </VisualizationContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 3. AUSENTISMO */}
        <Card
          className={cn(
            refreshEnabled &&
              "rounded-2xl border border-brand-border/60 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface-accent/70"
          )}
        >
          <CardHeader className={cn(refreshEnabled && "pb-6")}>
            <CardTitle className={cn("flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
              <AlertCircle className="h-5 w-5" />
              Ausentismo (Incidencias y Permisos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className={cn("w-full text-sm text-foreground", refreshEnabled && "text-brand-ink dark:text-slate-100")}>
                <thead>
                  <tr
                    className={cn(
                      "border-b border-slate-200 dark:border-slate-700/70",
                      refreshEnabled && "border-brand-border/60 dark:border-brand-border/40"
                    )}
                  >
                    <th className={cn("pb-3 text-left font-medium", refreshEnabled && "font-heading text-brand-ink dark:text-slate-100")}>
                      Nombre
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading text-brand-ink dark:text-slate-100")}>
                      Total
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading text-brand-ink dark:text-slate-100")}>
                      Permisos
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading text-brand-ink dark:text-slate-100")}>
                      Faltas
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading text-brand-ink dark:text-slate-100")}>
                      Otros
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((d, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "border-b last:border-0",
                        refreshEnabled && "border-brand-border/60 dark:border-brand-border/40"
                      )}
                    >
                      <td className={cn("py-3 font-medium", refreshEnabled && "font-heading")}>
                        {d.nombre}
                      </td>
                      <td className="py-3 text-right">
                        {d.ausentismo.total}
                      </td>
                      <td className="py-3 text-right text-blue-600 dark:text-blue-300">
                        {d.ausentismo.permisos}
                      </td>
                      <td className="py-3 text-right text-red-600 dark:text-red-400">
                        {d.ausentismo.faltas}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {d.ausentismo.otros}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ✅ CORREGIDO: Usar useMemo para recalcular cuando cambien plantilla, bajas, o incidencias
  const negocio = useMemo(() => datosPorNegocio(), [plantilla, bajas, incidencias]);
  const areas = useMemo(() => datosPorArea(), [plantilla, bajas, incidencias]);
  const departamentos = useMemo(() => datosPorDepartamento(), [plantilla, bajas, incidencias]);

  return (
    <div className={cn("space-y-6", refreshEnabled && "space-y-8")}>
      <div className={cn("flex items-center justify-between", refreshEnabled && "pb-2")}>
        <h2 className={cn("text-2xl font-bold", refreshEnabled && "font-heading text-3xl text-brand-ink")}>📊 Resumen Comparativo</h2>
      </div>

      <Tabs defaultValue="negocio" className="w-full">
        <TabsList
          className={cn(
            "grid w-full grid-cols-3",
            refreshEnabled && "rounded-full bg-brand-surface-accent p-1 text-brand-ink shadow-sm"
          )}
        >
          <TabsTrigger
            value="negocio"
            className={cn(
              refreshEnabled &&
                "rounded-full text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-brand text-brand-ink data-[state=active]:text-brand-foreground"
            )}
          >
            Negocio
          </TabsTrigger>
          <TabsTrigger
            value="area"
            className={cn(
              refreshEnabled &&
                "rounded-full text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-brand text-brand-ink data-[state=active]:text-brand-foreground"
            )}
          >
            Área
          </TabsTrigger>
          <TabsTrigger
            value="departamento"
            className={cn(
              refreshEnabled &&
                "rounded-full text-xs font-semibold uppercase tracking-[0.12em] data-[state=active]:bg-brand text-brand-ink data-[state=active]:text-brand-foreground"
            )}
          >
            Departamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="negocio" className={cn("space-y-4", refreshEnabled && "space-y-6")}>
          {renderSeccion(negocio, 'negocio')}
        </TabsContent>

        <TabsContent value="area" className={cn("space-y-4", refreshEnabled && "space-y-6")}>
          {renderSeccion(areas, 'area')}
        </TabsContent>

        <TabsContent value="departamento" className={cn("space-y-4", refreshEnabled && "space-y-6")}>
          {renderSeccion(departamentos, 'departamento')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
