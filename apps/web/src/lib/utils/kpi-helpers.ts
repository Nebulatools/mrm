/**
 * KPI Helpers - Funciones utilitarias centralizadas para cálculos de KPIs
 *
 * Estas funciones eliminan la duplicación de lógica de cálculo en el dashboard.
 * Todas las funciones son puras (sin efectos secundarios) y fáciles de testear.
 */

import type { PlantillaRecord } from '../types/records';
import { isMotivoClave } from '../normalizers';

// ============================================================================
// FUNCIONES BASE DE CÁLCULO
// ============================================================================

/**
 * Calcula el promedio de empleados activos en un período
 *
 * Fórmula: (Empleados al inicio + Empleados al fin) ÷ 2
 *
 * @param plantilla Lista de empleados (ya filtrada por applyRetentionFilters)
 * @param startDate Fecha inicio del período
 * @param endDate Fecha fin del período
 * @returns Promedio de empleados activos en el período
 *
 * @example
 * const startDate = new Date(2025, 9, 1); // 1 Oct 2025
 * const endDate = new Date(2025, 9, 31); // 31 Oct 2025
 * const promedio = calculateActivosPromedio(plantilla, startDate, endDate);
 * // Si hay 80 al inicio y 84 al fin: (80 + 84) / 2 = 82
 */
export function calculateActivosPromedio(
  plantilla: PlantillaRecord[],
  startDate: Date,
  endDate: Date
): number {
  // Validación
  if (!plantilla || plantilla.length === 0) {
    return 0;
  }

  if (startDate > endDate) {
    console.warn('⚠️ startDate debe ser anterior a endDate');
    return 0;
  }

  // Empleados activos al inicio del período
  const empleadosInicio = plantilla.filter(emp => {
    const fechaIngreso = new Date(emp.fecha_ingreso);
    const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;

    // Activo al inicio = ingresó antes del inicio Y (no tiene baja O baja es después del inicio)
    return fechaIngreso <= startDate && (!fechaBaja || fechaBaja > startDate);
  }).length;

  // Empleados activos al final del período
  const empleadosFin = plantilla.filter(emp => {
    const fechaIngreso = new Date(emp.fecha_ingreso);
    const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;

    // Activo al fin = ingresó antes del fin Y (no tiene baja O baja es después del fin)
    return fechaIngreso <= endDate && (!fechaBaja || fechaBaja > endDate);
  }).length;

  const promedio = (empleadosInicio + empleadosFin) / 2;

  console.log('📊 Activos Promedio:', {
    periodo: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    inicio: empleadosInicio,
    fin: empleadosFin,
    promedio: promedio
  });

  return promedio;
}

/**
 * Cuenta las bajas en un período específico
 *
 * @param plantilla Lista de empleados (ya filtrada)
 * @param startDate Fecha inicio del período
 * @param endDate Fecha fin del período
 * @returns Cantidad de bajas en el período
 *
 * @example
 * const startDate = new Date(2025, 9, 1);
 * const endDate = new Date(2025, 9, 31);
 * const bajas = calculateBajasEnPeriodo(plantilla, startDate, endDate);
 */
export function calculateBajasEnPeriodo(
  plantilla: PlantillaRecord[],
  startDate: Date,
  endDate: Date
): number {
  if (!plantilla || plantilla.length === 0) {
    return 0;
  }

  const bajas = plantilla.filter(emp => {
    if (!emp.fecha_baja) return false;
    const fechaBaja = new Date(emp.fecha_baja);
    return fechaBaja >= startDate && fechaBaja <= endDate;
  }).length;

  console.log('📉 Bajas en período:', {
    periodo: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    cantidad: bajas
  });

  return bajas;
}

/**
 * Calcula la rotación en un período
 *
 * Fórmula: (Bajas del período ÷ Activos promedio) × 100
 *
 * @param plantilla Lista de empleados (ya filtrada)
 * @param startDate Fecha inicio del período
 * @param endDate Fecha fin del período
 * @returns Porcentaje de rotación
 *
 * @example
 * const rotacion = calculateRotacion(plantilla, startDate, endDate);
 * // Si hay 5 bajas y 82 activos promedio: (5 / 82) × 100 = 6.1%
 */
export function calculateRotacion(
  plantilla: PlantillaRecord[],
  startDate: Date,
  endDate: Date
): number {
  const bajas = calculateBajasEnPeriodo(plantilla, startDate, endDate);
  const activosPromedio = calculateActivosPromedio(plantilla, startDate, endDate);

  if (activosPromedio === 0) {
    return 0;
  }

  const rotacion = (bajas / activosPromedio) * 100;

  console.log('🔄 Rotación calculada:', {
    periodo: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    bajas,
    activosPromedio,
    rotacion: `${rotacion.toFixed(1)}%`
  });

  return rotacion;
}

