import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sftpClient } from '@/lib/sftp-client';
import { requireAdmin } from '@/lib/server-auth';
import { computeNextRun, normalizeDayOfWeek, normalizeFrequency, normalizeRunTime } from '@/lib/utils/sync-schedule';

const normalizeKey = (key: unknown): string =>
  typeof key === 'string'
    ? key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : '';

function pickField(
  record: Record<string, unknown>,
  explicitKeys: string[],
  token: string
): string {
  for (const key of explicitKeys) {
    const value = record[key];
    const str = value === null || value === undefined ? '' : String(value).trim();
    if (str && str.toLowerCase() !== 'null') return str;
  }

  const tokenNorm = normalizeKey(token);
  for (const [rawKey, value] of Object.entries(record)) {
    const normKey = normalizeKey(rawKey);
    if (!normKey || !normKey.includes(tokenNorm)) continue;
    const str = value === null || value === undefined ? '' : String(value).trim();
    if (str && str.toLowerCase() !== 'null') return str;
  }

  return '';
}

interface EmpleadoSFTP {
  numero_empleado: number;
  apellidos: string;
  nombres: string;
  nombre_completo: string;
  gafete?: string;
  genero?: string;
  imss?: string;
  fecha_nacimiento?: string | null;
  estado?: string;
  fecha_ingreso: string;
  fecha_antiguedad?: string | null;
  empresa?: string;
  registro_patronal?: string;
  codigo_puesto?: string;
  puesto?: string;
  codigo_depto?: string;
  departamento?: string;
  codigo_cc?: string;
  cc?: string;
  subcuenta_cc?: string;
  clasificacion?: string;
  codigo_area?: string;
  area?: string;
  ubicacion?: string;
  tipo_nomina?: string;
  turno?: string;
  prestacion_ley?: string;
  paquete_prestaciones?: string;
  fecha_baja?: string | null;
  activo: boolean;
}

interface MotivoBaja {
  numero_empleado: number;
  fecha_baja: string;
  tipo: string;
  motivo: string;
  descripcion?: string;
  observaciones?: string;
}

interface IncidenciaSFTP {
  emp: number;
  nombre: string | null;
  fecha: string;
  turno: number | null;
  horario: string | null;
  incidencia: string | null;
  entra: string | null;
  sale: string | null;
  ordinarias: number | null;
  numero: number | null;
  inci: string | null;
  status: number | null;
  ubicacion2: string | null;
}

