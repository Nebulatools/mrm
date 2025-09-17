"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, type IncidenciaCSVRecord, type PlantillaRecord } from "@/lib/supabase";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Info } from "lucide-react";

type Props = {
  plantilla?: PlantillaRecord[];
};

type EnrichedIncidencia = IncidenciaCSVRecord & {
  empresa?: string | null;
  departamento?: string | null;
  area?: string | null;
  puesto?: string | null;
};

const INCIDENT_CODES = new Set(["FI", "SUS", "PSIN", "ENFE"]);
const EMPLOYEE_INCIDENT_CODES = new Set(["FI", "SUS", "PSIN", "ENFE"]); // Para card de empleados con incidencias
const PERMISO_CODES = new Set(["PCON", "VAC", "MAT3"]);

const normalizeCode = (raw?: string | null) => {
  const c = (raw || '').toUpperCase().trim();
  if (c === 'ENF') return 'ENFE';
  if (c === 'PSG') return 'PSIN';
  if (c === 'PCG') return 'PCON';
  if (c === 'SUSP') return 'SUS';
  if (c.replace(/\s+/g, '') === 'MAT3') return 'MAT3';
  return c;
};

export function IncidentsTab({ plantilla }: Props) {
  const [empleados, setEmpleados] = useState<PlantillaRecord[]>([]);
  const [incidencias, setIncidencias] = useState<IncidenciaCSVRecord[]>([]);
  const [showTable, setShowTable] = useState(false); // false = mostrar 10, true = mostrar todo

  // Por defecto: todo el histórico (sin rango de fechas local)

  // Cargar incidencias una vez (todo el histórico)
  useEffect(() => {
    const loadInc = async () => {
      try {
        const incs = await db.getIncidenciasCSV();
        setIncidencias(incs);
      } catch (e) {
        console.error("Error cargando incidencias:", e);
      }
    };
    loadInc();
  }, []);

  // Actualizar empleados cuando cambie la plantilla filtrada
  useEffect(() => {
    const loadEmps = async () => {
      if (plantilla && plantilla.length > 0) {
        setEmpleados(plantilla);
      } else {
        try {
          const emps = await db.getEmpleadosSFTP();
          setEmpleados(emps);
        } catch (e) {
          console.error('Error cargando empleados:', e);
        }
      }
    };
    loadEmps();
  }, [plantilla]);

  const empleadosMap = useMemo(() => {
    const m = new Map<number, PlantillaRecord & { numero_empleado?: number }>();
    empleados.forEach((e: any) => {
      const num = Number(e.numero_empleado ?? e.emp_id);
      if (!Number.isNaN(num)) m.set(num, e as any);
    });
    return m;
  }, [empleados]);

  const enriched: EnrichedIncidencia[] = useMemo(() => {
    console.log('🔍 Incidents Tab - Filtering data:');
    console.log('📊 Total incidencias:', incidencias.length);
    console.log('👥 Empleados en mapa filtrado:', empleadosMap.size);
    console.log('👤 Plantilla recibida:', plantilla?.length || 0);

    const filtered = incidencias
      .filter(inc => {
        // Solo incluir incidencias de empleados que están en la plantilla filtrada
        const hasEmployee = empleadosMap.has(inc.emp);
        return hasEmployee;
      })
      .map(inc => {
        const emp = empleadosMap.get(inc.emp);
        return {
          ...inc,
          empresa: emp?.empresa ?? null,
          departamento: emp?.departamento ?? null,
          area: emp?.area ?? null,
          puesto: emp?.puesto ?? null,
        };
      });

    console.log('📋 Incidencias filtradas:', filtered.length);
    console.log('🎯 Ejemplo filtrado:', filtered.slice(0, 2));
    return filtered;
  }, [incidencias, empleadosMap, plantilla]);

  const activosCount = useMemo(() => (empleados || []).filter(e => e.activo).length, [empleados]);
  const empleadosConIncidencias = useMemo(() => {
    const set = new Set<number>();
    enriched.forEach(i => {
      const code = normalizeCode(i.inci);
      if (code && EMPLOYEE_INCIDENT_CODES.has(code)) set.add(i.emp);
    });
    return set.size;
  }, [enriched]);
  const countByType = useMemo(() => {
    const map = new Map<string, number>();
    enriched.forEach(i => {
      const code = normalizeCode(i.inci);
      if (!code) return;
      map.set(code, (map.get(code) || 0) + 1);
    });
    return map;
  }, [enriched]);

  const totalIncidencias = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (INCIDENT_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);

  const totalPermisos = useMemo(() => {
    let total = 0;
    countByType.forEach((v, k) => { if (PERMISO_CODES.has(k)) total += v; });
    return total;
  }, [countByType]);

  // Histograma: eje X = # Empleados, eje Y = # Incidencias
  const histoData = useMemo(() => {
    const byEmp = new Map<number, number>();
    enriched.forEach(i => {
      const code = normalizeCode(i.inci);
      if (!code || !INCIDENT_CODES.has(code)) return; // solo incidencias (no permisos)
      byEmp.set(i.emp, (byEmp.get(i.emp) || 0) + 1);
    });
    const bins = new Map<number, number>();
    byEmp.forEach((count) => {
      bins.set(count, (bins.get(count) || 0) + 1);
    });
    return Array.from(bins.entries()).sort((a,b)=>a[0]-b[0]).map(([incidencias, empleados]) => ({ incidencias, empleados }));
  }, [enriched]);

  // Resumen por tipo: #días (≈ registros) y #empleados únicos por tipo
  const tiposUnicos = useMemo(() => {
    // Incluir todos los códigos presentes (incidencias y permisos), normalizados
    return Array.from(new Set(enriched.map(i => normalizeCode(i.inci)).filter((c): c is string => !!c))).sort();
  }, [enriched]);
  const resumenPorTipo = useMemo(() => {
    const out = [] as { tipo: string; dias: number; empleados: number }[];
    const byTipo = new Map<string, IncidenciaCSVRecord[]>();
    enriched.forEach(i => {
      const t = normalizeCode(i.inci);
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
    // Orden: primero Incidencias, luego Permisos, luego otros (si existen)
    const groupOf = (code: string) => (
      INCIDENT_CODES.has(code) ? 0 : PERMISO_CODES.has(code) ? 1 : 2
    );
    out.sort((a, b) => {
      const ga = groupOf(a.tipo);
      const gb = groupOf(b.tipo);
      if (ga !== gb) return ga - gb;
      return a.tipo.localeCompare(b.tipo);
    });
    return out;
  }, [enriched, tiposUnicos]);

  const pieData = useMemo(() => ([
    { name: 'Incidencias', value: totalIncidencias },
    { name: 'Permisos', value: totalPermisos },
  ]), [totalIncidencias, totalPermisos]);

  const PIE_COLORS = ["#ef4444", "#10b981"];

  // Calcular tendencias mensuales para el año actual
  const monthlyTrendsData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return months.map((month, index) => {
      // Filtrar incidencias por mes del año actual
      const monthData = enriched.filter(inc => {
        if (!inc.fecha) return false;
        const date = new Date(inc.fecha);
        return date.getFullYear() === currentYear && date.getMonth() === index;
      });

      // Contar incidencias y permisos por mes
      let incidenciasCount = 0;
      let permisosCount = 0;

      monthData.forEach(inc => {
        const code = normalizeCode(inc.inci);
        if (!code) return;

        if (INCIDENT_CODES.has(code)) {
          incidenciasCount++;
        } else if (PERMISO_CODES.has(code)) {
          permisosCount++;
        }
      });

      return {
        mes: month,
        incidencias: incidenciasCount,
        permisos: permisosCount
      };
    });
  }, [enriched]);

  const HoverHint = ({ text }: { text: string }) => (
    <div className="relative inline-block group">
      <Info className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
      <div role="tooltip" className="absolute z-50 hidden group-hover:block bottom-full mb-2 right-0 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow">
        {text}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 4 Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base"># de activos</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{activosCount.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Empleados con incidencias</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{empleadosConIncidencias.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base">Incidencias</CardTitle>
            <HoverHint text="Incluye: FI, SUS, PSIN, ENFE" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalIncidencias.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base">Permisos</CardTitle>
            <HoverHint text="Incluye: PCON, VAC, MAT3" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{totalPermisos.toLocaleString()}</CardContent>
        </Card>
      </div>

      {/* Gráfica de Tendencia Mensual - Incidencias y Permisos */}
      <div className="mb-6">
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia Mensual - Incidencias y Permisos {new Date().getFullYear()}</CardTitle>
            <p className="text-sm text-gray-600">Evolución de incidencias y permisos de enero a diciembre</p>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="w-full h-full">
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
            <div className="w-full h-full">
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
          </CardContent>
        </Card>

        {/* Resumen por tipo */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-base">Incidencias por tipo</CardTitle></CardHeader>
          <CardContent className="flex-1">
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>#días de incidencias</TableHead>
                    <TableHead>#empleados con incidencias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumenPorTipo.map(r => (
                    <TableRow key={r.tipo}>
                      <TableCell className="font-medium">{r.tipo}</TableCell>
                      <TableCell>{r.dias.toLocaleString()}</TableCell>
                      <TableCell>{r.empleados.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pie: Incidencias vs Permisos */}
        <Card className="h-[420px] flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribución: Incidencias vs Permisos</CardTitle></CardHeader>
          <CardContent className="flex-1">
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
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
                {(showTable ? enriched : enriched.slice(0, 10)).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.id}</TableCell>
                    <TableCell>{i.fecha}</TableCell>
                    <TableCell>{normalizeCode(i.inci) || '-'}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default IncidentsTab;
