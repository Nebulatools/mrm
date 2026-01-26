import type { PlantillaRecord, AsistenciaDiariaRecord } from '@/lib/supabase';
import type { KPIResult } from '@/lib/kpi-calculator';

/**
 * Mock Plantilla Data - Empleados de prueba
 */
export const mockPlantilla: PlantillaRecord[] = [
  {
    id: 1,
    emp_id: '1',
    numero_empleado: 1001,
    nombre: 'Juan Pérez García',
    activo: true,
    fecha_ingreso: '2020-01-15',
    fecha_baja: null,
    motivo_baja: null,
    departamento: 'Ventas',
    puesto: 'Vendedor Senior',
    area: 'Comercial',
    clasificacion: 'CONFIANZA',
    fecha_nacimiento: '1990-05-15',
    genero: 'masculino',
    created_at: '2020-01-15T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    emp_id: '2',
    numero_empleado: 1002,
    nombre: 'María García López',
    activo: true,
    fecha_ingreso: '2021-03-10',
    fecha_baja: null,
    motivo_baja: null,
    departamento: 'Marketing',
    puesto: 'Analista de Marketing',
    area: 'Comercial',
    clasificacion: 'SINDICALIZADO',
    fecha_nacimiento: '1985-08-20',
    genero: 'femenino',
    created_at: '2021-03-10T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    emp_id: '3',
    numero_empleado: 1003,
    nombre: 'Pedro López Martínez',
    activo: false,
    fecha_ingreso: '2019-05-20',
    fecha_baja: '2023-12-31',
    motivo_baja: 'Renuncia voluntaria',
    departamento: 'Operaciones',
    puesto: 'Operador de Producción',
    area: 'Producción',
    clasificacion: 'SINDICALIZADO',
    fecha_nacimiento: '1978-03-10',
    genero: 'masculino',
    created_at: '2019-05-20T00:00:00Z',
    updated_at: '2023-12-31T00:00:00Z',
  },
  {
    id: 4,
    emp_id: '4',
    numero_empleado: 1004,
    nombre: 'Ana Rodríguez Sánchez',
    activo: true,
    fecha_ingreso: '2022-08-01',
    fecha_baja: null,
    motivo_baja: null,
    departamento: 'Recursos Humanos',
    puesto: 'Coordinador de RH',
    area: 'Administración',
    clasificacion: 'CONFIANZA',
    fecha_nacimiento: '1992-11-25',
    genero: 'femenino',
    created_at: '2022-08-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    emp_id: '5',
    numero_empleado: 1005,
    nombre: 'Carlos Hernández Ruiz',
    activo: false,
    fecha_ingreso: '2023-10-15',
    fecha_baja: '2023-12-20',
    motivo_baja: 'Abandono de trabajo',
    departamento: 'Operaciones',
    puesto: 'Operador Junior',
    area: 'Producción',
    clasificacion: 'EVENTUAL',
    fecha_nacimiento: '1995-07-08',
    genero: 'masculino',
    created_at: '2023-10-15T00:00:00Z',
    updated_at: '2023-12-20T00:00:00Z',
  },
];

/**
 * Mock Motivos Baja Data
 */
export const mockMotivosBaja = [
  {
    id: 1,
    numero_empleado: 1003,
    fecha_baja: '2023-12-31',
    tipo: 'Voluntaria',
    motivo: 'Renuncia voluntaria',
    descripcion: 'Mejor oportunidad laboral',
    fecha_creacion: '2023-12-31T00:00:00Z',
  },
  {
    id: 2,
    numero_empleado: 1005,
    fecha_baja: '2023-12-20',
    tipo: 'Voluntaria',
    motivo: 'Abandono de trabajo',
    descripcion: 'No se presentó más',
    fecha_creacion: '2023-12-20T00:00:00Z',
  },
];

/**
 * Mock Asistencia Diaria Data
 */
export const mockAsistenciaDiaria: AsistenciaDiariaRecord[] = [
  {
    id: 1,
    numero_empleado: 1001,
    fecha: '2024-01-15',
    dia_semana: 'Lunes',
    horas_trabajadas: 8.0,
    horas_incidencia: 0.0,
    presente: true,
    fecha_creacion: '2024-01-15T00:00:00Z',
  },
  {
    id: 2,
    numero_empleado: 1002,
    fecha: '2024-01-15',
    dia_semana: 'Lunes',
    horas_trabajadas: 6.0,
    horas_incidencia: 2.0,
    presente: true,
    fecha_creacion: '2024-01-15T00:00:00Z',
  },
  {
    id: 3,
    numero_empleado: 1004,
    fecha: '2024-01-15',
    dia_semana: 'Lunes',
    horas_trabajadas: 0.0,
    horas_incidencia: 8.0,
    presente: false,
    fecha_creacion: '2024-01-15T00:00:00Z',
  },
];

/**
 * Mock KPI Results
 */
export const mockKPIs: KPIResult[] = [
  {
    name: 'Activos',
    category: 'headcount',
    value: 75,
    target: undefined,
    previous_value: 73,
    variance_percentage: 2.74,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: 'Días',
    category: 'headcount',
    value: 22,
    target: undefined,
    previous_value: 21,
    variance_percentage: 4.76,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: 'Activos Prom',
    category: 'headcount',
    value: 74,
    target: undefined,
    previous_value: 72,
    variance_percentage: 2.78,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: 'Bajas',
    category: 'retention',
    value: 5,
    target: undefined,
    previous_value: 3,
    variance_percentage: 66.67,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: 'Rotación Mensual',
    category: 'retention',
    value: 6.76,
    target: undefined,
    previous_value: 4.17,
    variance_percentage: 62.11,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: 'Incidencias',
    category: 'incidents',
    value: 45,
    target: undefined,
    previous_value: 38,
    variance_percentage: 18.42,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: 'Inc prom x empleado',
    category: 'incidents',
    value: 0.61,
    target: 0.4,
    previous_value: 0.53,
    variance_percentage: 15.09,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: 'Días Laborados',
    category: 'productivity',
    value: 64,
    target: undefined,
    previous_value: 62,
    variance_percentage: 3.23,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
  {
    name: '%incidencias',
    category: 'incidents',
    value: 70.31,
    target: 5.0,
    previous_value: 61.29,
    variance_percentage: 14.72,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
  },
];

/**
 * Helper para crear empleados de prueba personalizados
 */
export function createMockEmpleado(
  overrides: Partial<PlantillaRecord> = {}
): PlantillaRecord {
  return {
    id: 999,
    emp_id: '999',
    numero_empleado: 9999,
    nombre: 'Test Employee',
    activo: true,
    fecha_ingreso: '2023-01-01',
    fecha_baja: null,
    motivo_baja: null,
    departamento: 'Test',
    puesto: 'Test Position',
    area: 'Test Area',
    clasificacion: 'CONFIANZA',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Helper para crear registros de asistencia de prueba
 */
export function createMockAsistencia(
  overrides: Partial<AsistenciaDiariaRecord> = {}
): AsistenciaDiariaRecord {
  return {
    id: 999,
    numero_empleado: 9999,
    fecha: '2024-01-01',
    dia_semana: 'Lunes',
    horas_trabajadas: 8.0,
    horas_incidencia: 0.0,
    presente: true,
    fecha_creacion: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Helper para crear KPIs de prueba
 */
export function createMockKPI(overrides: Partial<KPIResult> = {}): KPIResult {
  return {
    name: 'Test KPI',
    category: 'test',
    value: 100,
    target: undefined,
    previous_value: 90,
    variance_percentage: 11.11,
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    ...overrides,
  };
}
