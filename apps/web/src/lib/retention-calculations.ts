import { format, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { isMotivoClave, normalizeMotivo } from './normalizers';
import type { PlantillaRecord } from './types/records';

export interface MonthlyRetentionData {
  mes: string;
  year: number;
  month: number;
  rotacionPorcentaje: number;
  rotacionVoluntaria: number;
  rotacionInvoluntaria: number;
  rotacionAcumulada12m: number;
  bajas: number;
  bajasVoluntarias: number;
  bajasInvoluntarias: number;
  activos: number;
  activosProm: number;
  bajasMenor3m: number;
  bajas3a6m: number;
  bajas6a12m: number;
  bajasMas12m: number;
}

export interface BajaEvento {
  numero_empleado: number;
  fecha_baja: string;
  motivo_normalizado: string;
}

export function parseSupabaseDate(value?: string | Date | null): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return startOfDay(value);
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }

  const isoString = stringValue.includes('T') ? stringValue : `${stringValue}T00:00:00`;
  const parsed = parseISO(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

export function bajaMatchesMotivo(
  emp: PlantillaRecord,
  motive: 'involuntaria' | 'voluntaria' | 'all' = 'all',
  overrideMotivo?: string
): boolean {
  if (!emp.fecha_baja && !overrideMotivo) {
    return false;
  }

  const cached = (emp as any)._motivo_normalizado;
  const motivoEvaluado = overrideMotivo ?? cached ?? (emp as any).motivo_baja ?? '';
  const motivoNormalizado = normalizeMotivo(String(motivoEvaluado));
  const esInvoluntaria = isMotivoClave(motivoNormalizado);

  if (motive === 'involuntaria') {
    return esInvoluntaria;
  }

  if (motive === 'voluntaria') {
    return !esInvoluntaria;
  }

  return true;
}

export const calculateMonthlyRetention = async (
  startDate: Date,
  endDate: Date,
  plantilla: PlantillaRecord[],
  motive: 'involuntaria' | 'voluntaria' | 'all',
  bajaEventos?: BajaEvento[]
): Promise<MonthlyRetentionData> => {
  try {
    const rangeStart = startOfDay(startDate);
    const rangeEnd = new Date(endDate.getTime());

    const plantillaFiltered = plantilla.filter(emp => {
      const fechaIngreso = (emp as any)._fecha_ingreso ?? parseSupabaseDate(emp.fecha_ingreso);
      return fechaIngreso !== null && fechaIngreso <= rangeEnd;
    });

    const empleadosMap = new Map<number, PlantillaRecord>();
    plantillaFiltered.forEach(emp => {
      const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
      if (Number.isFinite(numero)) {
        empleadosMap.set(numero, emp);
      }
    });

    type EventoDetallado = {
      numero_empleado: number;
      fecha: Date;
      motivo: string;
      empleado: PlantillaRecord;
    };

    const buildEventos = (rangeStartInner: Date, rangeEndInner: Date): EventoDetallado[] => {
      const eventosMap = new Map<string, EventoDetallado>();

      const addEvento = (numero: number, fecha: Date, motivo: string, empleado: PlantillaRecord) => {
        const key = `${numero}-${fecha.toISOString().slice(0, 10)}`;
        if (!eventosMap.has(key)) {
          eventosMap.set(key, { numero_empleado: numero, fecha, motivo, empleado });
        }
      };

      if (bajaEventos && bajaEventos.length > 0) {
        bajaEventos.forEach(evento => {
          const numero = Number(evento.numero_empleado);
          if (!Number.isFinite(numero)) return;
          const empleado = empleadosMap.get(numero);
          if (!empleado) return;
          const fechaBaja = parseSupabaseDate(evento.fecha_baja);
          if (!fechaBaja) return;
          if (fechaBaja < rangeStartInner || fechaBaja > rangeEndInner) return;
          if (!bajaMatchesMotivo(empleado, motive, evento.motivo_normalizado)) return;
          addEvento(numero, fechaBaja, evento.motivo_normalizado, empleado);
        });
      }

      plantillaFiltered.forEach(emp => {
        const fechaBajaParsed = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
        if (!fechaBajaParsed) return;
        if (fechaBajaParsed < rangeStartInner || fechaBajaParsed > rangeEndInner) return;
        if (!bajaMatchesMotivo(emp, motive)) return;
        const numero = Number((emp as any).numero_empleado ?? emp.emp_id);
        if (!Number.isFinite(numero)) return;
        const motivoNormalizado = (emp as any)._motivo_normalizado ?? normalizeMotivo((emp as any).motivo_baja || '');
        addEvento(numero, fechaBajaParsed, motivoNormalizado, emp);
      });

      return Array.from(eventosMap.values());
    };

    const eventosMes = buildEventos(rangeStart, rangeEnd);

    const empleadosInicioMes = plantillaFiltered.filter(emp => {
      const fechaIngreso = (emp as any)._fecha_ingreso ?? parseSupabaseDate(emp.fecha_ingreso);
      if (!fechaIngreso || fechaIngreso > rangeStart) {
        return false;
      }
      const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
      return !fechaBaja || fechaBaja > rangeStart;
    }).length;

    const empleadosFinMes = plantillaFiltered.filter(emp => {
      const fechaIngreso = (emp as any)._fecha_ingreso ?? parseSupabaseDate(emp.fecha_ingreso);
      if (!fechaIngreso || fechaIngreso > rangeEnd) {
        return false;
      }
      const fechaBaja = (emp as any)._fecha_baja ?? parseSupabaseDate(emp.fecha_baja);
      return !fechaBaja || fechaBaja > rangeEnd;
    }).length;

    const activosProm = (empleadosInicioMes + empleadosFinMes) / 2;

    const bajas = eventosMes.length;
    const bajasInvoluntarias = eventosMes.filter(evento => isMotivoClave(evento.motivo)).length;
    const bajasVoluntarias = bajas - bajasInvoluntarias;

    const rotacionPorcentaje = (bajas / (activosProm || 1)) * 100;
    const rotacionInvoluntaria = (bajasInvoluntarias / (activosProm || 1)) * 100;
    const rotacionVoluntaria = (bajasVoluntarias / (activosProm || 1)) * 100;

    const calcularTemporalidades = (eventos: EventoDetallado[]) => {
      let menor3 = 0;
      let entre3y6 = 0;
      let entre6y12 = 0;
      let mas12 = 0;

      eventos.forEach(evento => {
        const empleado = evento.empleado;
        if (!empleado) return;
        const fechaIngreso = parseSupabaseDate(empleado.fecha_ingreso);
        if (!fechaIngreso) return;
        const monthsWorked = (evento.fecha.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsWorked < 3) {
          menor3 += 1;
        } else if (monthsWorked < 6) {
          entre3y6 += 1;
        } else if (monthsWorked < 12) {
          entre6y12 += 1;
        } else {
          mas12 += 1;
        }
      });

      return {
        menor3meses: menor3,
        entre3y6meses: entre3y6,
        entre6y12meses: entre6y12,
        mas12meses: mas12
      };
    };

    const temporalidadesActual = calcularTemporalidades(eventosMes);

    return {
      mes: format(rangeStart, 'MMM yyyy', { locale: es }),
      year: rangeStart.getFullYear(),
      month: rangeStart.getMonth() + 1,
      rotacionPorcentaje: Number(rotacionPorcentaje.toFixed(2)),
      rotacionVoluntaria: Number(rotacionVoluntaria.toFixed(2)),
      rotacionInvoluntaria: Number(rotacionInvoluntaria.toFixed(2)),
      rotacionAcumulada12m: 0,
      bajas,
      bajasVoluntarias,
      bajasInvoluntarias,
      activos: empleadosFinMes,
      activosProm: Number(activosProm.toFixed(2)),
      bajasMenor3m: temporalidadesActual.menor3meses,
      bajas3a6m: temporalidadesActual.entre3y6meses,
      bajas6a12m: temporalidadesActual.entre6y12meses,
      bajasMas12m: temporalidadesActual.mas12meses
    };
  } catch (error) {
    console.error('Error calculating monthly retention:', error);
    const safeStart = startOfDay(startDate);
    return {
      mes: format(safeStart, 'MMM yyyy', { locale: es }),
      year: safeStart.getFullYear(),
      month: safeStart.getMonth() + 1,
      rotacionPorcentaje: 0,
      rotacionVoluntaria: 0,
      rotacionInvoluntaria: 0,
      rotacionAcumulada12m: 0,
      bajas: 0,
      bajasVoluntarias: 0,
      bajasInvoluntarias: 0,
      activos: 0,
      activosProm: 0,
      bajasMenor3m: 0,
      bajas3a6m: 0,
      bajas6a12m: 0,
      bajasMas12m: 0
    };
  }
};
