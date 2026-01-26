/**
 * Shared database record types used across backend utilities.
 * Splitting types out avoids circular dependencies between modules such as
 * `supabase` and `filters` while keeping a single source of truth.
 */

export interface PlantillaRecord {
  id: number
  emp_id: string
  numero_empleado?: number
  nombre: string
  departamento: string
  activo: boolean
  fecha_ingreso: string
  fecha_baja: string | null
  puesto?: string
  motivo_baja?: string | null
  area?: string | null
  clasificacion?: string | null
  ubicacion?: string | null
  ubicacion2?: string | null // CAD, CORPORATIVO, FILIALES
  cc?: string | null // Centro de Costo
  genero?: string | null
  fecha_nacimiento?: string | null
  fecha_antiguedad?: string | null
  empresa?: string | null
  created_at: string
  updated_at: string
}

export interface EmpleadoSFTPRecord {
  id: number
  numero_empleado: number
  apellidos: string
  nombres: string
  nombre_completo?: string
  gafete?: string
  genero?: string
  imss?: string
  fecha_nacimiento?: string
  estado?: string
  fecha_ingreso?: string
  fecha_antiguedad?: string
  empresa?: string
  registro_patronal?: string
  codigo_puesto?: string
  puesto?: string
  codigo_depto?: string
  departamento?: string
  codigo_cc?: string
  cc?: string
  subcuenta_cc?: string
  clasificacion?: string
  codigo_area?: string
  area?: string
  ubicacion?: string | null
  ubicacion2?: string | null // CAD, CORPORATIVO, FILIALES
  telefono?: string
  correo?: string
  direccion?: string
  cuenta_bancaria?: string
  fecha_baja?: string | null
  motivo_baja?: string | null
  activo: boolean
  fecha_creacion?: string
  fecha_actualizacion?: string
}

export interface MotivoBajaRecord {
  id: number
  numero_empleado: number
  fecha_baja: string
  tipo: string
  motivo: string
  descripcion?: string | null
  observaciones?: string | null
  fecha_creacion?: string
}

export interface AsistenciaDiariaRecord {
  id: number
  numero_empleado: number
  fecha: string
  dia_semana: string
  horas_trabajadas?: number
  horas_incidencia?: number
  presente?: boolean
  fecha_creacion?: string
}

export interface IncidenciaRecord {
  id: number
  emp_id: string
  fecha: string
  tipo: string
  descripcion: string | null
  created_at: string
}

export interface IncidenciaCSVRecord {
  id: number
  emp: number
  nombre?: string | null
  fecha: string
  turno?: number | null
  horario?: string | null
  incidencia?: string | null
  entra?: string | null
  sale?: string | null
  ordinarias?: number | null
  numero?: number | null
  inci?: string | null
  status?: number | null
  ubicacion2?: string | null
  fecha_creacion?: string
}

export interface ActividadRecord {
  id: number
  emp_id: string
  fecha: string
  presente: boolean
  created_at: string
}
