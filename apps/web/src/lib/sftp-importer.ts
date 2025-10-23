// SISTEMA DE IMPORTACIÓN SFTP - TRANSFORMACIÓN COMPLETA
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface EmpleadoSFTP {
  numero_empleado: number;
  apellidos: string;
  nombres: string;
}

interface AsistenciaDiaria {
  numero_empleado: number;
  fecha: string;
  dia_semana: string;
  horas_trabajadas: number;
  horas_incidencia: number;
}

interface MotivoBaja {
  numero_empleado: number;
  fecha_baja: string;
  tipo: string;
  motivo: string;
  descripcion?: string | null;
  observaciones?: string | null;
}

export class SFTPImporter {
  private importacionId: number | null = null;

  // Inicializar importación
  async iniciarImportacion(archivo: string): Promise<number> {
    const { data, error } = await supabase
      .from('importaciones_sftp')
      .insert({
        archivo,
        estado: 'iniciado'
      })
      .select()
      .single();

    if (error) throw new Error(`Error iniciando importación: ${error.message}`);
    
    this.importacionId = data.id;
    console.log(`🚀 Importación iniciada: ${archivo} (ID: ${this.importacionId})`);
    return data.id;
  }

  // Completar importación
  async completarImportacion(registrosExitosos: number, registrosErrores: number) {
    if (!this.importacionId) throw new Error('No hay importación activa');

    await supabase
      .from('importaciones_sftp')
      .update({
        registros_exitosos: registrosExitosos,
        registros_errores: registrosErrores,
        estado: registrosErrores > 0 ? 'completado_con_errores' : 'completado'
      })
      .eq('id', this.importacionId);

    console.log(`✅ Importación completada: ${registrosExitosos} exitosos, ${registrosErrores} errores`);
  }

