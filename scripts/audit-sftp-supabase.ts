#!/usr/bin/env tsx
/**
 * SFTP-Supabase Audit Script
 * Compares SFTP files with Supabase tables and generates a comprehensive audit report
 */

import SftpClient from 'ssh2-sftp-client';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

interface SFTPFileInfo {
  name: string;
  size: number;
  lastModified: Date;
  extension: string;
}

interface TableInfo {
  name: string;
  rows: number;
  columns: string[];
}

interface AuditResult {
  sftpFiles: SFTPFileInfo[];
  supabaseTables: TableInfo[];
  mapping: {
    sftpFile: string;
    supabaseTable: string;
    status: 'matched' | 'missing' | 'partial';
    notes: string;
  }[];
}

class AuditService {
  private sftp: SftpClient;
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.sftp = new SftpClient();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async connectSFTP() {
    const config = {
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!
    };

    console.log(`\n📡 Conectando a SFTP: ${config.username}@${config.host}:${config.port}`);
    await this.sftp.connect(config);
    console.log('✅ Conectado a SFTP\n');
  }

  async listSFTPFiles(): Promise<SFTPFileInfo[]> {
    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';
    console.log(`📂 Listando archivos en: ${directory}`);

    const fileList = await this.sftp.list(directory);

    const hrFiles = fileList
      .filter(file => {
        const isFile = file.type === '-';
        const hasValidExtension = file.name.endsWith('.csv') ||
                                 file.name.endsWith('.xlsx') ||
                                 file.name.endsWith('.xls');
        return isFile && hasValidExtension;
      })
      .map(file => ({
        name: file.name,
        size: file.size,
        lastModified: new Date(file.modifyTime),
        extension: path.extname(file.name).toLowerCase()
      }));

    console.log(`✅ Encontrados ${hrFiles.length} archivos HR válidos\n`);
    return hrFiles;
  }

  async analyzeSFTPFile(filename: string): Promise<{ columns: string[]; rowCount: number }> {
    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';
    const filePath = `${directory}/${filename}`;

    console.log(`  📊 Analizando estructura de: ${filename}`);

    try {
      const fileContent = await this.sftp.get(filePath);

      if (filename.toLowerCase().endsWith('.csv')) {
        const csvText = fileContent.toString('utf8');
        const parsed = Papa.parse<Record<string, unknown>>(csvText, {
          header: true,
          skipEmptyLines: true,
          preview: 100 // Solo primeras 100 filas para análisis
        });

        const columns = parsed.meta.fields || [];
        const rowCount = parsed.data.length;

        return { columns, rowCount };
      } else if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
        const workbook = XLSX.read(fileContent, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        const headerRow = rows[0] || [];
        const columns = headerRow.map(h => String(h || ''));
        const rowCount = rows.length - 1; // Excluir header

        return { columns, rowCount };
      }

      return { columns: [], rowCount: 0 };
    } catch (error) {
      console.error(`  ❌ Error analizando ${filename}:`, error);
      return { columns: [], rowCount: 0 };
    }
  }

  async getSupabaseTables(): Promise<TableInfo[]> {
    console.log('🗄️  Obteniendo tablas de Supabase...');

    const tables = [
      'empleados_sftp',
      'motivos_baja',
      'asistencia_diaria',
      'incidencias'
    ];

    const tableInfos: TableInfo[] = [];

    for (const tableName of tables) {
      try {
        // Get table structure
        const { data: sampleData, error: sampleError } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (sampleError) throw sampleError;

        const columns = sampleData && sampleData.length > 0
          ? Object.keys(sampleData[0])
          : [];

        // Get row count
        const { count, error: countError } = await this.supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        tableInfos.push({
          name: tableName,
          rows: count || 0,
          columns
        });
      } catch (error) {
        console.error(`  ❌ Error obteniendo info de ${tableName}:`, error);
      }
    }

    console.log(`✅ Analizadas ${tableInfos.length} tablas\n`);
    return tableInfos;
  }

  generateMapping(sftpFiles: SFTPFileInfo[], supabaseTables: TableInfo[]) {
    const mapping = [];

    // Mapeo basado en nombres de archivos
    const fileMapping: Record<string, { table: string; notes: string }> = {
      'prenomina horizontal': {
        table: 'NUEVA_TABLA_REQUERIDA',
        notes: 'Nueva tabla de prénomina que debe ser agregada a Supabase'
      },
      'validacion alta': {
        table: 'empleados_sftp',
        notes: 'Archivo maestro de empleados activos'
      },
      'motivos': {
        table: 'motivos_baja',
        notes: 'Registro de bajas y terminaciones'
      },
      'incidencias': {
        table: 'incidencias',
        notes: 'Registro detallado de incidencias de asistencia'
      },
      'me 5': {
        table: 'incidencias',
        notes: 'Alias para archivo de incidencias'
      }
    };

    for (const file of sftpFiles) {
      const fileName = file.name.toLowerCase();
      let matched = false;
      let matchedTable = '';
      let notes = '';

      for (const [pattern, info] of Object.entries(fileMapping)) {
        if (fileName.includes(pattern)) {
          matchedTable = info.table;
          notes = info.notes;
          matched = true;
          break;
        }
      }

      if (!matched) {
        matchedTable = 'SIN_MAPEO';
        notes = 'Archivo sin correspondencia conocida en Supabase';
      }

      const status = matchedTable === 'NUEVA_TABLA_REQUERIDA'
        ? 'missing' as const
        : matchedTable === 'SIN_MAPEO'
        ? 'partial' as const
        : 'matched' as const;

      mapping.push({
        sftpFile: file.name,
        supabaseTable: matchedTable,
        status,
        notes
      });
    }

    return mapping;
  }

