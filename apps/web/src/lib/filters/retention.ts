import type { PlantillaRecord } from '@/lib/supabase';

export interface RetentionFilterOptions {
  years: number[];
  months: number[];
  departamentos?: string[];
  puestos?: string[];
  clasificaciones?: string[];
}

// Apply retention filters to empleados_sftp-derived records efficiently
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

  const filtered = (plantilla as PlantillaRecord[]).filter((emp) => {
    // Departamento
    if (deptosSet.size && !deptosSet.has(emp.departamento || '')) return false;

    // Puesto (trim to avoid whitespace mismatches)
    if (puestosSet.size) {
      const empPuesto = String(emp.puesto || '').trim();
      if (!puestosSet.has(empPuesto)) return false;
    }

    // Clasificación
    if (clasifSet.size && !clasifSet.has(emp.clasificacion || '')) return false;

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

  return filtered;
}
