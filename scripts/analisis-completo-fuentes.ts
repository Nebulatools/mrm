#!/usr/bin/env tsx
/**
 * Análisis Completo de TODAS las Fuentes
 * Para entender exactamente qué datos hay en cada lugar
 */

import SftpClient from 'ssh2-sftp-client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function analizarTodasLasFuentes() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ANÁLISIS COMPLETO DE TODAS LAS FUENTES DE DATOS');
  console.log('='.repeat(80) + '\n');

  const sftp = new SftpClient();

  try {
    // ============================================
    // FUENTE 1: SERVIDOR SFTP ACTUAL
    // ============================================
    console.log('📡 FUENTE 1: SERVIDOR SFTP (Datos ACTUALES)');
    console.log('='.repeat(80) + '\n');

    await sftp.connect({
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!
    });

    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';

    // Analizar cada archivo
    const archivos = [
      'Validacion Alta de empleados.xls',
      'MotivosBaja.csv',
      'Incidencias.csv',
      'Prenomina Horizontal.csv'
    ];

    for (const filename of archivos) {
      try {
        const filePath = `${directory}/${filename}`;
        const fileContent = await sftp.get(filePath);

        console.log(`📄 ${filename}:`);

        if (filename.endsWith('.csv')) {
          const csvText = fileContent.toString('utf8');
          const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true, preview: 100 });

          console.log(`   Registros: ${parsed.data.length}`);
          console.log(`   Columnas: ${parsed.meta.fields?.length || 0}`);

          // Para MotivosBaja y otros, ver fechas
          if (parsed.data.length > 0) {
            const firstRow = parsed.data[0] as any;
            const lastRow = parsed.data[parsed.data.length - 1] as any;

            if (firstRow.Fecha || firstRow.fecha) {
              console.log(`   Primera fecha: ${firstRow.Fecha || firstRow.fecha}`);
              console.log(`   Última fecha: ${lastRow.Fecha || lastRow.fecha}`);
            }

            console.log(`   Muestra de primera fila:`, Object.keys(firstRow).slice(0, 5).join(', '));
          }
        } else {
          const workbook = XLSX.read(fileContent, { type: 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

          console.log(`   Registros: ${rows.length - 1}`);
          console.log(`   Columnas: ${(rows[0] as unknown[])?.length || 0}`);

          // Ver muestra
          if (rows.length > 1) {
            const headers = rows[0] as unknown[];
            const firstData = rows[1] as unknown[];
            console.log(`   Primeras columnas: ${headers.slice(0, 5).join(', ')}`);
          }
        }

        console.log('');
      } catch (error) {
        console.log(`   ❌ Error leyendo archivo: ${error instanceof Error ? error.message : 'Error'}\n`);
      }
    }

    await sftp.end();

    // ============================================
    // FUENTE 2: PATCHES EN /parches/
    // ============================================
    console.log('\n📁 FUENTE 2: PATCHES LOCALES (Datos HISTÓRICOS)');
    console.log('='.repeat(80) + '\n');

    // Analizar motivos_baja_inserts.sql
    const motivosPatchPath = path.join(__dirname, '../parches/motivos_baja_inserts.sql');
    if (fs.existsSync(motivosPatchPath)) {
      const content = fs.readFileSync(motivosPatchPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().startsWith('('));

      console.log(`📄 motivos_baja_inserts.sql:`);
      console.log(`   Registros: ${lines.length}`);

      // Extraer fechas para ver el rango
      const fechas = lines.map(l => {
        const match = l.match(/'(\d{4}-\d{2}-\d{2})'/);
        return match ? match[1] : null;
      }).filter(f => f !== null).sort();

      if (fechas.length > 0) {
        console.log(`   Primera fecha: ${fechas[0]}`);
        console.log(`   Última fecha: ${fechas[fechas.length - 1]}`);

        // Contar por año
        const porAno: Record<string, number> = {};
        fechas.forEach(f => {
          const year = f!.substring(0, 4);
          porAno[year] = (porAno[year] || 0) + 1;
        });

        console.log(`   Por año:`);
        Object.entries(porAno).sort().forEach(([year, count]) => {
          console.log(`     ${year}: ${count} bajas`);
        });
      }
      console.log('');
    }

    // Analizar incidencias_patch_insert.sql
    const incidenciasPatchPath = path.join(__dirname, '../parches/incidencias_patch_insert.sql');
    if (fs.existsSync(incidenciasPatchPath)) {
      const content = fs.readFileSync(incidenciasPatchPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().startsWith('('));

      console.log(`📄 incidencias_patch_insert.sql:`);
      console.log(`   Registros: ${lines.length}`);

      // Extraer fechas
      const fechas = lines.map(l => {
        const match = l.match(/'(\d{4}-\d{2}-\d{2})'/);
        return match ? match[1] : null;
      }).filter(f => f !== null).sort();

      if (fechas.length > 0) {
        console.log(`   Primera fecha: ${fechas[0]}`);
        console.log(`   Última fecha: ${fechas[fechas.length - 1]}`);

        // Contar por mes de 2025
        const porMes: Record<string, number> = {};
        fechas.forEach(f => {
          if (f!.startsWith('2025')) {
            const month = f!.substring(0, 7);
            porMes[month] = (porMes[month] || 0) + 1;
          }
        });

        console.log(`   Por mes (2025):`);
        Object.entries(porMes).sort().forEach(([month, count]) => {
          console.log(`     ${month}: ${count} incidencias`);
        });
      }
      console.log('');
    }

    // ============================================
    // CONCLUSIÓN
    // ============================================
    console.log('\n📊 CONCLUSIÓN');
    console.log('='.repeat(80) + '\n');

    console.log('SFTP ACTUAL tiene:');
    console.log('  ✅ Empleados: Snapshot ACTUAL (todos los empleados)');
    console.log('  ⚠️ Bajas: Solo 1-2 bajas RECIENTES (enero 2026)');
    console.log('  ⚠️ Incidencias: 0 o muy pocas RECIENTES');
    console.log('  ✅ Prenomina: Semana ACTUAL (enero 2026)');
    console.log('');
    console.log('PATCHES tienen:');
    console.log('  ✅ Bajas: 2023-2024 completo');
    console.log('  ⚠️ Bajas: 0 de 2025');
    console.log('  ⚠️ Incidencias: Solo jul-dic 2025');
    console.log('  ❌ Incidencias: NO ene-jun 2025');
    console.log('  ❌ Asistencia: NADA');
    console.log('');
    console.log('LO QUE FALTA (NO está en SFTP ni patches):');
    console.log('  ❌ Bajas de todo 2025');
    console.log('  ❌ Incidencias ene-jun 2025');
    console.log('  ❌ Asistencia diaria completa');
    console.log('');
    console.log('¿Dónde estaban antes?');
    console.log('  → En Supabase (importados previamente de SFTP histórico)');
    console.log('  → SE PERDIERON al hacer TRUNCATE');
    console.log('  → SOLO recuperables desde backup de Supabase');
    console.log('');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    await sftp.end();
  }
}

analizarTodasLasFuentes();
