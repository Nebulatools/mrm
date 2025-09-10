import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sftpClient } from '@/lib/sftp-client';

interface EmpleadoSFTP {
  numero_empleado: number;
  apellidos: string;
  nombres: string;
  nombre_completo: string;
  gafete?: string;
  genero?: string;
  imss?: string;
  fecha_nacimiento?: string;
  estado?: string;
  fecha_ingreso: string;
  fecha_antiguedad?: string;
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

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando importación real de datos SFTP...');
    
    // 1. Obtener lista de archivos del SFTP
    const files = await sftpClient.listFiles();
    console.log(`📁 Archivos encontrados:`, files.map(f => f.name));
    
    const results = {
      empleados: 0,
      bajas: 0,
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
          const empleadosTransformados: EmpleadoSFTP[] = empleadosData.map((record: any, index: number) => {
            
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
              clasificacion: String(record['Clasificación'] || ''),
              codigo_area: String(record['Codigo Area'] || ''),
              area: String(record['Area'] || 'Sin Area'),
              ubicacion: String(record['Ubicación'] || ''),
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
          
          // Limpiar tabla y insertar datos
          console.log('🗑️ Limpiando tabla empleados_sftp...');
          await supabaseAdmin.from('empleados_sftp').delete().neq('id', 0);
          
          // Insertar en lotes de 50
          const batchSize = 50;
          for (let i = 0; i < empleadosTransformados.length; i += batchSize) {
            const batch = empleadosTransformados.slice(i, i + batchSize);
            
            const { error } = await supabaseAdmin
              .from('empleados_sftp')
              .insert(batch);
              
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
          const bajasTransformadas: MotivoBaja[] = bajasData.map((record: any) => {
            // Parsear fecha de baja
            let fechaBaja = '2024-01-01'; // Default
            if (record['Fecha']) {
              try {
                const fecha = new Date(record['Fecha']);
                fechaBaja = fecha.toISOString().split('T')[0];
              } catch (e) {
                console.warn('Error parseando fecha de baja:', e);
              }
            }
            
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
          
          // Limpiar tabla y insertar datos
          console.log('🗑️ Limpiando tabla motivos_baja...');
          await supabaseAdmin.from('motivos_baja').delete().neq('id', 0);
          
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

    console.log('✅ Importación de datos SFTP completada!');
    console.log(`📊 Resultados finales - Empleados: ${results.empleados}, Bajas: ${results.bajas}`);
    
    return NextResponse.json({
      success: true,
      message: 'Importación de datos SFTP completada',
      results
    });

  } catch (error) {
    console.error('❌ Error en importación SFTP:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function para parsear fechas
function parseDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === 'null') return null;
  
  try {
    const str = String(dateStr);
    if (str.includes('/')) {
      const [day, month, year] = str.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
}