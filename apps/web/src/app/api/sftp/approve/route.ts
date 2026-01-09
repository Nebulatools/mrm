import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/server-auth';
import {
  approveImport,
  updateImportLogStatus,
  saveFileStructure
} from '@/lib/sftp-structure-comparator';
import { sftpClient } from '@/lib/sftp-client';

/**
 * POST /api/sftp/approve
 *
 * Aprueba una importación pendiente y continúa con el proceso de importación.
 * Solo se llama cuando hay cambios estructurales detectados.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const logIdParam = request.nextUrl.searchParams.get('logId');
  if (!logIdParam) {
    return NextResponse.json({
      success: false,
      error: 'Se requiere el parámetro logId'
    }, { status: 400 });
  }

  const logId = parseInt(logIdParam, 10);
  if (isNaN(logId)) {
    return NextResponse.json({
      success: false,
      error: 'logId debe ser un número válido'
    }, { status: 400 });
  }

  try {
    // 1. Marcar la importación como aprobada
    await approveImport(logId, auth.userId || 'admin');
    console.log(`✅ Importación ${logId} aprobada por ${auth.userId}`);

    // 2. Actualizar estado a "en proceso"
    await updateImportLogStatus(logId, 'pending');

    // 3. Ejecutar la importación real (reutilizar la lógica existente)
    // Configurar el cliente SFTP
    const sftpBaseUrl = buildSftpBaseUrl(request);
    sftpClient.setBaseUrl(sftpBaseUrl);
    const cookieHeader = request.headers.get('cookie') ?? undefined;
    if (cookieHeader) {
      sftpClient.setDefaultFetchOptions({ headers: { cookie: cookieHeader } });
    }

    // Obtener archivos y procesar
    const files = await sftpClient.listFiles();

    const results = {
      empleados: 0,
      bajas: 0,
      asistencia: 0,
      incidencias: null as number | null,
      permisos: null as number | null,
      errors: [] as string[]
    };

    // Procesar archivo de empleados
    const empleadosFile = files.find(f => f.name.includes('Validacion Alta') && f.name.includes('empleados'));
    if (empleadosFile) {
      try {
        const empleadosData = await sftpClient.downloadFile(empleadosFile.name);
        if (empleadosData.length > 0) {
          // Guardar la nueva estructura
          await saveFileStructure(empleadosFile.name, 'empleados', Object.keys(empleadosData[0]), empleadosData.length);

          // Transformar y insertar empleados
          const empleadosTransformados = empleadosData.map((record: Record<string, unknown>, index: number) => ({
            numero_empleado: parseInt(String(record['Número'] || record['Gafete'] || (index + 1))),
            apellidos: String(record['Apellidos'] || 'Apellido'),
            nombres: String(record['Nombres'] || 'Nombre'),
            nombre_completo: String(record['Nombre Completo'] || `${record['Nombres']} ${record['Apellidos']}` || `Empleado ${index + 1}`),
            gafete: String(record['Gafete'] || ''),
            fecha_ingreso: parseDate(record['Fecha Ingreso']) || '2024-01-01',
            puesto: String(record['Puesto'] || 'Sin Puesto'),
            departamento: String(record['Departamento'] || 'Sin Departamento'),
            area: String(record['Area'] || 'Sin Area'),
            empresa: String(record['Empresa'] || ''),
            fecha_baja: record['Fecha Baja'] && record['Fecha Baja'] !== 'null' ? parseDate(record['Fecha Baja']) : null,
            activo: String(record['Activo']).toUpperCase() === 'SI' || String(record['Activo']).toUpperCase() === 'TRUE'
          }));

          const batchSize = 50;
          for (let i = 0; i < empleadosTransformados.length; i += batchSize) {
            const batch = empleadosTransformados.slice(i, i + batchSize);
            const { error } = await supabaseAdmin
              .from('empleados_sftp')
              .upsert(batch, { onConflict: 'numero_empleado' });

            if (error) {
              results.errors.push(`Error lote empleados ${Math.floor(i / batchSize) + 1}: ${error.message}`);
            }
          }

          results.empleados = empleadosTransformados.length;
        }
      } catch (error) {
        results.errors.push(`Error empleados: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Procesar archivo de bajas
    const bajasFile = files.find(f => f.name.toLowerCase().includes('motivos') && f.name.toLowerCase().includes('baja'));
    if (bajasFile) {
      try {
        const bajasData = await sftpClient.downloadFile(bajasFile.name);
        if (bajasData.length > 0) {
          // Guardar la nueva estructura
          await saveFileStructure(bajasFile.name, 'bajas', Object.keys(bajasData[0]), bajasData.length);

          const bajasTransformadas = bajasData.map((record: Record<string, unknown>) => ({
            numero_empleado: parseInt(String(record['#'] || record['Numero'] || 1)),
            fecha_baja: parseDate(record['Fecha']) ?? '2024-01-01',
            tipo: String(record['Tipo'] || 'Baja'),
            motivo: String(record['Motivo'] || 'No especificado'),
            descripcion: String(record['Descripción'] || record['Descripcion'] || ''),
            observaciones: String(record['Observaciones'] || '')
          }));

          const { error } = await supabaseAdmin
            .from('motivos_baja')
            .insert(bajasTransformadas);

          if (error) {
            results.errors.push(`Error bajas: ${error.message}`);
          } else {
            results.bajas = bajasTransformadas.length;
          }
        }
      } catch (error) {
        results.errors.push(`Error bajas: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 4. Actualizar el log con los resultados
    await updateImportLogStatus(logId, 'completed', results);

    console.log('✅ Importación completada después de aprobación:', results);

    return NextResponse.json({
      success: true,
      message: 'Importación aprobada y completada',
      results
    });

  } catch (error) {
    console.error('❌ Error en aprobación:', error);

    // Marcar como fallida
    try {
      await updateImportLogStatus(logId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (updateError) {
      console.error('Error actualizando estado de fallo:', updateError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al aprobar importación'
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
      const fullYear = year.length === 2
        ? (parseInt(year) >= 50 ? `19${year}` : `20${year}`)
        : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
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
