const SftpClient = require('ssh2-sftp-client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Service role para DELETE
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración SFTP
const sftpConfig = {
  host: process.env.SFTP_HOST || '148.244.90.21',
  port: parseInt(process.env.SFTP_PORT || '5062'),
  username: process.env.SFTP_USER || 'rhmrm',
  password: process.env.SFTP_PASSWORD || 'rh12345',
  directory: process.env.SFTP_DIRECTORY || 'ReportesRH'
};

async function importarDatosSFTP() {
  const sftp = new SftpClient();
  console.log('🚀 INICIANDO IMPORTACIÓN DE DATOS REALES SFTP...\n');
  
  try {
    // Conectar al SFTP
    console.log(`🔗 Conectando a SFTP: ${sftpConfig.username}@${sftpConfig.host}:${sftpConfig.port}`);
    await sftp.connect(sftpConfig);
    console.log('✅ Conexión SFTP exitosa\n');

    // Listar archivos
    console.log('📁 Listando archivos CSV...');
    const fileList = await sftp.list(sftpConfig.directory);
    const csvFiles = fileList.filter(file => 
      file.type === '-' && file.name.endsWith('.csv')
    );
    
    console.log(`🔢 Archivos CSV encontrados: ${csvFiles.length}`);
    csvFiles.forEach(file => {
      const size = (file.size / 1024).toFixed(1);
      const modified = new Date(file.modifyTime).toLocaleDateString('es-MX');
      console.log(`  📄 ${file.name} (${size} KB, ${modified})`);
    });

    if (csvFiles.length === 0) {
      console.log('❌ No se encontraron archivos CSV');
      return;
    }

    // Registrar importación en Supabase
    console.log('\n📝 Registrando importación...');
    const { data: importacion, error: importError } = await supabase
      .from('importaciones_sftp')
      .insert({
        archivo: csvFiles.map(f => f.name).join(', '),
        estado: 'iniciado'
      })
      .select()
      .single();

    if (importError) {
      console.error('❌ Error registrando importación:', importError.message);
      return;
    }
    
    console.log(`✅ Importación registrada con ID: ${importacion.id}`);

    let totalEmpleados = 0;
    let totalAsistencias = 0;
    let totalBajas = 0;

    // Procesar cada archivo
    for (const file of csvFiles) {
      console.log(`\n📊 PROCESANDO: ${file.name}`);
      console.log('─'.repeat(60));
      
      try {
        // Descargar archivo
        const filePath = `${sftpConfig.directory}/${file.name}`;
        const fileContent = await sftp.get(filePath);
        const csvText = fileContent.toString('utf8');
        const lines = csvText.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
          console.log('⚠️  Archivo vacío');
          continue;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log(`📋 Headers: ${headers.length} columnas`);
        console.log(`📈 Líneas de datos: ${lines.length - 1}`);
        console.log('🔍 Primeros 5 headers:', headers.slice(0, 5));
        console.log('🔍 Primera línea de datos:', lines[1] ? lines[1].substring(0, 100) + '...' : 'N/A');

        // Limpiar datos existentes antes de la primera importación
        if (file.name.toLowerCase().includes('prenomina')) {
          console.log('🧹 Limpiando datos existentes...');
          
          // Limpiar en orden correcto por foreign keys
          await supabase.from('motivos_baja').delete().neq('id', 0);
          await supabase.from('asistencia_diaria').delete().neq('id', 0);
          await supabase.from('empleados_sftp').delete().neq('id', 0);
          
          console.log('✅ Datos existentes limpiados');
        }

        // Procesar según tipo de archivo
        if (file.name.toLowerCase().includes('prenomina') || 
            file.name.toLowerCase().includes('horizontal')) {
          
          console.log('👥 Procesando datos de empleados y asistencia...');
          const resultado = await procesarPrenomina(lines, headers);
          totalEmpleados += resultado.empleados;
          totalAsistencias += resultado.asistencias;
          
        } else if (file.name.toLowerCase().includes('motivos') || 
                   file.name.toLowerCase().includes('baja')) {
          
          console.log('📋 Procesando motivos de baja...');
          const resultado = await procesarMotivosBaja(lines, headers);
          totalBajas += resultado.bajas;
        }

      } catch (error) {
        console.error(`❌ Error procesando ${file.name}:`, error.message);
      }
    }

    await sftp.end();

    // Actualizar registro de importación
    await supabase
      .from('importaciones_sftp')
      .update({
        registros_exitosos: totalEmpleados + totalAsistencias + totalBajas,
        estado: 'completado'
      })
      .eq('id', importacion.id);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ¡IMPORTACIÓN COMPLETADA EXITOSAMENTE!');
    console.log(`👥 Empleados importados: ${totalEmpleados}`);
    console.log(`📅 Registros de asistencia: ${totalAsistencias}`);
    console.log(`📋 Motivos de baja: ${totalBajas}`);
    console.log(`📊 Total de registros: ${totalEmpleados + totalAsistencias + totalBajas}`);
    console.log('='.repeat(60));

    // Verificar datos importados
    console.log('\n🔍 Verificando datos importados...');
    await verificarDatos();

  } catch (error) {
    console.error('❌ Error en importación:', error.message);
    await sftp.end();
  }
}

async function procesarPrenomina(lines, headers) {
  const empleados = [];
  const asistencias = [];
  
  console.log('🔄 Extrayendo datos de empleados...');
  
  // Procesar cada fila de empleado (todos los empleados)
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (i <= 5 || i % 50 === 0) {
        console.log(`🔍 Fila ${i}: ${values.length} valores vs ${headers.length} headers`);
      }
      
      if (Math.abs(values.length - headers.length) > 1) {
        console.log(`⚠️  Fila ${i}: valores muy diferentes (${values.length} vs ${headers.length})`);
        continue;
      }

      // Estructura real CSV: "4","Beltran Del Rio Lara, Juan Gerardo","01/09/2025",...
      // Col[0]=Número, Col[1]=Apellidos+Nombres, Col[2]=LUN fecha, etc.
      const numeroEmpleado = parseInt(values[0]);
      const nombreCompleto = values[1] || '';

      if (!numeroEmpleado || !nombreCompleto) {
        continue;
      }

      // Separar apellidos y nombres del formato "Apellidos, Nombres"
      let apellidos = '';
      let nombres = '';
      
      if (nombreCompleto.includes(', ')) {
        const partes = nombreCompleto.split(', ');
        apellidos = partes[0].trim();
        nombres = partes[1].trim();
      } else {
        // Si no hay coma, usar la primera parte como nombres y el resto como apellidos
        const palabras = nombreCompleto.trim().split(' ');
        if (palabras.length >= 2) {
          nombres = palabras[0];
          apellidos = palabras.slice(1).join(' ');
        } else {
          apellidos = nombreCompleto.trim();
          nombres = 'N/A';
        }
      }

      // Agregar empleado (evitar duplicados)
      if (!empleados.find(e => e.numero_empleado === numeroEmpleado)) {
        empleados.push({
          numero_empleado: numeroEmpleado,
          apellidos,
          nombres
        });
      }

      // Procesar asistencia - Estructura según análisis real:
      // LUN: Col[2]=fecha, Col[3]=horas, Col[4]=incidencia
      // MAR: Col[6]=fecha, Col[7]=horas, Col[8]=incidencia, etc.
      const diasInfo = [
        { dia: 'LUN', fechaIndex: 2, horasIndex: 3, incIndex: 4 },
        { dia: 'MAR', fechaIndex: 6, horasIndex: 7, incIndex: 8 },
        { dia: 'MIE', fechaIndex: 10, horasIndex: 11, incIndex: 12 },
        { dia: 'JUE', fechaIndex: 14, horasIndex: 15, incIndex: 16 },
        { dia: 'VIE', fechaIndex: 18, horasIndex: 19, incIndex: 20 },
        { dia: 'SAB', fechaIndex: 22, horasIndex: 23, incIndex: 24 },
        { dia: 'DOM', fechaIndex: 26, horasIndex: 27, incIndex: 28 }
      ];
      
      for (const { dia, fechaIndex, horasIndex, incIndex } of diasInfo) {
        const fechaStr = values[fechaIndex] || '';
        const horasStr = values[horasIndex] || '0';
        const incidenciaStr = values[incIndex] || '0';
        
        if (fechaStr && fechaStr.includes('/')) {
          try {
            // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD
            const [day, month, year] = fechaStr.split('/');
            const fecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            
            const horas = Math.min(parseFloat(horasStr) || 0, 24); // Máximo 24 horas
            const incidencia = Math.min(parseFloat(incidenciaStr) || 0, 24); // Máximo 24 horas

            asistencias.push({
              numero_empleado: numeroEmpleado,
              fecha,
              dia_semana: dia,
              horas_trabajadas: horas,
              horas_incidencia: incidencia
            });
          } catch (error) {
            console.warn(`⚠️  Error procesando fecha ${fechaStr} para empleado ${numeroEmpleado}:`, error.message);
          }
        }
      }

    } catch (error) {
      console.warn(`⚠️  Error en fila ${i}:`, error.message);
    }
  }

  console.log(`🔍 Empleados extraídos: ${empleados.length}`);
  if (empleados.length > 0) {
    console.log('📄 Muestra de empleados:');
    empleados.slice(0, 3).forEach((emp, i) => {
      console.log(`  ${i+1}. ${emp.numero_empleado} - ${emp.nombres} ${emp.apellidos}`);
    });
  }

  // Insertar empleados
  if (empleados.length > 0) {
    console.log(`👥 Insertando ${empleados.length} empleados...`);
    const { error: empleadosError } = await supabase
      .from('empleados_sftp')
      .insert(empleados);

    if (empleadosError) {
      console.error('❌ Error insertando empleados:', empleadosError.message);
      console.error('📋 Detalle del error:', empleadosError);
      return { empleados: 0, asistencias: 0 };
    }
    console.log('✅ Empleados insertados exitosamente');
  } else {
    console.log('⚠️  No se extrajeron empleados del archivo');
  }

  // Insertar asistencias
  if (asistencias.length > 0) {
    console.log(`📅 Insertando ${asistencias.length} registros de asistencia...`);
    const { error: asistenciaError } = await supabase
      .from('asistencia_diaria')
      .insert(asistencias);

    if (asistenciaError) {
      console.error('❌ Error insertando asistencias:', asistenciaError.message);
      return { empleados: empleados.length, asistencias: 0 };
    }
    console.log('✅ Asistencias insertadas exitosamente');
  }

  return { empleados: empleados.length, asistencias: asistencias.length };
}

