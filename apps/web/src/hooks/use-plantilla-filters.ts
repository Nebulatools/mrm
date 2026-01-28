"use client";

import { useMemo } from "react";
import { applyFiltersWithScope, type RetentionFilterOptions } from "@/lib/filters";
import type { PlantillaRecord, IncidenciaCSVRecord } from "@/lib/supabase";
import type { MotivoBajaRecord } from "@/lib/types/records";

interface UsePlantillaFiltersOptions {
  plantilla: PlantillaRecord[];
  bajasData: MotivoBajaRecord[];
  incidenciasData: IncidenciaCSVRecord[];
  retentionFilters: RetentionFilterOptions;
  selectedPeriod: Date;
}

interface UsePlantillaFiltersReturn {
  /** Filtrado específico (año + mes + filtros estructurales), solo activos */
  plantillaFiltered: PlantillaRecord[];
  /** Filtrado por año (sin mes), solo activos - para incidencias */
  plantillaFilteredYearScope: PlantillaRecord[];
  /** Filtrado general (sin año/mes), con inactivos - para acumulados históricos */
  plantillaFilteredGeneral: PlantillaRecord[];
  /** Filtrado por año (con inactivos) - para tablas de rotación */
  plantillaRotacionYearScope: PlantillaRecord[];
  /** Empleados con baja en el mes seleccionado - para detalle de bajas */
  plantillaDismissalDetail: PlantillaRecord[];
  /** Bajas filtradas por empleados en plantillaFiltered */
  bajasFiltered: MotivoBajaRecord[];
  /** Incidencias filtradas por empleados en plantillaFiltered */
  incidenciasFiltered: Array<{
    id: number;
    emp: number;
    fecha: string;
    inci: string;
    incidencia: string | null;
    ubicacion2: string | null;
  }>;
}

/**
 * Hook para gestionar las 4 variantes de filtrado de plantilla
 *
 * Cada variante tiene un propósito específico:
 * 1. plantillaFiltered: Para KPIs del mes específico (solo activos)
 * 2. plantillaFilteredYearScope: Para incidencias (denominador real de empleados activos)
 * 3. plantillaFilteredGeneral: Para comparaciones históricas (incluye inactivos)
 * 4. plantillaRotacionYearScope: Para tablas de rotación (incluye bajas)
 */
export function usePlantillaFilters({
  plantilla,
  bajasData,
  incidenciasData,
  retentionFilters,
  selectedPeriod,
}: UsePlantillaFiltersOptions): UsePlantillaFiltersReturn {
  // Variante 1: Filtrado específico (año + mes + estructura), solo activos
  const plantillaFiltered = useMemo(() => {
    if (!plantilla || plantilla.length === 0) return [];
    const filtered = applyFiltersWithScope(
      plantilla,
      {
        ...retentionFilters,
        includeInactive: false, // Solo empleados activos
      },
      "specific"
    );
    console.log("🎯 Plantilla filtrada (específico, solo activos):", filtered.length);
    return filtered;
  }, [plantilla, retentionFilters]);

  // Variante 2: Filtrado por año (sin mes), solo activos - para incidencias
  const plantillaFilteredYearScope = useMemo(() => {
    if (!plantilla || plantilla.length === 0) return [];
    const scoped = applyFiltersWithScope(
      plantilla,
      {
        ...retentionFilters,
        includeInactive: true, // Incluir todos los empleados para tab de incidencias
      },
      "year-only"
    );
    console.log("📊 Plantilla (año, todos) para incidencias:", scoped.length);
    return scoped;
  }, [plantilla, retentionFilters]);

  // Variante 3: Filtrado general (sin año/mes), con inactivos - para acumulados
  const plantillaFilteredGeneral = useMemo(() => {
    if (!plantilla || plantilla.length === 0) return [];
    const scoped = applyFiltersWithScope(
      plantilla,
      {
        ...retentionFilters,
        includeInactive: true,
      },
      "general"
    );
    console.log("🌐 Plantilla sin filtros temporales (para acumulados):", scoped.length);
    return scoped;
  }, [plantilla, retentionFilters]);

  // Variante 4: Filtrado por año (con inactivos) - para tablas de rotación
  // ✅ FIX: Aplicar TODOS los filtros estructurales (departamento, área, ubicación, etc.)
  // Las tablas de rotación deben respetar los filtros seleccionados por el usuario
  const plantillaRotacionYearScope = useMemo(() => {
    if (!plantilla || plantilla.length === 0) return [];
    const scoped = applyFiltersWithScope(
      plantilla,
      {
        ...retentionFilters, // ✅ Incluir TODOS los filtros (año, estructura, etc.)
        months: [], // ✅ Pero sin mes (year-only scope)
        includeInactive: true, // Incluir empleados con baja para tablas de rotación
      },
      "year-only"
    );
    console.log("🔄 Plantilla (año, con bajas) para rotación:", scoped.length);
    return scoped;
  }, [plantilla, retentionFilters]);

  // Detalle de bajas del mes seleccionado
  // ✅ FIX: Usar plantillaRotacionYearScope (incluye inactivos/bajas) en lugar de
  // plantillaFilteredYearScope (solo activos) para poder mostrar las bajas
  const plantillaDismissalDetail = useMemo(() => {
    if (!plantillaRotacionYearScope || plantillaRotacionYearScope.length === 0) {
      return [];
    }
    const targetYear = selectedPeriod.getFullYear();
    const targetMonth = selectedPeriod.getMonth() + 1;
    const targetKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

    return plantillaRotacionYearScope.filter((emp) => {
      if (!emp.fecha_baja) return false;
      const fecha =
        typeof emp.fecha_baja === "string"
          ? emp.fecha_baja.slice(0, 7)
          : new Date(emp.fecha_baja).toISOString().slice(0, 7);
      return fecha === targetKey;
    });
  }, [plantillaRotacionYearScope, selectedPeriod]);

  // Bajas filtradas por empleados en plantillaFiltered
  const empleadosFiltradosIds = useMemo(
    () =>
      new Set(plantillaFilteredYearScope.map((e) => e.numero_empleado || Number(e.emp_id))),
    [plantillaFilteredYearScope]
  );

  const bajasFiltered = useMemo(
    () => bajasData.filter((b) => empleadosFiltradosIds.has(b.numero_empleado)),
    [bajasData, empleadosFiltradosIds]
  );

  // Incidencias filtradas y normalizadas
  const incidenciasFiltered = useMemo(
    () =>
      incidenciasData
        .filter((i) => {
          // Incluir incidencias con emp negativo (sintético) o sin match para no perder datos
          if (i.emp === undefined || i.emp === null || i.emp < 0) return true;
          return empleadosFiltradosIds.size === 0 || empleadosFiltradosIds.has(i.emp);
        })
        .map((i) => ({
          id: i.id,
          emp: i.emp,
          fecha: i.fecha,
          inci: i.inci ?? i.incidencia ?? "",
          incidencia: i.incidencia ?? null,
          ubicacion2: i.ubicacion2 ?? null,
        })),
    [incidenciasData, empleadosFiltradosIds]
  );

  return {
    plantillaFiltered,
    plantillaFilteredYearScope,
    plantillaFilteredGeneral,
    plantillaRotacionYearScope,
    plantillaDismissalDetail,
    bajasFiltered,
    incidenciasFiltered,
  };
}
