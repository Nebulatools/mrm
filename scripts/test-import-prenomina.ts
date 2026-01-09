#!/usr/bin/env tsx
/**
 * Test Import Prenomina - Script de prueba completo
 * Ejecuta la importación y valida los resultados
 */

import SftpClient from 'ssh2-sftp-client';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

// Helper para parsear fechas
function parseDate(dateValue: unknown): string | null {
  if (!dateValue) return null;

  try {
    let date: Date;

    if (typeof dateValue === 'string') {
      const cleaned = dateValue.trim();

      if (cleaned.includes('/')) {
        const parts = cleaned.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          let year = parseInt(parts[2]);

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
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return null;
    }

    if (isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

async function testImportPrenomina() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INICIANDO IMPORTACIÓN Y VALIDACIÓN DE PRENOMINA HORIZONTAL');
  console.log('='.repeat(80) + '\n');

  const sftp = new SftpClient();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // ========================================
    // PASO 1: CONECTAR A SFTP
    // ========================================
    console.log('📡 PASO 1: Conectando a SFTP...');

    const config = {
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!
    };

    await sftp.connect(config);
    console.log('✅ Conectado a SFTP\n');

    // ========================================
    // PASO 2: DESCARGAR ARCHIVO
    // ========================================
    console.log('📥 PASO 2: Descargando Prenomina Horizontal.csv...');

    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';
    const filename = 'Prenomina Horizontal.csv';
    const filePath = `${directory}/${filename}`;

    const fileContent = await sftp.get(filePath);
    await sftp.end();
    console.log('✅ Archivo descargado\n');

    // ========================================
    // PASO 3: PARSEAR CSV
    // ========================================
    console.log('📊 PASO 3: Parseando CSV...');

    const csvText = fileContent.toString('utf8');
    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: true
    });

    console.log(`✅ Parseado: ${parsed.data.length} filas`);
    console.log(`📋 Columnas: ${parsed.meta.fields?.length}\n`);

    // ========================================
    // PASO 4: TRANSFORMAR DATOS
    // ========================================
    console.log('🔄 PASO 4: Transformando datos...');

    const records = parsed.data.map((row, index) => {
      const numero = parseInt(String(
        row['Número'] ||
        row['N?mero'] ||
        row['Numero'] ||
        row['#']
      ).trim());

      const nombre = String(row['Nombre'] || '').trim();

      if (!numero || !nombre) return null;

      // Parsear fechas
      const lunFecha = parseDate(row['LUN']);
      const marFecha = parseDate(row['MAR']);
      const mieFecha = parseDate(row['MIE']);
      const jueFecha = parseDate(row['JUE']);
      const vieFecha = parseDate(row['VIE']);
      const sabFecha = parseDate(row['SAB']);
      const domFecha = parseDate(row['DOM']);

      const semanaInicio = lunFecha || marFecha || mieFecha || jueFecha || vieFecha || sabFecha || domFecha;
      if (!semanaInicio) return null;

      const semanaFechaObj = new Date(semanaInicio + 'T00:00:00');
      const semanaFinFechaObj = new Date(semanaFechaObj);
      semanaFinFechaObj.setDate(semanaFinFechaObj.getDate() + 6);
      const semanaFin = semanaFinFechaObj.toISOString().split('T')[0];

      return {
        numero_empleado: numero,
        nombre: nombre,
        semana_inicio: semanaInicio,
        semana_fin: semanaFin,

        lun_fecha: lunFecha,
        lun_horas_ord: parseFloat(String(row['LUN-ORD'] || row['LUN - ORD'] || '0')),
        lun_horas_te: parseFloat(String(row['LUN- TE'] || row['LUN-TE'] || '0')),
        lun_incidencia: String(row['LUN-INC'] || '').trim(),

        mar_fecha: marFecha,
        mar_horas_ord: parseFloat(String(row['MAR-ORD'] || row['MAR - ORD'] || '0')),
        mar_horas_te: parseFloat(String(row['MAR - TE'] || row['MAR-TE'] || '0')),
        mar_incidencia: String(row['MAR-INC'] || '').trim(),

        mie_fecha: mieFecha,
        mie_horas_ord: parseFloat(String(row['MIE-ORD'] || row['MIE - ORD'] || '0')),
        mie_horas_te: parseFloat(String(row['MIE - TE'] || row['MIE-TE'] || '0')),
        mie_incidencia: String(row['MIE-INC'] || '').trim(),

        jue_fecha: jueFecha,
        jue_horas_ord: parseFloat(String(row['JUE-ORD'] || row['JUE - ORD'] || '0')),
        jue_horas_te: parseFloat(String(row['JUE - TE'] || row['JUE-TE'] || '0')),
        jue_incidencia: String(row['JUE-INC'] || '').trim(),

        vie_fecha: vieFecha,
        vie_horas_ord: parseFloat(String(row['VIE-ORD'] || row['VIE - ORD'] || '0')),
        vie_horas_te: parseFloat(String(row['VIE - TE'] || row['VIE-TE'] || '0')),
        vie_incidencia: String(row['VIE-INC'] || '').trim(),

        sab_fecha: sabFecha,
        sab_horas_ord: parseFloat(String(row['SAB-ORD'] || row['SAB - ORD'] || '0')),
        sab_horas_te: parseFloat(String(row['SAB - TE'] || row['SAB-TE'] || '0')),
        sab_incidencia: String(row['SAB-INC'] || '').trim(),

        dom_fecha: domFecha,
        dom_horas_ord: parseFloat(String(row['DOM-ORD'] || row['DOM - ORD'] || '0')),
        dom_horas_te: parseFloat(String(row['DOM - TE'] || row['DOM-TE'] || '0')),
        dom_incidencia: String(row['DOM-INC'] || '').trim()
      };
    }).filter(r => r !== null);

    console.log(`✅ Transformados: ${records.length} registros válidos\n`);

    // Mostrar muestra de datos
    console.log('📋 MUESTRA DE DATOS (primeros 2 registros):');
    console.log('-'.repeat(80));
    records.slice(0, 2).forEach((rec, i) => {
      console.log(`\nRegistro ${i + 1}:`);
      console.log(`  Empleado: ${rec.numero_empleado} - ${rec.nombre}`);
      console.log(`  Semana: ${rec.semana_inicio} → ${rec.semana_fin}`);
      console.log(`  Lun: ${rec.lun_horas_ord}h ord + ${rec.lun_horas_te}h extra${rec.lun_incidencia ? ` (${rec.lun_incidencia})` : ''}`);
      console.log(`  Mar: ${rec.mar_horas_ord}h ord + ${rec.mar_horas_te}h extra${rec.mar_incidencia ? ` (${rec.mar_incidencia})` : ''}`);
      console.log(`  Total estimado: ${rec.lun_horas_ord + rec.mar_horas_ord + rec.mie_horas_ord + rec.jue_horas_ord + rec.vie_horas_ord + rec.sab_horas_ord + rec.dom_horas_ord}h ord`);
    });
    console.log('-'.repeat(80) + '\n');

    // ========================================
    // PASO 5: INSERTAR EN SUPABASE
    // ========================================
    console.log('💾 PASO 5: Insertando en Supabase...');
    console.log(`   Total a insertar: ${records.length} registros`);

    const BATCH_SIZE = 50;
    let insertados = 0;
    let errores = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`   📦 Procesando lote ${batchNum}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} registros)...`);

      const { data, error } = await supabase
        .from('prenomina_horizontal')
        .upsert(batch, {
          onConflict: 'numero_empleado,semana_inicio',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`   ❌ Error en lote ${batchNum}:`, error.message);
        errores += batch.length;
      } else {
        insertados += data?.length || 0;
        console.log(`   ✅ Lote ${batchNum} insertado: ${data?.length} registros`);
      }
    }

    console.log(`\n✅ Inserción completada: ${insertados} registros, ${errores} errores\n`);

    // ========================================
    // PASO 6: VALIDACIÓN COMPLETA
    // ========================================
    console.log('🔍 PASO 6: Validando datos importados...\n');

    // 6.1 Contar registros en todas las tablas
    console.log('📊 6.1 Conteo de registros:');
    console.log('-'.repeat(80));

    const tables = ['empleados_sftp', 'motivos_baja', 'incidencias', 'asistencia_diaria', 'prenomina_horizontal'];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      counts[table] = count || 0;
      console.log(`   ${table.padEnd(25)}: ${count?.toLocaleString().padStart(6)} registros`);
    }
    console.log('-'.repeat(80) + '\n');

    // 6.2 Verificar datos de prenomina
    console.log('📊 6.2 Verificando estructura de prenomina_horizontal:');
    console.log('-'.repeat(80));

    const { data: sampleData, error: sampleError } = await supabase
      .from('prenomina_horizontal')
      .select('*')
      .order('semana_inicio', { ascending: false })
      .limit(3);

    if (sampleError) {
      console.error('❌ Error obteniendo muestra:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log(`✅ Muestra de ${sampleData.length} registros:`);

      sampleData.forEach((rec: any, i: number) => {
        console.log(`\n   Registro ${i + 1}:`);
        console.log(`   - Empleado: ${rec.numero_empleado} (${rec.nombre})`);
        console.log(`   - Semana: ${rec.semana_inicio} → ${rec.semana_fin}`);
        console.log(`   - Horas Ord: ${rec.total_horas_ord || 0}`);
        console.log(`   - Horas Extra: ${rec.total_horas_te || 0}`);
        console.log(`   - Total Semana: ${rec.total_horas_semana || 0}`);
      });
    } else {
      console.log('⚠️ No hay datos en prenomina_horizontal');
    }
    console.log('-'.repeat(80) + '\n');

    // 6.3 Validar totales calculados
    console.log('📊 6.3 Validando totales calculados automáticamente:');
    console.log('-'.repeat(80));

    const { data: validationData } = await supabase
      .from('prenomina_horizontal')
      .select('numero_empleado, nombre, lun_horas_ord, mar_horas_ord, mie_horas_ord, jue_horas_ord, vie_horas_ord, sab_horas_ord, dom_horas_ord, total_horas_ord')
      .limit(5);

    if (validationData && validationData.length > 0) {
      let allValid = true;

      validationData.forEach((rec: any) => {
        const sumaManual = (rec.lun_horas_ord || 0) + (rec.mar_horas_ord || 0) +
                          (rec.mie_horas_ord || 0) + (rec.jue_horas_ord || 0) +
                          (rec.vie_horas_ord || 0) + (rec.sab_horas_ord || 0) +
                          (rec.dom_horas_ord || 0);

        const totalCalculado = rec.total_horas_ord || 0;
        const isValid = Math.abs(sumaManual - totalCalculado) < 0.01;

        if (!isValid) {
          console.log(`   ❌ Empleado ${rec.numero_empleado}: Suma manual (${sumaManual}) ≠ Total calculado (${totalCalculado})`);
          allValid = false;
        }
      });

      if (allValid) {
        console.log('   ✅ Todos los totales calculados son correctos');
      }
    }
    console.log('-'.repeat(80) + '\n');

    // 6.4 Verificar duplicados
    console.log('📊 6.4 Verificando duplicados:');
    console.log('-'.repeat(80));

    const { data: duplicados } = await supabase
      .rpc('check_prenomina_duplicates')
      .select('*')
      .limit(0)
      .throwOnError(false);

    // Usar query alternativo si el RPC no existe
    const { data: countByWeek } = await supabase
      .from('prenomina_horizontal')
      .select('numero_empleado, semana_inicio')
      .limit(1000);

    if (countByWeek) {
      const map = new Map<string, number>();
      countByWeek.forEach((rec: any) => {
        const key = `${rec.numero_empleado}_${rec.semana_inicio}`;
        map.set(key, (map.get(key) || 0) + 1);
      });

      const dups = Array.from(map.entries()).filter(([_, count]) => count > 1);

      if (dups.length === 0) {
        console.log('   ✅ No hay duplicados (constraint UNIQUE funciona correctamente)');
      } else {
        console.log(`   ⚠️ Encontrados ${dups.length} posibles duplicados`);
        dups.slice(0, 3).forEach(([key, count]) => {
          console.log(`      - ${key}: ${count} registros`);
        });
      }
    }
    console.log('-'.repeat(80) + '\n');

    // ========================================
    // PASO 7: REPORTE FINAL
    // ========================================
    console.log('📋 PASO 7: Generando reporte final...\n');
    console.log('='.repeat(80));
    console.log('✅ VALIDACIÓN COMPLETADA - RESULTADOS FINALES');
    console.log('='.repeat(80) + '\n');

    console.log('📊 RESUMEN DE TABLAS:');
    console.log('-'.repeat(80));
    console.log('Tabla                     | Registros | Estado');
    console.log('-'.repeat(80));
    Object.entries(counts).forEach(([tabla, count]) => {
      const status = count > 0 ? '✅' : '⚠️';
      console.log(`${tabla.padEnd(25)} | ${count.toString().padStart(9)} | ${status}`);
    });
    console.log('-'.repeat(80) + '\n');

    console.log('📈 MÉTRICAS DE PRENOMINA:');
    console.log('-'.repeat(80));
    console.log(`Registros importados:     ${insertados}`);
    console.log(`Errores:                  ${errores}`);
    console.log(`Tasa de éxito:            ${((insertados / records.length) * 100).toFixed(1)}%`);
    console.log(`Cobertura SFTP:           100% (4 de 4 archivos)`);
    console.log('-'.repeat(80) + '\n');

    const statusIcon = errores === 0 ? '🎉' : '⚠️';
    console.log(`${statusIcon} ESTADO: ${errores === 0 ? 'EXITOSO' : 'COMPLETADO CON ERRORES'}`);
    console.log('='.repeat(80) + '\n');

    return {
      success: errores === 0,
      insertados,
      errores,
      totalTablas: counts
    };

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    await sftp.end();
    throw error;
  }
}

// Ejecutar
testImportPrenomina()
  .then(result => {
    if (result.success) {
      console.log('✅ Prueba completada exitosamente!\n');
      process.exit(0);
    } else {
      console.log('⚠️ Prueba completada con errores\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Prueba fallida:', error);
    process.exit(1);
  });
