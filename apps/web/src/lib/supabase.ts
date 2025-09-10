import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('🔑 Supabase config:', {
  url: supabaseUrl ? '✅ Configured' : '❌ Missing',
  key: supabaseAnonKey ? '✅ Configured' : '❌ Missing'
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on your actual Supabase schema
export interface PlantillaRecord {
  id: number
  emp_id: string
  nombre: string
  departamento: string
  activo: boolean
  fecha_ingreso: string // Date string in ISO format
  fecha_baja: string | null
  puesto?: string
  motivo_baja?: string | null
  area?: string | null
  created_at: string
  updated_at: string
}

export interface EmpleadoSFTPRecord {
  id: number
  numero_empleado: number
  apellidos: string
  nombres: string
  nombre_completo?: string
  activo: boolean
  fecha_creacion?: string
  fecha_actualizacion?: string
  // Virtual fields we'll add
  departamento?: string
  area?: string
  fecha_ingreso?: string
  fecha_baja?: string | null
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
  fecha: string // Date string in ISO format
  tipo: string
  descripcion: string | null
  created_at: string
}

export interface ActividadRecord {
  id: number
  emp_id: string
  fecha: string // Date string in ISO format
  presente: boolean
  created_at: string
}

// Database operations
export const db = {
  // PLANTILLA operations (legacy - keeping for compatibility)
  async getPlantilla() {
    console.log('🗄️ Fetching plantilla data...');
    const { data, error } = await supabase
      .from('plantilla')
      .select('*')
      .order('emp_id')
    
    if (error) {
      console.error('❌ Error fetching plantilla:', error);
      // Fallback to empleados_sftp if plantilla doesn't exist
      return this.getEmpleadosSFTP();
    }
    console.log('✅ plantilla data loaded:', data?.length, 'records');
    return (data || []) as PlantillaRecord[]
  },

  // EMPLEADOS_SFTP operations (new main employee table)
  async getEmpleadosSFTP() {
    console.log('🗄️ Fetching empleados_sftp data...');
    const { data, error } = await supabase
      .from('empleados_sftp')
      .select(`
        *,
        motivos_baja (
          fecha_baja,
          tipo,
          motivo,
          descripcion
        )
      `)
      .order('numero_empleado')
    
    if (error) {
      console.error('❌ Error fetching empleados_sftp:', error);
      throw error;
    }
    
    // Transform to PlantillaRecord format for compatibility
    const transformed = (data || []).map(emp => ({
      id: emp.id,
      emp_id: String(emp.numero_empleado),
      nombre: emp.nombre_completo || `${emp.nombres} ${emp.apellidos}`,
      departamento: emp.departamento || 'Sin Departamento',
      activo: emp.activo,
      fecha_ingreso: emp.fecha_ingreso || emp.fecha_creacion || new Date().toISOString(),
      fecha_baja: emp.motivos_baja?.[0]?.fecha_baja || null,
      puesto: emp.puesto || null,
      motivo_baja: emp.motivos_baja?.[0]?.motivo || null,
      area: emp.area || null,
      created_at: emp.fecha_creacion || new Date().toISOString(),
      updated_at: emp.fecha_actualizacion || new Date().toISOString()
    }));
    
    console.log('✅ empleados_sftp data loaded:', transformed.length, 'records');
    return transformed as PlantillaRecord[];
  },

  async getMotivosBaja(startDate?: string, endDate?: string) {
    console.log('🗄️ Fetching motivos_baja data...', { startDate, endDate });
    let query = supabase
      .from('motivos_baja')
      .select('*')
      .order('fecha_baja', { ascending: false })

    if (startDate) {
      query = query.gte('fecha_baja', startDate)
    }
    if (endDate) {
      query = query.lte('fecha_baja', endDate)
    }

    const { data, error } = await query
    if (error) {
      console.error('❌ Error fetching motivos_baja:', error);
      throw error;
    }
    console.log('✅ motivos_baja data loaded:', data?.length, 'records');
    return (data || []) as MotivoBajaRecord[]
  },

  async getAsistenciaDiaria(startDate?: string, endDate?: string) {
    console.log('🗄️ Fetching asistencia_diaria data...', { startDate, endDate });
    let query = supabase
      .from('asistencia_diaria')
      .select('*')
      .order('fecha', { ascending: false })

    if (startDate) {
      query = query.gte('fecha', startDate)
    }
    if (endDate) {
      query = query.lte('fecha', endDate)
    }

    const { data, error } = await query
    if (error) {
      console.error('❌ Error fetching asistencia_diaria:', error);
      throw error;
    }
    console.log('✅ asistencia_diaria data loaded:', data?.length, 'records');
    return (data || []) as AsistenciaDiariaRecord[]
  },

  async getDepartamentos() {
    console.log('🗄️ Fetching departamentos...');
    // Since we don't have departamento field in empleados_sftp, we'll create mock data
    // You should add this field to your database
    const mockDepartamentos = [
      'Recursos Humanos',
      'Tecnología',
      'Ventas',
      'Marketing',
      'Operaciones',
      'Finanzas',
      'Administración'
    ];
    return mockDepartamentos;
  },

  async getAreas() {
    console.log('🗄️ Fetching areas...');
    // Since we don't have area field in empleados_sftp, we'll create mock data
    // You should add this field to your database
    const mockAreas = [
      'Desarrollo',
      'Soporte',
      'Gestión',
      'Análisis',
      'Diseño',
      'Calidad'
    ];
    return mockAreas;
  },

  async getActiveEmployees() {
    const { data, error } = await supabase
      .from('plantilla')
      .select('*')
      .eq('activo', true)
      .order('emp_id')
    
    if (error) throw error
    return (data || []) as PlantillaRecord[]
  },

  // INCIDENCIAS operations
  async getIncidencias(startDate?: string, endDate?: string) {
    console.log('🗄️ Fetching incidencias data...', { startDate, endDate });
    let query = supabase
      .from('incidencias')
      .select('*')
      .order('fecha', { ascending: false })

    if (startDate) {
      query = query.gte('fecha', startDate)
    }
    if (endDate) {
      query = query.lte('fecha', endDate)
    }

    const { data, error } = await query
    if (error) {
      console.error('❌ Error fetching incidencias:', error);
      throw error;
    }
    console.log('✅ incidencias data loaded:', data?.length, 'records');
    return (data || []) as IncidenciaRecord[]
  },

  async addIncidencia(incidencia: Omit<IncidenciaRecord, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('incidencias')
      .insert([incidencia])
      .select()

    if (error) throw error
    return data?.[0] as IncidenciaRecord
  },

  // ACT operations (actividad diaria)
  async getACT(startDate?: string, endDate?: string) {
    console.log('🗄️ Fetching act data...', { startDate, endDate });
    let query = supabase
      .from('act')
      .select('*')
      .order('fecha', { ascending: false })

    if (startDate) {
      query = query.gte('fecha', startDate)
    }
    if (endDate) {
      query = query.lte('fecha', endDate)
    }

    const { data, error } = await query
    if (error) {
      console.error('❌ Error fetching act:', error);
      throw error;
    }
    console.log('✅ act data loaded:', data?.length, 'records');
    return (data || []) as ActividadRecord[]
  },

  async addACT(actividad: Omit<ActividadRecord, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('act')
      .insert([actividad])
      .select()

    if (error) throw error
    return data?.[0] as ActividadRecord
  },

  // Bulk operations for adding multiple records
  async addMultipleEmployees(employees: Omit<PlantillaRecord, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
      .from('plantilla')
      .insert(employees)
      .select()

    if (error) throw error
    return data as PlantillaRecord[]
  },

  async addMultipleIncidencias(incidencias: Omit<IncidenciaRecord, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('incidencias')
      .insert(incidencias)
      .select()

    if (error) throw error
    return data as IncidenciaRecord[]
  },

  async addMultipleACT(actividades: Omit<ActividadRecord, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('act')
      .insert(actividades)
      .select()

    if (error) throw error
    return data as ActividadRecord[]
  }
}