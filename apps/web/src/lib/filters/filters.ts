/**
 * Filtros Centralizados del Dashboard
 *
 * Este archivo contiene la lógica de filtrado que se usa en TODOS los tabs del dashboard.
 * Anteriormente se llamaba "retention.ts" pero se renombró a "filters.ts" para reflejar
 * su uso general en toda la aplicación.
 *
 * @module lib/filters/filters
 */

import type { PlantillaRecord } from '@/lib/types/records';
import { isMotivoClave } from '@/lib/normalizers';

type Nullable<T> = T | null | undefined;

interface TemporalWindow {
  start: Date;
  end: Date;
}

interface NormalizedFilterSets {
  empresas: Set<string>;
  areas: Set<string>;
  departamentos: Set<string>;
  puestos: Set<string>;
  clasificaciones: Set<string>;
  ubicaciones: Set<string>;
  ubicacionesIncidencias: Set<string>;
}

interface DatasetYearBounds {
  minYear: number;
  maxYear: number;
}

const EMPTY_SET = new Set<string>();

function isEmployeeActiveFlag(emp: PlantillaRecord): boolean {
  const raw = (emp as any).activo;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí';
  }
  return false;
}

/**
 * Normaliza una cadena para comparaciones insensibles a mayúsculas/acentos.
 */
function normalizeValue(value: Nullable<string | number>): string | null {
  if (value === null || value === undefined) return null;
  const strValue = String(value).trim();
  if (!strValue) return null;
  return strValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildNormalizedSet(values?: Nullable<(string | number)[]>): Set<string> {
  if (!values || values.length === 0) return EMPTY_SET;
  const set = new Set<string>();
  values.forEach((value) => {
    const normalized = normalizeValue(value);
    if (normalized) {
      set.add(normalized);
    }
  });
  return set;
}

function matchesFilter(value: Nullable<string | number>, filterSet: Set<string>): boolean {
  if (!filterSet.size) return true;
  const normalized = normalizeValue(value);
  if (!normalized) return false;
  return filterSet.has(normalized);
}

function parseDate(value: Nullable<string>, fallback?: Date): Date | null {
  if (!value) return fallback ?? null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback ?? null;
  }
  return parsed;
}

function getDatasetYearBounds(plantilla: PlantillaRecord[]): DatasetYearBounds {
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = Number.NEGATIVE_INFINITY;

  for (const emp of plantilla) {
    const ingreso = parseDate(emp.fecha_ingreso);
    const baja = parseDate(emp.fecha_baja);

    if (ingreso) {
      minYear = Math.min(minYear, ingreso.getFullYear());
      maxYear = Math.max(maxYear, ingreso.getFullYear());
    }

    if (baja) {
      minYear = Math.min(minYear, baja.getFullYear());
      maxYear = Math.max(maxYear, baja.getFullYear());
    }
  }

  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    const currentYear = new Date().getFullYear();
    return { minYear: currentYear, maxYear: currentYear };
  }

  return { minYear, maxYear };
}

function buildTemporalWindows(
  plantilla: PlantillaRecord[],
  filters: RetentionFilterOptions
): TemporalWindow[] {
  const years = Array.isArray(filters.years) ? filters.years.filter((y) => Number.isFinite(y)) : [];
  const months = Array.isArray(filters.months) ? filters.months.filter((m) => Number.isFinite(m)) : [];

  const hasYearFilters = years.length > 0;
  const hasMonthFilters = months.length > 0;

  if (!hasYearFilters && !hasMonthFilters) {
    return [];
  }

  const windows: TemporalWindow[] = [];

  if (hasYearFilters && hasMonthFilters) {
    for (const year of years) {
      for (const month of months) {
        const monthIndex = Math.max(1, Math.min(12, Math.trunc(month)));
        const start = new Date(year, monthIndex - 1, 1);
        const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);
        windows.push({ start, end });
      }
    }
    return windows;
  }

  if (hasYearFilters) {
    for (const year of years) {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      windows.push({ start, end });
    }
    return windows;
  }

  // Solo filtros de mes: usar rango dinámico basado en datos disponibles.
  const { minYear, maxYear } = getDatasetYearBounds(plantilla);
  for (let year = minYear; year <= maxYear; year++) {
    for (const month of months) {
      const monthIndex = Math.max(1, Math.min(12, Math.trunc(month)));
      const start = new Date(year, monthIndex - 1, 1);
      const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);
      windows.push({ start, end });
    }
  }

  return windows;
}

function employeeActiveInWindow(emp: PlantillaRecord, window: TemporalWindow): boolean {
  const ingreso = parseDate(emp.fecha_ingreso);
  const baja = parseDate(emp.fecha_baja);

  if (!ingreso) {
    return false;
  }

  const activeAtEnd = !baja || baja >= window.start;
  const joinedBeforeEnd = ingreso <= window.end;
  return joinedBeforeEnd && activeAtEnd;
}

function filterByTemporalWindows(
  plantilla: PlantillaRecord[],
  windows: TemporalWindow[]
): PlantillaRecord[] {
  if (!windows.length) return plantilla;
  return plantilla.filter((emp) => windows.some((window) => employeeActiveInWindow(emp, window)));
}

