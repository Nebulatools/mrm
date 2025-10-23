'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingDown, AlertCircle, TrendingUp, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isMotivoClave, normalizeIncidenciaCode } from '@/lib/normalizers';
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
  plantillaYearScope?: PlantillaRecord[];
  bajas: BajaRecord[];
  incidencias: IncidenciaRecord[];
  selectedYear?: number;    // ✅ Opcional: undefined = SIN filtro (mostrar TODO)
  selectedMonth?: number;   // ✅ Opcional: undefined = SIN filtro (mostrar TODO)
  refreshEnabled?: boolean;
}

// ✅ Códigos de incidencias y permisos (igual que en incidents-tab.tsx)
const INCIDENT_CODES = new Set(["FI", "SUS", "PSIN", "ENFE"]);
const PERMISO_CODES = new Set(["PCON", "VAC", "MAT3"]);

const formatMonthLabel = (date: Date) => {
  const monthLabel = date.toLocaleDateString('es-MX', { month: 'short' });
  const cleanedLabel = monthLabel.replace('.', '').trim();
  const monthWithCase = `${cleanedLabel.charAt(0).toUpperCase()}${cleanedLabel.slice(1)}`;
  return `${monthWithCase} ${date.getFullYear().toString().slice(-2)}`;
};

export function SummaryComparison({ plantilla, plantillaYearScope, bajas, incidencias, selectedYear, selectedMonth, refreshEnabled = false }: SummaryComparisonProps) {

  const plantillaRotacion = plantillaYearScope && plantillaYearScope.length > 0 ? plantillaYearScope : plantilla;

  const [motivoFilterType, setMotivoFilterType] = useState<'involuntaria' | 'complementaria'>('involuntaria');

  const referenceDate = useMemo(() => {
    const today = new Date();
    if (selectedYear === undefined) {
      return today;
    }

    const currentYear = today.getFullYear();
    const targetYear = selectedYear;
    if (targetYear > currentYear) {
      return today;
    }

    const targetMonth = targetYear === currentYear ? today.getMonth() : 11;
    return new Date(targetYear, targetMonth, 1);
  }, [selectedYear]);

  const rotationSeries = useMemo(() => {
    const baseDate = referenceDate;
    const points: Array<{
      key: string;
      label: string;
      month: number;
      year: number;
      mensual: ReturnType<typeof calcularRotacionConDesglose>;
      rolling: ReturnType<typeof calcularRotacionAcumulada12mConDesglose>;
      ytd: ReturnType<typeof calcularRotacionYTDConDesglose>;
    }> = [];

    for (let offset = 11; offset >= 0; offset--) {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
      const startDate = new Date(current.getFullYear(), current.getMonth(), 1);
      const endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0);

      const monthlyRotation = calcularRotacionConDesglose(plantillaRotacion, startDate, endDate);
      const rollingRotation = calcularRotacionAcumulada12mConDesglose(plantillaRotacion, endDate);
      const ytdRotation = calcularRotacionYTDConDesglose(plantillaRotacion, endDate);

      points.push({
        key: `${current.getFullYear()}-${current.getMonth() + 1}`,
        label: formatMonthLabel(current),
        month: current.getMonth() + 1,
        year: current.getFullYear(),
        mensual: monthlyRotation,
        rolling: rollingRotation,
        ytd: ytdRotation
      });
    }

    return points;
  }, [plantillaRotacion, referenceDate]);

  const plantillaRotacionIds = useMemo(() => {
    const ids = new Set<number>();
    plantillaRotacion.forEach((emp: any) => {
      const num = Number(emp.numero_empleado ?? emp.emp_id);
      if (!Number.isNaN(num)) {
        ids.add(num);
      }
    });
    return ids;
  }, [plantillaRotacion]);

  const incidenciasPermisosSeries = useMemo(() => {
    if (!incidencias || incidencias.length === 0) {
      return [] as Array<{ mes: string; incidencias: number; permisos: number }>;
    }

    const baseDate = referenceDate;
    const series: Array<{ mes: string; incidencias: number; permisos: number }> = [];

    for (let offset = 11; offset >= 0; offset--) {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
      const startDate = new Date(current.getFullYear(), current.getMonth(), 1);
      const endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

      let incidenciasCount = 0;
      let permisosCount = 0;

      incidencias.forEach((inc) => {
        const empleadoId = Number(inc.emp);
        if (Number.isNaN(empleadoId)) return;
        if (plantillaRotacionIds.size > 0 && !plantillaRotacionIds.has(empleadoId)) return;

        const fechaInc = new Date(inc.fecha);
        if (fechaInc < startDate || fechaInc > endDate) return;

        const code = normalizeIncidenciaCode(inc.inci);
        if (code && INCIDENT_CODES.has(code)) {
          incidenciasCount += 1;
        } else if (code && PERMISO_CODES.has(code)) {
          permisosCount += 1;
        }
      });

      series.push({
        mes: formatMonthLabel(current),
        incidencias: incidenciasCount,
        permisos: permisosCount
      });
    }

    return series;
  }, [incidencias, plantillaRotacionIds, referenceDate]);

  // ✅ LÓGICA CORRECTA: Filtrar incidencias/permisos con filtros aplicados
  const { totalIncidencias, totalPermisos } = useMemo(() => {
    // Crear mapa de empleados filtrados
    const empleadosMap = new Map<number, PlantillaRecord>();
    plantilla.forEach((e: any) => {
      const num = Number(e.numero_empleado ?? e.emp_id);
      if (!Number.isNaN(num)) empleadosMap.set(num, e);
    });

    // Filtrar incidencias: solo empleados filtrados + fecha si aplica
    const incidenciasFiltradas = incidencias.filter(inc => {
      // ✅ FILTRO 1: Solo empleados en plantilla filtrada
      if (!empleadosMap.has(inc.emp)) return false;

      // ✅ FILTRO 2: Por fecha SOLO si hay filtros de año/mes seleccionados
      if (selectedYear !== undefined && selectedMonth !== undefined) {
        const mesInicio = new Date(selectedYear, selectedMonth - 1, 1);
        const mesFin = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        const fechaInc = new Date(inc.fecha);
        if (fechaInc < mesInicio || fechaInc > mesFin) return false;
      }

      return true;
    });

    // Contar por tipo usando normalización
    const countByType = new Map<string, number>();
    incidenciasFiltradas.forEach(i => {
      const code = normalizeIncidenciaCode(i.inci);
      if (!code) return;
      countByType.set(code, (countByType.get(code) || 0) + 1);
    });

    // Sumar incidencias (FI, SUS, PSIN, ENFE)
    let totalInc = 0;
    countByType.forEach((v, k) => { if (INCIDENT_CODES.has(k)) totalInc += v; });

    // Sumar permisos (PCON, VAC, MAT3)
    let totalPerm = 0;
    countByType.forEach((v, k) => { if (PERMISO_CODES.has(k)) totalPerm += v; });

    return { totalIncidencias: totalInc, totalPermisos: totalPerm };
  }, [plantilla, incidencias, selectedYear, selectedMonth]);

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
    const kpisActuales = calcularKPIsDelMes(plantilla, 0);
    const kpisAnteriores = calcularKPIsDelMes(plantilla, -1);

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

    const rotationLabel = motivoFilterType === 'involuntaria' ? 'Rotación Involuntaria' : 'Rotación Complementaria';
    const rotationColor = motivoFilterType === 'involuntaria' ? '#ef4444' : '#22c55e';
    const getRotationValue = (input: { involuntaria: number; complementaria: number }) =>
      motivoFilterType === 'involuntaria' ? input.involuntaria : input.complementaria;

    const monthlyChartData = rotationSeries.map(point => ({
      mes: point.label,
      rotacion: Number(getRotationValue(point.mensual).toFixed(2))
    }));

    const rollingChartData = rotationSeries.map(point => ({
      mes: point.label,
      rotacion: Number(getRotationValue(point.rolling).toFixed(2))
    }));

    const currentYear = new Date().getFullYear();
    let ytdSeries = rotationSeries.filter(point => point.year === currentYear);
    if (ytdSeries.length === 0) {
      ytdSeries = rotationSeries;
    }

    const ytdChartData = ytdSeries.map(point => ({
      mes: point.label,
      rotacion: Number(getRotationValue(point.ytd).toFixed(2))
    }));

    const hasMonthlyData = monthlyChartData.some(d => d.rotacion > 0);
    const hasRollingData = rollingChartData.some(d => d.rotacion > 0);
    const hasYtdData = ytdChartData.some(d => d.rotacion > 0);

    const incidenciasChartData = incidenciasPermisosSeries.map(point => ({
      mes: point.mes,
      incidencias: point.incidencias
    }));

    const permisosChartData = incidenciasPermisosSeries.map(point => ({
      mes: point.mes,
      permisos: point.permisos
    }));

    const hasIncidenciasSeries = incidenciasChartData.some(d => d.incidencias > 0);
    const hasPermisosSeries = permisosChartData.some(d => d.permisos > 0);

    return (
      <div className={cn("space-y-6", refreshEnabled && "space-y-8")}>
        {/* KPI CARDS CON SEMAFORIZACIÓN */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {renderKPICard('Empleados Activos', kpisActuales.empleadosActivos, kpisAnteriores.empleadosActivos, false, <Users className="h-4 w-4" />)}
          {renderKPICard('Rotación Mensual', kpisActuales.rotacionMensual, kpisAnteriores.rotacionMensual, true, <TrendingDown className="h-4 w-4" />)}
          {renderKPICard('Rotación Acumulada', kpisActuales.rotacionAcumulada, kpisAnteriores.rotacionAcumulada, true, <TrendingDown className="h-4 w-4" />)}
          {renderKPICard('Rotación Año Actual', kpisActuales.rotacionAnioActual, kpisAnteriores.rotacionAnioActual, true, <TrendingDown className="h-4 w-4" />)}
          {renderKPICard('Incidencias', totalIncidencias, totalIncidencias, false, <AlertCircle className="h-4 w-4" />)}
          {renderKPICard('Permisos', totalPermisos, totalPermisos, false, <TrendingUp className="h-4 w-4" />)}
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
                <Bar dataKey="0-3 meses" stackId="a" fill="#ef4444" />
                <Bar dataKey="3-6 meses" stackId="a" fill="#f97316" />
                <Bar dataKey="6-12 meses" stackId="a" fill="#eab308" />
                <Bar dataKey="1-3 años" stackId="a" fill="#22c55e" />
                <Bar dataKey="+3 años" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Toggle para rotación */}
        <div
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border bg-white p-4",
            refreshEnabled && "rounded-2xl border-brand-border/40 bg-brand-surface-accent/60 shadow-brand/10"
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm font-medium text-gray-700",
                refreshEnabled && "font-heading text-xs uppercase tracking-[0.12em] text-brand-ink/80"
              )}
            >
              Filtrar visualizaciones por:
            </span>
            <div className="flex gap-2">
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
                variant={motivoFilterType === 'complementaria' ? (refreshEnabled ? 'cta' : 'default') : 'outline'}
                size="sm"
                onClick={() => setMotivoFilterType('complementaria')}
                className={cn(
                  "transition-all",
                  refreshEnabled && "rounded-full font-semibold",
                  motivoFilterType === 'complementaria' && refreshEnabled && "shadow-brand"
                )}
              >
                Rotación Complementaria
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Rotación involuntaria incluye Rescisión por desempeño, Rescisión por disciplina y Término del contrato.
          </p>
        </div>

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
              {!hasMonthlyData ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Sin bajas registradas en los últimos meses</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Último corte: {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                    <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, rotationLabel]} />
                    <Legend />
                    <Line type="monotone" dataKey="rotacion" stroke={rotationColor} strokeWidth={2} dot={{ fill: rotationColor, r: 4 }} name={rotationLabel} />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
              {!hasRollingData ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Sin información suficiente para calcular 12 meses móviles</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={rollingChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                    <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, rotationLabel]} />
                    <Legend />
                    <Line type="monotone" dataKey="rotacion" stroke={rotationColor} strokeWidth={2} dot={{ fill: rotationColor, r: 4 }} name={`${rotationLabel} (12m)`} />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
              {!hasYtdData ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Sin datos del año en curso para mostrar</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ytdChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                    <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, rotationLabel]} />
                    <Legend />
                    <Line type="monotone" dataKey="rotacion" stroke={rotationColor} strokeWidth={2} dot={{ fill: rotationColor, r: 4 }} name={`${rotationLabel} (YTD)`} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 2.b Incidencias y Permisos 12 Meses */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow")}
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
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Sin incidencias registradas en los últimos 12 meses</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={incidenciasChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value: number | string) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                        const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
                        return [`${safeValue} registros`, 'Incidencias'];
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="incidencias" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} name="Incidencias" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className={cn(refreshEnabled && "rounded-2xl border border-brand-border/60 bg-white/95 shadow-brand transition-shadow")}
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
                  <div className="text-center text-gray-500">
                    <p className="text-sm">Sin permisos registrados en los últimos 12 meses</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={permisosChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value: number | string) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                        const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
                        return [`${safeValue} registros`, 'Permisos'];
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="permisos" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Permisos" />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
