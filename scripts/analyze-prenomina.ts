#!/usr/bin/env tsx
/**
 * Prenomina Horizontal Analysis Script
 * Analyzes the structure of Prenomina Horizontal.csv to help create the Supabase table
 */

import SftpClient from 'ssh2-sftp-client';
import Papa from 'papaparse';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

async function analyzePrenomina() {
  const sftp = new SftpClient();

  try {
    const config = {
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!
    };

    console.log('\n📡 Conectando a SFTP...');
    await sftp.connect(config);
    console.log('✅ Conectado\n');

    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';
    const filename = 'Prenomina Horizontal.csv';
    const filePath = `${directory}/${filename}`;

    console.log(`📥 Descargando: ${filename}`);
    const fileContent = await sftp.get(filePath);

    const csvText = fileContent.toString('utf8');

    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: true,
      preview: 5 // Solo primeras 5 filas para ver ejemplos
    });

    const columns = parsed.meta.fields || [];
    const sampleRows = parsed.data;

    console.log('\n' + '='.repeat(80));
    console.log('📊 ANÁLISIS: Prenomina Horizontal.csv');
    console.log('='.repeat(80) + '\n');

    console.log(`Total de columnas: ${columns.length}`);
    console.log(`Filas de muestra: ${sampleRows.length}\n`);

    console.log('COLUMNAS DETECTADAS:');
    console.log('-'.repeat(80));

    columns.forEach((col, i) => {
      const sampleValue = sampleRows[0]?.[col];
      const type = typeof sampleValue;
      console.log(`${(i+1).toString().padStart(3)}. ${col}`);
      console.log(`     Tipo: ${type}, Ejemplo: ${String(sampleValue).substring(0, 50)}`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log('\n📋 DATOS DE MUESTRA (primeras 2 filas):');
    console.log('-'.repeat(80) + '\n');

    sampleRows.slice(0, 2).forEach((row, i) => {
      console.log(`Fila ${i+1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('');
    });

    console.log('='.repeat(80) + '\n');

    // Generate SQL CREATE TABLE statement suggestion
    console.log('💡 SUGERENCIA DE TABLA SUPABASE:');
    console.log('-'.repeat(80) + '\n');
    console.log('CREATE TABLE prenomina_horizontal (');
    console.log('  id SERIAL PRIMARY KEY,');
    console.log('  numero_empleado INTEGER REFERENCES empleados_sftp(numero_empleado),');

    columns.forEach(col => {
      // Inferir tipo de dato basado en el nombre de la columna
      let sqlType = 'VARCHAR(100)';
      const colLower = col.toLowerCase();

      if (colLower.includes('numero') || colLower.includes('n?mero')) {
        sqlType = 'INTEGER';
      } else if (colLower.includes('fecha')) {
        sqlType = 'DATE';
      } else if (colLower.includes('monto') || colLower.includes('importe') || colLower.includes('sueldo')) {
        sqlType = 'DECIMAL(10,2)';
      } else if (colLower.includes('horas') || colLower.includes('dias') || colLower.includes('d?as')) {
        sqlType = 'DECIMAL(6,2)';
      } else if (col.match(/^(LUN|MAR|MIE|JUE|VIE|SAB|DOM)/i)) {
        // Columnas de días de la semana son probablemente horas o números
        sqlType = 'DECIMAL(6,2)';
      }

      const cleanColName = col
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      console.log(`  ${cleanColName} ${sqlType} NULL,`);
    });

    console.log('  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
    console.log('  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    console.log(');\n');
    console.log('-'.repeat(80) + '\n');

    await sftp.end();
    console.log('✅ Análisis completado\n');

  } catch (error) {
    console.error('❌ Error:', error);
    await sftp.end();
    process.exit(1);
  }
}

analyzePrenomina();
