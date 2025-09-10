import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper function to safely parse dates
function parseDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  try {
    // Handle different date formats
    let date: Date;
    
    if (typeof dateValue === 'string') {
      // Common formats: DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD
      const cleaned = dateValue.trim();
      
      if (cleaned.includes('/')) {
        // Handle DD/MM/YY or DD/MM/YYYY
        const parts = cleaned.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed
          let year = parseInt(parts[2]);
          
          // Convert 2-digit year to 4-digit
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
          
          date = new Date(year, month, day);
        } else {
          date = new Date(cleaned);
        }
      } else {
        date = new Date(cleaned);
      }
    } else {
      date = new Date(dateValue);
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.log(`⚠️ Invalid date: ${dateValue}`);
      return null;
    }
    
    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.log(`⚠️ Error parsing date: ${dateValue}`, error);
    return null;
  }
}

// FORZAR IMPORTACIÓN REAL SIN CACHÉ
export async function POST(request: NextRequest) {
  console.log('🚀 FORZANDO IMPORTACIÓN REAL DE DATOS SFTP (SIN CACHÉ)...');

  try {
    // ========================================
    // PASO 1: CONECTAR DIRECTAMENTE AL SFTP
    // ========================================
    const sftpResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/sftp?action=list&nocache=true`);
    const sftpFiles = await sftpResponse.json();
    
    console.log('📂 Archivos SFTP reales encontrados:', sftpFiles);

    // ========================================
    // PASO 2: DESCARGAR ARCHIVOS REALES
    // ========================================
    
    // Descargar archivo de empleados (Excel) - DATOS TÉCNICOS
    console.log('📥 Descargando Validacion Alta de empleados.xls...');
    const empleadosResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/sftp?action=download&filename=Validacion%20Alta%20de%20empleados.xls&nocache=true`);
    const empleadosData = await empleadosResponse.json();
    
    console.log('👥 Empleados encontrados:', empleadosData.data?.length || 0);
    console.log('📋 Muestra empleado:', empleadosData.data?.[0]);
    
    // Debug: mostrar todas las columnas del archivo de empleados
    if (empleadosData.data?.[0]) {
      console.log('📊 Columnas en archivo de empleados:', Object.keys(empleadosData.data[0]));
    }

    // Descargar archivo de nómina (CSV) - NOMBRES REALES
    console.log('📥 Descargando Prenomina Horizontal.csv...');
    const nominaResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/sftp?action=download&filename=Prenomina%20Horizontal.csv&nocache=true`);
    const nominaData = await nominaResponse.json();
    
    console.log('👥 Nómina encontrada:', nominaData.data?.length || 0);
    console.log('📋 Muestra nómina:', nominaData.data?.[0]);
    
    // Debug: mostrar todas las columnas del archivo de nómina
    if (nominaData.data?.[0]) {
      console.log('📊 Columnas en archivo de nómina:', Object.keys(nominaData.data[0]));
    }

    // Descargar archivo de bajas (CSV)
    console.log('📥 Descargando MotivosBaja.csv...');
    const bajasResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/sftp?action=download&filename=MotivosBaja.csv&nocache=true`);
    const bajasData = await bajasResponse.json();
    
    console.log('📉 Bajas encontradas:', bajasData.data?.length || 0);
    console.log('📋 Muestra baja:', bajasData.data?.[0]);

    // ========================================
    // PASO 3: COMBINAR Y MAPEAR DATOS REALES
    // ========================================
    
    // Crear mapa de nómina para buscar nombres por número de empleado
    const nominaMap = new Map();
    (nominaData.data || []).forEach((nomina: any, index: number) => {
      // Probar múltiples variaciones de campos para el número
      const numero = String(
        nomina['Número'] || 
        nomina['N?mero'] || 
        nomina['Numero'] ||
        nomina['#'] || 
        nomina['ID'] ||
        nomina['No'] ||
        nomina['Employee ID'] ||
        nomina['Empleado'] ||
        (index + 1) // Usar índice como fallback
      ).trim();
      
      if (numero) {
        console.log(`📋 Mapa entry ${index + 1}: número=${numero}, nombres=${nomina['Nombres'] || nomina['NOMBRES'] || nomina['nombres'] || nomina['Nombre']}, apellidos=${nomina['Apellidos'] || nomina['APELLIDOS'] || nomina['apellidos'] || nomina['Apellido']}`);
        nominaMap.set(numero, nomina);
      }
    });
    
    console.log('🗺️ Mapa de nómina creado con', nominaMap.size, 'registros');
    
    // Debug: mostrar las primeras claves del mapa
    console.log('🔍 Primeras 5 claves del mapa:', Array.from(nominaMap.keys()).slice(0, 5));
    
    const empleadosReales = (empleadosData.data || []).map((emp: any, index: number) => {
      // Probar múltiples variaciones para el número de empleado
      const numero = String(
        emp['Número'] || 
        emp['N?mero'] || 
        emp['Numero'] ||
        emp['#'] ||
        emp['ID'] ||
        emp['No'] ||
        emp['Employee ID'] ||
        emp['Empleado'] ||
        (index + 1)
      ).trim();
      
      // Buscar nombres en el archivo de nómina
      const nominaInfo = nominaMap.get(numero);
      
      // Probar múltiples variaciones para apellidos y nombres
      const apellidos = nominaInfo?.['Apellidos'] || 
                       nominaInfo?.['APELLIDOS'] || 
                       nominaInfo?.['apellidos'] || 
                       nominaInfo?.['Apellido'] || 
                       nominaInfo?.['Last Name'] ||
                       nominaInfo?.['LastName'] ||
                       'Sin Apellidos';
                       
      const nombres = nominaInfo?.['Nombres'] || 
                     nominaInfo?.['NOMBRES'] || 
                     nominaInfo?.['nombres'] || 
                     nominaInfo?.['Nombre'] ||
                     nominaInfo?.['First Name'] ||
                     nominaInfo?.['FirstName'] ||
                     'Sin Nombres';
      
      // Debug log para cada empleado
      if (index < 5) {
        console.log(`👤 Empleado ${index + 1}: número="${numero}", nominaInfo found: ${!!nominaInfo}, nombres: "${nombres}", apellidos: "${apellidos}"`);
        if (nominaInfo) {
          console.log(`📄 Campos disponibles en nómina:`, Object.keys(nominaInfo));
        }
      }
      
      return {
        numero_empleado: parseInt(String(numero)) || (index + 1),
        apellidos: String(apellidos).trim(),
        nombres: String(nombres).trim(),
        nombre_completo: `${nombres} ${apellidos}`.trim(),
        gafete: emp['Gafete'] || numero,
        genero: emp['Género'] || emp['G?nero'] || 'No especificado',
        imss: emp['IMSS'] || '',
        fecha_nacimiento: parseDate(emp['Fecha de Nacimiento']),
        estado: emp['Estado'] || 'No especificado',
        fecha_ingreso: parseDate(emp['Fecha Ingreso']) || '2024-01-01',
        fecha_antiguedad: parseDate(emp['Fecha Antigüedad'] || emp['Fecha Antig?edad']),
        empresa: emp['Empresa'] || 'MOTO TOTAL',
        registro_patronal: emp['No. Registro Patronal'] || '',
        codigo_puesto: emp['CodigoPuesto'] || '',
        puesto: emp['Puesto'] || 'No especificado',
        codigo_depto: emp['Código Depto'] || emp['C?digo Depto'] || '',
        departamento: emp['Departamento'] || 'RH',
        codigo_cc: emp['Código de CC'] || emp['C?digo de CC'] || '',
        cc: emp['CC'] || '',
        subcuenta_cc: emp['Subcuenta CC'] || '',
        clasificacion: emp['Clasificación'] || emp['Clasificaci?n'] || 'No especificado',
        codigo_area: emp['Codigo Area'] || '',
        area: emp['Area'] || emp['Área'] || 'No especificada',
        ubicacion: emp['Ubicación'] || emp['Ubicaci?n'] || 'No especificada',
        tipo_nomina: emp['Tipo de Nómina'] || emp['Tipo de N?mina'] || '',
        turno: emp['Turno'] || '',
        prestacion_ley: emp['Prestación de Ley'] || emp['Prestaci?n de Ley'] || '',
        paquete_prestaciones: emp['Paquete de Prestaciones'] || '',
        fecha_baja: parseDate(emp['Fecha Baja']),
        activo: emp['Activo'] === 'SI' || emp['Activo'] === 'si' || emp['Activo'] === true,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };
    });

    const bajasReales = (bajasData.data || []).map((baja: any, index: number) => {
      return {
        numero_empleado: parseInt(String(baja['#'] || baja['Número'] || baja['N?mero'])) || (index + 1),
        fecha_baja: parseDate(baja['Fecha']) || new Date().toISOString().split('T')[0],
        tipo: baja['Tipo'] || 'Baja',
        motivo: baja['Motivo'] || 'Sin especificar',
        descripcion: baja['Descripción'] || baja['Descripci?n'] || baja['Observaciones'] || '',
        observaciones: baja['Observaciones'] || '',
        fecha_creacion: new Date().toISOString()
      };
    });

    console.log('🔄 Empleados mapeados:', empleadosReales.length);
    console.log('🔄 Bajas mapeadas:', bajasReales.length);

    // ========================================
    // PASO 4: LIMPIAR TABLAS EXISTENTES
    // ========================================
    console.log('🗑️ Limpiando datos existentes...');
    
    await supabaseAdmin.from('empleados_sftp').delete().neq('id', 0);
    await supabaseAdmin.from('motivos_baja').delete().neq('id', 0);

    // ========================================
    // PASO 5: INSERTAR DATOS REALES
    // ========================================
    console.log('💾 Insertando empleados reales...');
    
    // Insertar empleados en lotes
    const BATCH_SIZE = 50;
    let empleadosInsertados = 0;
    
    for (let i = 0; i < empleadosReales.length; i += BATCH_SIZE) {
      const batch = empleadosReales.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabaseAdmin
        .from('empleados_sftp')
        .insert(batch)
        .select();
        
      if (error) {
        console.error(`Error insertando lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        throw error;
      }
      
      empleadosInsertados += data?.length || 0;
      console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1} insertado: ${data?.length} empleados`);
    }

    console.log('💾 Insertando bajas reales...');
    
    // Insertar bajas
    let bajasInsertadas = 0;
    if (bajasReales.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('motivos_baja')
        .insert(bajasReales)
        .select();
        
      if (error) {
        console.error('Error insertando bajas:', error);
        throw error;
      }
      
      bajasInsertadas = data?.length || 0;
      console.log(`✅ Bajas insertadas: ${bajasInsertadas}`);
    }

    // ========================================
    // PASO 6: VERIFICAR INSERCIÓN
    // ========================================
    const { count: totalEmpleados } = await supabaseAdmin
      .from('empleados_sftp')
      .select('*', { count: 'exact', head: true });
      
    const { count: totalBajas } = await supabaseAdmin
      .from('motivos_baja')
      .select('*', { count: 'exact', head: true });

    console.log('✅ IMPORTACIÓN REAL COMPLETADA!');
    console.log(`📊 Total empleados en BD: ${totalEmpleados}`);
    console.log(`📊 Total bajas en BD: ${totalBajas}`);

    return NextResponse.json({ 
      success: true,
      message: 'Importación real de datos SFTP completada exitosamente',
      data: {
        empleados: {
          encontrados: empleadosReales.length,
          insertados: empleadosInsertados,
          total_en_bd: totalEmpleados
        },
        bajas: {
          encontradas: bajasReales.length,
          insertadas: bajasInsertadas,
          total_en_bd: totalBajas
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en importación real:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}