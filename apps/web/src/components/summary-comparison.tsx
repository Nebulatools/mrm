'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingDown, AlertCircle, TrendingUp, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isMotivoClave } from '@/lib/normalizers';
import { cn } from '@/lib/utils';
import type { PlantillaRecord } from '@/lib/supabase';
import {
  calculateActivosPromedio,
  calcularRotacionConDesglose,
  calcularRotacionAcumulada12mConDesglose,
  calcularRotacionYTDConDesglose
} from '@/lib/utils/kpi-helpers';

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

  // ✅ ELIMINADA función duplicada - ahora usa funciones centralizadas de kpi-helpers.ts

  // Calcular KPIs para un mes específico
  const calcularKPIsDelMes = (grupo: PlantillaRecord[], mesOffset = 0) => {
    const hoy = new Date();
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1);
    const mesFin = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset + 1, 0);

    // Empleados activos al final del mes
    const empleadosActivos = grupo.filter(e => {
      const fechaIngreso = new Date(e.fecha_ingreso);
      // Activo si: ingresó antes del fin del mes Y no tiene baja O su baja es después del mes
      return fechaIngreso <= mesFin && e.activo;
    }).length;

    // Rotaciones usando funciones centralizadas (CORREGIDO)
    // ⚠️ CRÍTICO: Usar funciones centralizadas para garantizar consistencia con Tab Retención
    const fechaRef = mesOffset === 0 ? hoy : new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset + 1, 0);
    const mesActualStart = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1);
    const mesActualEnd = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset + 1, 0);
    const rotacionMensual = calcularRotacionConDesglose(grupo, mesActualStart, mesActualEnd);

    // Para métricas GENERALES, usar funciones centralizadas con desglose
    // Esto garantiza que los valores coincidan con el Tab Retención
    const rotacionAcumuladaDesglose = calcularRotacionAcumulada12mConDesglose(plantilla, fechaRef);
    const rotacionAnioActualDesglose = calcularRotacionYTDConDesglose(plantilla, fechaRef);

    // Incidencias del mes
    const empleadosIds = grupo.map(e => e.numero_empleado || Number(e.emp_id));
    const incidenciasDelMes = incidencias.filter(i => {
      if (!empleadosIds.includes(i.emp)) return false;
      const fecha = new Date(i.fecha);
      return fecha >= mesActual && fecha <= mesFin;
    });

    const totalIncidencias = incidenciasDelMes.length;
    const permisos = incidenciasDelMes.filter(i =>
      i.inci?.toUpperCase() === 'INC' ||
      i.inci?.toUpperCase().includes('PERMISO') ||
      i.inci?.toUpperCase() === 'PCON' ||
      i.inci?.toUpperCase() === 'VAC'
    ).length;

    console.log('📊 Tab Resumen - KPIs calculados:', {
      rotacionAcumulada: rotacionAcumuladaDesglose.total.toFixed(1) + '%',
      rotacionAnioActual: rotacionAnioActualDesglose.total.toFixed(1) + '%',
      rotacionMensual: rotacionMensual.total.toFixed(1) + '%'
    });

    return {
      empleadosActivos,
      rotacionMensual: rotacionMensual.total,
      rotacionAcumulada: rotacionAcumuladaDesglose.total,  // ✅ Ahora usa funciones centralizadas
      rotacionAnioActual: rotacionAnioActualDesglose.total,  // ✅ Ahora usa funciones centralizadas
      incidencias: totalIncidencias,
      permisos
    };
  };

  // Renderizar tarjeta KPI con indicador de tendencia
  const renderKPICard = (
    titulo: string,
    valorActual: number,
    valorAnterior: number,
    esPercentaje: boolean,
    icon: React.ReactNode
  ) => {
    const diferencia = valorActual - valorAnterior;
    const porcentajeCambio = valorAnterior !== 0 ? ((diferencia / valorAnterior) * 100) : 0;

    // Para rotación e incidencias: menor es mejor (verde), mayor es peor (rojo)
    // Para empleados activos: mayor es mejor (verde), menor es peor (rojo)
    const esMejor = titulo === 'Empleados Activos' || titulo === 'Permisos'
      ? diferencia > 0
      : diferencia < 0;

    const colorIndicador = Math.abs(diferencia) < 0.01
      ? 'text-gray-500'
      : esMejor
      ? 'text-green-600'
      : 'text-red-600';

    const IconoTendencia = Math.abs(diferencia) < 0.01
      ? Minus
      : diferencia > 0
      ? ArrowUp
      : ArrowDown;

    return (
      <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand")}>
        <CardHeader className={cn("pb-3", refreshEnabled && "pb-4")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className={cn("text-sm font-medium", refreshEnabled && "font-heading text-brand-ink")}>
                {titulo}
              </CardTitle>
            </div>
            <IconoTendencia className={cn("h-5 w-5", colorIndicador)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className={cn("text-2xl font-bold", refreshEnabled && "font-heading text-3xl text-brand-ink")}>
              {valorActual.toFixed(esPercentaje ? 1 : 0)}
              {esPercentaje && '%'}
            </div>
            <div className={cn("text-xs", colorIndicador)}>
              {diferencia > 0 ? '+' : ''}
              {diferencia.toFixed(esPercentaje ? 1 : 0)}
              {esPercentaje && '%'} vs mes anterior
            </div>
          </div>
        </CardContent>
      </Card>
    );
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

      // Activos por antigüedad (solo empleados activos)
      const empleadosActivos = empleados.filter(e => e.activo);
      const porAntiguedad = empleadosActivos.reduce((acc, emp) => {
        const anos = getAntiguedad(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(anos);
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

      // Activos por antigüedad (solo empleados activos)
      const empleadosActivos = empleados.filter(e => e.activo);
      const porAntiguedad = empleadosActivos.reduce((acc, emp) => {
        const anos = getAntiguedad(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(anos);
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

      // Activos por antigüedad (solo empleados activos)
      const empleadosActivos = empleados.filter(e => e.activo);
      const porAntiguedad = empleadosActivos.reduce((acc, emp) => {
        const anos = getAntiguedad(emp.fecha_ingreso);
        const categoria = clasificarAntiguedad(anos);
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
    // Calcular empleados filtrados según el tipo de grupo
    let empleadosDelGrupo: PlantillaRecord[] = [];
    if (tipoGrupo === 'negocio') {
      const negociosActivos = datos.map(d => d.nombre);
      empleadosDelGrupo = plantilla.filter(e => negociosActivos.includes(e.empresa || ''));
    } else if (tipoGrupo === 'area') {
      const areasActivas = datos.map(d => d.nombre);
      empleadosDelGrupo = plantilla.filter(e => areasActivas.includes(e.area || ''));
    } else {
      const deptosActivos = datos.map(d => d.nombre);
      empleadosDelGrupo = plantilla.filter(e => deptosActivos.includes(e.departamento));
    }

    // Calcular KPIs del mes actual y anterior para comparación
    const kpisActuales = calcularKPIsDelMes(empleadosDelGrupo, 0);
    const kpisAnteriores = calcularKPIsDelMes(empleadosDelGrupo, -1);

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
        '0-1 años': d.antiguedad['0-1 años'] || 0,
        '1-3 años': d.antiguedad['1-3 años'] || 0,
        '3-5 años': d.antiguedad['3-5 años'] || 0,
        '5-10 años': d.antiguedad['5-10 años'] || 0,
        '10+ años': d.antiguedad['10+ años'] || 0,
      };
    });

    return (
      <div className={cn("space-y-6", refreshEnabled && "space-y-8")}>
        {/* KPI CARDS CON SEMAFORIZACIÓN */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {renderKPICard('Empleados Activos', kpisActuales.empleadosActivos, kpisAnteriores.empleadosActivos, false, <Users className="h-4 w-4" />)}
          {renderKPICard('Rotación Mensual', kpisActuales.rotacionMensual, kpisAnteriores.rotacionMensual, true, <TrendingDown className="h-4 w-4" />)}
          {renderKPICard('Rotación Acumulada', kpisActuales.rotacionAcumulada, kpisAnteriores.rotacionAcumulada, true, <TrendingDown className="h-4 w-4" />)}
          {renderKPICard('Rotación Año Actual', kpisActuales.rotacionAnioActual, kpisAnteriores.rotacionAnioActual, true, <TrendingDown className="h-4 w-4" />)}
          {renderKPICard('Incidencias', kpisActuales.incidencias, kpisAnteriores.incidencias, false, <AlertCircle className="h-4 w-4" />)}
          {renderKPICard('Permisos', kpisActuales.permisos, kpisAnteriores.permisos, false, <TrendingUp className="h-4 w-4" />)}
        </div>

        {/* 1. ACTIVOS POR ANTIGÜEDAD - DISEÑO MEJORADO */}
        <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white shadow-brand transition-shadow")}>
          <CardHeader className={cn("pb-3", refreshEnabled && "pb-4")}>
            <CardTitle className={cn("flex items-center gap-2 text-base", refreshEnabled && "font-heading text-brand-ink")}>
              <Users className="h-4 w-4" />
              Empleados Activos por Antigüedad
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(refreshEnabled && "pt-0")}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={datosActivos}
                margin={{ top: 5, right: 20, left: 10, bottom: 65 }}
                barSize={datosActivos.length > 5 ? undefined : 80}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="nombre"
                  angle={-35}
                  textAnchor="end"
                  height={75}
                  interval={0}
                  tick={{ fontSize: 11, fill: '#374151' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#374151' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    const total = props.payload.total || 0;
                    const percentage = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0';
                    return [`${value} (${percentage}%)`, name];
                  }}
                  labelFormatter={(label: string, payload: any) => {
                    if (payload && payload.length > 0 && payload[0].payload.nombreCompleto) {
                      return `${payload[0].payload.nombreCompleto} - Total: ${payload[0].payload.total || 0}`;
                    }
                    return label;
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="rect" iconSize={12} />
                <Bar dataKey="0-1 años" stackId="a" fill="#ef4444" />
                <Bar dataKey="1-3 años" stackId="a" fill="#f97316" />
                <Bar dataKey="3-5 años" stackId="a" fill="#eab308" />
                <Bar dataKey="5-10 años" stackId="a" fill="#22c55e" />
                <Bar dataKey="10+ años" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
              {(() => {
                const datosGrafico = datos.map(d => ({
                  nombre: d.nombre.length > 15 ? d.nombre.substring(0, 15) + '...' : d.nombre,
                  Voluntaria: Number(d.rotacion.mensual.complementaria.toFixed(1)),
                  Involuntaria: Number(d.rotacion.mensual.involuntaria.toFixed(1))
                }));

                const hayDatos = datosGrafico.some(d => d.Voluntaria > 0 || d.Involuntaria > 0);

                if (!hayDatos) {
                  return (
                    <div className="flex h-[300px] items-center justify-center">
                      <div className="text-center text-gray-500">
                        <p className="text-sm">Sin bajas en el mes actual</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosGrafico}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} fontSize={11} />
                      <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Voluntaria" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
                      <Line type="monotone" dataKey="Involuntaria" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
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
                <LineChart
                  data={datos.map(d => ({
                    nombre: d.nombre.length > 15 ? d.nombre.substring(0, 15) + '...' : d.nombre,
                    Voluntaria: Number(d.rotacion.doce_meses.complementaria.toFixed(1)),
                    Involuntaria: Number(d.rotacion.doce_meses.involuntaria.toFixed(1))
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Voluntaria" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
                  <Line type="monotone" dataKey="Involuntaria" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
                </LineChart>
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
                <LineChart
                  data={datos.map(d => ({
                    nombre: d.nombre.length > 15 ? d.nombre.substring(0, 15) + '...' : d.nombre,
                    Voluntaria: Number(d.rotacion.ytd.complementaria.toFixed(1)),
                    Involuntaria: Number(d.rotacion.ytd.involuntaria.toFixed(1))
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Voluntaria" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
                  <Line type="monotone" dataKey="Involuntaria" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
                </LineChart>
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
            <div className="overflow-x-auto">
              <table className={cn("w-full text-sm", refreshEnabled && "text-brand-ink")}>
                <thead>
                  <tr className={cn("border-b", refreshEnabled && "border-brand-border/60")}>
                    <th className={cn("pb-3 text-left font-medium", refreshEnabled && "font-heading")}>
                      Nombre
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading")}>
                      Total
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading")}>
                      Permisos
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading")}>
                      Faltas
                    </th>
                    <th className={cn("pb-3 text-right font-medium", refreshEnabled && "font-heading")}>
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
                        refreshEnabled && "border-brand-border/60"
                      )}
                    >
                      <td className={cn("py-3 font-medium", refreshEnabled && "font-heading")}>
                        {d.nombre}
                      </td>
                      <td className="py-3 text-right">
                        {d.ausentismo.total}
                      </td>
                      <td className="py-3 text-right text-blue-600">
                        {d.ausentismo.permisos}
                      </td>
                      <td className="py-3 text-right text-red-600">
                        {d.ausentismo.faltas}
                      </td>
                      <td className="py-3 text-right text-gray-600">
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
