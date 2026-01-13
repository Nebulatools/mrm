/**
 * Script para generar SQL de inserción desde CSVs de parches
 * Genera: motivos_baja_2025.sql y incidencias_2025.sql
 */

const fs = require('fs');
const path = require('path');

// Mapeo de meses en español a números
const mesesMap = {
  'Ene': '01', 'Feb': '02', 'Mar': '03', 'Abr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dic': '12'
};

// Convertir fecha dd/Mes/yyyy a yyyy-mm-dd
function convertirFecha(fechaStr) {
  if (!fechaStr || fechaStr.trim() === '') return null;

  // Formato: 06/Ene/2025
  const partes = fechaStr.trim().split('/');
  if (partes.length !== 3) return null;

  const dia = partes[0].padStart(2, '0');
  const mes = mesesMap[partes[1]] || partes[1];
  const anio = partes[2];

  return `${anio}-${mes}-${dia}`;
}

// Convertir fecha dd/mm/yyyy a yyyy-mm-dd
function convertirFechaDDMMYYYY(fechaStr) {
  if (!fechaStr || fechaStr.trim() === '') return null;

  const partes = fechaStr.trim().split('/');
  if (partes.length !== 3) return null;

  const dia = partes[0].padStart(2, '0');
  const mes = partes[1].padStart(2, '0');
  const anio = partes[2];

  return `${anio}-${mes}-${dia}`;
}

// Escapar strings para SQL
function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").trim();
}

// Parsear CSV con campos entre comillas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Parsear Motivos de Baja CSV
function parsearMotivosBaja() {
  const csvPath = path.join(__dirname, 'Motivos Bajas (1).csv');
  const content = fs.readFileSync(csvPath, 'latin1');
  const lines = content.split('\n');

  const inserts = [];

  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parsear correctamente considerando comillas
    const campos = parseCSVLine(line);

    // Verificar que tengamos datos válidos
    // Formato: ,Fecha,#,Nombre,Tipo,Motivo,Descripción,Observaciones,
    if (campos.length < 7) continue;

    const fecha = campos[1]?.trim();
    const numeroEmpleado = campos[2]?.trim();
    // Campo 3 es nombre (no lo usamos)
    const tipo = campos[4]?.trim();
    const motivo = campos[5]?.trim();
    const descripcion = campos[6]?.trim() || '';
    const observaciones = campos[7]?.trim() || '';

    // Validar campos requeridos
    if (!fecha || !numeroEmpleado || isNaN(parseInt(numeroEmpleado))) continue;
    if (!tipo || tipo === '' || numeroEmpleado === '236') continue; // Skip totales

    const fechaConvertida = convertirFecha(fecha);
    if (!fechaConvertida) continue;

    // Solo incluir datos de 2025
    if (!fechaConvertida.startsWith('2025')) continue;

    inserts.push({
      numero_empleado: parseInt(numeroEmpleado),
      fecha_baja: fechaConvertida,
      tipo: escapeSql(tipo),
      motivo: escapeSql(motivo),
      descripcion: escapeSql(descripcion),
      observaciones: escapeSql(observaciones)
    });
  }

  return inserts;
}

