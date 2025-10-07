const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno desde .env.local
const envPath = '/Users/jaco/Desktop/proyectos/mrm_simple/apps/web/.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Falta configuración de Supabase en .env.local');
  console.log('URL:', supabaseUrl ? '✅' : '❌');
  console.log('Key:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para parsear fechas en formato "8-Jan-25"
function parseDate(dateStr) {
  if (!dateStr || dateStr === '0') return null;

  try {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    // Formato: "8-Jan-25"
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    let year = parseInt(parts[2]);

    // Convertir año de 2 dígitos a 4
    year = year < 50 ? 2000 + year : 1900 + year;

    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  } catch (error) {
    console.log(`⚠️ Error parseando fecha: ${dateStr}`);
    return null;
  }
}

// Función para parsear tiempo "HH:MM"
function parseTime(timeStr) {
  if (!timeStr || timeStr === '0' || timeStr.trim() === '') return null;
  // Ya viene en formato correcto generalmente
  return timeStr;
}

async function importIncidencias() {
  console.log('📂 Leyendo archivo incidencias1.csv...');

  const csvContent = fs.readFileSync('/Users/jaco/Desktop/proyectos/mrm_simple/incidencias1.csv', 'utf-8');
  const lines = csvContent.split('\n');

  // Saltar las primeras 2 líneas (Table 1 y header)
  const dataLines = lines.slice(2).filter(line => line.trim() !== '');

  console.log(`📊 Encontradas ${dataLines.length} incidencias para importar`);

  const incidencias = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];

    // Parsear CSV manualmente (respetando comillas)
    const columns = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim()); // Último campo

    if (columns.length < 12) continue; // Línea inválida

    const [emp, nombre, fecha, turno, horario, incidencia, entra, sale, ordinarias, numero, inci, status] = columns;

    const empNum = parseInt(emp);
    if (isNaN(empNum) || empNum === 0) continue; // Saltar registros inválidos

    const fechaParsed = parseDate(fecha);
    if (!fechaParsed) continue; // Saltar si la fecha no se puede parsear

    incidencias.push({
      emp: empNum,
      nombre: nombre === '0' ? null : nombre,
      fecha: fechaParsed,
      turno: turno && turno !== '0' ? parseInt(turno) : null,
      horario: horario || null,
      incidencia: incidencia || null,
      entra: parseTime(entra),
      sale: parseTime(sale),
      ordinarias: ordinarias && ordinarias !== '0' ? parseFloat(ordinarias) : 0,
      numero: numero && numero !== '0' ? parseInt(numero) : null,
      inci: inci || null,
      status: status && status !== '0' ? parseInt(status) : null
    });
  }

  console.log(`✅ Procesadas ${incidencias.length} incidencias válidas`);

  // Limpiar tabla antes de insertar
  console.log('🗑️ Limpiando tabla incidencias...');
  const { error: deleteError } = await supabase
    .from('incidencias')
    .delete()
    .neq('id', 0);

  if (deleteError) {
    console.error('❌ Error limpiando tabla:', deleteError);
  } else {
    console.log('✅ Tabla limpiada');
  }

  // Insertar en lotes de 1000
  const BATCH_SIZE = 1000;
  let insertados = 0;

  for (let i = 0; i < incidencias.length; i += BATCH_SIZE) {
    const batch = incidencias.slice(i, i + BATCH_SIZE);

    console.log(`💾 Insertando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(incidencias.length/BATCH_SIZE)} (${batch.length} registros)...`);

    const { data, error } = await supabase
      .from('incidencias')
      .insert(batch)
      .select();

    if (error) {
      console.error(`❌ Error en lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
    } else {
      insertados += data?.length || 0;
      console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1} completado: ${data?.length} registros`);
    }
  }

  console.log(`\n🎉 IMPORTACIÓN COMPLETADA!`);
  console.log(`📊 Total insertado: ${insertados} incidencias`);

  // Verificar
  const { count } = await supabase
    .from('incidencias')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Total en BD: ${count} registros`);
}

importIncidencias().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