function buildNormalizedFilters(filters: RetentionFilterOptions): NormalizedFilterSets {
  return {
    empresas: buildNormalizedSet(filters.empresas),
    areas: buildNormalizedSet(filters.areas),
    departamentos: buildNormalizedSet(filters.departamentos),
    puestos: buildNormalizedSet(filters.puestos),
    clasificaciones: buildNormalizedSet(filters.clasificaciones),
    ubicaciones: buildNormalizedSet(filters.ubicaciones),
    ubicacionesIncidencias: buildNormalizedSet(filters.ubicacionesIncidencias)
  };
}

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
  ubicacionesIncidencias?: string[]; // ubicacion2 (incidencias)
  empresas?: string[];  // Negocio/Empresa filter
  areas?: string[];     // Área filter

  // 🆕 NUEVOS FILTROS CENTRALIZADOS
  motivoFilter?: 'involuntaria' | 'voluntaria' | 'all';  // Filtro de tipo de baja
  includeInactive?: boolean;  // Incluir empleados con fecha_baja
}

export type FilterScope = 'specific' | 'general' | 'year-only';

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
  if (!plantilla || plantilla.length === 0) {
    return [];
  }

  const normalizedFilters = buildNormalizedFilters(filters);
  const temporalWindows = buildTemporalWindows(plantilla, filters);

  let filtered = plantilla.filter((emp) => {
    if (!matchesFilter((emp as any).empresa ?? emp.empresa, normalizedFilters.empresas)) {
      return false;
    }

    if (!matchesFilter(emp.area, normalizedFilters.areas)) {
      return false;
    }

    if (!matchesFilter(emp.departamento, normalizedFilters.departamentos)) {
      return false;
    }

    if (!matchesFilter(emp.puesto, normalizedFilters.puestos)) {
      return false;
    }

    if (!matchesFilter(emp.clasificacion, normalizedFilters.clasificaciones)) {
      return false;
    }

    if (!matchesFilter((emp as any).ubicacion ?? emp.ubicacion, normalizedFilters.ubicaciones)) {
      return false;
    }

    // Filtro ubicacionesIncidencias: usa ubicacion2 directamente (datos limpios: CAD/CORPORATIVO/FILIALES)
    if (normalizedFilters.ubicacionesIncidencias.size > 0) {
      const ubicacion2 = (emp as any).ubicacion2 || '';
      if (!matchesFilter(ubicacion2.toUpperCase(), normalizedFilters.ubicacionesIncidencias)) {
        return false;
      }
    }

    return true;
  });

  filtered = filterByTemporalWindows(filtered, temporalWindows);

  if (filters.motivoFilter && filters.motivoFilter !== 'all') {
    filtered = filtered.filter((emp) => {
      if (!emp.fecha_baja) {
        return true;
      }
      const motivo = (emp as any).motivo_baja ?? emp.motivo_baja ?? '';
      const esInvoluntaria = isMotivoClave(motivo);
      return filters.motivoFilter === 'involuntaria' ? esInvoluntaria : !esInvoluntaria;
    });
  }

  if (filters.includeInactive === false) {
    filtered = filtered.filter((emp) => isEmployeeActiveFlag(emp));
  }

  console.log('🔍 Filtros aplicados:', {
    original: plantilla.length,
    filtrado: filtered.length,
    filtros: {
      años: filters.years?.length || 0,
      meses: filters.months?.length || 0,
      departamentos: filters.departamentos?.length || 0,
      puestos: filters.puestos?.length || 0,
      clasificaciones: filters.clasificaciones?.length || 0,
      ubicaciones: filters.ubicaciones?.length || 0,
      ubicacionesIncidencias: filters.ubicacionesIncidencias?.length || 0,
      empresas: filters.empresas?.length || 0,
      areas: filters.areas?.length || 0,
      motivoFilter: filters.motivoFilter ?? 'all',
      includeInactive: filters.includeInactive !== false
    }
  });

  return filtered;
}

export function applyFiltersWithScope(
  plantilla: PlantillaRecord[],
  filters: RetentionFilterOptions,
  scope: FilterScope = 'specific'
): PlantillaRecord[] {
  const scopedFilters: RetentionFilterOptions = {
    years: filters.years ? [...filters.years] : [],
    months: filters.months ? [...filters.months] : [],
    departamentos: filters.departamentos ? [...filters.departamentos] : [],
    puestos: filters.puestos ? [...filters.puestos] : [],
    clasificaciones: filters.clasificaciones ? [...filters.clasificaciones] : [],
    ubicaciones: filters.ubicaciones ? [...filters.ubicaciones] : [],
    ubicacionesIncidencias: filters.ubicacionesIncidencias ? [...filters.ubicacionesIncidencias] : [],
    empresas: filters.empresas ? [...filters.empresas] : [],
    areas: filters.areas ? [...filters.areas] : [],
    motivoFilter: filters.motivoFilter,
    includeInactive: filters.includeInactive
  };

  if (scope === 'general') {
    scopedFilters.years = [];
    scopedFilters.months = [];
  } else if (scope === 'year-only') {
    scopedFilters.months = [];
  }

  return applyRetentionFilters(plantilla, scopedFilters);
}