  async generateReport(): Promise<AuditResult> {
    await this.connectSFTP();

    const sftpFiles = await this.listSFTPFiles();

    // Analizar estructura de cada archivo
    console.log('📊 Analizando estructura de archivos SFTP...\n');
    for (const file of sftpFiles) {
      const { columns, rowCount } = await this.analyzeSFTPFile(file.name);
      console.log(`  ✅ ${file.name}: ${rowCount} filas, ${columns.length} columnas`);
      console.log(`     Columnas: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}\n`);
    }

    const supabaseTables = await this.getSupabaseTables();
    const mapping = this.generateMapping(sftpFiles, supabaseTables);

    await this.sftp.end();
    console.log('✅ Conexión SFTP cerrada\n');

    return {
      sftpFiles,
      supabaseTables,
      mapping
    };
  }

  printReport(result: AuditResult) {
    console.log('\n' + '='.repeat(80));
    console.log('📋 REPORTE DE AUDITORÍA: SFTP vs SUPABASE');
    console.log('='.repeat(80) + '\n');

    // Sección 1: Archivos SFTP
    console.log('📂 ARCHIVOS EN SFTP:');
    console.log('-'.repeat(80));
    console.log('No. | Archivo                              | Tamaño    | Última Modificación');
    console.log('-'.repeat(80));

    result.sftpFiles.forEach((file, i) => {
      const sizeKB = (file.size / 1024).toFixed(1);
      const date = file.lastModified.toLocaleDateString('es-MX');
      console.log(`${(i+1).toString().padStart(3)} | ${file.name.padEnd(36)} | ${sizeKB.padStart(7)} KB | ${date}`);
    });
    console.log('-'.repeat(80) + '\n');

    // Sección 2: Tablas Supabase
    console.log('🗄️  TABLAS EN SUPABASE:');
    console.log('-'.repeat(80));
    console.log('No. | Tabla                | Filas  | Columnas');
    console.log('-'.repeat(80));

    result.supabaseTables.forEach((table, i) => {
      console.log(`${(i+1).toString().padStart(3)} | ${table.name.padEnd(20)} | ${table.rows.toString().padStart(6)} | ${table.columns.length.toString().padStart(3)}`);
      console.log(`     Columnas: ${table.columns.slice(0, 6).join(', ')}${table.columns.length > 6 ? '...' : ''}`);
    });
    console.log('-'.repeat(80) + '\n');

    // Sección 3: Mapeo
    console.log('🔗 MAPEO SFTP → SUPABASE:');
    console.log('-'.repeat(80));

    result.mapping.forEach((map, i) => {
      const statusIcon = map.status === 'matched' ? '✅' : map.status === 'missing' ? '⚠️' : '❓';
      console.log(`\n${(i+1).toString().padStart(2)}. ${statusIcon} ${map.sftpFile}`);
      console.log(`   → Tabla Supabase: ${map.supabaseTable}`);
      console.log(`   → Notas: ${map.notes}`);
    });
    console.log('\n' + '-'.repeat(80) + '\n');

    // Sección 4: Resumen
    console.log('📊 RESUMEN:');
    console.log('-'.repeat(80));
    const matched = result.mapping.filter(m => m.status === 'matched').length;
    const missing = result.mapping.filter(m => m.status === 'missing').length;
    const partial = result.mapping.filter(m => m.status === 'partial').length;

    console.log(`Total archivos SFTP:        ${result.sftpFiles.length}`);
    console.log(`Total tablas Supabase:      ${result.supabaseTables.length}`);
    console.log(`Archivos con mapeo:         ${matched} ✅`);
    console.log(`Archivos sin tabla:         ${missing} ⚠️`);
    console.log(`Archivos sin mapeo:         ${partial} ❓`);
    console.log('-'.repeat(80) + '\n');

    // Sección 5: Recomendaciones
    console.log('💡 RECOMENDACIONES:');
    console.log('-'.repeat(80));

    const prenominaFile = result.mapping.find(m => m.supabaseTable === 'NUEVA_TABLA_REQUERIDA');
    if (prenominaFile) {
      console.log(`\n⚠️  ACCIÓN REQUERIDA: Agregar tabla para "${prenominaFile.sftpFile}"`);
      console.log('   Esta tabla contiene datos de prénomina que actualmente no están en Supabase.');
      console.log('   Próximos pasos:');
      console.log('   1. Analizar la estructura del archivo');
      console.log('   2. Crear la tabla "prenomina_horizontal" en Supabase');
      console.log('   3. Implementar la lógica de importación');
      console.log('   4. Actualizar el dashboard para mostrar esta información');
    }

    const unmapped = result.mapping.filter(m => m.supabaseTable === 'SIN_MAPEO');
    if (unmapped.length > 0) {
      console.log(`\n❓ Archivos sin mapeo conocido:`);
      unmapped.forEach(file => {
        console.log(`   - ${file.sftpFile}`);
      });
      console.log('   Revisar si estos archivos deben ser procesados.');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// Main execution
async function main() {
  try {
    const audit = new AuditService();
    const result = await audit.generateReport();
    audit.printReport(result);

    // Export JSON report
    const fs = await import('fs');
    const reportPath = path.join(__dirname, '../audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 Reporte JSON guardado en: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    process.exit(1);
  }
}

main();
