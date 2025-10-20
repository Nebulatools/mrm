/**
 * Filtros Centralizados del Dashboard
 *
 * Este archivo contiene la lógica de filtrado que se usa en TODOS los tabs del dashboard.
 * Anteriormente se llamaba "retention.ts" pero se renombró a "filters.ts" para reflejar
 * su uso general en toda la aplicación.
 *
 * @module lib/filters/filters
 */

import type { PlantillaRecord } from '@/lib/supabase';
import { isMotivoClave } from '@/lib/normalizers';

/**
 * Opciones de filtrado para el dashboard
 *
 * Estos filtros se aplican a empleados en todos los tabs excepto donde se especifique
 * que se usa filtrado GENERAL (sin filtros).
 */
export interface RetentionFilterOptions {
  years: number[];
  months: number[];
  departamentos?: string[];
  puestos?: string[];
  clasificaciones?: string[];
  ubicaciones?: string[];
  empresas?: string[];  // Negocio/Empresa filter
  areas?: string[];     // Área filter

  // 🆕 NUEVOS FILTROS CENTRALIZADOS
  motivoFilter?: 'involuntaria' | 'complementaria' | 'all';  // Filtro de tipo de baja
  includeInactive?: boolean;  // Incluir empleados con fecha_baja
}

/**
 * Aplica filtros a la plantilla de empleados
 *
 * Esta es la función CENTRALIZADA que aplica todos los filtros del dashboard.
 * Se usa en TODOS los tabs (Resumen, Personal, Incidencias, Retención).
 *
 * @param plantilla Lista completa de empleados
 * @param filters Opciones de filtrado (año, mes, departamento, puesto, etc.)
 * @returns Lista filtrada de empleados que cumplen con los criterios
 */
export function applyRetentionFilters(
  plantilla: PlantillaRecord[],
  filters: RetentionFilterOptions
): PlantillaRecord[] {
  if (!plantilla || plantilla.length === 0) return [] as PlantillaRecord[];

  const hasYearFilters = (filters.years?.length || 0) > 0;
  const hasMonthFilters = (filters.months?.length || 0) > 0;

  const puestosSet = new Set((filters.puestos || []).map(p => String(p).trim()));
  const deptosSet = new Set(filters.departamentos || []);
  const clasifSet = new Set(filters.clasificaciones || []);
  const ubicSet = new Set(filters.ubicaciones || []);
  const empresasSet = new Set(filters.empresas || []);
  const areasSet = new Set(filters.areas || []);

  let filtered = (plantilla as PlantillaRecord[]).filter((emp) => {
    // Empresa/Negocio
    if (empresasSet.size) {
      const empEmpresa: string = (emp as any).empresa || '';
      if (!empresasSet.has(empEmpresa)) return false;
    }

    // Área
    if (areasSet.size && !areasSet.has(emp.area || '')) return false;

    // Departamento
    if (deptosSet.size && !deptosSet.has(emp.departamento || '')) return false;

    // Puesto (trim to avoid whitespace mismatches)
    if (puestosSet.size) {
      const empPuesto = String(emp.puesto || '').trim();
      if (!puestosSet.has(empPuesto)) return false;
    }

    // Clasificación
    if (clasifSet.size && !clasifSet.has(emp.clasificacion || '')) return false;

    // Ubicación
    // Some datasets might have missing ubicacion; default to empty string
    // Only filter when there are selected ubicaciones
    // @ts-ignore - PlantillaRecord may be extended to include ubicacion
    const empUbicacion: string = (emp as any).ubicacion || '';
    if (ubicSet.size && !ubicSet.has(empUbicacion)) return false;

    // Year/Month filters: employee considered included if active within any selected period
    if (hasYearFilters || hasMonthFilters) {
      const ingreso = new Date(emp.fecha_ingreso);
      const baja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;

      if (hasYearFilters && hasMonthFilters) {
        // Check any year-month pair
        for (const year of filters.years) {
          for (const month of filters.months) {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0);
            if (ingreso <= end && (!baja || baja >= start)) return true;
          }
        }
        return false;
      }

      if (hasYearFilters) {
        // Active at any time in the year
        for (const year of filters.years) {
          const start = new Date(year, 0, 1);
          const end = new Date(year, 11, 31);
          if (ingreso <= end && (!baja || baja >= start)) return true;
        }
        return false;
      }

      if (hasMonthFilters) {
        // Active in that month of any year from 2022..current
        const currentYear = new Date().getFullYear();
        for (let y = 2022; y <= currentYear; y++) {
          for (const m of filters.months) {
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 0);
            if (ingreso <= end && (!baja || baja >= start)) return true;
          }
        }
        return false;
      }
    }

    return true;
  });

  // 🆕 FILTRO DE MOTIVO (Involuntaria vs Complementaria)
  // Solo aplicar si se especifica un filtro de motivo
  if (filters.motivoFilter && filters.motivoFilter !== 'all') {
    filtered = filtered.filter(emp => {
      // Mantener empleados activos (sin fecha_baja)
      if (!emp.fecha_baja) {
        return true;
      }

      // Verificar si el motivo es involuntario (clave)
      const esInvoluntaria = isMotivoClave((emp as any).motivo_baja);

      // Filtrar según el tipo solicitado
      if (filters.motivoFilter === 'involuntaria') {
        return esInvoluntaria;
      } else if (filters.motivoFilter === 'complementaria') {
        return !esInvoluntaria;
      }

      return true;
    });
  }

  // 🆕 FILTRO DE INACTIVOS
  // Por defecto incluye todos (activos e inactivos)
  // Si includeInactive = false, solo incluir activos
  if (filters.includeInactive === false) {
    filtered = filtered.filter(emp => emp.activo);
  }

  console.log('🔍 Filtros aplicados:', {
    original: plantilla.length,
    filtrado: filtered.length,
    filtros: {
      años: filters.years.length,
      meses: filters.months.length,
      departamentos: filters.departamentos?.length || 0,
      puestos: filters.puestos?.length || 0,
      motivoFilter: filters.motivoFilter || 'all',
      includeInactive: filters.includeInactive !== false
    }
  });

  return filtered;
}
