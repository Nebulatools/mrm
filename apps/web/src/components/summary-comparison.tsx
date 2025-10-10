'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingDown, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isMotivoClave } from '@/lib/normalizers';
import { cn } from '@/lib/utils';

interface PlantillaRecord {
  numero_empleado: number;
  nombre_completo: string;
  empresa: string;
  area: string;
  departamento: string;
  fecha_ingreso: string;
  activo: boolean;
}

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
  bajas: BajaRecord[];
  incidencias: IncidenciaRecord[];
  refreshEnabled?: boolean;
}

export function SummaryComparison({ plantilla, bajas, incidencias, refreshEnabled = false }: SummaryComparisonProps) {

  // Calcular antigüedad en años
  const getAntiguedad = (fechaIngreso: string): number => {
    const ingreso = new Date(fechaIngreso);
    const hoy = new Date();
    return Math.floor((hoy.getTime() - ingreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  // Clasificar antigüedad
  const clasificarAntiguedad = (anos: number): string => {
    if (anos < 1) return '0-1 años';
    if (anos < 3) return '1-3 años';
    if (anos < 5) return '3-5 años';
    if (anos < 10) return '5-10 años';
    return '10+ años';
  };

  // Calcular rotación
  const calcularRotacion = (grupo: PlantillaRecord[], periodo: 'mensual' | '12meses' | 'ytd') => {
    const hoy = new Date();
    const activos = grupo.filter(e => e.activo).length;

    let fechaInicio: Date;
    if (periodo === 'mensual') {
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (periodo === '12meses') {
      fechaInicio = new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
    } else {
      fechaInicio = new Date(hoy.getFullYear(), 0, 1);
    }

    const bajasDelPeriodo = bajas.filter(b => {
      const fechaBaja = new Date(b.fecha_baja);
      const empleado = grupo.find(e => e.numero_empleado === b.numero_empleado);
      return empleado && fechaBaja >= fechaInicio && fechaBaja <= hoy;
    });

    // Rotación voluntaria usa motivos clave: Rescisión por desempeño, disciplina, término del contrato
    const voluntarias = bajasDelPeriodo.filter(b => isMotivoClave(b.motivo)).length;
    const involuntarias = bajasDelPeriodo.length - voluntarias;
    const promedioActivos = activos > 0 ? activos : 1;
    const rotacionTotal = (bajasDelPeriodo.length / promedioActivos) * 100;

    return {
      total: rotacionTotal,
      voluntaria: (voluntarias / promedioActivos) * 100,
      involuntaria: (involuntarias / promedioActivos) * 100,
      cantidad: bajasDelPeriodo.length
    };
  };

  // Calcular ausentismo
  const calcularAusentismo = (grupo: PlantillaRecord[]) => {
    const empleadosIds = grupo.map(e => e.numero_empleado);
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
      const empleados = plantilla.filter(e => e.empresa === negocio && e.activo);

      // Activos por antigüedad
      const porAntiguedad = empleados.reduce((acc, emp) => {
        const anos = getAntiguedad(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(anos);
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        nombre: negocio,
        total: empleados.length,
        antiguedad: porAntiguedad,
        rotacion: {
          mensual: calcularRotacion(empleados, 'mensual'),
          doce_meses: calcularRotacion(empleados, '12meses'),
          ytd: calcularRotacion(empleados, 'ytd')
        },
        ausentismo: calcularAusentismo(empleados)
      };
    });
  };

  // Preparar datos por ÁREA
  const datosPorArea = () => {
    const areas = [...new Set(plantilla.map(e => e.area))].filter(Boolean);

    return areas.map(area => {
      const empleados = plantilla.filter(e => e.area === area && e.activo);

      const porAntiguedad = empleados.reduce((acc, emp) => {
        const anos = getAntiguedad(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(anos);
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        nombre: area,
        total: empleados.length,
        antiguedad: porAntiguedad,
        rotacion: {
          mensual: calcularRotacion(empleados, 'mensual'),
          doce_meses: calcularRotacion(empleados, '12meses'),
          ytd: calcularRotacion(empleados, 'ytd')
        },
        ausentismo: calcularAusentismo(empleados)
      };
    });
  };

  // Preparar datos por DEPARTAMENTO
  const datosPorDepartamento = () => {
    const departamentos = [...new Set(plantilla.map(e => e.departamento))].filter(Boolean);

    return departamentos.map(depto => {
      const empleados = plantilla.filter(e => e.departamento === depto && e.activo);

      const porAntiguedad = empleados.reduce((acc, emp) => {
        const anos = getAntiguedad(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(anos);
        acc[categoria] = (acc[categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        nombre: depto,
        total: empleados.length,
        antiguedad: porAntiguedad,
        rotacion: {
          mensual: calcularRotacion(empleados, 'mensual'),
          doce_meses: calcularRotacion(empleados, '12meses'),
          ytd: calcularRotacion(empleados, 'ytd')
        },
        ausentismo: calcularAusentismo(empleados)
      };
    });
  };

  const renderSeccion = (datos: ReturnType<typeof datosPorNegocio>) => {
    // Preparar datos para gráfico de activos por antigüedad
    const datosActivos = datos.map(d => ({
      nombre: d.nombre.length > 20 ? d.nombre.substring(0, 20) + '...' : d.nombre,
      '0-1 años': d.antiguedad['0-1 años'] || 0,
      '1-3 años': d.antiguedad['1-3 años'] || 0,
      '3-5 años': d.antiguedad['3-5 años'] || 0,
      '5-10 años': d.antiguedad['5-10 años'] || 0,
      '10+ años': d.antiguedad['10+ años'] || 0,
    }));

    return (
      <div className={cn("space-y-6", refreshEnabled && "space-y-8")}>
        {/* 1. ACTIVOS POR ANTIGÜEDAD */}
        <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow")}>
          <CardHeader className={cn(refreshEnabled && "pb-6")}>
            <CardTitle className={cn("flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
              <Users className="h-5 w-5" />
              Empleados Activos por Antigüedad
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(refreshEnabled && "pt-0")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosActivos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="0-1 años" stackId="a" fill="#ef4444" />
                <Bar dataKey="1-3 años" stackId="a" fill="#f97316" />
                <Bar dataKey="3-5 años" stackId="a" fill="#eab308" />
                <Bar dataKey="5-10 años" stackId="a" fill="#22c55e" />
                <Bar dataKey="10+ años" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. ROTACIÓN */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Rotación Mensual */}
          <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow")}>
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <TrendingDown className="h-4 w-4" />
                Rotación Mensual
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={datos.map(d => ({
                    nombre: d.nombre.length > 15 ? d.nombre.substring(0, 15) + '...' : d.nombre,
                    Voluntaria: Number(d.rotacion.mensual.voluntaria.toFixed(1)),
                    Involuntaria: Number(d.rotacion.mensual.involuntaria.toFixed(1))
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Voluntaria" fill="#22c55e" />
                  <Bar dataKey="Involuntaria" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rotación 12 Meses Móviles */}
          <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow")}>
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <TrendingDown className="h-4 w-4" />
                12 Meses Móviles
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={datos.map(d => ({
                    nombre: d.nombre.length > 15 ? d.nombre.substring(0, 15) + '...' : d.nombre,
                    Voluntaria: Number(d.rotacion.doce_meses.voluntaria.toFixed(1)),
                    Involuntaria: Number(d.rotacion.doce_meses.involuntaria.toFixed(1))
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Voluntaria" fill="#22c55e" />
                  <Bar dataKey="Involuntaria" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rotación Año Actual (YTD) */}
          <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow")}>
            <CardHeader className={cn("pb-3", refreshEnabled && "pb-6")}>
              <CardTitle className={cn("text-base flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
                <TrendingDown className="h-4 w-4" />
                Lo que va del Año
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(refreshEnabled && "pt-0")}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={datos.map(d => ({
                    nombre: d.nombre.length > 15 ? d.nombre.substring(0, 15) + '...' : d.nombre,
                    Voluntaria: Number(d.rotacion.ytd.voluntaria.toFixed(1)),
                    Involuntaria: Number(d.rotacion.ytd.involuntaria.toFixed(1))
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Voluntaria" fill="#22c55e" />
                  <Bar dataKey="Involuntaria" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 3. AUSENTISMO */}
        <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow")}>
          <CardHeader className={cn(refreshEnabled && "pb-6")}>
            <CardTitle className={cn("flex items-center gap-2", refreshEnabled && "font-heading text-brand-ink")}>
              <AlertCircle className="h-5 w-5" />
              Ausentismo (Incidencias y Permisos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("space-y-3", refreshEnabled && "space-y-4")}>
              {datos.map((d, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between border-b pb-3 last:border-0",
                    refreshEnabled && "border-brand-border/60 pb-4 text-brand-ink"
                  )}
                >
                  <div className={cn("text-sm font-medium", refreshEnabled && "font-heading text-base")}>
                    {d.nombre}
                  </div>
                  <div className={cn("flex gap-4 text-xs", refreshEnabled && "gap-3 text-sm")}>
                    <Badge
                      variant="outline"
                      className={cn(
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-3 py-1 text-[11px] font-semibold text-brand-ink"
                      )}
                    >
                      Total: {d.ausentismo.total}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={cn(
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-3 py-1 text-[11px] font-semibold text-brand-ink"
                      )}
                    >
                      Permisos: {d.ausentismo.permisos}
                    </Badge>
                    <Badge
                      variant="destructive"
                      className={cn(
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-3 py-1 text-[11px] font-semibold text-brand-ink"
                      )}
                    >
                      Faltas: {d.ausentismo.faltas}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const negocio = datosPorNegocio();
  const areas = datosPorArea();
  const departamentos = datosPorDepartamento();

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
          {renderSeccion(negocio)}
        </TabsContent>

        <TabsContent value="area" className={cn("space-y-4", refreshEnabled && "space-y-6")}>
          {renderSeccion(areas)}
        </TabsContent>

        <TabsContent value="departamento" className={cn("space-y-4", refreshEnabled && "space-y-6")}>
          {renderSeccion(departamentos)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
