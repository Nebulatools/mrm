import { createClient } from '@supabase/supabase-js'
import { normalizeMotivo, normalizeDepartamento } from './normalizers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (process.env.NODE_ENV !== 'production') {
  console.log('🔑 Supabase config:', {
    url: supabaseUrl ? '✅ Configured' : '❌ Missing',
    key: supabaseAnonKey ? '✅ Configured' : '❌ Missing'
  });
}

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
  clasificacion?: string | null
  ubicacion?: string | null
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
  clasificacion?: string  // CONFIANZA, SINDICALIZADO, etc.
  codigo_area?: string
  area?: string
  ubicacion?: string | null
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
  fecha: string // Date string in ISO format
  tipo: string
  descripcion: string | null
  created_at: string
}

// Incidencias CSV (tabla: incidencias) según 1_crear_tabla_incidencias.sql
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
  inci?: string | null // Código: VAC, INC, FJ, FI, etc.
  status?: number | null
  fecha_creacion?: string
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

  // INCIDENCIAS (CSV) operations
  async getIncidenciasCSV(startDate?: string, endDate?: string) {
    console.log('🗄️ Fetching incidencias (CSV table)...', { startDate, endDate });
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
      console.error('❌ Error fetching incidencias (CSV):', error);
      throw error;
    }
    console.log('✅ incidencias (CSV) loaded:', data?.length, 'records');
    return (data || []) as IncidenciaCSVRecord[]
  },

  // EMPLEADOS_SFTP operations (new main employee table)
  async getEmpleadosSFTP() {
    console.log('🗄️ Fetching empleados_sftp data...');
    console.log('🔍 DEBUGGING: getEmpleadosSFTP called at', new Date().toISOString());
    
    // Obtener empleados con TODOS los campos incluyendo clasificacion
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
      // Ordenar por fecha_baja desc para tomar el último motivo real
      motivosEmpleado.sort((a: any, b: any) => new Date(b.fecha_baja).getTime() - new Date(a.fecha_baja).getTime());
      const ultimoMotivo = motivosEmpleado.length > 0 ? motivosEmpleado[0] : null;
      
      return {
        id: emp.id,
        emp_id: String(emp.numero_empleado),
        numero_empleado: emp.numero_empleado, // Agregar campo numero_empleado
        nombre: emp.nombre_completo || `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || 'Sin Nombre',
        departamento: normalizeDepartamento(emp.departamento) || 'Sin Departamento',
        activo: emp.activo === true || emp.activo === 'true' || emp.activo === 1,
        fecha_ingreso: emp.fecha_ingreso || emp.fecha_antiguedad || emp.fecha_creacion || new Date().toISOString(),
        fecha_baja: emp.fecha_baja || ultimoMotivo?.fecha_baja || null,
        puesto: emp.puesto || 'Sin Puesto',
        motivo_baja: normalizeMotivo(emp.motivo_baja || ultimoMotivo?.descripcion || ultimoMotivo?.motivo || 'No especificado'),
        area: emp.area || 'Sin Área',
        clasificacion: emp.clasificacion || 'Sin Clasificación',
        ubicacion: (emp as any).ubicacion || null,
        empresa: (emp as any).empresa || null,
        genero: emp.genero || null,
        fecha_nacimiento: emp.fecha_nacimiento || null,
        fecha_antiguedad: emp.fecha_antiguedad || null,
        created_at: emp.fecha_creacion || new Date().toISOString(),
        updated_at: emp.fecha_actualizacion || new Date().toISOString()
      };
    });
    
    console.log('✅ empleados_sftp data loaded:', transformed.length, 'records');
    console.log('✅ motivos_baja data loaded:', motivos?.length, 'records');
    
    // DEBUG: Ver qué puestos y clasificaciones hay
    console.log('🔍 DEBUGGING FILTROS:');
    console.log('🔍 Primeros 3 empleados:', transformed.slice(0, 3).map(emp => ({
      nombre: emp.nombre,
      departamento: emp.departamento,
      puesto: emp.puesto,
      clasificacion: emp.clasificacion
    })));
    
    const puestosUnicos = Array.from(new Set(transformed.map(emp => emp.puesto).filter(p => p && p !== 'Sin Puesto')));
    const clasificacionesUnicas = Array.from(new Set(transformed.map(emp => emp.clasificacion).filter(c => c && c !== 'Sin Clasificación')));
    
    console.log('🔍 Puestos únicos encontrados:', puestosUnicos);
    console.log('🔍 Clasificaciones únicas encontradas:', clasificacionesUnicas);
    
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
    console.log('🗄️ Fetching distinct departamentos from empleados_sftp...');
    const { data, error } = await supabase
      .from('empleados_sftp')
      .select('departamento');
    if (error) {
      console.error('❌ Error fetching departamentos:', error);
      throw error;
    }
    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      const v = (r?.departamento ?? '').toString().trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  },

  async getAreas() {
    console.log('🗄️ Fetching distinct áreas from empleados_sftp...');
    const { data, error } = await supabase
      .from('empleados_sftp')
      .select('area');
    if (error) {
      console.error('❌ Error fetching áreas:', error);
      throw error;
    }
    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      const v = (r?.area ?? '').toString().trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  },

  async getIncidenciaCodes() {
    console.log('🗄️ Fetching distinct incidencia codes (inci) from incidencias...');
    const { data, error } = await supabase
      .from('incidencias')
      .select('inci');
    if (error) {
      console.error('❌ Error fetching incidencia codes:', error);
      throw error;
    }
    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      const v = (r?.inci ?? '').toString().trim();
      if (v) set.add(v.toUpperCase());
    });
    return Array.from(set).sort();
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
  async getKPIStats() {
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
      totalActiveDays: Array.from(new Set(asistencia.map((a: AsistenciaDiariaRecord) => a.fecha))).length,
      totalTerminations: bajas.length
    }
  }
}
