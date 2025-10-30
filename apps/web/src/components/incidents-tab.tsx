"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, type IncidenciaCSVRecord, type PlantillaRecord } from "@/lib/supabase";
import { normalizeIncidenciaCode, labelForIncidencia } from "@/lib/normalizers";
import type { KPIResult } from "@/lib/kpi-calculator";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format } from "date-fns";
import { VisualizationContainer } from "@/components/visualization-container";
import { calculateVariancePercentage, countActivosEnFecha } from "@/lib/utils/kpi-helpers";
import { KPICard, KPICardSkeleton } from "./kpi-card";
import { Users, AlertCircle, Activity, ClipboardCheck } from "lucide-react";

type Props = {
  plantilla?: PlantillaRecord[];
  plantillaAnual?: PlantillaRecord[];
  currentYear?: number;
  selectedMonths?: number[];
  initialIncidencias?: IncidenciaCSVRecord[];
};

type EnrichedIncidencia = IncidenciaCSVRecord & {
  nombre?: string | null;
  empresa?: string | null;
  departamento?: string | null;
  area?: string | null;
  puesto?: string | null;
};

const INCIDENT_CODES = new Set(["FI", "SUS", "PSIN", "ENFE"]);
const EMPLOYEE_INCIDENT_CODES = new Set(["FI", "SUS", "PSIN", "ENFE"]); // Para card de empleados con incidencias
const PERMISO_CODES = new Set(["PCON", "VAC", "MAT3", "MAT1", "JUST"]);

const formatToDDMMYYYY = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return format(parsed, 'dd-MM-yyyy');
};