// Parsear Incidencias CSV (formato agrupado por empleado)
// La tabla incidencias tiene: emp, nombre, fecha, turno, horario, incidencia, entra, sale, numero, inci, status, ordinarias, ubicacion2
function parsearIncidencias() {
  const csvPath = path.join(__dirname, 'ME 5. Incidencias FI FJ SUS PSG PCG INC VAC (2).csv');
  const content = fs.readFileSync(csvPath, 'latin1');
  const lines = content.split('\n');

  const incidencias = [];
  let empleadoActual = null;
  let nombreActual = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Usar parseCSVLine para manejar comillas correctamente
    const campos = parseCSVLine(line);

    // Detectar línea de encabezado de empleado: Empleado:,,16,Nombre,"Rodriguez Gonzalez, Ricardo Arturo"
    if (campos[0]?.trim() === 'Empleado:') {
      empleadoActual = parseInt(campos[2]?.trim());
      nombreActual = campos[4]?.trim() || '';
      continue;
    }

    // Línea de datos de incidencia (empieza vacío y tiene fecha)
    // Formato: ,Fecha,Turno,,Horario,Incidencia,,Entra,Sale,Ordinarias,#,INCI,Status,,
    if (campos[0]?.trim() === '' && campos[1]?.trim() && empleadoActual) {
      const fecha = campos[1]?.trim();
      const turno = parseInt(campos[2]?.trim()) || null;
      const horario = campos[4]?.trim() || null;
      const incidenciaDesc = campos[5]?.trim() || null;
      const entra = campos[7]?.trim() || null;
      const sale = campos[8]?.trim() || null;
      const ordinarias = parseFloat(campos[9]?.trim()) || 0;
      const numero = parseInt(campos[10]?.trim()) || 1;
      const tipoInci = campos[11]?.trim() || null;
      const status = parseInt(campos[12]?.trim()) || null;

      // Validar fecha
      const fechaConvertida = convertirFechaDDMMYYYY(fecha);
      if (!fechaConvertida) continue;

      // Solo incluir datos de 2025
      if (!fechaConvertida.startsWith('2025')) continue;

      // FILTRO IMPORTANTE: Solo Ene-Jun 2025 (Jul-Dic ya están en Supabase)
      const mes = parseInt(fechaConvertida.substring(5, 7));
      if (mes > 6) continue; // Saltar Jul-Dic

      // Convertir hora a formato time
      const entraTime = entra && entra.includes(':') ? entra : null;
      const saleTime = sale && sale.includes(':') ? sale : null;

      incidencias.push({
        emp: empleadoActual,
        nombre: nombreActual,
        fecha: fechaConvertida,
        turno: turno,
        horario: horario,
        incidencia: incidenciaDesc,
        entra: entraTime,
        sale: saleTime,
        ordinarias: ordinarias,
        numero: numero,
        inci: tipoInci,
        status: status,
        ubicacion2: null // No disponible en el CSV
      });
    }
  }

  return incidencias;
}

// Obtener día de la semana
function obtenerDiaSemana(fechaStr) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const fecha = new Date(fechaStr + 'T12:00:00');
  return dias[fecha.getDay()];
}

// Generar SQL para motivos_baja
function generarSqlMotivosBaja(datos) {
  let sql = `-- SQL de inserción para motivos_baja - Datos 2025
-- Generado automáticamente el ${new Date().toISOString()}
-- Total de registros: ${datos.length}

-- Limpiar datos existentes de 2025 (opcional, descomentar si es necesario)
-- DELETE FROM motivos_baja WHERE fecha_baja >= '2025-01-01' AND fecha_baja <= '2025-12-31';

INSERT INTO motivos_baja (numero_empleado, fecha_baja, tipo, motivo, descripcion, observaciones)
VALUES
`;

  const values = datos.map(d =>
    `  (${d.numero_empleado}, '${d.fecha_baja}', '${d.tipo}', '${d.motivo}', '${d.descripcion}', '${d.observaciones}')`
  );

  sql += values.join(',\n');
  sql += '\nON CONFLICT DO NOTHING;\n';

  // Agregar estadísticas por mes
  sql += `\n-- Estadísticas por mes:\n`;
  const porMes = {};
  datos.forEach(d => {
    const mes = d.fecha_baja.substring(0, 7);
    porMes[mes] = (porMes[mes] || 0) + 1;
  });
  Object.entries(porMes).sort().forEach(([mes, count]) => {
    sql += `-- ${mes}: ${count} bajas\n`;
  });

  return sql;
}

