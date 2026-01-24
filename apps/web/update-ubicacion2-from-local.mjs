#!/usr/bin/env node
/**
 * Actualizar ubicacion2 desde archivo local a Supabase
 *
 * Este script lee el archivo Excel local con mejor calidad de datos
 * y actualiza la columna ubicacion2 en empleados_sftp por numero_empleado
 */
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno desde .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const filePath = '/Users/jaco/Desktop/proyectos/mrm_simple/parches/parches_nuevos/Validacion Alta de empleados (42).xlsb';

console.log('🚀 Iniciando actualización de ubicacion2...');
console.log('📂 Archivo fuente:', filePath);
console.log('');

// Función para normalizar valores de ubicacion2
function normalizeUbicacion2(value) {
  if (!value || value.trim() === '') return 'SIN UBICACIÓN';

  const upper = value.toUpperCase().trim();

  if (upper === 'CORPO' || upper === 'CORPORATIVO') return 'CORPORATIVO';
  if (upper === 'CAD') return 'CAD';
  if (upper === 'FILIALES' || upper === 'FILIAL') return 'FILIALES';

  return value.trim();
}

try {
  // 1. Leer archivo Excel local
  console.log('📖 Leyendo archivo Excel binario (.xlsb)...');
  const fileBuffer = readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, {
    type: 'buffer',
    bookVBA: true,
    cellFormula: false,
    cellHTML: false
  });

  console.log(`📑 Hojas disponibles: ${workbook.SheetNames.join(', ')}`);

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // Verificar rango de datos
  if (!worksheet['!ref']) {
    throw new Error('El archivo no tiene datos');
  }

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log(`📐 Rango detectado: ${worksheet['!ref']} (${range.e.r + 1} filas x ${range.e.c + 1} columnas)`);

  const data = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: '',
    blankrows: false
  });

  console.log(`✅ Archivo leído: ${data.length} registros`);
  console.log('');

  // 2. Extraer pares (numero_empleado, ubicacion2)
  console.log('🔍 Extrayendo datos de ubicacion2...');
  const updates = data
    .filter(row => row['Ubicacion2'] && row['Número'])
    .map(row => ({
      numero_empleado: parseInt(row['Número']),
      ubicacion2: normalizeUbicacion2(row['Ubicacion2'])
    }))
    .filter(item => !isNaN(item.numero_empleado));

  console.log(`📊 Empleados a actualizar: ${updates.length}`);

  // Mostrar distribución de valores
  const distribucion = {};
  updates.forEach(({ ubicacion2 }) => {
    distribucion[ubicacion2] = (distribucion[ubicacion2] || 0) + 1;
  });

  console.log('');
  console.log('═'.repeat(60));
  console.log('DISTRIBUCIÓN DE VALORES A ACTUALIZAR:');
  console.log('═'.repeat(60));
  Object.entries(distribucion)
    .sort((a, b) => b[1] - a[1])
    .forEach(([valor, cantidad]) => {
      const porcentaje = ((cantidad / updates.length) * 100).toFixed(2);
      console.log(`${valor.padEnd(20)} │ ${cantidad.toString().padStart(4)} empleados │ ${porcentaje.padStart(6)}%`);
    });
  console.log('═'.repeat(60));
  console.log('');

  // 3. Configurar Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('🔗 Conectado a Supabase');
  console.log('');

  // 4. Actualizar en lotes
  console.log('🔄 Iniciando actualización en Supabase...');
  const batchSize = 100;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    // Actualizar uno por uno
    for (const { numero_empleado, ubicacion2 } of batch) {
      const { error } = await supabase
        .from('empleados_sftp')
        .update({ ubicacion2 })
        .eq('numero_empleado', numero_empleado);

      if (error) {
        console.error(`❌ Error actualizando empleado #${numero_empleado}:`, error.message);
        errors++;
      } else {
        updated++;
      }
    }

    const loteNum = Math.floor(i / batchSize) + 1;
    const totalLotes = Math.ceil(updates.length / batchSize);
    console.log(`✅ Lote ${loteNum}/${totalLotes} procesado - Actualizados: ${updated}, Errores: ${errors}`);
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('🎉 ACTUALIZACIÓN COMPLETADA');
  console.log('═'.repeat(60));
  console.log(`✅ Empleados actualizados: ${updated}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📊 Tasa de éxito: ${((updated / updates.length) * 100).toFixed(2)}%`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('🔍 Ejecuta este query para verificar:');
  console.log('');
  console.log('SELECT ubicacion2, COUNT(*) as cantidad');
  console.log('FROM empleados_sftp');
  console.log('GROUP BY ubicacion2');
  console.log('ORDER BY cantidad DESC;');
  console.log('');

} catch (error) {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
}
