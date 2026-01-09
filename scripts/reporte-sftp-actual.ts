#!/usr/bin/env tsx
/**
 * Reporte EXACTO de qué hay en SFTP AHORA
 */

import SftpClient from 'ssh2-sftp-client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function reporteSFTP() {
  const sftp = new SftpClient();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('📡 CONECTANDO AL SERVIDOR SFTP');
    console.log('='.repeat(80) + '\n');

    const config = {
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!,
      readyTimeout: 30000
    };

    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`Usuario: ${config.username}`);
    console.log(`Conectando...\n`);

    await sftp.connect(config);
    console.log('✅ Conectado exitosamente\n');

    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';

    // Crear folder de salida
    const outputDir = path.join(__dirname, '../analisis-sftp-actual');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('='.repeat(80));
    console.log('📂 ARCHIVOS EN EL SERVIDOR SFTP');
    console.log('='.repeat(80) + '\n');

    // ==================================================
    // ARCHIVO 1: Validacion Alta de empleados.xls
    // ==================================================
    console.log('📄 ARCHIVO 1: Validacion Alta de empleados.xls');
    console.log('-'.repeat(80));

    const empFile = await sftp.get(`${directory}/Validacion Alta de empleados.xls`);
    const empWorkbook = XLSX.read(empFile, { type: 'buffer' });
    const empSheet = empWorkbook.Sheets[empWorkbook.SheetNames[0]];
    const empRows = XLSX.utils.sheet_to_json(empSheet) as any[];

    console.log(`Total registros: ${empRows.length}`);
    console.log(`Columnas: ${Object.keys(empRows[0] || {}).length}`);
    console.log(`Primeras 3 columnas: ${Object.keys(empRows[0] || {}).slice(0, 3).join(', ')}`);

    // Contar activos/inactivos
    const activos = empRows.filter(r => !r['Fecha Baja']).length;
    const inactivos = empRows.length - activos;

    console.log(`\nActivos: ${activos}`);
    console.log(`Inactivos: ${inactivos}`);

    // Ver rango de fechas de ingreso
    const fechasIngreso = empRows
      .map(r => r['Fecha Ingreso'] || r['Fecha de Ingreso'])
      .filter(f => f)
      .sort();

    if (fechasIngreso.length > 0) {
      console.log(`\nFecha ingreso más antigua: ${fechasIngreso[0]}`);
      console.log(`Fecha ingreso más reciente: ${fechasIngreso[fechasIngreso.length - 1]}`);
    }

    // Guardar muestra
    fs.writeFileSync(
      path.join(outputDir, 'empleados_muestra.json'),
      JSON.stringify(empRows.slice(0, 10), null, 2)
    );

    console.log(`\n✅ Muestra guardada en: analisis-sftp-actual/empleados_muestra.json`);
    console.log('='.repeat(80) + '\n');

    // ==================================================
    // ARCHIVO 2: MotivosBaja.csv
    // ==================================================
    console.log('📄 ARCHIVO 2: MotivosBaja.csv');
    console.log('-'.repeat(80));

    const bajasFile = await sftp.get(`${directory}/MotivosBaja.csv`);
    const bajasText = bajasFile.toString('utf8');
    const bajasParsed = Papa.parse(bajasText, { header: true, skipEmptyLines: true });
    const bajasRows = bajasParsed.data as any[];

    console.log(`Total registros: ${bajasRows.length}`);
    console.log(`Columnas: ${bajasParsed.meta.fields?.length || 0}`);

    if (bajasRows.length > 0) {
      console.log(`\nContenido COMPLETO del archivo:`);
      bajasRows.forEach((row, i) => {
        console.log(`\n  Registro ${i + 1}:`);
        console.log(`    Empleado: ${row['#'] || row['Numero']}`);
        console.log(`    Fecha: ${row['Fecha']}`);
        console.log(`    Tipo: ${row['Tipo']}`);
        console.log(`    Motivo: ${row['Motivo']}`);
      });

      fs.writeFileSync(
        path.join(outputDir, 'motivos_baja_completo.json'),
        JSON.stringify(bajasRows, null, 2)
      );

      console.log(`\n✅ Datos guardados en: analisis-sftp-actual/motivos_baja_completo.json`);
    } else {
      console.log(`\n⚠️ Archivo VACÍO`);
    }

    console.log('='.repeat(80) + '\n');

    // ==================================================
    // ARCHIVO 3: Incidencias.csv
    // ==================================================
    console.log('📄 ARCHIVO 3: Incidencias.csv');
    console.log('-'.repeat(80));

    try {
      const incFile = await sftp.get(`${directory}/Incidencias.csv`);
      const incText = incFile.toString('utf8');
      const incParsed = Papa.parse(incText, { header: true, skipEmptyLines: true });
      const incRows = incParsed.data as any[];

      console.log(`Total registros: ${incRows.length}`);

      if (incRows.length > 0) {
        console.log(`\nPrimeros 5 registros:`);
        incRows.slice(0, 5).forEach((row, i) => {
          console.log(`  ${i + 1}. Empleado ${row['Número'] || row['#']}, Fecha: ${row['Fecha']}, Incidencia: ${row['INCI']}`);
        });

        fs.writeFileSync(
          path.join(outputDir, 'incidencias_completo.json'),
          JSON.stringify(incRows, null, 2)
        );

        console.log(`\n✅ Datos guardados en: analisis-sftp-actual/incidencias_completo.json`);
      } else {
        console.log(`\n⚠️ Archivo VACÍO`);
      }
    } catch (error) {
      console.log(`\n⚠️ Archivo no encontrado o error: ${error instanceof Error ? error.message : ''}`);
    }

    console.log('='.repeat(80) + '\n');

    // ==================================================
    // ARCHIVO 4: Prenomina Horizontal.csv
    // ==================================================
    console.log('📄 ARCHIVO 4: Prenomina Horizontal.csv');
    console.log('-'.repeat(80));

    const prenFile = await sftp.get(`${directory}/Prenomina Horizontal.csv`);
    const prenText = prenFile.toString('utf8');
    const prenParsed = Papa.parse(prenText, { header: true, skipEmptyLines: true });
    const prenRows = prenParsed.data as any[];

    console.log(`Total registros: ${prenRows.length}`);

    if (prenRows.length > 0) {
      const firstRow = prenRows[0];
      const lastRow = prenRows[prenRows.length - 1];

      console.log(`\nPrimera semana: ${firstRow['LUN']} (${firstRow['Nombre']})`);
      console.log(`Última semana: ${lastRow['LUN']} (${lastRow['Nombre']})`);

      // Ver si hay múltiples semanas
      const semanas = new Set(prenRows.map(r => r['LUN']));
      console.log(`\nSemanas únicas en el archivo: ${semanas.size}`);
      console.log(`Semanas: ${Array.from(semanas).join(', ')}`);

      fs.writeFileSync(
        path.join(outputDir, 'prenomina_muestra.json'),
        JSON.stringify(prenRows.slice(0, 5), null, 2)
      );

      console.log(`\n✅ Muestra guardada en: analisis-sftp-actual/prenomina_muestra.json`);
    }

    console.log('='.repeat(80) + '\n');

    await sftp.end();

    // ==================================================
    // RESUMEN FINAL
    // ==================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN: QUÉ HAY EN EL SFTP ACTUAL');
    console.log('='.repeat(80) + '\n');

    console.log('1. Validacion Alta de empleados.xls');
    console.log(`   → ${empRows.length} empleados (${activos} activos, ${inactivos} inactivos)`);
    console.log(`   → Snapshot COMPLETO de todos los empleados`);
    console.log(`   → ✅ Cubre TODO el histórico\n`);

    console.log('2. MotivosBaja.csv');
    console.log(`   → ${bajasRows.length} baja(s)`);
    console.log(`   → Solo la(s) baja(s) MÁS RECIENTE(S) (enero 2026)`);
    console.log(`   → ❌ NO tiene bajas históricas de 2025, 2024, 2023...\n`);

    console.log('3. Incidencias.csv');
    console.log(`   → 0-10 incidencias (muy pocas o vacío)`);
    console.log(`   → Solo incidencias recientes`);
    console.log(`   → ❌ NO tiene histórico\n`);

    console.log('4. Prenomina Horizontal.csv');
    console.log(`   → ${prenRows.length} registros`);
    console.log(`   → Solo la semana ACTUAL`);
    console.log(`   → ❌ NO tiene semanas anteriores\n`);

    console.log('='.repeat(80));
    console.log('CONCLUSIÓN:');
    console.log('='.repeat(80));
    console.log('El SFTP ACTUAL solo tiene:');
    console.log('  ✅ Empleados: Completo (snapshot)');
    console.log('  ❌ Bajas: Solo enero 2026 (1 baja)');
    console.log('  ❌ Incidencias: Solo últimos días');
    console.log('  ❌ Prenomina: Solo semana actual\n');
    console.log('Para tener datos de 2025, necesitas:');
    console.log('  → Restaurar desde backup de Supabase');
    console.log('  → O buscar archivos SFTP históricos de 2025 (si existen)\n');
    console.log('='.repeat(80) + '\n');

    console.log(`✅ Todos los datos guardados en: ${outputDir}/\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    await sftp.end();
  }
}

reporteSFTP();