// ============================================================================
// FUNCIONES DE ROTACIÓN ESPECÍFICAS
// ============================================================================

/**
 * Calcula rotación mensual para una fecha específica
 *
 * @param plantilla Lista de empleados (ya filtrada)
 * @param fecha Fecha del mes a calcular (normalmente new Date())
 * @returns Porcentaje de rotación mensual
 *
 * @example
 * const rotacion = calcularRotacionMensual(plantilla, new Date());
 * console.log(`Rotación mensual: ${rotacion.toFixed(1)}%`);
 */
export function calcularRotacionMensual(
  plantilla: PlantillaRecord[],
  fecha: Date
): number {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return calculateRotacion(plantilla, startDate, endDate);
}

/**
 * Calcula rotación acumulada de últimos 12 meses móviles
 *
 * @param plantilla Lista de empleados (ya filtrada)
 * @param fecha Fecha de referencia (normalmente hoy)
 * @returns Porcentaje de rotación acumulada 12m
 *
 * @example
 * const rotacion12m = calcularRotacionAcumulada12m(plantilla, new Date());
 * console.log(`Rotación 12 meses: ${rotacion12m.toFixed(1)}%`);
 */
export function calcularRotacionAcumulada12m(
  plantilla: PlantillaRecord[],
  fecha: Date
): number {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();

  // Últimos 12 meses: desde hace 11 meses hasta fin del mes actual
  const startDate = new Date(year, month - 11, 1);
  const endDate = new Date(year, month + 1, 0);

  return calculateRotacion(plantilla, startDate, endDate);
}

/**
 * Calcula rotación desde inicio de año hasta fecha (Year-To-Date)
 *
 * @param plantilla Lista de empleados (ya filtrada)
 * @param fecha Fecha de referencia (normalmente hoy)
 * @returns Porcentaje de rotación YTD
 *
 * @example
 * const rotacionYTD = calcularRotacionYTD(plantilla, new Date());
 * console.log(`Rotación año actual: ${rotacionYTD.toFixed(1)}%`);
 */
export function calcularRotacionYTD(
  plantilla: PlantillaRecord[],
  fecha: Date
): number {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();

  // Desde 1 de Enero hasta fin del mes actual
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, month + 1, 0);

  return calculateRotacion(plantilla, startDate, endDate);
}

// ============================================================================
// FUNCIONES DE FILTRADO
// ============================================================================

/**
 * Filtra empleados por tipo de motivo de baja
 *
 * Motivos Involuntarios (Clave):
 * - Rescisión por desempeño
 * - Rescisión por disciplina
 * - Término del contrato
 *
 * @param plantilla Lista de empleados
 * @param motivoFilter Tipo de motivo ('involuntaria' | 'complementaria' | 'all')
 * @returns Lista filtrada
 *
 * @example
 * const soloInvoluntarias = filterByMotivo(plantilla, 'involuntaria');
 * const soloComplementarias = filterByMotivo(plantilla, 'complementaria');
 */
export function filterByMotivo(
  plantilla: PlantillaRecord[],
  motivoFilter: 'involuntaria' | 'complementaria' | 'all'
): PlantillaRecord[] {
  if (!plantilla || plantilla.length === 0) {
    return [];
  }

  if (motivoFilter === 'all') {
    return plantilla;
  }

  const filtered = plantilla.filter(emp => {
    // Mantener empleados activos (sin fecha_baja)
    if (!emp.fecha_baja) {
      return true;
    }

    // Verificar si el motivo es involuntario (clave)
    const esInvoluntaria = isMotivoClave((emp as any).motivo_baja);

    // Filtrar según el tipo solicitado
    return motivoFilter === 'involuntaria' ? esInvoluntaria : !esInvoluntaria;
  });

  console.log(`🔍 Filtro de motivo ${motivoFilter}:`, {
    original: plantilla.length,
    filtrado: filtered.length,
    bajasActivas: plantilla.filter(e => e.fecha_baja).length,
    bajasFiltradas: filtered.filter(e => e.fecha_baja).length
  });

  return filtered;
}

/**
 * Filtra empleados por rango de fechas (activos en el período)
 *
 * @param plantilla Lista de empleados
 * @param startDate Fecha inicio del período
 * @param endDate Fecha fin del período
 * @returns Lista de empleados activos en el período
 *
 * @example
 * const empleadosEnOctubre = filterByDateRange(
 *   plantilla,
 *   new Date(2025, 9, 1),
 *   new Date(2025, 9, 31)
 * );
 */