async function procesarMotivosBaja(lines, headers) {
  const motivos = [];
  
  console.log('🔄 Extrayendo motivos de baja...');
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

      const fecha = values[0] || '';
      const numeroEmpleado = parseInt(values[1]) || 0;
      const tipo = values[2] || '';
      const motivo = values[3] || '';
      const descripcion = values[4] || '';
      const observaciones = values[5] || '';

      if (!numeroEmpleado || !fecha || !tipo || !motivo) {
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

    } catch (error) {
      console.warn(`⚠️  Error en fila ${i}:`, error.message);
    }
  }

  // Insertar motivos de baja
  if (motivos.length > 0) {
    console.log(`📤 Insertando ${motivos.length} motivos de baja...`);
    const { error } = await supabase
      .from('motivos_baja')
      .insert(motivos);

    if (error) {
      console.error('❌ Error insertando motivos de baja:', error.message);
      return { bajas: 0 };
    }
    console.log('✅ Motivos de baja insertados exitosamente');
  }

  return { bajas: motivos.length };
}

async function verificarDatos() {
  try {
    // Verificar empleados
    const { data: empleados, error: empError } = await supabase
      .from('empleados_sftp')
      .select('count(*)', { count: 'exact' });

    // Verificar asistencias
    const { data: asistencias, error: astError } = await supabase
      .from('asistencia_diaria')
      .select('count(*)', { count: 'exact' });

    // Verificar bajas
    const { data: bajas, error: bajError } = await supabase
      .from('motivos_baja')
      .select('count(*)', { count: 'exact' });

    // Verificar vistas de compatibilidad
    const { data: plantilla, error: plantError } = await supabase
      .from('plantilla')
      .select('count(*)', { count: 'exact' });

    const { data: act, error: actError } = await supabase
      .from('act')
      .select('count(*)', { count: 'exact' });

    const { data: incidencias, error: incError } = await supabase
      .from('incidencias')
      .select('count(*)', { count: 'exact' });

    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`  empleados_sftp: ${empleados?.count || 0} registros`);
    console.log(`  asistencia_diaria: ${asistencias?.count || 0} registros`);
    console.log(`  motivos_baja: ${bajas?.count || 0} registros`);
    console.log('\n🔄 VISTAS DE COMPATIBILIDAD:');
    console.log(`  plantilla: ${plantilla?.count || 0} registros`);
    console.log(`  act: ${act?.count || 0} registros`);
    console.log(`  incidencias: ${incidencias?.count || 0} registros`);

    if (empError || astError || bajError || plantError || actError || incError) {
      console.log('\n⚠️  Algunos errores en verificación, pero datos principales importados');
    }

  } catch (error) {
    console.error('❌ Error verificando datos:', error.message);
  }
}

// Ejecutar importación
importarDatosSFTP();