export function IncidentsTab({ plantilla, plantillaAnual, currentYear, selectedMonths, initialIncidencias }: Props) {
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

    const targetYear = currentYear ?? new Date().getFullYear();
    const scopedByYear = scopedByEmployee.filter(inc => {
      if (currentYear === undefined) return true;
      if (!inc.fecha) return false;
      const fecha = new Date(inc.fecha);
      return fecha.getFullYear() === currentYear;
    });

    const monthsFilter = (selectedMonths || []).filter(m => Number.isFinite(m)) as number[];

    const buildPairs = (months: number[], seedYear: number) =>
      months.map(month => {
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

    const baseMonths = monthsFilter.length > 0 ? monthsFilter : Array.from({ length: 12 }, (_, index) => index + 1);
    const currentPairs = dedupePairs(buildPairs(baseMonths, targetYear));
    const previousPairs = dedupePairs(shiftPairsBackOneMonth(currentPairs));

    const matchesPairs = (date: Date, pairs: { year: number; month: number }[]) =>
      pairs.some(({ year, month }) => date.getFullYear() === year && date.getMonth() + 1 === month);

    const scopedByPeriod = monthsFilter.length
      ? scopedByYear.filter(inc => {
          if (!inc.fecha) return false;
          return matchesPairs(new Date(inc.fecha), currentPairs);
        })
      : scopedByYear;

    const scopedByPrevious = scopedByEmployee.filter(inc => {
      if (!inc.fecha) return false;
      return matchesPairs(new Date(inc.fecha), previousPairs);
    });

    const toEnriched = (collection: IncidenciaCSVRecord[]): EnrichedIncidencia[] =>
      collection.map(inc => {
        const emp = empleadosAnualesMap.get(inc.emp);
        return {
          ...inc,
          nombre: emp?.nombre ?? inc.nombre ?? null,
          empresa: emp?.empresa ?? null,
          departamento: emp?.departamento ?? null,
          area: emp?.area ?? null,
          puesto: emp?.puesto ?? null,
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

  const toISODate = (date: Date) => format(date, 'yyyy-MM-dd');

  const incidentsKpiCards: { icon: ReactNode; kpi: KPIResult }[] = [
    {
      icon: <Users className="h-6 w-6" />,
      kpi: {
        name: '# de activos',
        category: 'headcount',
        value: activosCount,
        previous_value: activosPrevios,
        variance_percentage: calculateVariancePercentage(activosCount, activosPrevios),
        period_start: toISODate(currentReferenceDate),
        period_end: toISODate(currentReferenceDate),
      },
    },
    {
      icon: <AlertCircle className="h-6 w-6" />,
      kpi: {
        name: 'Empleados con incidencias',
        category: 'incidents',
        value: empleadosConIncidencias,
        previous_value: empleadosConIncidenciasAnterior,
        variance_percentage: calculateVariancePercentage(empleadosConIncidencias, empleadosConIncidenciasAnterior),
        period_start: toISODate(currentReferenceDate),
        period_end: toISODate(currentReferenceDate),
      },
    },
    {
      icon: <Activity className="h-6 w-6" />,
      kpi: {
        name: 'Incidencias',
        category: 'incidents',
        value: totalIncidencias,
        previous_value: totalIncidenciasAnterior,
        variance_percentage: calculateVariancePercentage(totalIncidencias, totalIncidenciasAnterior),
        period_start: toISODate(currentReferenceDate),
        period_end: toISODate(currentReferenceDate),
      },
    },
    {
      icon: <ClipboardCheck className="h-6 w-6" />,
      kpi: {
        name: 'Permisos',
        category: 'headcount',
        value: totalPermisos,
        previous_value: totalPermisosAnteriores,
        variance_percentage: calculateVariancePercentage(totalPermisos, totalPermisosAnteriores),
        period_start: toISODate(currentReferenceDate),
        period_end: toISODate(currentReferenceDate),
      },
    },
  ];

  // Histograma: eje X = # Empleados, eje Y = # Incidencias
  const histoData = useMemo(() => {
    const byEmp = new Map<number, number>();
    enrichedPeriodo.forEach(i => {
      const code = normalizeIncidenciaCode(i.inci);
      if (!code || !INCIDENT_CODES.has(code)) return; // solo incidencias (no permisos)
      byEmp.set(i.emp, (byEmp.get(i.emp) || 0) + 1);
    });
    const bins = new Map<number, number>();
    byEmp.forEach((count) => {
      bins.set(count, (bins.get(count) || 0) + 1);
    });
    return Array.from(bins.entries()).sort((a,b)=>a[0]-b[0]).map(([incidencias, empleados]) => ({ incidencias, empleados }));
  }, [enrichedPeriodo]);

  // Resumen por tipo: #días (≈ registros) y #empleados únicos por tipo
  const tiposUnicos = useMemo(() => {
    // Incluir todos los códigos presentes (incidencias y permisos), normalizados
    return Array.from(new Set(enrichedPeriodo.map(i => normalizeIncidenciaCode(i.inci)).filter((c): c is string => !!c))).sort();
  }, [enrichedPeriodo]);
  const resumenPorTipo = useMemo(() => {
    const out = [] as { tipo: string; dias: number; empleados: number }[];
    const byTipo = new Map<string, IncidenciaCSVRecord[]>();
    enrichedPeriodo.forEach(i => {
      const t = normalizeIncidenciaCode(i.inci);
      if (!t) return;
      if (!byTipo.has(t)) byTipo.set(t, []);
      byTipo.get(t)!.push(i);
    });
    // Solo tipos presentes en datos (no listar tipos inexistentes)
    tiposUnicos.forEach(t => {
      const arr = byTipo.get(t) || [];
      const empleadosTipo = new Set(arr.map(a => a.emp)).size;
      const dias = arr.length; // sin dias_aplicados en CSV
      out.push({ tipo: t, dias, empleados: empleadosTipo });
    });
    // Orden principal: mayor número de empleados, luego tipo de grupo
    const groupOf = (code: string) => (
      INCIDENT_CODES.has(code) ? 0 : PERMISO_CODES.has(code) ? 1 : 2
    );
    out.sort((a, b) => {
      if (b.empleados !== a.empleados) return b.empleados - a.empleados;
      const ga = groupOf(a.tipo);
      const gb = groupOf(b.tipo);
      if (ga !== gb) return ga - gb;
      return a.tipo.localeCompare(b.tipo);
    });
    return out;
  }, [enrichedPeriodo, tiposUnicos]);

  const pieData = useMemo(() => ([
    { name: 'Incidencias', value: totalIncidencias },
    { name: 'Permisos', value: totalPermisos },
  ]), [totalIncidencias, totalPermisos]);

  const PIE_COLORS = ["#ef4444", "#10b981"];

  // Calcular tendencias mensuales para el año actual
  const monthlyTrendsData = useMemo(() => {
    const selectedYear = currentYear || new Date().getFullYear();
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return months.map((monthName, index) => {
      const monthData = enrichedAnual.filter(inc => {
        if (!inc.fecha) return false;
        const date = new Date(inc.fecha);
        return date.getFullYear() === selectedYear && date.getMonth() === index;
      });

      let incidenciasCount = 0;
      let permisosCount = 0;

      monthData.forEach(inc => {
        const code = normalizeIncidenciaCode(inc.inci);
        if (!code) return;

        if (INCIDENT_CODES.has(code)) {
          incidenciasCount++;
        } else if (PERMISO_CODES.has(code)) {
          permisosCount++;
        }
      });

      return {
        mes: monthName,
        incidencias: incidenciasCount,
        permisos: permisosCount
      };
    });
  }, [enrichedAnual, currentYear]);

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
      {/* 4 Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingIncidencias
          ? Array.from({ length: 4 }).map((_, index) => (
              <KPICardSkeleton key={`incidents-kpi-skeleton-${index}`} />
            ))
          : incidentsKpiCards.map(({ kpi, icon }, index) => (
              <KPICard key={`incidents-kpi-${index}`} kpi={kpi} icon={icon} />
            ))}
      </div>
      <p className="text-xs text-gray-500">
        * Incidencias: FI, SUS, PSIN, ENFE · Permisos: PCON, VAC, MAT3, MAT1, JUST
      </p>

      {/* Gráfica de Tendencia Mensual - Incidencias y Permisos */}
      <div className="mb-6">
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia Mensual - Incidencias y Permisos {currentYear || new Date().getFullYear()}</CardTitle>
            <p className="text-sm text-gray-600">Evolución de incidencias y permisos de enero a diciembre</p>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={320} />
            ) : (
              <VisualizationContainer
                title="Tendencia mensual: Incidencias vs Permisos"
                type="chart"
                className="h-[320px] w-full"
                filename="tendencia-incidencias-permisos"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 420 : 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrendsData} margin={{ left: 16, right: 16, top: 8, bottom: 40 }}>
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
                          label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="incidencias"
                          stroke="#ef4444"
                          strokeWidth={3}
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8 }}
                          name="# Incidencias"
                        />
                        <Line
                          type="monotone"
                          dataKey="permisos"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8 }}
                          name="# Permisos"
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
        {/* Histograma: Incidencias por empleado */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Incidencias por empleado</CardTitle>
            <p className="text-sm text-gray-600">X: # Incidencias • Y: # Empleados</p>
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
                      <BarChart data={histoData} margin={{ left: 16, right: 16, top: 8, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="incidencias" label={{ value: '# Incidencias', position: 'insideBottom', offset: -10 }} />
                        <YAxis type="number" dataKey="empleados" label={{ value: '# Empleados', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar dataKey="empleados" fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </VisualizationContainer>
            )}
          </CardContent>
        </Card>

        {/* Resumen por tipo */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-base">Incidencias por tipo</CardTitle></CardHeader>
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
                          <TableHead className="w-1/4 text-center"># días</TableHead>
                          <TableHead className="w-1/4 text-center"># emp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumenPorTipo.map(r => (
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

        {/* Pie: Incidencias vs Permisos */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribución: Incidencias vs Permisos</CardTitle></CardHeader>
          <CardContent className="flex-1">
            {loadingIncidencias ? (
              <ChartLoadingPlaceholder height={320} />
            ) : (
              <VisualizationContainer
                title="Distribución: Incidencias vs Permisos"
                type="chart"
                className="h-full w-full"
                filename="distribucion-incidencias-permisos"
              >
                {(fullscreen) => (
                  <div style={{ height: fullscreen ? 420 : 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const total = pieData.reduce((acc, item) => acc + item.value, 0);
                            const percentage = total > 0 ? (Number(value) / total) * 100 : 0;
                            return [
                              `${Number(value).toFixed(1)} (${percentage.toFixed(1)}%)`,
                              name
                            ];
                          }}
                        />
                        <Legend />
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={fullscreen ? 150 : 110}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
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
                        <TableHead>Nombre</TableHead>
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
                          <TableCell>{i.nombre || '—'}</TableCell>
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
