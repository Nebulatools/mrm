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
    
    // Obtener empleados
    const { data: empleados, error: empleadosError } = await supabase
      .from('empleados_sftp')
      .select('*')
      .order('numero_empleado')
    
    if (empleadosError) {
      console.error('❌ Error fetching empleados_sftp:', empleadosError);
      throw empleadosError;
    }
    
    // Obtener motivos de baja
    const { data: motivos, error: motivosError } = await supabase
      .from('motivos_baja')
      .select('*')
    
    if (motivosError) {
      console.error('❌ Error fetching motivos_baja:', motivosError);
      throw motivosError;
    }
    
    // Crear un mapa de motivos por número de empleado
    const motivosMap = new Map();
    (motivos || []).forEach(motivo => {
      if (!motivosMap.has(motivo.numero_empleado)) {
        motivosMap.set(motivo.numero_empleado, []);
      }
      motivosMap.get(motivo.numero_empleado).push(motivo);
    });
    
    // Transform to PlantillaRecord format for compatibility
    const transformed = (empleados || []).map(emp => {
      const motivosEmpleado = motivosMap.get(emp.numero_empleado) || [];
      const ultimoMotivo = motivosEmpleado.length > 0 ? motivosEmpleado[0] : null;
      
      return {
        id: emp.id,
        emp_id: String(emp.numero_empleado),
        nombre: emp.nombre_completo || `${emp.nombres} ${emp.apellidos}`,
        departamento: emp.departamento || 'Sin Departamento',
        activo: emp.activo,
        fecha_ingreso: emp.fecha_ingreso || emp.fecha_creacion || new Date().toISOString(),
        fecha_baja: ultimoMotivo?.fecha_baja || null,
        puesto: emp.puesto || null,
        motivo_baja: ultimoMotivo?.motivo || null,
        area: emp.area || null,
        created_at: emp.fecha_creacion || new Date().toISOString(),
        updated_at: emp.fecha_actualizacion || new Date().toISOString()
      };
    });
    
    console.log('✅ empleados_sftp data loaded:', transformed.length, 'records');
    console.log('✅ motivos_baja data loaded:', motivos?.length, 'records');
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

  // Get incidencias from asistencia_diaria (where horas_incidencia > 0)
  async getIncidenciasFromAsistencia(startDate?: string, endDate?: string) {
    console.log('🗄️ Fetching incidencias from asistencia_diaria...', { startDate, endDate });
    let query = supabase
      .from('asistencia_diaria')
      .select('*')
      .gt('horas_incidencia', 0) // Solo registros con incidencias
      .order('fecha', { ascending: false })

    if (startDate) {
      query = query.gte('fecha', startDate)
    }
    if (endDate) {
      query = query.lte('fecha', endDate)
    }

    const { data, error } = await query
    if (error) {
      console.error('❌ Error fetching incidencias from asistencia:', error);
      throw error;
    }
    console.log('✅ incidencias from asistencia loaded:', data?.length, 'records');
    return (data || []) as AsistenciaDiariaRecord[]
  },

  // Stats operations
  async getKPIStats(period: string = 'monthly') {
    const [empleados, asistencia, bajas] = await Promise.all([
      this.getEmpleadosSFTP(),
      this.getAsistenciaDiaria(),
      this.getMotivosBaja()
    ])

    // Contar incidencias (registros con horas_incidencia > 0)
    const incidencias = asistencia.filter((a: AsistenciaDiariaRecord) => (a.horas_incidencia || 0) > 0)

    return {
      totalEmployees: empleados.length,
      activeEmployees: empleados.filter((e: PlantillaRecord) => e.activo).length,
      totalIncidents: incidencias.length,
      totalActiveDays: [...new Set(asistencia.map((a: AsistenciaDiariaRecord) => a.fecha))].length,
      totalTerminations: bajas.length
    }
  }
}