export function filterByDateRange(
  plantilla: PlantillaRecord[],
  startDate: Date,
  endDate: Date
): PlantillaRecord[] {
  if (!plantilla || plantilla.length === 0) {
    return [];
  }

  const filtered = plantilla.filter(emp => {
    const ingreso = new Date(emp.fecha_ingreso);
    const baja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;

    // Empleado activo en el rango = ingresó antes del fin Y (no tiene baja O baja es después del inicio)
    return ingreso <= endDate && (!baja || baja >= startDate);
  });

  console.log('📅 Filtro por rango de fechas:', {
    periodo: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    original: plantilla.length,
    filtrado: filtered.length
  });

  return filtered;
}

// ============================================================================
// FUNCIONES DE BAJAS ESPECÍFICAS
// ============================================================================

/**
 * Calcula bajas tempranas (empleados con menos de 3 meses de antigüedad)
 *
 * @param plantilla Lista de empleados con bajas
 * @returns Cantidad de bajas tempranas
 *
 * @example
 * const bajasTempranas = calculateBajasTempranas(plantilla);
 */
export function calculateBajasTempranas(plantilla: PlantillaRecord[]): number {
  if (!plantilla || plantilla.length === 0) {
    return 0;
  }

  const bajasTempranas = plantilla.filter(emp => {
    if (!emp.fecha_baja) return false;

    const fechaIngreso = new Date(emp.fecha_ingreso);
    const fechaBaja = new Date(emp.fecha_baja);

    // Calcular meses trabajados
    const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);

    return mesesTrabajados < 3;
  }).length;

  console.log('⏱️ Bajas tempranas (<3 meses):', bajasTempranas);

  return bajasTempranas;
}

/**
 * Calcula total de bajas históricas
 *
 * @param plantilla Lista de empleados
 * @returns Cantidad total de empleados con fecha_baja
 *
 * @example
 * const totalBajas = calculateTotalBajas(plantilla);
 */
export function calculateTotalBajas(plantilla: PlantillaRecord[]): number {
  if (!plantilla || plantilla.length === 0) {
    return 0;
  }

  return plantilla.filter(emp => emp.fecha_baja !== null && emp.fecha_baja !== undefined).length;
}

// ============================================================================
// FUNCIONES DE EMPLEADOS ACTIVOS
// ============================================================================

/**
 * Cuenta empleados activos en una fecha específica
 *
 * @param plantilla Lista de empleados
 * @param fecha Fecha de referencia (default: hoy)
 * @returns Cantidad de empleados activos
 *
 * @example
 * const activos = countActivosEnFecha(plantilla, new Date());
 */
export function countActivosEnFecha(
  plantilla: PlantillaRecord[],
  fecha: Date = new Date()
): number {
  if (!plantilla || plantilla.length === 0) {
    return 0;
  }

  return plantilla.filter(emp => {
    const fechaIngreso = new Date(emp.fecha_ingreso);
    const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;

    // Activo en la fecha = ingresó antes de la fecha Y (no tiene baja O baja es después de la fecha)
    return fechaIngreso <= fecha && (!fechaBaja || fechaBaja > fecha);
  }).length;
}

// ============================================================================
// FUNCIONES DE ROTACIÓN CON DESGLOSE POR MOTIVO (GENERAL)
// ============================================================================

/**
 * Calcula rotación desglosada por motivo manteniendo el mismo denominador
 *
 * Esta función es crítica para métricas GENERALES que necesitan mostrar
 * desglose por motivo (Involuntaria vs Complementaria) pero manteniendo
 * el mismo denominador (activos promedio total).
 *
 * Garantiza que: Involuntaria% + Complementaria% = Total%
 *
 * @param plantilla Lista completa de empleados (sin filtrar por motivo)
 * @param startDate Fecha inicio del período
 * @param endDate Fecha fin del período
 * @returns Objeto con rotación total, involuntaria y complementaria
 *
 * @example
 * const rotacion = calcularRotacionConDesglose(plantillaGeneral, startDate, endDate);
 * console.log(rotacion.total); // 10.5%
 * console.log(rotacion.involuntaria); // 6.2%
 * console.log(rotacion.complementaria); // 4.3%
 * // 6.2% + 4.3% = 10.5% ✅
 */