const INCIDENT_CODES = new Set(['FI', 'SUS', 'PSIN', 'ENFE']);
const PERMISO_CODES = new Set(['PCON', 'VAC', 'MAT3', 'MAT1', 'JUST']);

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const isServiceRun = auth.userId === 'service';
  const triggerSource = request.nextUrl.searchParams.get('trigger') ?? '';
  const manualTrigger = triggerSource === 'manual';

  if (manualTrigger) {
    console.log('🔄 Actualización manual solicitada: limpiando caché del cliente SFTP');
    sftpClient.clearCache();
  }

  const sftpBaseUrl = buildSftpBaseUrl(request);
  sftpClient.setBaseUrl(sftpBaseUrl);
  const cronSecret = process.env.CRON_SYNC_SECRET;
  const cookieHeader = request.headers.get('cookie') ?? undefined;
  if (cronSecret) {
    sftpClient.setDefaultFetchOptions({ headers: { 'x-cron-secret': cronSecret } });
  } else if (cookieHeader) {
    sftpClient.setDefaultFetchOptions({ headers: { cookie: cookieHeader } });
  } else {
    sftpClient.setDefaultFetchOptions(undefined);
  }
  console.log('🔗 SFTP base URL usada en importación:', sftpClient.getBaseUrl());

  if (isServiceRun) {
    const { data: scheduleRow, error: scheduleError } = await supabaseAdmin
      .from('sync_settings')
      .select('frequency, day_of_week, run_time, next_run')
      .eq('singleton', true)
      .maybeSingle();

    if (!scheduleError && scheduleRow) {
      const frequency = normalizeFrequency(scheduleRow.frequency);
      if (frequency === 'manual') {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'La sincronización está configurada en modo manual.',
        });
      }

      const dayOfWeek = normalizeDayOfWeek(scheduleRow.day_of_week);
      const runTime = normalizeRunTime(scheduleRow.run_time);
      const now = new Date();
      let nextRunDate = scheduleRow.next_run ? new Date(scheduleRow.next_run) : null;
      if (!nextRunDate || Number.isNaN(nextRunDate.getTime())) {
        nextRunDate = computeNextRun(frequency, dayOfWeek, runTime, now) || null;
      }

      if (nextRunDate && now < nextRunDate) {
        if (!scheduleRow.next_run) {
          await supabaseAdmin
            .from('sync_settings')
            .upsert(
              {
                singleton: true,
                frequency,
                day_of_week: dayOfWeek,
                run_time: runTime,
                next_run: nextRunDate.toISOString(),
              },
              { onConflict: 'singleton' }
            );
        }
        return NextResponse.json({
          success: true,
          skipped: true,
          next_run: nextRunDate.toISOString(),
          message: 'La sincronización aún no está programada para ejecutarse.',
        });
      }
    }
  }
  try {
    console.log('🚀 Iniciando importación real de datos SFTP...');
    
    // 1. Obtener lista de archivos del SFTP
    const files = await sftpClient.listFiles();
    console.log(`📁 Archivos encontrados:`, files.map(f => f.name));
    
    const results = {
      empleados: 0,
      bajas: 0,
      asistencia: 0,
      incidencias: null as number | null,
      permisos: null as number | null,
      errors: [] as string[]
    };

    // 2. Procesar archivo de empleados (Validacion Alta de empleados.xls)
    const empleadosFile = files.find(f => f.name.includes('Validacion Alta') && f.name.includes('empleados'));
    
    if (empleadosFile) {
      console.log(`📥 Procesando archivo de empleados: ${empleadosFile.name}`);
      
      try {
        const empleadosData = await sftpClient.downloadFile(empleadosFile.name);
        console.log(`📊 Registros de empleados encontrados: ${empleadosData.length}`);
        
        if (empleadosData.length > 0) {
          // Mapear datos del SFTP a estructura de BD
          const empleadosTransformados: EmpleadoSFTP[] = empleadosData.map((record: Record<string, unknown>, index: number) => {
            
            // Parsear fecha de ingreso
            let fechaIngreso = '2024-01-01'; // Default
            if (record['Fecha Ingreso']) {
              try {
                const fechaStr = String(record['Fecha Ingreso']);
                if (fechaStr.includes('/')) {
                  const [day, month, year] = fechaStr.split('/');
                  const fullYear = year.length === 2 ? `20${year}` : year;
                  fechaIngreso = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              } catch (e) {
                console.warn(`Error parseando fecha para empleado ${index + 1}:`, e);
              }
            }
            
            return {
              numero_empleado: parseInt(String(record['Número'] || record['Gafete'] || (index + 1))),
              apellidos: String(record['Apellidos'] || 'Apellido'),
              nombres: String(record['Nombres'] || 'Nombre'),
              nombre_completo: String(record['Nombre Completo'] || `${record['Nombres']} ${record['Apellidos']}` || `Empleado ${index + 1}`),
              gafete: String(record['Gafete'] || ''),
              genero: String(record['Género'] || record['Genero'] || ''),
              imss: String(record['IMSS'] || ''),
              fecha_nacimiento: record['Fecha de Nacimiento'] ? parseDate(record['Fecha de Nacimiento']) : null,
              estado: String(record['Estado'] || ''),
              fecha_ingreso: fechaIngreso,
              fecha_antiguedad: record['Fecha Antigüedad'] ? parseDate(record['Fecha Antigüedad']) : null,
              empresa: String(record['Empresa'] || ''),
              registro_patronal: String(record['No. Registro Patronal'] || ''),
              codigo_puesto: String(record['CodigoPuesto'] || ''),
              puesto: String(record['Puesto'] || 'Sin Puesto'),
              codigo_depto: String(record['Código Depto'] || ''),
              departamento: String(record['Departamento'] || 'Sin Departamento'),
              codigo_cc: String(record['Código de CC'] || ''),
              cc: String(record['CC'] || ''),
              subcuenta_cc: String(record['Subcuenta CC'] || ''),
              clasificacion: pickField(record as Record<string, unknown>, ['Clasificación', 'Clasificaci?n', 'Clasificacion'], 'clasif'),
              codigo_area: String(record['Codigo Area'] || ''),
              area: String(record['Area'] || 'Sin Area'),
              ubicacion: pickField(record as Record<string, unknown>, ['Ubicación', 'Ubicaci?n', 'Ubicacion'], 'ubica'),
              tipo_nomina: String(record['Tipo de Nómina'] || ''),
              turno: String(record['Turno'] || ''),
              prestacion_ley: String(record['Prestación de Ley'] || ''),
              paquete_prestaciones: String(record['Paquete de Prestaciones'] || ''),
              fecha_baja: record['Fecha Baja'] && record['Fecha Baja'] !== 'null' ? parseDate(record['Fecha Baja']) : null,
              activo: String(record['Activo']).toUpperCase() === 'SI' || String(record['Activo']).toUpperCase() === 'TRUE'
            };
          });
          
          console.log(`🔄 Empleados transformados: ${empleadosTransformados.length}`);
          console.log('Sample empleado:', empleadosTransformados[0]);
          
          // Insertar en lotes de 50 usando upsert para no eliminar historial previo
          const batchSize = 50;
          for (let i = 0; i < empleadosTransformados.length; i += batchSize) {
            const batch = empleadosTransformados.slice(i, i + batchSize);
            
            const { error } = await supabaseAdmin
              .from('empleados_sftp')
              .upsert(batch, { onConflict: 'numero_empleado' });
              
            if (error) {
              console.error(`Error insertando lote ${Math.floor(i / batchSize) + 1}:`, error);
              results.errors.push(`Error lote empleados ${Math.floor(i / batchSize) + 1}: ${error.message}`);
            } else {
              console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} insertado correctamente`);
            }
          }
          
          results.empleados = empleadosTransformados.length;
        }
        
      } catch (error) {
        console.error('Error procesando empleados:', error);
        results.errors.push(`Error empleados: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. Procesar archivo de bajas (MotivosBaja.csv)
    const bajasFile = files.find(f => f.name.toLowerCase().includes('motivos') && f.name.toLowerCase().includes('baja'));
    
    if (bajasFile) {
      console.log(`📥 Procesando archivo de bajas: ${bajasFile.name}`);
      
      try {
        const bajasData = await sftpClient.downloadFile(bajasFile.name);
        console.log(`📊 Registros de bajas encontrados: ${bajasData.length}`);
        
        if (bajasData.length > 0) {
          // Mapear datos del SFTP a estructura de BD
          const bajasTransformadas: MotivoBaja[] = bajasData.map((record: Record<string, unknown>) => {
            const fechaBaja = parseDate(record['Fecha']) ?? '2024-01-01';
            
            return {
              numero_empleado: parseInt(String(record['#'] || record['Numero'] || 1)),
              fecha_baja: fechaBaja,
              tipo: String(record['Tipo'] || 'Baja'),
              motivo: String(record['Motivo'] || 'No especificado'),
              descripcion: String(record['Descripción'] || record['Descripcion'] || ''),
              observaciones: String(record['Observaciones'] || '')
            };
          });
          
          console.log(`🔄 Bajas transformadas: ${bajasTransformadas.length}`);
          console.log('Sample baja:', bajasTransformadas[0]);
          
          const uniqueEmployeeNumbers = Array.from(new Set(
            bajasTransformadas
              .map((baja) => baja.numero_empleado)
              .filter((num) => Number.isFinite(num))
          ));

          let idsToDelete: number[] = [];

          if (uniqueEmployeeNumbers.length > 0) {
            const { data: existingRows, error: fetchExistingError } = await supabaseAdmin
              .from('motivos_baja')
              .select('id, numero_empleado, fecha_baja, motivo')
              .in('numero_empleado', uniqueEmployeeNumbers);

            if (fetchExistingError) {
              console.error('Error obteniendo motivos existentes:', fetchExistingError);
            } else if (existingRows) {
              const incomingKeys = new Set(
                bajasTransformadas.map(
                  (baja) => `${baja.numero_empleado}|${baja.fecha_baja}|${baja.motivo}`
                )
              );

              idsToDelete = existingRows
                .filter((row) => incomingKeys.has(`${row.numero_empleado}|${row.fecha_baja}|${row.motivo}`))
                .map((row) => row.id as number)
                .filter((id) => typeof id === 'number');
            }
          }

          if (idsToDelete.length > 0) {
            console.log(`🧹 Eliminando ${idsToDelete.length} motivos_baja existentes que serán reemplazados`);
            await supabaseAdmin
              .from('motivos_baja')
              .delete()
              .in('id', idsToDelete);
          }

          const { error } = await supabaseAdmin
            .from('motivos_baja')
            .insert(bajasTransformadas);
            
          if (error) {
            console.error('Error insertando bajas:', error);
            results.errors.push(`Error bajas: ${error.message}`);
          } else {
            console.log('✅ Bajas insertadas correctamente');
            results.bajas = bajasTransformadas.length;
          }
        }
        
      } catch (error) {
        console.error('Error procesando bajas:', error);
        results.errors.push(`Error bajas: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 4. Procesar archivo de incidencias (Incidencias.csv)
    const incidenciasFile = files.find(f => f.name.toLowerCase().includes('incidencia') && f.name.toLowerCase().endsWith('.csv'));

    if (incidenciasFile) {
      console.log(`📥 Procesando archivo de incidencias: ${incidenciasFile.name}`);

      try {
        const incidenciasData = await sftpClient.downloadFile(incidenciasFile.name);
        console.log(`📊 Registros de incidencias encontrados: ${incidenciasData.length}`);

        if (incidenciasData.length > 0) {
          const incidenciasTransformadas = incidenciasData
            .map((record: Record<string, unknown>, index: number) => transformIncidenciaRecord(record, index))
            .filter((record): record is IncidenciaSFTP => record !== null);

          if (incidenciasTransformadas.length > 0) {
            console.log(`🔄 Incidencias transformadas: ${incidenciasTransformadas.length}`);
            console.log('Sample incidencia:', incidenciasTransformadas[0]);

            const fechas = incidenciasTransformadas
              .map((inc) => new Date(inc.fecha))
              .filter((date) => !Number.isNaN(date.getTime()))
              .sort((a, b) => a.getTime() - b.getTime());

            if (fechas.length > 0) {
              const periodStart = fechas[0].toISOString().split('T')[0];
              const periodEnd = fechas[fechas.length - 1].toISOString().split('T')[0];
              console.log(`🧹 Eliminando incidencias existentes en rango ${periodStart} -> ${periodEnd}`);

              await supabaseAdmin
                .from('incidencias')
                .delete()
                .gte('fecha', periodStart)
                .lte('fecha', periodEnd);
            }

            const batchSize = 200;
            for (let i = 0; i < incidenciasTransformadas.length; i += batchSize) {
              const batch = incidenciasTransformadas.slice(i, i + batchSize);
              const { error } = await supabaseAdmin
                .from('incidencias')
                .insert(batch);

              if (error) {
                console.error(`Error insertando incidencias lote ${Math.floor(i / batchSize) + 1}:`, error);
                results.errors.push(`Error lote incidencias ${Math.floor(i / batchSize) + 1}: ${error.message}`);
              } else {
                console.log(`✅ Lote incidencias ${Math.floor(i / batchSize) + 1} insertado correctamente`);
              }
            }

            const totalIncidencias = incidenciasTransformadas.filter((inc) => inc.inci && INCIDENT_CODES.has(inc.inci)).length;
            const totalPermisos = incidenciasTransformadas.filter((inc) => inc.inci && PERMISO_CODES.has(inc.inci)).length;

            console.log(`📈 Totales incidencias/permisos - Incidencias: ${totalIncidencias}, Permisos: ${totalPermisos}`);

            results.incidencias = totalIncidencias;
            results.permisos = totalPermisos;
          }
        }

      } catch (error) {
        console.error('Error procesando incidencias:', error);
        results.errors.push(`Error incidencias: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('✅ Importación de datos SFTP completada!');
    console.log(`📊 Resultados finales - Empleados: ${results.empleados}, Bajas: ${results.bajas}, Incidencias: ${results.incidencias}`);

    let scheduleMeta: { last_run?: string | null; next_run?: string | null } = {};
    const { data: scheduleRow, error: scheduleError } = await supabaseAdmin
      .from('sync_settings')
      .select('frequency, day_of_week, run_time')
      .eq('singleton', true)
      .maybeSingle();

    if (!scheduleError) {
      const frequency = normalizeFrequency(scheduleRow?.frequency);
      const dayOfWeek = normalizeDayOfWeek(scheduleRow?.day_of_week);
      const runTime = normalizeRunTime(scheduleRow?.run_time);
      const nextRunDate = computeNextRun(frequency, dayOfWeek, runTime);
      const lastRunIso = new Date().toISOString();

      const { data: updatedSchedule, error: updateScheduleError } = await supabaseAdmin
        .from('sync_settings')
        .upsert(
          {
            singleton: true,
            frequency,
            day_of_week: dayOfWeek,
            run_time: runTime,
            last_run: lastRunIso,
            next_run: nextRunDate ? nextRunDate.toISOString() : null,
          },
          { onConflict: 'singleton' }
        )
        .select('last_run, next_run')
        .single();

      if (!updateScheduleError && updatedSchedule) {
        scheduleMeta = {
          last_run: updatedSchedule.last_run,
          next_run: updatedSchedule.next_run,
        };
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Importación de datos SFTP completada',
      results,
      schedule: scheduleMeta,
    });
    return response;

  } catch (error) {
    console.error('❌ Error en importación SFTP:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    sftpClient.setDefaultFetchOptions(undefined);
  }
}

// Helper function para parsear fechas
function parseDate(dateValue: unknown): string | null {
  if (dateValue === null || dateValue === undefined) return null;

  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue.toISOString().split('T')[0];
  }

  if (typeof dateValue === 'number' && Number.isFinite(dateValue)) {
    // Many XLSX extracts representan fechas como seriales (Excel epoch 1899-12-30)
    const excelEpoch = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
    if (!isNaN(excelEpoch.getTime())) {
      return excelEpoch.toISOString().split('T')[0];
    }
  }

  const str = String(dateValue).trim();
  if (!str || str === 'null' || str === '[object Object]') return null;

  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function parseIncidenciaDate(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split('T')[0];
}

function parseOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseInt(String(value).trim(), 10);
  return Number.isFinite(num) ? num : null;
}

function parseOptionalFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

function sanitizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function normalizeInciCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toUpperCase();
  return cleaned || null;
}

function transformIncidenciaRecord(record: Record<string, unknown>, index: number): IncidenciaSFTP | null {
  const fecha = parseIncidenciaDate(record['Fecha']);
  if (!fecha) {
    return null;
  }

  const turno = parseOptionalInt(record['Turno']);
  const horario = sanitizeString(record['Horario']);
  const incidencia = sanitizeString(record['Incidencia']);
  const entra = sanitizeString(record['Entra']);
  const sale = sanitizeString(record['Sale']);
  const ordinarias = parseOptionalFloat(record['Ordinarias']);
  const numero =
    parseOptionalInt(record['#']) ??
    parseOptionalInt(record['Número']) ??
    parseOptionalInt(record['N?mero']) ??
    null;
  const inci = normalizeInciCode(record['INCI']);
  const status = parseOptionalInt(record['Status']);
  const ubicacion2 = sanitizeString(
    pickField(record, ['Ubicacion2', 'Ubicación2', 'Ubicacion 2', 'Ubicacion'], 'ubicacion2')
  );
  const empParsed =
    parseOptionalInt(record['Número']) ??
    parseOptionalInt(record['N?mero']) ??
    parseOptionalInt(record['Gafete']) ??
    numero;
  const emp = empParsed !== null && empParsed !== undefined ? empParsed : -1 * (index + 1);

  return {
    emp,
    nombre: null,
    fecha,
    turno,
    horario,
    incidencia,
    entra,
    sale,
    ordinarias,
    numero,
    inci,
    status,
    ubicacion2,
  };
}

function buildSftpBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const originHeader = request.headers.get('origin');

  let origin = '';
  if (forwardedHost) {
    const proto = forwardedProto || 'https';
    origin = `${proto}://${forwardedHost}`;
  } else if (originHeader) {
    origin = originHeader;
  } else if (request.nextUrl && request.nextUrl.origin) {
    origin = request.nextUrl.origin;
  }

  const envFallback =
    process.env.INTERNAL_SFTP_API_URL ||
    process.env.INTERNAL_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const fallbackOrigin = envFallback || `http://localhost:${process.env.PORT ?? '3000'}`;
  return origin || fallbackOrigin;
}
