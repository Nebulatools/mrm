"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricToggle } from "@/components/ui/metric-toggle";
import { db, type IncidenciaCSVRecord, type PlantillaRecord } from "@/lib/supabase";
import { normalizeIncidenciaCode, labelForIncidencia, normalizePuesto, normalizeArea, normalizeDepartamento } from "@/lib/normalizers";
import type { KPIResult } from "@/lib/kpi-calculator";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, LabelList, ComposedChart, Area } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { differenceInCalendarDays, format } from "date-fns";
import { VisualizationContainer } from "@/components/visualization-container";
import { calculateVariancePercentage, countActivosEnFecha } from "@/lib/utils/kpi-helpers";
import { KPICard, KPICardSkeleton } from "./kpi-card";
import { Users, AlertCircle, Activity, ClipboardCheck } from "lucide-react";
import { getModernColor, withOpacity } from "@/lib/chart-colors";
import { useTheme } from "@/components/theme-provider";

type Props = {
  plantilla?: PlantillaRecord[];
  plantillaAnual?: PlantillaRecord[];
  currentYear?: number;
  selectedMonths?: number[];
  initialIncidencias?: IncidenciaCSVRecord[];
  onKPIsUpdate?: (kpis: {
    incidencias: number;
    incidenciasAnterior: number;
    permisos: number;
    permisosAnterior: number;
  }) => void;
};

type EnrichedIncidencia = IncidenciaCSVRecord & {
  nombre?: string | null;
  empresa?: string | null;
  departamento?: string | null;
  area?: string | null;
  puesto?: string | null;
};

// ✅ NUEVA CATEGORIZACIÓN: 4 grupos (Faltas, Salud, Permisos, Vacaciones)
const FALTAS_CODES = new Set(["FI", "SUSP"]);
const SALUD_CODES = new Set(["ENFE", "MAT3", "MAT1"]);
const PERMISOS_CODES = new Set(["PSIN", "PCON", "FEST", "PATER", "JUST"]);
const VACACIONES_CODES = new Set(["VAC"]);

// ✅ LEGACY: Mantener para compatibilidad con código existente
const INCIDENT_CODES = new Set([...FALTAS_CODES, ...SALUD_CODES]); // Faltas + Salud
const EMPLOYEE_INCIDENT_CODES = new Set([...FALTAS_CODES, ...SALUD_CODES]); // Para card de empleados
const PERMISO_CODES = new Set([...PERMISOS_CODES, ...VACACIONES_CODES]); // Permisos + Vacaciones

const PIE_COLORS = [getModernColor(0), getModernColor(1), getModernColor(2), getModernColor(3)];
const AUSENTISMO_COLOR = '#EF4444';
const PERMISO_COLOR = '#2563EB';
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado'
};
const MONTH_LABELS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const PIE_LEGEND_STYLE: CSSProperties = { paddingTop: 8 };
const PIE_TOOLTIP_STYLE: CSSProperties = {
  borderRadius: 12,
  borderColor: "#E2E8F0",
  backgroundColor: "#FFFFFF",
  padding: "10px 12px",
  boxShadow: "0 12px 32px -18px rgba(15, 23, 42, 0.35)",
};
const PIE_TOOLTIP_LABEL_STYLE: CSSProperties = { fontSize: 11, fontWeight: 600, color: "#334155" };
const LINE_TOOLTIP_STYLE: CSSProperties = {
  borderRadius: 12,
  borderColor: "#E2E8F0",
  backgroundColor: "#FFFFFF",
  padding: "10px 12px",
  boxShadow: "0 12px 32px -18px rgba(15, 23, 42, 0.35)",
};
const LINE_TOOLTIP_LABEL_STYLE: CSSProperties = { fontSize: 11, fontWeight: 600, color: "#334155" };
const TOOLTIP_WRAPPER_STYLE: CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  boxShadow: 'none',
  borderRadius: 0,
  outline: 'none'
};
const RADIAN = Math.PI / 180;

const renderPieInnerLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
  payload,
}: PieLabelRenderProps) => {
  // Ensure all values are numbers
  const cxNum = Number(cx);
  const cyNum = Number(cy);
  const midAngleNum = Number(midAngle);
  const innerRadiusNum = Number(innerRadius);
  const outerRadiusNum = Number(outerRadius);

  const safePercent = Number.isFinite(percent) ? percent * 100 : 0;
  const value = typeof payload?.value === "number" ? payload.value : 0;
  const label = typeof payload?.name === "string" ? payload.name : "";
  const displayValue = `${value.toLocaleString("es-MX")} · ${safePercent.toFixed(1)}%`;
  const isSmallSlice = safePercent < 12;
  const outerPointRadius = outerRadiusNum + 8;
  const accentRadius = outerRadiusNum + 28;
  const angle = -midAngleNum * RADIAN;
  const connectorStartX = cxNum + outerRadiusNum * Math.cos(angle);
  const connectorStartY = cyNum + outerRadiusNum * Math.sin(angle);
  const connectorMidX = cxNum + outerPointRadius * Math.cos(angle);
  const connectorMidY = cyNum + outerPointRadius * Math.sin(angle);
  const textX = cxNum + accentRadius * Math.cos(angle);
  const textY = cyNum + accentRadius * Math.sin(angle);
  const textAnchor = textX > cxNum ? "start" : "end";
  const textOffset = textAnchor === "start" ? 10 : -10;

  if (isSmallSlice) {
    return (
      <g>
        <polyline
          points={`${connectorStartX},${connectorStartY} ${connectorMidX},${connectorMidY} ${textX},${textY}`}
          stroke="#94A3B8"
          strokeWidth={1}
          fill="none"
        />
        <circle cx={textX} cy={textY} r={2.5} fill="#64748B" />
        <text
          x={textX + textOffset}
          y={textY - 4}
          textAnchor={textAnchor}
          fill="#0F172A"
          fontSize={12}
          fontWeight={700}
        >
          {label}
        </text>
        <text
          x={textX + textOffset}
          y={textY + 12}
          textAnchor={textAnchor}
          fill="#475569"
          fontSize={11}
          fontWeight={600}
        >
          {displayValue}
        </text>
      </g>
    );
  }

  const radius = innerRadiusNum + (outerRadiusNum - innerRadiusNum) * 0.52;
  const innerX = cxNum + radius * Math.cos(angle);
  const innerY = cyNum + radius * Math.sin(angle);

  return (
    <g>
      <text
        x={innerX}
        y={innerY - 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0F172A"
        fontSize={13}
        fontWeight={700}
        style={{ paintOrder: "stroke", stroke: "#FFFFFF", strokeWidth: 4, strokeLinejoin: "round" }}
      >
        {label}
      </text>
      <text
        x={innerX}
        y={innerY + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#475569"
        fontSize={11}
        fontWeight={600}
        style={{ paintOrder: "stroke", stroke: "#FFFFFF", strokeWidth: 3, strokeLinejoin: "round" }}
      >
        {displayValue}
      </text>
    </g>
  );
};

const formatToDDMMYYYY = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return format(parsed, 'dd-MM-yyyy');
};

export function IncidentsTab({ plantilla, plantillaAnual, currentYear, selectedMonths, initialIncidencias, onKPIsUpdate }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Toggle para mostrar % o número en todo el tab
  const [metricType, setMetricType] = useState<"percent" | "number">("percent");
  const axisSecondaryColor = isDark ? "#CBD5F5" : "#64748b";
  const axisMutedColor = isDark ? "#CBD5F5" : "#475569";
  const gridStrokeColor = isDark ? "rgba(148, 163, 184, 0.25)" : "#E2E8F0";
  const legendFormatter = useCallback(
    (value: string) => (
      <span className={`text-[11px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
        {value}
      </span>
    ),
    [isDark]
  );
  const [incidencias, setIncidencias] = useState<IncidenciaCSVRecord[]>(initialIncidencias ?? []);
  const [showTable, setShowTable] = useState(false); // false = mostrar 10, true = mostrar todo
  const [loadingIncidencias, setLoadingIncidencias] = useState(!(initialIncidencias && initialIncidencias.length > 0));

  // Por defecto: todo el histórico (sin rango de fechas local)

  // Cargar incidencias una vez (todo el histórico)
  useEffect(() => {
    let cancelled = false;

    if (initialIncidencias && initialIncidencias.length > 0) {
      setIncidencias(initialIncidencias);
      setLoadingIncidencias(false);
      return;
    }

    const loadInc = async () => {
      try {
        setLoadingIncidencias(true);
        const incs = await db.getIncidenciasCSV();
        if (!cancelled) {
          setIncidencias(incs);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Error cargando incidencias:", e);
        }
      } finally {
        if (!cancelled) {
          setLoadingIncidencias(false);
        }
      }
    };

    loadInc();

    return () => {
      cancelled = true;
    };
  }, [initialIncidencias]);

  const empleadosPeriodo = useMemo(() => plantilla ?? [], [plantilla]);

  const empleadosAnuales = useMemo(() => {
    if (plantillaAnual && plantillaAnual.length > 0) return plantillaAnual;
    return empleadosPeriodo;
  }, [plantillaAnual, empleadosPeriodo]);

  const empleadosAnualesMap = useMemo(() => {
    const m = new Map<number, PlantillaRecord & { numero_empleado?: number }>();
    empleadosAnuales.forEach((e: any) => {
      const num = Number(e.numero_empleado ?? e.emp_id);
      if (!Number.isNaN(num)) m.set(num, e as any);
    });
    return m;
  }, [empleadosAnuales]);

  const { enrichedAnual, enrichedPeriodo, enrichedAnterior, currentPairs, previousPairs } = useMemo(() => {
    console.log('🔍 Incidents Tab - Filtering data:');
    console.log('📊 Total incidencias:', incidencias.length);
    console.log('👥 Empleados anuales considerados:', empleadosAnualesMap.size);
    console.log('👤 Plantilla periodo recibida:', plantilla?.length || 0);
    console.log('📅 Año filtrado:', currentYear || 'SIN FILTRO (TODO)');
    console.log('📅 Mes filtrado:', selectedMonths && selectedMonths.length ? selectedMonths : 'SIN FILTRO (TODO)');

    // ✅ CAMBIO: NO filtrar por empleadosAnualesMap - mostrar TODAS las incidencias históricas
    // Esto permite ver incidencias de empleados que se dieron de baja antes del periodo
    const scopedByEmployee = incidencias;

    const scopedByYear = scopedByEmployee.filter(inc => {
      if (currentYear === undefined) return true;
      if (!inc.fecha) return false;
      const fecha = new Date(inc.fecha);
      return fecha.getFullYear() === currentYear;
    });

    const monthsFilter = (selectedMonths || []).filter(m => Number.isFinite(m)) as number[];

    const buildPairs = (months: number[], seedYear: number) =>
      months.map((month) => {
        const reference = new Date(seedYear, month - 1, 1);
        return {
          year: reference.getFullYear(),
          month: reference.getMonth() + 1,
        };
      });

    const shiftPairsBackOneMonth = (pairs: { year: number; month: number }[]) =>
      pairs.map(({ year, month }) => {
        const reference = new Date(year, month - 2, 1);
        return {
          year: reference.getFullYear(),
          month: reference.getMonth() + 1,
        };
      });

    const dedupePairs = (pairs: { year: number; month: number }[]) => {
      const seen = new Set<string>();
      return pairs.filter(pair => {
        const key = `${pair.year}-${pair.month}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const hasYearFilter = typeof currentYear === 'number';
    const hasMonthFilter = monthsFilter.length > 0;

    const yearsFromData = Array.from(
      new Set(
        scopedByEmployee
          .map((inc) => {
            if (!inc.fecha) return null;
            const date = new Date(inc.fecha);
            return Number.isNaN(date.getTime()) ? null : date.getFullYear();
          })
          .filter((year): year is number => year !== null)
      )
    ).sort((a, b) => a - b);

    const baseYears = hasYearFilter
      ? [currentYear as number]
      : yearsFromData.length > 0
        ? yearsFromData
        : [new Date().getFullYear()];

    const baseMonths = hasMonthFilter
      ? monthsFilter
      : Array.from({ length: 12 }, (_, index) => index + 1);

    const currentPairs = dedupePairs(
      baseYears.flatMap((year) => buildPairs(baseMonths, year))
    );
    const previousPairs = dedupePairs(shiftPairsBackOneMonth(currentPairs));

    const matchesPairs = (date: Date, pairs: { year: number; month: number }[]) =>
      pairs.some(({ year, month }) => date.getFullYear() === year && date.getMonth() + 1 === month);

    const scopedByPeriod = scopedByYear.filter(inc => {
      if (!inc.fecha) return false;
      return matchesPairs(new Date(inc.fecha), currentPairs);
    });

    const scopedByPrevious = scopedByEmployee.filter(inc => {
      if (!inc.fecha) return false;
      return matchesPairs(new Date(inc.fecha), previousPairs);
    });

    const toEnriched = (collection: IncidenciaCSVRecord[]): EnrichedIncidencia[] =>
      collection.map(inc => {
        const emp = empleadosAnualesMap.get(inc.emp);
        const rawArea = emp?.area ?? null;
        const rawDepto = emp?.departamento ?? null;
        const rawPuesto = emp?.puesto ?? null;

        return {
          ...inc,
          nombre: emp?.nombre ?? inc.nombre ?? null,
          empresa: emp?.empresa ?? null,
          departamento: rawDepto ? normalizeDepartamento(rawDepto) : null,
          area: rawArea ? normalizeArea(rawArea) : null,
          puesto: rawPuesto ? normalizePuesto(rawPuesto) : null,
        };
      });

    const annual = toEnriched(scopedByYear);
    const period = toEnriched(scopedByPeriod);
    const previous = toEnriched(scopedByPrevious);

    console.log('📋 Incidencias filtradas (año):', annual.length);
    console.log('📋 Incidencias filtradas (periodo actual):', period.length);
    if (period.length === 0) {
      console.warn('⚠️ No hay incidencias en el periodo filtrado; se usarán valores anuales para la gráfica.');
    }

    return { enrichedAnual: annual, enrichedPeriodo: period, enrichedAnterior: previous, currentPairs, previousPairs };
  }, [incidencias, empleadosAnualesMap, plantilla, currentYear, selectedMonths]);

  const { currentReferenceDate, previousReferenceDate } = useMemo(() => {
    const now = new Date();
    const fallbackYear = currentYear ?? now.getFullYear();
    const fallbackMonth = selectedMonths && selectedMonths.length
      ? Math.max(...selectedMonths)
      : now.getMonth() + 1;

    const resolveLatestPair = (pairs: { year: number; month: number }[]) =>
      pairs.reduce<{ year: number; month: number } | undefined>((acc, pair) => {
        if (!acc) return pair;
        return pair.year * 12 + pair.month > acc.year * 12 + acc.month ? pair : acc;
      }, undefined);

    const currentPair = resolveLatestPair(currentPairs) ?? { year: fallbackYear, month: fallbackMonth };
    const fallbackPreviousDate = new Date(currentPair.year, currentPair.month - 2, 1);
    const previousPair = resolveLatestPair(previousPairs) ?? {
      year: fallbackPreviousDate.getFullYear(),
      month: fallbackPreviousDate.getMonth() + 1,
    };

    return {
      currentReferenceDate: new Date(currentPair.year, currentPair.month, 0),
      previousReferenceDate: new Date(previousPair.year, previousPair.month, 0),
    };
  }, [currentPairs, previousPairs, currentYear, selectedMonths]);

  const plantillaBaseForActivos = useMemo<PlantillaRecord[]>(() => {
    if (plantillaAnual && plantillaAnual.length > 0) return plantillaAnual;
    return empleadosPeriodo;
  }, [plantillaAnual, empleadosPeriodo]);

  const activosCount = useMemo(() =>
    countActivosEnFecha(plantillaBaseForActivos, currentReferenceDate),
  [plantillaBaseForActivos, currentReferenceDate]);

  const activosPrevios = useMemo(() =>
    countActivosEnFecha(plantillaBaseForActivos, previousReferenceDate),
  [plantillaBaseForActivos, previousReferenceDate]);

  const calcularDiasActivo = useCallback((emp: PlantillaRecord, start: Date, end: Date) => {
    const ingreso = new Date(emp.fecha_ingreso);
    const baja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
    const effectiveStart = ingreso > start ? ingreso : start;
    const effectiveEnd = baja && baja < end ? baja : end;
    if (effectiveEnd < effectiveStart) return 0;
    return differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
  }, []);

  const buildMonthStats = useCallback((refDate: Date) => {
    const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);

    const monthIncidencias = incidencias.filter((inc) => {
      if (!inc.fecha) return false;
      const d = new Date(inc.fecha);
      return d >= start && d <= end;
    });

    const diasLaborables = plantillaBaseForActivos.reduce((acc, emp) => acc + calcularDiasActivo(emp, start, end), 0);
    const activos = countActivosEnFecha(plantillaBaseForActivos, end);
    const incidenciasCount = monthIncidencias.filter((i) => INCIDENT_CODES.has(normalizeIncidenciaCode(i.inci) || '')).length;
    const permisosCount = monthIncidencias.filter((i) => PERMISO_CODES.has(normalizeIncidenciaCode(i.inci) || '')).length;
    const empleadosSet = new Set<number>();
    monthIncidencias.forEach((i) => {
      const code = normalizeIncidenciaCode(i.inci);
      if (code && EMPLOYEE_INCIDENT_CODES.has(code)) {
        empleadosSet.add(i.emp);
      }
    });

    return {
      activos,
      diasLaborables,
      incidenciasCount,
      permisosCount,
      empleadosConIncidencias: empleadosSet.size,
    };
  }, [calcularDiasActivo, countActivosEnFecha, incidencias, plantillaBaseForActivos]);

  const currentMonthStats = useMemo(() => buildMonthStats(currentReferenceDate), [buildMonthStats, currentReferenceDate]);
  const prevMonthStats = useMemo(() => buildMonthStats(previousReferenceDate), [buildMonthStats, previousReferenceDate]);
  const sameMonthLastYearStats = useMemo(() => {
    const date = new Date(currentReferenceDate);
    date.setFullYear(date.getFullYear() - 1);
    return buildMonthStats(date);
  }, [buildMonthStats, currentReferenceDate]);

  const diasLaborablesActual = useMemo(() => {
    const start = new Date(currentReferenceDate.getFullYear(), currentReferenceDate.getMonth(), 1);
    return plantillaBaseForActivos.reduce((acc, emp) => acc + calcularDiasActivo(emp, start, currentReferenceDate), 0);
  }, [plantillaBaseForActivos, calcularDiasActivo, currentReferenceDate]);

  const diasLaborablesPrev = useMemo(() => {
    const start = new Date(previousReferenceDate.getFullYear(), previousReferenceDate.getMonth(), 1);
    return plantillaBaseForActivos.reduce((acc, emp) => acc + calcularDiasActivo(emp, start, previousReferenceDate), 0);
  }, [plantillaBaseForActivos, calcularDiasActivo, previousReferenceDate]);

  const diasLaborablesPorArea = useMemo(() => {
    const start = new Date(currentReferenceDate.getFullYear(), currentReferenceDate.getMonth(), 1);
    const map = new Map<string, number>();
    plantillaBaseForActivos.forEach((emp) => {
      const days = calcularDiasActivo(emp, start, currentReferenceDate);
      if (days <= 0) return;
      const rawArea = emp.area ? normalizeArea(emp.area) : '';
      const area = rawArea && rawArea.trim().length > 0 ? rawArea : 'Sin área definida';
      map.set(area, (map.get(area) || 0) + days);
    });
    return map;
  }, [plantillaBaseForActivos, calcularDiasActivo, currentReferenceDate]);

  const empleadosConIncidencias = useMemo(() => {
    const set = new Set<number>();
    enrichedPeriodo.forEach(i => {
      const code = normalizeIncidenciaCode(i.inci);
      if (code && EMPLOYEE_INCIDENT_CODES.has(code)) set.add(i.emp);
    });
    return set.size;
  }, [enrichedPeriodo]);
  const empleadosConIncidenciasAnterior = useMemo(() => {
    const set = new Set<number>();
    enrichedAnterior.forEach(i => {
      const code = normalizeIncidenciaCode(i.inci);
      if (code && EMPLOYEE_INCIDENT_CODES.has(code)) set.add(i.emp);
    });
    return set.size;
  }, [enrichedAnterior]);
  const countByType = useMemo(() => {
    const map = new Map<string, number>();
    enrichedPeriodo.forEach(i => {
      const code = normalizeIncidenciaCode(i.inci);
      if (!code) return;
      map.set(code, (map.get(code) || 0) + 1);
    });
    return map;
  }, [enrichedPeriodo]);
  const countByTypePrevious = useMemo(() => {
    const map = new Map<string, number>();
    enrichedAnterior.forEach(i => {
      const code = normalizeIncidenciaCode(i.inci);
      if (!code) return;
      map.set(code, (map.get(code) || 0) + 1);
    });
    return map;
  }, [enrichedAnterior]);

  const totalIncidencias = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (INCIDENT_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);
  const totalIncidenciasAnterior = useMemo(() => {
    let total = 0;
    countByTypePrevious.forEach((v, k) => { if (INCIDENT_CODES.has(k)) total += v; });
    return total;
  }, [countByTypePrevious]);

  const totalPermisos = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (PERMISO_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);
  const totalPermisosAnteriores = useMemo(() => {
    let total = 0;
    countByTypePrevious.forEach((v, k) => { if (PERMISO_CODES.has(k)) total += v; });
    return total;
  }, [countByTypePrevious]);

  // ✅ NOTA: FALTAS_CODES, SALUD_CODES, PERMISOS_CODES, VACACIONES_CODES ya están definidos arriba

  const totalFaltas = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (FALTAS_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);

  const totalFaltasAnterior = useMemo(() => {
    let total = 0;
    countByTypePrevious.forEach((v, k) => { if (FALTAS_CODES.has(k)) total += v; });
    return total;
  }, [countByTypePrevious]);

  const totalSalud = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (SALUD_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);

  const totalSaludAnterior = useMemo(() => {
    let total = 0;
    countByTypePrevious.forEach((v, k) => { if (SALUD_CODES.has(k)) total += v; });
    return total;
  }, [countByTypePrevious]);

  const totalPermisosOnly = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (PERMISOS_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);

  const totalVacaciones = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (VACACIONES_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);

  useEffect(() => {
    if (!onKPIsUpdate) return;
    onKPIsUpdate({
      incidencias: totalIncidencias,
      incidenciasAnterior: totalIncidenciasAnterior,
      permisos: totalPermisos,
      permisosAnterior: totalPermisosAnteriores
    });
  }, [onKPIsUpdate, totalIncidencias, totalIncidenciasAnterior, totalPermisos, totalPermisosAnteriores]);

  const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

  const empleadosConIncidenciasPct = activosCount > 0 ? (empleadosConIncidencias / activosCount) * 100 : 0;
  const empleadosConIncidenciasAnteriorPct = activosPrevios > 0 ? (empleadosConIncidenciasAnterior / activosPrevios) * 100 : 0;
  const incidenciasPct = diasLaborablesActual > 0 ? (totalIncidencias / diasLaborablesActual) * 100 : 0;
  const incidenciasPctAnterior = diasLaborablesPrev > 0 ? (totalIncidenciasAnterior / diasLaborablesPrev) * 100 : 0;
  const permisosPct = diasLaborablesActual > 0 ? (totalPermisos / diasLaborablesActual) * 100 : 0;
  const permisosPctAnterior = diasLaborablesPrev > 0 ? (totalPermisosAnteriores / diasLaborablesPrev) * 100 : 0;

  // Percentages segmentados por tipo
  const faltasPct = diasLaborablesActual > 0 ? (totalFaltas / diasLaborablesActual) * 100 : 0;
  const faltasPctAnterior = diasLaborablesPrev > 0 ? (totalFaltasAnterior / diasLaborablesPrev) * 100 : 0;
  const saludPct = diasLaborablesActual > 0 ? (totalSalud / diasLaborablesActual) * 100 : 0;
  const saludPctAnterior = diasLaborablesPrev > 0 ? (totalSaludAnterior / diasLaborablesPrev) * 100 : 0;

  const maMonth = {
    empleadosPct: prevMonthStats.activos > 0 ? (prevMonthStats.empleadosConIncidencias / (prevMonthStats.activos || 1)) * 100 : 0,
    incidenciasPct: prevMonthStats.diasLaborables > 0 ? (prevMonthStats.incidenciasCount / prevMonthStats.diasLaborables) * 100 : 0,
    permisosPct: prevMonthStats.diasLaborables > 0 ? (prevMonthStats.permisosCount / prevMonthStats.diasLaborables) * 100 : 0,
    activos: prevMonthStats.activos,
  };

  const mmaaMonth = {
    empleadosPct: sameMonthLastYearStats.activos > 0 ? (sameMonthLastYearStats.empleadosConIncidencias / (sameMonthLastYearStats.activos || 1)) * 100 : 0,
    incidenciasPct: sameMonthLastYearStats.diasLaborables > 0 ? (sameMonthLastYearStats.incidenciasCount / sameMonthLastYearStats.diasLaborables) * 100 : 0,
    permisosPct: sameMonthLastYearStats.diasLaborables > 0 ? (sameMonthLastYearStats.permisosCount / sameMonthLastYearStats.diasLaborables) * 100 : 0,
    activos: sameMonthLastYearStats.activos,
  };

  const incidentsKpiCards = useMemo(() => {
    const isPercent = metricType === "percent";

    return [
      {
        icon: <Users className="h-6 w-6" />,
        kpi: {
          name: '# de activos',
          category: 'headcount' as const,
          value: activosCount,
          previous_value: activosPrevios,
          variance_percentage: calculateVariancePercentage(activosCount, activosPrevios),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        },
        secondaryRows: [
          { label: 'MA', value: maMonth.activos, showColon: true },
          { label: 'MMAA', value: mmaaMonth.activos, showColon: true }
        ]
      },
      {
        icon: <AlertCircle className="h-6 w-6" />,
        kpi: {
          name: isPercent ? 'Empleados con incidencias (%)' : 'Empleados con incidencias (#)',
          category: 'incidents' as const,
          value: isPercent ? Number(empleadosConIncidenciasPct.toFixed(1)) : empleadosConIncidencias,
          previous_value: isPercent ? Number(empleadosConIncidenciasAnteriorPct.toFixed(1)) : empleadosConIncidenciasAnterior,
          variance_percentage: isPercent
            ? calculateVariancePercentage(empleadosConIncidenciasPct, empleadosConIncidenciasAnteriorPct)
            : calculateVariancePercentage(empleadosConIncidencias, empleadosConIncidenciasAnterior),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        },
        secondaryRows: isPercent ? [
          { label: 'Total', value: empleadosConIncidencias, showColon: true }
        ] : undefined
      },
      {
        icon: <Activity className="h-6 w-6" />,
        kpi: {
          name: isPercent ? 'Incidencias (%)' : 'Incidencias (#)',
          category: 'incidents' as const,
          value: isPercent ? Number(incidenciasPct.toFixed(1)) : totalIncidencias,
          previous_value: isPercent ? Number(incidenciasPctAnterior.toFixed(1)) : totalIncidenciasAnterior,
          variance_percentage: isPercent
            ? calculateVariancePercentage(incidenciasPct, incidenciasPctAnterior)
            : calculateVariancePercentage(totalIncidencias, totalIncidenciasAnterior),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        },
        secondaryRows: isPercent ? [
          { label: 'Total', value: totalIncidencias, showColon: true }
        ] : undefined
      },
      {
        icon: <ClipboardCheck className="h-6 w-6" />,
        kpi: {
          name: isPercent ? 'Permisos (%)' : 'Permisos (#)',
          category: 'headcount' as const,
          value: isPercent ? Number(permisosPct.toFixed(1)) : totalPermisos,
          previous_value: isPercent ? Number(permisosPctAnterior.toFixed(1)) : totalPermisosAnteriores,
          variance_percentage: isPercent
            ? calculateVariancePercentage(permisosPct, permisosPctAnterior)
            : calculateVariancePercentage(totalPermisos, totalPermisosAnteriores),
          period_start: toISODate(currentReferenceDate),
          period_end: toISODate(currentReferenceDate)
        },
        secondaryRows: isPercent ? [
          { label: 'Total', value: totalPermisos, showColon: true }
        ] : undefined
      },
    ];
  }, [metricType, activosCount, activosPrevios, empleadosConIncidenciasPct, empleadosConIncidenciasAnteriorPct, empleadosConIncidencias, empleadosConIncidenciasAnterior, incidenciasPct, incidenciasPctAnterior, totalIncidencias, totalIncidenciasAnterior, permisosPct, permisosPctAnterior, totalPermisos, totalPermisosAnteriores, currentReferenceDate, maMonth.activos, mmaaMonth.activos]);

  // Histograma: eje X = # Empleados (o %), eje Y = # Faltas (FI, SUSP)
  const histoData = useMemo(() => {
    const byEmp = new Map<number, number>();
    enrichedPeriodo.forEach(i => {
      const code = normalizeIncidenciaCode(i.inci);
      if (!code || !FALTAS_CODES.has(code)) return; // ✅ SOLO FALTAS (FI, SUSP)
      byEmp.set(i.emp, (byEmp.get(i.emp) || 0) + 1);
    });
    const bins = new Map<number, number>();
    byEmp.forEach((count) => {
      bins.set(count, (bins.get(count) || 0) + 1);
    });

    const totalEmpleadosConIncidencias = byEmp.size;

    const dataPoints = Array.from(bins.entries()).sort((a,b)=>a[0]-b[0]).map(([incidencias, empleados]) => ({
      incidencias,
      empleados: metricType === "percent" && totalEmpleadosConIncidencias > 0
        ? Number(((empleados / totalEmpleadosConIncidencias) * 100).toFixed(1))
        : empleados
    }));

    const maxEmpleados = dataPoints.reduce((max, point) => Math.max(max, typeof point.empleados === 'number' ? point.empleados : 0), 0);
    const domainMax = metricType === "percent"
      ? Math.min(100, Math.max(10, Math.ceil(maxEmpleados * 1.2)))
      : null;

    return { data: dataPoints, domainMax };
  }, [enrichedPeriodo, metricType]);

  // Resumen por tipo: #días (≈ registros) y #empleados únicos por tipo
  const tiposUnicos = useMemo(() => {
    // Incluir todos los códigos presentes (incidencias y permisos), normalizados
    return Array.from(new Set(enrichedPeriodo.map(i => normalizeIncidenciaCode(i.inci)).filter((c): c is string => !!c))).sort();
  }, [enrichedPeriodo]);
  const resumenPorTipo = useMemo(() => {
    const out = [] as { tipo: string; dias: number | string; empleados: number | string }[];
    const byTipo = new Map<string, IncidenciaCSVRecord[]>();
    enrichedPeriodo.forEach(i => {
      const t = normalizeIncidenciaCode(i.inci);
      if (!t) return;
      if (!byTipo.has(t)) byTipo.set(t, []);
      byTipo.get(t)!.push(i);
    });

    // Calculate totals for percentage mode
    const totalDias = enrichedPeriodo.length;
    const totalEmpleadosUnicos = new Set(enrichedPeriodo.map(i => i.emp)).size;

    // Solo tipos presentes en datos (no listar tipos inexistentes)
    tiposUnicos.forEach(t => {
      const arr = byTipo.get(t) || [];
      const empleadosTipo = new Set(arr.map(a => a.emp)).size;
      const diasCount = arr.length;

      if (metricType === "percent") {
        const diasPct = totalDias > 0 ? (diasCount / totalDias * 100).toFixed(1) + '%' : '0%';
        const empleadosPct = totalEmpleadosUnicos > 0 ? (empleadosTipo / totalEmpleadosUnicos * 100).toFixed(1) + '%' : '0%';
        out.push({ tipo: t, dias: diasPct, empleados: empleadosPct });
      } else {
        out.push({ tipo: t, dias: diasCount, empleados: empleadosTipo });
      }
    });

    // Orden principal: mayor número de empleados, luego tipo de grupo
    const groupOf = (code: string) => (
      INCIDENT_CODES.has(code) ? 0 : PERMISO_CODES.has(code) ? 1 : 2
    );
    out.sort((a, b) => {
      const aEmp = typeof a.empleados === 'number' ? a.empleados : parseFloat(a.empleados);
      const bEmp = typeof b.empleados === 'number' ? b.empleados : parseFloat(b.empleados);
      if (bEmp !== aEmp) return bEmp - aEmp;
      const ga = groupOf(a.tipo);
      const gb = groupOf(b.tipo);
      if (ga !== gb) return ga - gb;
      return a.tipo.localeCompare(b.tipo);
    });
    return out;
  }, [enrichedPeriodo, tiposUnicos, metricType]);

  const pieData = useMemo(() => ([
    { name: 'Faltas', value: totalFaltas },
    { name: 'Salud', value: totalSalud },
    { name: 'Permisos', value: totalPermisosOnly },
    { name: 'Vacaciones', value: totalVacaciones },
  ]), [totalFaltas, totalSalud, totalPermisosOnly, totalVacaciones]);

  const incidenciasPorDia = useMemo(() => {
    const baseCounts = WEEKDAY_ORDER.map(day => ({
      dia: WEEKDAY_LABELS[day],
      ausentismosCount: 0,
      permisosCount: 0,
    }));
    const indexMap = new Map<number, number>();
    WEEKDAY_ORDER.forEach((day, idx) => indexMap.set(day, idx));

    enrichedPeriodo.forEach(inc => {
      if (!inc.fecha) return;
      const fecha = new Date(inc.fecha);
      if (Number.isNaN(fecha.getTime())) return;
      const weekday = fecha.getDay();
      const bucketIndex = indexMap.get(weekday);
      if (bucketIndex === undefined) return;

      const code = normalizeIncidenciaCode(inc.inci);
      if (!code) return;
      if (INCIDENT_CODES.has(code)) {
        baseCounts[bucketIndex].ausentismosCount += 1;
      } else if (PERMISO_CODES.has(code)) {
        baseCounts[bucketIndex].permisosCount += 1;
      }
    });

    // Convert to percentage if needed
    let dataPoints;
    if (metricType === "percent") {
      // Calculate % based on total dias laborables in period
      dataPoints = baseCounts.map(day => ({
        dia: day.dia,
        ausentismos: diasLaborablesActual > 0 ? Number((day.ausentismosCount / diasLaborablesActual * 100).toFixed(1)) : 0,
        permisos: diasLaborablesActual > 0 ? Number((day.permisosCount / diasLaborablesActual * 100).toFixed(1)) : 0,
      }));
    } else {
      dataPoints = baseCounts.map(day => ({
        dia: day.dia,
        ausentismos: day.ausentismosCount,
        permisos: day.permisosCount,
      }));
    }

    const maxValue = dataPoints.reduce((max, point) => Math.max(max, point.ausentismos, point.permisos), 0);
    const domainMax = metricType === "percent"
      ? Math.min(100, Math.max(5, Math.ceil(maxValue * 1.2)))
      : null;

    return { data: dataPoints, domainMax };
  }, [enrichedPeriodo, metricType, diasLaborablesActual]);

  const incidenciasPorArea = useMemo(() => {
    const map = new Map<string, { ausentismos: number; permisos: number }>();

    enrichedPeriodo.forEach(inc => {
      const code = normalizeIncidenciaCode(inc.inci);
      if (!code) return;
      if (!INCIDENT_CODES.has(code) && !PERMISO_CODES.has(code)) return;

      const rawArea = (inc.area || '').trim();
      const area = rawArea.length > 0 ? rawArea : 'Sin área definida';

      if (!map.has(area)) {
        map.set(area, { ausentismos: 0, permisos: 0 });
      }
      const bucket = map.get(area)!;
      if (INCIDENT_CODES.has(code)) {
        bucket.ausentismos += 1;
      } else if (PERMISO_CODES.has(code)) {
        bucket.permisos += 1;
      }
    });

    const entries = Array.from(map.entries())
      .map(([area, counts]) => {
        const diasArea = diasLaborablesPorArea.get(area) || 0;

        if (metricType === "percent") {
          const ausentismosPct = diasArea > 0 ? (counts.ausentismos / diasArea) * 100 : 0;
          const permisosPct = diasArea > 0 ? (counts.permisos / diasArea) * 100 : 0;
          return {
            area,
            ausentismos: Number(ausentismosPct.toFixed(2)),
            permisos: Number(permisosPct.toFixed(2)),
            totalPct: ausentismosPct + permisosPct,
          };
        } else {
          return {
            area,
            ausentismos: counts.ausentismos,
            permisos: counts.permisos,
            totalPct: counts.ausentismos + counts.permisos,
          };
        }
      })
      .filter(entry => entry.totalPct > 0)
      .sort((a, b) => b.totalPct - a.totalPct);

    const TOP_LIMIT = 8;
    const dataPoints = entries.slice(0, TOP_LIMIT).map(({ area, ausentismos, permisos }) => ({
      area,
      ausentismos,
      permisos,
    }));

    const maxValue = dataPoints.reduce((max, point) => Math.max(max, point.ausentismos, point.permisos), 0);
    const domainMax = metricType === "percent"
      ? Math.min(100, Math.max(5, Math.ceil(maxValue * 1.2)))
      : null;

    return { data: dataPoints, domainMax };
  }, [enrichedPeriodo, diasLaborablesPorArea, metricType]);

  const hasWeekdayData = useMemo(
    () => incidenciasPorDia.data.some(item => item.ausentismos > 0 || item.permisos > 0),
    [incidenciasPorDia]
  );
  const hasAreaData = useMemo(
    () => incidenciasPorArea.data.some(item => item.ausentismos > 0 || item.permisos > 0),
    [incidenciasPorArea]
  );


  // Calcular tendencias mensuales para el año actual
  const monthlyTrendsData = useMemo(() => {
    const selectedYear = typeof currentYear === "number" ? currentYear : null;
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dataPoints = months.map((monthName, index) => {
      const monthData = enrichedAnual.filter(inc => {
        if (!inc.fecha) return false;
        const date = new Date(inc.fecha);
        if (Number.isNaN(date.getTime())) return false;
        if (selectedYear !== null && date.getFullYear() !== selectedYear) {
          return false;
        }
        return date.getMonth() === index;
      });

      let faltasCount = 0;
      let saludCount = 0;
      let permisosCount = 0;
      let vacacionesCount = 0;

      monthData.forEach(inc => {
        const code = normalizeIncidenciaCode(inc.inci);
        if (!code) return;

        if (FALTAS_CODES.has(code)) {
          faltasCount++;
        } else if (SALUD_CODES.has(code)) {
          saludCount++;
        } else if (PERMISOS_CODES.has(code)) {
          permisosCount++;
        } else if (VACACIONES_CODES.has(code)) {
          vacacionesCount++;
        }
      });

      // Calculate dias laborables for this month
      const year = selectedYear || new Date().getFullYear();
      const monthDate = new Date(year, index, 15); // Mid-month
      const monthStats = buildMonthStats(monthDate);
      const diasLaborablesMonth = monthStats.diasLaborables;

      // Calculate percentages
      const faltasPctMonth = diasLaborablesMonth > 0 ? (faltasCount / diasLaborablesMonth) * 100 : 0;
      const saludPctMonth = diasLaborablesMonth > 0 ? (saludCount / diasLaborablesMonth) * 100 : 0;
      const permisosPctMonth = diasLaborablesMonth > 0 ? (permisosCount / diasLaborablesMonth) * 100 : 0;
      const vacacionesPctMonth = diasLaborablesMonth > 0 ? (vacacionesCount / diasLaborablesMonth) * 100 : 0;

      return {
        mes: monthName,
        faltas: metricType === "percent" ? Number(faltasPctMonth.toFixed(1)) : faltasCount,
        salud: metricType === "percent" ? Number(saludPctMonth.toFixed(1)) : saludCount,
        permisos: metricType === "percent" ? Number(permisosPctMonth.toFixed(1)) : permisosCount,
        vacaciones: metricType === "percent" ? Number(vacacionesPctMonth.toFixed(1)) : vacacionesCount
      };
    });

    // Calculate dynamic domain for better visualization
    const maxValue = dataPoints.reduce((max, point) => {
      return Math.max(max, point.faltas, point.salud, point.permisos, point.vacaciones);
    }, 0);

    const domainMax = metricType === "percent"
      ? Math.min(100, Math.max(10, Math.ceil(maxValue * 1.2))) // 20% padding, min 10, cap at 100
      : null;

    return { data: dataPoints, domainMax };
  }, [enrichedAnual, currentYear, metricType, buildMonthStats]);

  // ✅ AUSENTISMO MENSUAL: TODOS los motivos (Faltas + Salud + Permisos + Vacaciones)
  const monthlyAbsenteeismComparison = useMemo(() => {
    const targetYear = typeof currentYear === 'number' ? currentYear : new Date().getFullYear();
    const previousYear = targetYear - 1;
    const now = new Date();

    const data = MONTH_LABELS_SHORT.map((mes, index) => {
      const currentStart = new Date(targetYear, index, 1);
      const currentEnd = new Date(targetYear, index + 1, 0);
      const previousStart = new Date(previousYear, index, 1);
      const previousEnd = new Date(previousYear, index + 1, 0);

      // Count ALL ausentismo categories (Faltas, Salud, Permisos, Vacaciones) for current month
      const ausentismosCurrent = incidencias.filter((inc) => {
        if (!inc.fecha) return false;
        const d = new Date(inc.fecha);
        if (d < currentStart || d > currentEnd) return false;
        const code = normalizeIncidenciaCode(inc.inci);
        return code && (FALTAS_CODES.has(code) || SALUD_CODES.has(code) || PERMISOS_CODES.has(code) || VACACIONES_CODES.has(code));
      }).length;

      // Count ALL ausentismo categories for previous year same month
      const ausentismosPrevious = incidencias.filter((inc) => {
        if (!inc.fecha) return false;
        const d = new Date(inc.fecha);
        if (d < previousStart || d > previousEnd) return false;
        const code = normalizeIncidenciaCode(inc.inci);
        return code && (FALTAS_CODES.has(code) || SALUD_CODES.has(code) || PERMISOS_CODES.has(code) || VACACIONES_CODES.has(code));
      }).length;

      // Calculate días laborables (total work days) for each month
      const diasLaborablesCurrent = plantillaBaseForActivos.reduce((acc, emp) => acc + calcularDiasActivo(emp, currentStart, currentEnd), 0);
      const diasLaborablesPrevious = plantillaBaseForActivos.reduce((acc, emp) => acc + calcularDiasActivo(emp, previousStart, previousEnd), 0);

      let currentValue: number | null;
      let previousValue: number | null;

      if (metricType === "percent") {
        // ✅ CORRECCIÓN: Percentage = (total ausentismos / días laborables) * 100
        currentValue = diasLaborablesCurrent > 0 ? (ausentismosCurrent / diasLaborablesCurrent) * 100 : null;
        previousValue = diasLaborablesPrevious > 0 ? (ausentismosPrevious / diasLaborablesPrevious) * 100 : null;
      } else {
        currentValue = ausentismosCurrent > 0 ? ausentismosCurrent : null;
        previousValue = ausentismosPrevious > 0 ? ausentismosPrevious : null;
      }

      const isFutureMonth = targetYear === now.getFullYear() && currentEnd > now;
      if (isFutureMonth && currentValue === null && previousValue === null) {
        return null;
      }

      return {
        mes,
        actual: currentValue,
        anterior: previousValue,
      };
    }).filter((entry): entry is { mes: string; actual: number | null; anterior: number | null } => entry !== null);

    const maxValue = data.reduce((acc, item) => {
      const candidates = [item.actual ?? 0, item.anterior ?? 0];
      return Math.max(acc, ...candidates);
    }, 0);

    const domainTop = metricType === "percent"
      ? (maxValue > 0 ? Math.min(100, Math.ceil(maxValue + 2)) : 10)
      : Math.ceil(maxValue * 1.1);

    return { data, targetYear, previousYear, domainTop };
  }, [incidencias, plantillaBaseForActivos, calcularDiasActivo, currentYear, metricType]);

  // ✅ AUSENTISMO ACUMULADO 12 MESES MÓVILES: TODOS los motivos (Faltas + Salud + Permisos + Vacaciones)
  const rollingAbsenteeismComparison = useMemo(() => {
    const targetYear = typeof currentYear === 'number' ? currentYear : new Date().getFullYear();
    const previousYear = targetYear - 1;
    const now = new Date();

    const data = MONTH_LABELS_SHORT.map((mes, index) => {
      const currentEnd = new Date(targetYear, index + 1, 0);
      const currentStart = new Date(targetYear, index - 11, 1); // 12 months back
      const previousEnd = new Date(previousYear, index + 1, 0);
      const previousStart = new Date(previousYear, index - 11, 1);

      // Count ALL ausentismo categories in rolling 12 months
      const ausentismosCurrent = incidencias.filter((inc) => {
        if (!inc.fecha) return false;
        const d = new Date(inc.fecha);
        if (d < currentStart || d > currentEnd) return false;
        const code = normalizeIncidenciaCode(inc.inci);
        return code && (FALTAS_CODES.has(code) || SALUD_CODES.has(code) || PERMISOS_CODES.has(code) || VACACIONES_CODES.has(code));
      }).length;

      const ausentismosPrevious = incidencias.filter((inc) => {
        if (!inc.fecha) return false;
        const d = new Date(inc.fecha);
        if (d < previousStart || d > previousEnd) return false;
        const code = normalizeIncidenciaCode(inc.inci);
        return code && (FALTAS_CODES.has(code) || SALUD_CODES.has(code) || PERMISOS_CODES.has(code) || VACACIONES_CODES.has(code));
      }).length;

      // Calculate días laborables for rolling 12 months
      const diasLaborablesCurrent = plantillaBaseForActivos.reduce((acc, emp) => acc + calcularDiasActivo(emp, currentStart, currentEnd), 0);
      const diasLaborablesPrevious = plantillaBaseForActivos.reduce((acc, emp) => acc + calcularDiasActivo(emp, previousStart, previousEnd), 0);

      let currentValue: number | null;
      let previousValue: number | null;

      if (metricType === "percent") {
        // ✅ CORRECCIÓN: Percentage = (total ausentismos in 12 months / días laborables) * 100
        currentValue = diasLaborablesCurrent > 0 ? (ausentismosCurrent / diasLaborablesCurrent) * 100 : null;
        previousValue = diasLaborablesPrevious > 0 ? (ausentismosPrevious / diasLaborablesPrevious) * 100 : null;
      } else {
        currentValue = ausentismosCurrent > 0 ? ausentismosCurrent : null;
        previousValue = ausentismosPrevious > 0 ? ausentismosPrevious : null;
      }

      const isFutureMonth = targetYear === now.getFullYear() && currentEnd > now;
      if (isFutureMonth && currentValue === null && previousValue === null) {
        return null;
      }

      return {
        mes,
        actual: currentValue,
        anterior: previousValue,
      };
    }).filter((entry): entry is { mes: string; actual: number | null; anterior: number | null } => entry !== null);

    const maxValue = data.reduce((acc, item) => {
      const candidates = [item.actual ?? 0, item.anterior ?? 0];
      return Math.max(acc, ...candidates);
    }, 0);

    const domainTop = metricType === "percent"
      ? (maxValue > 0 ? Math.min(100, Math.ceil(maxValue + 2)) : 10)
      : Math.ceil(maxValue * 1.1);

    return { data, targetYear, previousYear, domainTop };
  }, [incidencias, plantillaBaseForActivos, calcularDiasActivo, currentYear, metricType]);

  const ChartLoadingPlaceholder = ({ height = 320 }: { height?: number }) => (
    <div
      className="flex items-center justify-center text-sm text-gray-500"
      style={{ minHeight: height }}
    >
      Cargando incidencias...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toggle global para % o # */}
      <div className="flex justify-end">
        <MetricToggle value={metricType} onChange={setMetricType} size="md" />
      </div>

      {/* 4 Cards con toggle % / # */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingIncidencias
          ? Array.from({ length: 4 }).map((_, index) => (
              <KPICardSkeleton key={`incidents-kpi-skeleton-${index}`} />
            ))
          : incidentsKpiCards.map(({ kpi, icon, secondaryRows }, index) => (
              <KPICard key={`incidents-kpi-${index}`} kpi={kpi} icon={icon} secondaryRows={secondaryRows} />
            ))}
      </div>
      <p className="text-xs text-gray-500">
        * MA: Mes Anterior. MMAA: Mismo Mes Año Anterior. Incidencias: FI, SUSP, PSIN, ENFE · Permisos: PCON, VAC, MAT3, MAT1, JUST
      </p>

      {/* Gráfica de Tendencia Mensual - 4 Categorías */}
      <div className="mb-6">
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">Ausentismo por Motivo - {currentYear || new Date().getFullYear()}</CardTitle>
              <p className="text-sm text-gray-600">Evolución de Faltas, Salud, Permisos y Vacaciones {metricType === "percent" ? "(porcentaje)" : "(cantidad)"}</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={320} />
            ) : (
              <VisualizationContainer
                title="Tendencia mensual: 4 Categorías"
                type="chart"
                className="h-[320px] w-full"
                filename="tendencia-4-categorias"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 420 : 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrendsData.data} margin={{ left: 32, right: 16, top: 8, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="mes"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          label={{
                            value: metricType === "percent" ? 'Porcentaje (%)' : 'Cantidad',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 10
                          }}
                          tick={{ fontSize: 12 }}
                          domain={monthlyTrendsData.domainMax !== null ? [0, monthlyTrendsData.domainMax] : undefined}
                        />
                        <Tooltip
                          contentStyle={LINE_TOOLTIP_STYLE}
                          labelStyle={LINE_TOOLTIP_LABEL_STYLE}
                          cursor={{ strokeDasharray: '3 3', stroke: withOpacity(getModernColor(0), 0.35) }}
                          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                          formatter={(value: number | string, name: string) => {
                            const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                            const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
                            const formatted = metricType === "percent"
                              ? `${safeValue.toFixed(1)}%`
                              : `${safeValue.toLocaleString('es-MX')} registros`;
                            return [formatted, name];
                          }}
                        />
                        <Legend wrapperStyle={PIE_LEGEND_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                        <Line
                          type="monotone"
                          dataKey="faltas"
                          stroke={getModernColor(0)}
                          strokeWidth={3}
                          dot={{ fill: getModernColor(0), strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8 }}
                          name={metricType === "percent" ? "Faltas (%)" : "# Faltas"}
                        />
                        <Line
                          type="monotone"
                          dataKey="salud"
                          stroke={getModernColor(1)}
                          strokeWidth={3}
                          dot={{ fill: getModernColor(1), strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8 }}
                          name={metricType === "percent" ? "Salud (%)" : "# Salud"}
                        />
                        <Line
                          type="monotone"
                          dataKey="permisos"
                          stroke={getModernColor(2)}
                          strokeWidth={3}
                          dot={{ fill: getModernColor(2), strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8 }}
                          name={metricType === "percent" ? "Permisos (%)" : "# Permisos"}
                        />
                        <Line
                          type="monotone"
                          dataKey="vacaciones"
                          stroke={getModernColor(3)}
                          strokeWidth={3}
                          dot={{ fill: getModernColor(3), strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8 }}
                          name={metricType === "percent" ? "Vacaciones (%)" : "# Vacaciones"}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </VisualizationContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sección central: 3 tarjetas en la misma fila (responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Histograma: Faltas por empleado */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Faltas por empleado</CardTitle>
            <p className="text-sm text-gray-600">
              X: # Faltas • Y: {metricType === "percent" ? "% Empleados" : "# Empleados"}
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={320} />
            ) : (
              <VisualizationContainer
                title="Distribución de incidencias por empleado"
                type="chart"
                className="h-full w-full"
                filename="incidencias-por-empleado"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 420 : 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histoData.data} margin={{ left: 16, right: 16, top: 8, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="incidencias" label={{ value: '# Faltas', position: 'insideBottom', offset: -10 }} />
                        <YAxis
                          type="number"
                          dataKey="empleados"
                          label={{
                            value: metricType === "percent" ? '% Empleados' : '# Empleados',
                            angle: -90,
                            position: 'insideLeft'
                          }}
                          domain={histoData.domainMax !== null ? [0, histoData.domainMax] : undefined}
                        />
                        <Tooltip
                          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                          contentStyle={LINE_TOOLTIP_STYLE}
                          labelStyle={LINE_TOOLTIP_LABEL_STYLE}
                          formatter={(value: number) => metricType === "percent" ? `${value}%` : value}
                        />
                        <Bar dataKey="empleados" fill={getModernColor(0)} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </VisualizationContainer>
            )}
          </CardContent>
        </Card>

        {/* Resumen por tipo - Solo Faltas + Salud */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-base">Incidencias por tipo (Faltas + Salud)</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-hidden pt-2 pb-4">
            <VisualizationContainer
              title="Tabla de incidencias por tipo"
              type="table"
              className="h-full w-full"
              filename="incidencias-por-tipo"
            >
              {() => (
                loadingIncidencias ? (
                  <ChartLoadingPlaceholder height={280} />
                ) : (
                  <div className="h-full overflow-y-auto overflow-x-hidden pr-2">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-white">
                        <TableRow>
                          <TableHead className="w-1/2">Tipo</TableHead>
                          <TableHead className="w-1/4 text-center">
                            {metricType === "percent" ? "% días" : "# días"}
                          </TableHead>
                          <TableHead className="w-1/4 text-center">
                            {metricType === "percent" ? "% emp" : "# emp"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumenPorTipo.filter(r => FALTAS_CODES.has(r.tipo) || SALUD_CODES.has(r.tipo)).map(r => (
                          <TableRow key={r.tipo}>
                            <TableCell className="py-2 font-medium">{labelForIncidencia(r.tipo)}</TableCell>
                            <TableCell className="py-2 text-center">{r.dias.toLocaleString()}</TableCell>
                            <TableCell className="py-2 text-center">{r.empleados.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>

        {/* Pie: 4 Categorías (Faltas, Salud, Permisos, Vacaciones) */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribución: 4 Categorías</CardTitle></CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={320} />
            ) : (
              <VisualizationContainer
                title="Distribución: 4 Categorías"
                type="chart"
                className="h-full w-full"
                filename="distribucion-4-categorias"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 420 : 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                          cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                          contentStyle={PIE_TOOLTIP_STYLE}
                          labelStyle={PIE_TOOLTIP_LABEL_STYLE}
                          formatter={(value: number, name: string) => {
                            const total = pieData.reduce((acc, item) => acc + item.value, 0);
                            const percentage = total > 0 ? (Number(value) / total) * 100 : 0;
                            if (metricType === "percent") {
                              return [`${percentage.toFixed(1)}%`, name];
                            }
                            return [
                              `${Number(value).toLocaleString('es-MX')} (${percentage.toFixed(1)}%)`,
                              name
                            ];
                          }}
                        />
                        <Legend wrapperStyle={PIE_LEGEND_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={fullscreen ? 60 : 50}
                          outerRadius={fullscreen ? 150 : 110}
                          paddingAngle={2}
                          labelLine={false}
                          label={renderPieInnerLabel}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </VisualizationContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ausentismos vs permisos por día (full width) */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ausentismos vs Permisos por día</CardTitle>
            <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-600'}`}>Comparativo del periodo seleccionado, lunes a domingo</p>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={320} />
            ) : hasWeekdayData ? (
              <VisualizationContainer
                title="Ausentismos vs permisos por día de la semana"
                type="chart"
                className="h-full w-full"
                filename="incidencias-dia-semana"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 420 : 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incidenciasPorDia.data} margin={{ left: 16, right: 24, top: 16, bottom: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                        <XAxis dataKey="dia" tick={{ fontSize: 12, fill: axisSecondaryColor }} />
                        <YAxis
                          tick={{ fontSize: 12, fill: axisMutedColor }}
                          label={{
                            value: metricType === "percent" ? 'Porcentaje (%)' : 'Cantidad',
                            angle: -90,
                            position: 'insideLeft'
                          }}
                          domain={incidenciasPorDia.domainMax !== null ? [0, incidenciasPorDia.domainMax] : undefined}
                        />
                        <Tooltip
                          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                          contentStyle={LINE_TOOLTIP_STYLE}
                          labelStyle={LINE_TOOLTIP_LABEL_STYLE}
                          formatter={(value: number, name: string) => {
                            const formatted = metricType === "percent"
                              ? `${Number(value || 0).toFixed(1)}%`
                              : `${Number(value || 0).toLocaleString('es-MX')} registros`;
                            return [formatted, name];
                          }}
                        />
                        <Legend wrapperStyle={PIE_LEGEND_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                        <Bar dataKey="ausentismos" name="Ausentismos" fill={AUSENTISMO_COLOR} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="permisos" name="Permisos" fill={PERMISO_COLOR} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </VisualizationContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No hay ausentismos o permisos registrados en el periodo seleccionado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nuevas Gráficas de Ausentismo - Barras Verticales (TODOS los motivos) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 5.8: Ausentismo Mensual */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ausentismo Mensual</CardTitle>
            <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-600'}`}>
              Todos los ausentismos por mes: Año actual vs año anterior
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={400} />
            ) : monthlyAbsenteeismComparison.data.length > 0 ? (
              <VisualizationContainer
                title="Ausentismo mensual"
                type="chart"
                className="h-[400px] w-full"
                filename="ausentismo-mensual"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 480 : 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={monthlyAbsenteeismComparison.data}
                        margin={{ left: 16, right: 16, top: 32, bottom: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11, fill: axisSecondaryColor }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: axisMutedColor }}
                          tickFormatter={(v) => metricType === "percent" ? `${v}%` : v}
                          label={{
                            value: metricType === "percent" ? 'Porcentaje (%)' : 'Cantidad',
                            angle: -90,
                            position: 'insideLeft'
                          }}
                          domain={[0, monthlyAbsenteeismComparison.domainTop]}
                        />
                        <Tooltip
                          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                          contentStyle={LINE_TOOLTIP_STYLE}
                          labelStyle={LINE_TOOLTIP_LABEL_STYLE}
                          formatter={(value: number, name: string) => {
                            const formatted = metricType === "percent"
                              ? `${Number(value || 0).toFixed(2)}%`
                              : `${Number(value || 0).toLocaleString('es-MX')}`;
                            return [formatted, name];
                          }}
                        />
                        <Legend wrapperStyle={PIE_LEGEND_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                        <Area
                          type="monotone"
                          dataKey="anterior"
                          name={`${monthlyAbsenteeismComparison.previousYear}`}
                          stroke={withOpacity('#94a3b8', 0.9)}
                          fill={withOpacity('#94a3b8', 0.4)}
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                        <Bar
                          dataKey="actual"
                          name={`${monthlyAbsenteeismComparison.targetYear}`}
                          fill={getModernColor(0)}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        >
                          <LabelList
                            dataKey="actual"
                            position="top"
                            formatter={(value: number) => value !== null && value > 0 ? `${Number(value).toFixed(0)}%` : ''}
                            style={{ fontSize: 10, fill: axisSecondaryColor, fontWeight: 600 }}
                          />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </VisualizationContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No hay datos de ausentismo para graficar.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5.9: Ausentismo Acumulado 12 Meses Móviles */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ausentismo Acumulado - Meses Móviles</CardTitle>
            <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-gray-600'}`}>
              Todos los ausentismos acumulados últimos 12 meses: Año actual vs año anterior
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={400} />
            ) : rollingAbsenteeismComparison.data.length > 0 ? (
              <VisualizationContainer
                title="Ausentismo acumulado 12 meses móviles"
                type="chart"
                className="h-[400px] w-full"
                filename="ausentismo-acumulado-movil"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 480 : 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={rollingAbsenteeismComparison.data}
                        margin={{ left: 16, right: 16, top: 32, bottom: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11, fill: axisSecondaryColor }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: axisMutedColor }}
                          tickFormatter={(v) => metricType === "percent" ? `${v}%` : v}
                          label={{
                            value: metricType === "percent" ? 'Porcentaje (%)' : 'Cantidad',
                            angle: -90,
                            position: 'insideLeft'
                          }}
                          domain={[0, rollingAbsenteeismComparison.domainTop]}
                        />
                        <Tooltip
                          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                          contentStyle={LINE_TOOLTIP_STYLE}
                          labelStyle={LINE_TOOLTIP_LABEL_STYLE}
                          formatter={(value: number, name: string) => {
                            const formatted = metricType === "percent"
                              ? `${Number(value || 0).toFixed(2)}%`
                              : `${Number(value || 0).toLocaleString('es-MX')}`;
                            return [formatted, name];
                          }}
                        />
                        <Legend wrapperStyle={PIE_LEGEND_STYLE} iconType="circle" iconSize={10} formatter={legendFormatter} />
                        <Area
                          type="monotone"
                          dataKey="anterior"
                          name={`${rollingAbsenteeismComparison.previousYear}`}
                          stroke={withOpacity('#94a3b8', 0.9)}
                          fill={withOpacity('#94a3b8', 0.4)}
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                        <Bar
                          dataKey="actual"
                          name={`${rollingAbsenteeismComparison.targetYear}`}
                          fill={getModernColor(0)}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        >
                          <LabelList
                            dataKey="actual"
                            position="top"
                            formatter={(value: number) => value !== null && value > 0 ? `${Number(value).toFixed(0)}%` : ''}
                            style={{ fontSize: 10, fill: axisSecondaryColor, fontWeight: 600 }}
                          />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </VisualizationContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No hay datos de ausentismo acumulado para graficar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla completa (mostrar 10 por defecto; botón para ver todo) */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tabla de incidencias</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowTable(s => !s)}>
            {showTable ? 'Mostrar 10' : 'Mostrar todo'}
          </Button>
        </CardHeader>
        <CardContent>
          <VisualizationContainer
            title="Tabla de incidencias detallada"
            type="table"
            className="w-full"
            filename="tabla-incidencias"
          >
            {() => (
              loadingIncidencias ? (
                <ChartLoadingPlaceholder height={360} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Incidencia</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Puesto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showTable ? enrichedPeriodo : enrichedPeriodo.slice(0, 10)).map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>{i.id}</TableCell>
                          <TableCell>{formatToDDMMYYYY(i.fecha)}</TableCell>
                          <TableCell>{labelForIncidencia(i.inci, i.incidencia) || '-'}</TableCell>
                          <TableCell>1</TableCell>
                          <TableCell>{i.empresa || '—'}</TableCell>
                          <TableCell>{i.departamento || '—'}</TableCell>
                          <TableCell>{i.area || '—'}</TableCell>
                          <TableCell>{i.puesto || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </VisualizationContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default IncidentsTab;