export function calcularRotacionConDesglose(
  plantilla: PlantillaRecord[],
  startDate: Date,
  endDate: Date
): {
  total: number;
  involuntaria: number;
  complementaria: number;
  bajas: number;
  bajasInvoluntarias: number;
  bajasComplementarias: number;
  activosPromedio: number;
} {
  if (!plantilla || plantilla.length === 0) {
    return {
      total: 0,
      involuntaria: 0,
      complementaria: 0,
      bajas: 0,
      bajasInvoluntarias: 0,
      bajasComplementarias: 0,
      activosPromedio: 0
    };
  }

  // Calcular activos promedio con TODA la plantilla (sin filtrar)
  const activosPromedio = calculateActivosPromedio(plantilla, startDate, endDate);

  // Obtener todas las bajas del período
  const todasLasBajas = plantilla.filter(emp => {
    if (!emp.fecha_baja) return false;
    const fechaBaja = new Date(emp.fecha_baja);
    return fechaBaja >= startDate && fechaBaja <= endDate;
  });

  // Separar bajas por motivo
  const bajasInvoluntarias = todasLasBajas.filter(emp =>
    isMotivoClave((emp as any).motivo_baja)
  );
  const bajasComplementarias = todasLasBajas.filter(emp =>
    !isMotivoClave((emp as any).motivo_baja)
  );

  // Calcular rotaciones usando el MISMO denominador
  const rotacionTotal = activosPromedio > 0 ? (todasLasBajas.length / activosPromedio) * 100 : 0;
  const rotacionInvoluntaria = activosPromedio > 0 ? (bajasInvoluntarias.length / activosPromedio) * 100 : 0;
  const rotacionComplementaria = activosPromedio > 0 ? (bajasComplementarias.length / activosPromedio) * 100 : 0;

  console.log('🔢 Rotación con desglose por motivo:', {
    periodo: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    activosPromedio: activosPromedio.toFixed(1),
    bajas: {
      total: todasLasBajas.length,
      involuntarias: bajasInvoluntarias.length,
      complementarias: bajasComplementarias.length,
      suma: bajasInvoluntarias.length + bajasComplementarias.length
    },
    rotacion: {
      total: `${rotacionTotal.toFixed(1)}%`,
      involuntaria: `${rotacionInvoluntaria.toFixed(1)}%`,
      complementaria: `${rotacionComplementaria.toFixed(1)}%`,
      suma: `${(rotacionInvoluntaria + rotacionComplementaria).toFixed(1)}%`
    },
    verificacion: Math.abs(rotacionTotal - (rotacionInvoluntaria + rotacionComplementaria)) < 0.1 ? '✅' : '❌'
  });

  return {
    total: rotacionTotal,
    involuntaria: rotacionInvoluntaria,
    complementaria: rotacionComplementaria,
    bajas: todasLasBajas.length,
    bajasInvoluntarias: bajasInvoluntarias.length,
    bajasComplementarias: bajasComplementarias.length,
    activosPromedio
  };
}

/**
 * Calcula rotación acumulada 12 meses con desglose por motivo
 *
 * @param plantilla Lista completa de empleados (sin filtrar)
 * @param fecha Fecha de referencia (normalmente hoy)
 * @returns Objeto con rotación total, involuntaria y complementaria
 */
export function calcularRotacionAcumulada12mConDesglose(
  plantilla: PlantillaRecord[],
  fecha: Date
): {
  total: number;
  involuntaria: number;
  complementaria: number;
} {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();

  // Últimos 12 meses: desde hace 11 meses hasta fin del mes actual
  const startDate = new Date(year, month - 11, 1);
  const endDate = new Date(year, month + 1, 0);

  const resultado = calcularRotacionConDesglose(plantilla, startDate, endDate);

  return {
    total: resultado.total,
    involuntaria: resultado.involuntaria,
    complementaria: resultado.complementaria
  };
}

/**
 * Calcula rotación YTD con desglose por motivo
 *
 * @param plantilla Lista completa de empleados (sin filtrar)
 * @param fecha Fecha de referencia (normalmente hoy)
 * @returns Objeto con rotación total, involuntaria y complementaria
 */
export function calcularRotacionYTDConDesglose(
  plantilla: PlantillaRecord[],
  fecha: Date
): {
  total: number;
  involuntaria: number;
  complementaria: number;
} {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();

  // Desde 1 de Enero hasta fin del mes actual
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, month + 1, 0);

  const resultado = calcularRotacionConDesglose(plantilla, startDate, endDate);

  return {
    total: resultado.total,
    involuntaria: resultado.involuntaria,
    complementaria: resultado.complementaria
  };
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Valida que una plantilla tenga datos válidos
 *
 * @param plantilla Lista de empleados
 * @returns true si la plantilla es válida
 */
export function validatePlantilla(plantilla: PlantillaRecord[]): boolean {
  if (!plantilla || plantilla.length === 0) {
    console.warn('⚠️ Plantilla vacía o inválida');
    return false;
  }

  // Verificar que todos los empleados tengan fecha_ingreso
  const sinFechaIngreso = plantilla.filter(emp => !emp.fecha_ingreso);
  if (sinFechaIngreso.length > 0) {
    console.warn(`⚠️ ${sinFechaIngreso.length} empleados sin fecha_ingreso`);
  }

  return true;
}
