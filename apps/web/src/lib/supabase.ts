import { createBrowserClient as createClient } from '@supabase/ssr'
import { normalizeMotivo, normalizeDepartamento, normalizeArea } from './normalizers'
import type {
  PlantillaRecord,
  EmpleadoSFTPRecord,
  MotivoBajaRecord,
  AsistenciaDiariaRecord,
  IncidenciaRecord,
  IncidenciaCSVRecord,
  ActividadRecord
} from './types/records'
export type {
  PlantillaRecord,
  EmpleadoSFTPRecord,
  MotivoBajaRecord,
  AsistenciaDiariaRecord,
  IncidenciaRecord,
  IncidenciaCSVRecord,
  ActividadRecord
} from './types/records'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (process.env.NODE_ENV !== 'production') {
  console.log('🔑 Supabase config:', {
    url: supabaseUrl ? '✅ Configured' : '❌ Missing',
    key: supabaseAnonKey ? '✅ Configured' : '❌ Missing'
  });
}

// IMPORTANTE: Este cliente ahora usa @supabase/ssr para incluir la sesión del usuario
// Esto permite que Row Level Security (RLS) funcione correctamente
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on your actual Supabase schema
// Type definitions moved to ./types/records to avoid circular imports.

// Database operations
export const db = {
  // PLANTILLA operations (legacy - keeping for compatibility)
  async getPlantilla(client = supabase) {
    console.log('🗄️ Fetching plantilla data...');
    const { data, error } = await client
      .from('plantilla')
      .select('*')
      .order('emp_id')

    if (error) {
      console.error('❌ Error fetching plantilla:', error);
      // Fallback to empleados_sftp if plantilla doesn't exist
      return this.getEmpleadosSFTP(client);
    }
    console.log('✅ plantilla data loaded:', data?.length, 'records');
    return (data || []) as PlantillaRecord[]
  },

  // INCIDENCIAS (CSV) operations - CON PAGINACIÓN para cargar TODOS los registros
  async getIncidenciasCSV(startDate?: string, endDate?: string, client = supabase) {
    console.log('🗄️ Fetching incidencias (CSV table) con paginación...', { startDate, endDate });

    let allData: IncidenciaCSVRecord[] = [];
    let from = 0;
    const pageSize = 1000; // Máximo de Supabase por página
    let hasMore = true;

    while (hasMore) {
      let query = client
        .from('incidencias')
        .select('*')
        .order('fecha', { ascending: false })
        .range(from, from + pageSize - 1);

      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching incidencias página', from / pageSize + 1, ':', error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(data);
        console.log(`📄 Página ${Math.floor(from / pageSize) + 1}: ${data.length} registros (total acumulado: ${allData.length})`);
        from += pageSize;

        // Si recibimos menos registros que el tamaño de página, ya no hay más
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
    }

    console.log('✅ incidencias (CSV) loaded:', allData.length, 'records (todas las páginas cargadas)');
    return allData as IncidenciaCSVRecord[];
  },

  // EMPLEADOS_SFTP operations (new main employee table)
  // ✅ FASE 5: Usar motivos_baja como fuente de verdad para bajas
  async getEmpleadosSFTP(client = supabase) {
    console.log('🗄️ Fetching empleados_sftp data...');
    console.log('🔍 DEBUGGING: getEmpleadosSFTP called at', new Date().toISOString());

    // DIAGNÓSTICO: Verificar sesión del usuario
    const { data: { session } } = await client.auth.getSession();
    console.log('🔐 SESIÓN ACTIVA:', {
      user_id: session?.user?.id,
      email: session?.user?.email,
      tiene_sesion: !!session
    });

    // ✅ PASO 1: Cargar motivos_baja PRIMERO (fuente de verdad para bajas)
    const { data: motivos, error: motivosError } = await client
      .from('v_motivos_baja_unicos')
      .select('*');

    if (motivosError) {
      console.error('❌ Error fetching v_motivos_baja_unicos:', motivosError);
      throw motivosError;
    }
    console.log('✅ motivos_baja data loaded (FUENTE DE VERDAD):', motivos?.length, 'records');

    // Crear un mapa de motivos por número de empleado
    const motivosMap = new Map();
    (motivos || []).forEach(motivo => {
      if (!motivosMap.has(motivo.numero_empleado)) {
        motivosMap.set(motivo.numero_empleado, []);
      }
      motivosMap.get(motivo.numero_empleado).push(motivo);
    });

    // ✅ PASO 2: Cargar empleados_sftp
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    const empleados: any[] = [];

    while (hasMore) {
      const { data, error } = await client
        .from('empleados_sftp')
        .select('*')
        .order('numero_empleado', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('❌ Error fetching empleados_sftp:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        empleados.push(...data);
        from += pageSize;
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
    }

    // ✅ PASO 3: Sincronizar automáticamente fecha_baja desde motivos_baja
    // Transform to PlantillaRecord format usando motivos_baja como fuente de verdad
    const transformed = empleados.map(emp => {
      const motivosEmpleado = motivosMap.get(emp.numero_empleado) || [];
      // Ordenar por fecha_baja desc para tomar el último motivo real
      motivosEmpleado.sort((a: any, b: any) => new Date(b.fecha_baja).getTime() - new Date(a.fecha_baja).getTime());
      const ultimoMotivo = motivosEmpleado.length > 0 ? motivosEmpleado[0] : null;

      // ✅ SINCRONIZACIÓN: Usar motivos_baja como fuente primaria
      const fechaBajaMotivos = ultimoMotivo?.fecha_baja || null;
      // ✅ CRÍTICO: Usar campo 'motivo' (específico) NO 'descripcion' (genérico)
      // Motivo: "Rescisión por desempeño" vs Descripcion: "Rescisión de contrato"
      const motivoMotivos = ultimoMotivo ? normalizeMotivo(ultimoMotivo.motivo || 'No especificado') : null;

      // Validar activo basado en si tiene fecha_baja en motivos_baja
      const activoFinal = fechaBajaMotivos === null;

      return {
        id: emp.id,
        emp_id: String(emp.numero_empleado),
        numero_empleado: emp.numero_empleado,
        nombre: emp.nombre_completo || `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || 'Sin Nombre',
        departamento: normalizeDepartamento(emp.departamento) || 'Sin Departamento',
        activo: activoFinal, // ✅ Auto-calculado desde motivos_baja
        fecha_ingreso: emp.fecha_ingreso || emp.fecha_antiguedad || emp.fecha_creacion || new Date().toISOString(),
        fecha_baja: fechaBajaMotivos, // ✅ FUENTE: motivos_baja
        puesto: emp.puesto || 'Sin Puesto',
        motivo_baja: motivoMotivos, // ✅ FUENTE: motivos_baja
        area: normalizeArea(emp.area) || 'Sin Área',
        clasificacion: emp.clasificacion || 'Sin Clasificación',
        ubicacion: (emp as any).ubicacion || null,
        ubicacion2: (emp as any).ubicacion2 || null, // CAD, CORPORATIVO, FILIALES
        cc: emp.cc || null,
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

    // ✅ DIAGNÓSTICO: Verificar sincronización
    const bajasMotivos = motivos?.length || 0;
    const bajasTransformed = transformed.filter(e => e.fecha_baja !== null).length;

    console.log('🔍 SINCRONIZACIÓN VERIFICADA:', {
      totalMotivos: bajasMotivos,
      empleadosConBaja: bajasTransformed,
      coinciden: bajasMotivos === bajasTransformed ? '✅' : '❌',
      diferencia: bajasMotivos - bajasTransformed,
      empleadosInactivos: transformed.filter(e => e.activo === false).length,
      primerosConBaja: transformed.filter(e => e.fecha_baja !== null).slice(0, 3).map(e => ({
        numero: e.numero_empleado,
        nombre: e.nombre,
        fecha_baja: e.fecha_baja,
        motivo: e.motivo_baja,
        activo: e.activo
      }))
    });

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

  async getMotivosBaja(startDate?: string, endDate?: string, client = supabase) {
    console.log('🗄️ Fetching motivos_baja data desde vista deduplicada...', { startDate, endDate });
    let query = client
      .from('v_motivos_baja_unicos')
      .select('*')
      .order('fecha_baja', { ascending: false });

    if (startDate) {
      query = query.gte('fecha_baja', startDate);
    }
    if (endDate) {
      query = query.lte('fecha_baja', endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Error fetching v_motivos_baja_unicos:', error);
      throw error;
    }
    console.log('✅ motivos_baja data loaded desde vista v_motivos_baja_unicos:', data?.length, 'records');
    return (data || []) as MotivoBajaRecord[];
  },

  // DEPRECATED: asistencia_diaria table doesn't exist - use getIncidenciasCSV instead
  async getAsistenciaDiaria(startDate?: string, endDate?: string, client = supabase) {
    console.warn('⚠️ getAsistenciaDiaria is deprecated - table asistencia_diaria does not exist. Using incidencias table instead.');
    // Return incidencias data instead
    return this.getIncidenciasCSV(startDate, endDate, client);
  },

  async getDepartamentos(client = supabase) {
    console.log('🗄️ Fetching distinct departamentos from empleados_sftp...');
    const { data, error } = await client
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

  async getAreas(client = supabase) {
    console.log('🗄️ Fetching distinct áreas from empleados_sftp...');
    const { data, error } = await client
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

  async getIncidenciaCodes(client = supabase) {
    console.log('🗄️ Fetching distinct incidencia codes (inci) from incidencias...');
    const { data, error } = await client
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

  async getActiveEmployees(client = supabase) {
    const { data, error } = await client
      .from('plantilla')
      .select('*')
      .eq('activo', true)
      .order('emp_id')

    if (error) throw error
    return (data || []) as PlantillaRecord[]
  },

  // DEPRECATED: asistencia_diaria table doesn't exist - use getIncidenciasCSV instead
  async getIncidenciasFromAsistencia(startDate?: string, endDate?: string, client = supabase) {
    console.warn('⚠️ getIncidenciasFromAsistencia is deprecated - table asistencia_diaria does not exist. Using incidencias table instead.');
    // Return incidencias data instead
    return this.getIncidenciasCSV(startDate, endDate, client);
  },

  // Stats operations
  async getKPIStats(client = supabase) {
    const [empleados, incidencias, bajas] = await Promise.all([
      this.getEmpleadosSFTP(client),
      this.getIncidenciasCSV(undefined, undefined, client),
      this.getMotivosBaja(undefined, undefined, client)
    ])

    // Contar días únicos desde incidencias
    const diasUnicos = Array.from(new Set(incidencias.map((i: IncidenciaCSVRecord) => i.fecha))).length;

    return {
      totalEmployees: empleados.length,
      activeEmployees: empleados.filter((e: PlantillaRecord) => e.activo).length,
      totalIncidents: incidencias.length,
      totalActiveDays: diasUnicos,
      totalTerminations: bajas.length
    }
  }
}