  // Procesar archivo Prenomina Horizontal.csv
  async procesarPrenomina(csvData: string[]): Promise<{ exitosos: number; errores: number }> {
    let exitosos = 0;
    let errores = 0;

    console.log(`📊 Procesando Prenomina: ${csvData.length - 1} registros`);

    if (csvData.length === 0) {
      throw new Error('No hay datos para procesar');
    }

    // Parse headers
    const headers: string[] = csvData[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    console.log(`📋 Headers encontrados: ${headers.length} columnas`);

    // Limpiar datos existentes
    await this.limpiarTablasEmpleados();

    const empleados: EmpleadoSFTP[] = [];
    const asistencias: AsistenciaDiaria[] = [];

    // Procesar cada fila
    for (let i = 1; i < csvData.length; i++) {
      try {
        const values = csvData[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length !== headers.length) {
          console.warn(`⚠️  Fila ${i}: Número incorrecto de columnas`);
          errores++;
          continue;
        }

        // Extraer datos del empleado
        const numeroEmpleado = parseInt(values[0]);
        const apellidos = values[1] || '';
        const nombres = values[2] || '';

        if (!numeroEmpleado || !apellidos || !nombres) {
          console.warn(`⚠️  Fila ${i}: Datos de empleado incompletos`);
          errores++;
          continue;
        }

        // Agregar empleado (evitar duplicados)
        if (!empleados.find(e => e.numero_empleado === numeroEmpleado)) {
          empleados.push({
            numero_empleado: numeroEmpleado,
            apellidos,
            nombres
          });
        }

        // Procesar asistencia para cada día de la semana
        const diasSemana = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
        
        for (const dia of diasSemana) {
          // Buscar índices de columnas para este día
          const fechaIndex = headers.findIndex(h => h.includes(`${dia}-ORD`) || (h === dia && headers[headers.indexOf(h) + 1]?.includes('ORD')));
          const horasIndex = headers.findIndex(h => h.includes(`${dia} - TE`) || h.includes(`${dia}-TE`));
          const incidenciaIndex = headers.findIndex(h => h.includes(`${dia}-INC`) || h.includes(`${dia} INC`));

          if (fechaIndex >= 0 && horasIndex >= 0) {
            const fechaStr = values[fechaIndex + 1] || values[fechaIndex]; // Puede estar en la siguiente columna
            const horasStr = values[horasIndex] || '0';
            const incidenciaStr = values[incidenciaIndex] || '0';

            // Parsear fecha (formato DD/MM/YYYY)
            if (fechaStr && fechaStr.includes('/')) {
              try {
                const [day, month, year] = fechaStr.split('/');
                const fecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                
                const horas = parseFloat(horasStr) || 0;
                const incidencia = parseFloat(incidenciaStr) || 0;

                asistencias.push({
                  numero_empleado: numeroEmpleado,
                  fecha,
                  dia_semana: dia,
                  horas_trabajadas: horas,
                  horas_incidencia: incidencia
                });
              } catch {
                console.warn(`⚠️  Error procesando fecha ${fechaStr} para empleado ${numeroEmpleado}`);
              }
            }
          }
        }

        exitosos++;
      } catch (error) {
        console.error(`❌ Error en fila ${i}:`, error);
        await this.registrarError(i, csvData[i], 'parse_error', (error as Error).message);
        errores++;
      }
    }

    // Insertar empleados
    console.log(`👥 Insertando ${empleados.length} empleados...`);
    const { error: empleadosError } = await supabase
      .from('empleados_sftp')
      .insert(empleados);

    if (empleadosError) {
      throw new Error(`Error insertando empleados: ${empleadosError.message}`);
    }

    // Insertar asistencias en lotes
    console.log(`📅 Insertando ${asistencias.length} registros de asistencia...`);
    const batchSize = 1000;
    for (let i = 0; i < asistencias.length; i += batchSize) {
      const batch = asistencias.slice(i, i + batchSize);
      const { error: asistenciaError } = await supabase
        .from('asistencia_diaria')
        .insert(batch);

      if (asistenciaError) {
        console.error(`❌ Error insertando lote de asistencias:`, asistenciaError.message);
        errores += batch.length;
      } else {
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} insertado (${batch.length} registros)`);
      }
    }

    return { exitosos, errores };
  }

  // Procesar archivo MotivosBaja.csv
  async procesarMotivosBaja(csvData: string[]): Promise<{ exitosos: number; errores: number }> {
    let exitosos = 0;
    let errores = 0;

    console.log(`📋 Procesando Motivos de Baja: ${csvData.length - 1} registros`);

    if (csvData.length === 0) {
      return { exitosos: 0, errores: 0 };
    }

    // const headers = csvData[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const motivos: MotivoBaja[] = [];

    for (let i = 1; i < csvData.length; i++) {
      try {
        const values = csvData[i].split(',').map(v => v.trim().replace(/"/g, ''));

        const fecha = values[0] || '';
        const numeroEmpleado = parseInt(values[1]) || 0;
        const tipo = values[2] || '';
        const motivo = values[3] || '';
        const descripcion = values[4] || '';
        const observaciones = values[5] || '';

        if (!numeroEmpleado || !fecha || !tipo || !motivo) {
          console.warn(`⚠️  Fila ${i}: Datos incompletos de baja`);
          errores++;
          continue;
        }

        motivos.push({
          numero_empleado: numeroEmpleado,
          fecha_baja: fecha,
          tipo,
          motivo,
          descripcion: descripcion || null,
          observaciones: observaciones || null
        });

        exitosos++;
      } catch (error) {
        console.error(`❌ Error en fila ${i}:`, error);
        await this.registrarError(i, csvData[i], 'parse_error', (error as Error).message);
        errores++;
      }
    }

    // Insertar motivos de baja
    if (motivos.length > 0) {
      console.log(`📤 Insertando ${motivos.length} motivos de baja...`);
      
      const { error } = await supabase
        .from('motivos_baja')
        .insert(motivos);

      if (error) {
        throw new Error(`Error insertando motivos de baja: ${error.message}`);
      }
    }

    return { exitosos, errores };
  }

  // Limpiar tablas antes de nueva importación
  private async limpiarTablasEmpleados() {
    console.log('🧹 Limpiando tablas existentes...');
    
    // Limpiar en orden correcto por foreign keys
    await supabase.from('motivos_baja').delete().neq('id', 0);
    await supabase.from('asistencia_diaria').delete().neq('id', 0);
    await supabase.from('empleados_sftp').delete().neq('id', 0);
    
    console.log('✅ Tablas limpiadas');
  }

  // Registrar errores
  private async registrarError(numeroFila: number, datosOriginales: string, tipoError: string, mensajeError: string) {
    if (!this.importacionId) return;

    await supabase
      .from('errores_importacion')
      .insert({
        importacion_id: this.importacionId,
        numero_fila: numeroFila,
        datos_originales: datosOriginales,
        tipo_error: tipoError,
        mensaje_error: mensajeError
      });
  }

  // Obtener estadísticas de la importación
  async obtenerEstadisticas() {
    const empleados = await supabase
      .from('empleados_sftp')
      .select('count(*)', { count: 'exact' });

    const asistencias = await supabase
      .from('asistencia_diaria')
      .select('count(*)', { count: 'exact' });

    const bajas = await supabase
      .from('motivos_baja')
      .select('count(*)', { count: 'exact' });

    return {
      empleados: empleados.count || 0,
      asistencias: asistencias.count || 0,
      bajas: bajas.count || 0
    };
  }
}

export const sftpImporter = new SFTPImporter();