// Generar SQL para tabla incidencias (estructura real de Supabase)
function generarSqlIncidencias(datos) {
  let sql = `-- SQL de inserción para incidencias - SOLO Ene-Jun 2025
-- (Jul-Dic 2025 ya están en Supabase)
-- Generado automáticamente el ${new Date().toISOString()}
-- Total de registros: ${datos.length}

-- IMPORTANTE: Este parche solo contiene Enero-Junio 2025
-- Los datos de Julio-Diciembre 2025 ya existen en Supabase

`;

  if (datos.length === 0) {
    sql += `-- ⚠️ NO HAY REGISTROS PARA INSERTAR\n`;
    sql += `-- El CSV no contiene datos de Ene-Jun 2025\n`;
    return sql;
  }

  // Dividir en lotes de 200 para evitar problemas con inserts muy grandes
  const loteSize = 200;
  for (let i = 0; i < datos.length; i += loteSize) {
    const lote = datos.slice(i, i + loteSize);

    sql += `-- Lote ${Math.floor(i/loteSize) + 1} de ${Math.ceil(datos.length/loteSize)}\n`;
    sql += `INSERT INTO incidencias (emp, nombre, fecha, turno, horario, incidencia, entra, sale, ordinarias, numero, inci, status, ubicacion2)
VALUES
`;

    const values = lote.map(d => {
      const nombre = d.nombre ? `'${escapeSql(d.nombre)}'` : 'NULL';
      const turno = d.turno !== null ? d.turno : 'NULL';
      const horario = d.horario ? `'${escapeSql(d.horario)}'` : 'NULL';
      const incidencia = d.incidencia ? `'${escapeSql(d.incidencia)}'` : 'NULL';
      const entra = d.entra ? `'${d.entra}'` : 'NULL';
      const sale = d.sale ? `'${d.sale}'` : 'NULL';
      const inci = d.inci ? `'${escapeSql(d.inci)}'` : 'NULL';
      const status = d.status !== null ? d.status : 'NULL';
      const ubicacion2 = d.ubicacion2 ? `'${escapeSql(d.ubicacion2)}'` : 'NULL';

      return `  (${d.emp}, ${nombre}, '${d.fecha}', ${turno}, ${horario}, ${incidencia}, ${entra}, ${sale}, ${d.ordinarias}, ${d.numero}, ${inci}, ${status}, ${ubicacion2})`;
    });

    sql += values.join(',\n');
    sql += ';\n\n';
  }

  // Agregar estadísticas
  sql += `\n-- Estadísticas por mes:\n`;
  const porMes = {};
  const porTipo = {};
  datos.forEach(d => {
    const mes = d.fecha.substring(0, 7);
    porMes[mes] = (porMes[mes] || 0) + 1;
    if (d.inci) porTipo[d.inci] = (porTipo[d.inci] || 0) + 1;
  });

  Object.entries(porMes).sort().forEach(([mes, count]) => {
    sql += `-- ${mes}: ${count} incidencias\n`;
  });

  sql += `\n-- Por tipo de incidencia (inci):\n`;
  Object.entries(porTipo).sort((a,b) => b[1] - a[1]).forEach(([tipo, count]) => {
    sql += `-- ${tipo}: ${count}\n`;
  });

  return sql;
}

// Main
console.log('🔄 Parseando archivos CSV...\n');

console.log('📊 Procesando Motivos de Baja...');
const motivosBaja = parsearMotivosBaja();
console.log(`   ✅ ${motivosBaja.length} registros de bajas encontrados\n`);

console.log('📊 Procesando Incidencias...');
const incidencias = parsearIncidencias();
console.log(`   ✅ ${incidencias.length} registros de incidencias encontrados\n`);

console.log('📝 Generando archivos SQL...\n');

// Generar y guardar SQL de motivos_baja
const sqlMotivosBaja = generarSqlMotivosBaja(motivosBaja);
fs.writeFileSync(path.join(__dirname, 'motivos_baja_2025.sql'), sqlMotivosBaja);
console.log('   ✅ motivos_baja_2025.sql generado');

// Generar y guardar SQL de incidencias
const sqlIncidencias = generarSqlIncidencias(incidencias);
fs.writeFileSync(path.join(__dirname, 'incidencias_2025.sql'), sqlIncidencias);
console.log('   ✅ incidencias_2025.sql generado');

console.log('\n✨ Proceso completado!');
console.log('\nPara aplicar los parches en Supabase:');
console.log('1. Abrir Supabase Dashboard > SQL Editor');
console.log('2. Ejecutar primero: motivos_baja_2025.sql');
console.log('3. Ejecutar después: incidencias_2025.sql');
