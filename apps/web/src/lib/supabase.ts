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
  // PLANTILLA operations
  async getPlantilla() {
    console.log('🗄️ Fetching plantilla data...');
    const { data, error } = await supabase
      .from('plantilla')
      .select('*')
      .order('emp_id')
    
    if (error) {
      console.error('❌ Error fetching plantilla:', error);
      throw error;
    }
    console.log('✅ plantilla data loaded:', data?.length, 'records');
    return (data || []) as PlantillaRecord[]
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