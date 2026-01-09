#!/usr/bin/env tsx
/**
 * Force Import Complete - Importación forzada completa desde SFTP
 * Este script replica la lógica de /api/import-real-sftp-force
 */

import SftpClient from 'ssh2-sftp-client';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const BATCH_SIZE = 50;

// Helper functions
const normalizeKey = (key: string): string =>
  key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function pickField(
  record: Record<string, unknown>,
  explicitKeys: string[],
  token: string
): string {
  for (const key of explicitKeys) {
    const value = record[key];
    const str = value === null || value === undefined ? '' : String(value).trim();
    if (str && str.toLowerCase() !== 'null') return str;
  }

  const tokenNorm = normalizeKey(token);
  for (const [rawKey, value] of Object.entries(record)) {
    const normKey = normalizeKey(rawKey);
    if (!normKey || !normKey.includes(tokenNorm)) continue;
    const str = value === null || value === undefined ? '' : String(value).trim();
    if (str && str.toLowerCase() !== 'null') return str;
  }

  return '';
}

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
      // Excel serial date
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + dateValue * 86400000);
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

async function downloadFromSFTP(filename: string): Promise<Record<string, unknown>[]> {
  const sftp = new SftpClient();
  try {
    const config = {
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!
    };

    console.log(`📥 Descargando ${filename}...`);

    await sftp.connect(config);

    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';
    const filePath = `${directory}/${filename}`;
    const fileContent = await sftp.get(filePath);
    await sftp.end();

    let data: Record<string, unknown>[] = [];

    if (filename.toLowerCase().endsWith('.csv')) {
      const csvText = fileContent.toString('utf8');
      const parsed = Papa.parse<Record<string, unknown>>(csvText, {
        header: true,
        skipEmptyLines: true
      });
      data = parsed.data;
    } else if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
      const workbook = XLSX.read(fileContent, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as unknown[];
      const headerRow = (rows[0] as unknown[]) || [];
      const headers: string[] = headerRow.map((h: unknown) => String(h || ''));
      const bodyRows = rows.slice(1) as unknown[];

      data = bodyRows.map((rowUnknown: unknown) => {
        const row = rowUnknown as unknown[];
        const obj: Record<string, unknown> = {};
        headers.forEach((header, i) => {
          const cell = row && row[i] !== undefined ? row[i] : null;
          obj[header || `col_${i}`] = cell as unknown;
        });
        return obj;
      });
    }

    console.log(`✅ ${filename}: ${data.length} registros`);
    return data;
  } catch (error) {
    console.error(`❌ Error descargando ${filename}:`, error);
    await sftp.end();
    return [];
  }
}

async function main() {
  console.log('Conectando a Supabase...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let empleadosInsertados = 0;
  let bajasInsertadas = 0;
  let prenominaInsertada = 0;

  try {
    // ===========================================
    // PASO 1: DESCARGAR ARCHIVOS DESDE SFTP
    // ===========================================
    console.log('\n📂 PASO 1: Descargando archivos desde SFTP...\n');

    const empleadosData = await downloadFromSFTP('Validacion Alta de empleados.xls');
    const bajasData = await downloadFromSFTP('MotivosBaja.csv');
    const nominaData = await downloadFromSFTP('Prenomina Horizontal.csv');

    // ===========================================
    // PASO 2: IMPORTAR EMPLEADOS
    // ===========================================
    console.log('\n👥 PASO 2: Importando empleados...\n');

    const empleadosTransformados = empleadosData.map((emp: Record<string, unknown>) => {
      const numero = parseInt(String(emp['Número'] || emp['N?mero'] || emp['Numero'] || 0));
      if (!numero) return null;

      return {
        numero_empleado: numero,
        apellidos: pickField(emp, ['Apellidos', 'APELLIDOS'], 'apellidos') || '',
        nombres: pickField(emp, ['Nombres', 'NOMBRES'], 'nombres') || '',
        nombre_completo: pickField(emp, ['Nombre Completo'], 'nombre_completo') ||
                        `${pickField(emp, ['Apellidos'], 'apellidos')} ${pickField(emp, ['Nombres'], 'nombres')}`,
        gafete: pickField(emp, ['Gafete', 'GAFETE'], 'gafete'),
        genero: pickField(emp, ['Género', 'G?nero', 'Genero', 'GÉNERO'], 'genero'),
        imss: pickField(emp, ['IMSS'], 'imss'),
        fecha_nacimiento: parseDate(emp['Fecha de Nacimiento']),
        estado: pickField(emp, ['Estado', 'ESTADO'], 'estado'),
        fecha_ingreso: parseDate(emp['Fecha Ingreso']) || parseDate(emp['Fecha de Ingreso']) || '2024-01-01',
        fecha_antiguedad: parseDate(emp['Fecha Antigüedad']) || parseDate(emp['Fecha de Antigüedad']),
        empresa: pickField(emp, ['Empresa', 'EMPRESA'], 'empresa'),
        registro_patronal: pickField(emp, ['No. Registro Patronal', 'Registro Patronal'], 'registro'),
        codigo_puesto: pickField(emp, ['CodigoPuesto', 'Código Puesto'], 'codigo puesto'),
        puesto: pickField(emp, ['Puesto', 'PUESTO'], 'puesto'),
        codigo_depto: pickField(emp, ['Código Depto', 'CodigoDepto'], 'codigo depto'),
        departamento: pickField(emp, ['Departamento', 'DEPARTAMENTO'], 'departamento'),
        codigo_cc: pickField(emp, ['Código de CC', 'CodigoCC'], 'codigo cc'),
        cc: pickField(emp, ['CC'], 'cc'),
        subcuenta_cc: pickField(emp, ['Subcuenta CC'], 'subcuenta'),
        clasificacion: pickField(emp, ['Clasificación', 'Clasificacion'], 'clasificacion'),
        codigo_area: pickField(emp, ['Codigo Area', 'Código Área'], 'codigo area'),
        area: pickField(emp, ['Area', 'Área', 'AREA'], 'area'),
        ubicacion: pickField(emp, ['Ubicación', 'Ubicacion'], 'ubicacion'),
        tipo_nomina: pickField(emp, ['Tipo de Nómina'], 'tipo nomina'),
        turno: pickField(emp, ['Turno', 'TURNO'], 'turno'),
        prestacion_ley: pickField(emp, ['Prestación de Ley'], 'prestacion'),
        paquete_prestaciones: pickField(emp, ['Paquete de Prestaciones'], 'paquete'),
        fecha_baja: parseDate(emp['Fecha Baja']) || parseDate(emp['Fecha de Baja']),
        activo: !emp['Fecha Baja'] && !emp['Fecha de Baja']
      };
    }).filter((e: any) => e !== null);

    console.log(`Transformados: ${empleadosTransformados.length} empleados`);

    // Insertar en lotes
    for (let i = 0; i < empleadosTransformados.length; i += BATCH_SIZE) {
      const batch = empleadosTransformados.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('empleados_sftp')
        .upsert(batch, { onConflict: 'numero_empleado' })
        .select();

      if (error) {
        console.error(`Error lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
      } else {
        empleadosInsertados += data?.length || 0;
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${data?.length} empleados`);
      }
    }

    // ===========================================
    // PASO 3: IMPORTAR BAJAS
    // ===========================================
    console.log('\n📉 PASO 3: Importando bajas...\n');

    const bajasTransformadas = bajasData.map((baja: Record<string, unknown>) => {
      const numero = parseInt(String(baja['#'] || baja['Numero'] || baja['Número'] || 0));
      if (!numero) return null;

      return {
        numero_empleado: numero,
        fecha_baja: parseDate(baja['Fecha']) || '2024-01-01',
        tipo: String(baja['Tipo'] || 'Baja'),
        motivo: String(baja['Motivo'] || 'No especificado'),
        descripcion: String(baja['Descripción'] || baja['Descripcion'] || ''),
        observaciones: String(baja['Observaciones'] || '')
      };
    }).filter((b: any) => b !== null);

    console.log(`Transformadas: ${bajasTransformadas.length} bajas`);

    if (bajasTransformadas.length > 0) {
      const { data, error } = await supabase
        .from('motivos_baja')
        .insert(bajasTransformadas)
        .select();

      if (error) {
        console.error('Error insertando bajas:', error);
      } else {
        bajasInsertadas = data?.length || 0;
        console.log(`✅ Insertadas: ${bajasInsertadas} bajas`);
      }
    }

    // ===========================================
    // PASO 4: IMPORTAR PRENOMINA
    // ===========================================
    console.log('\n⏰ PASO 4: Importando prenomina...\n');

    const prenominaTransformada = nominaData.map((nom: Record<string, unknown>) => {
      const numero = parseInt(String(nom['Número'] || nom['N?mero'] || nom['Numero'] || 0));
      const nombre = String(nom['Nombre'] || '');
      if (!numero || !nombre) return null;

      const lunFecha = parseDate(nom['LUN']);
      if (!lunFecha) return null;

      const semanaFechaObj = new Date(lunFecha + 'T00:00:00');
      const semanaFinFechaObj = new Date(semanaFechaObj);
      semanaFinFechaObj.setDate(semanaFinFechaObj.getDate() + 6);

      return {
        numero_empleado: numero,
        nombre: nombre,
        semana_inicio: lunFecha,
        semana_fin: semanaFinFechaObj.toISOString().split('T')[0],

        lun_fecha: parseDate(nom['LUN']),
        lun_horas_ord: parseFloat(String(nom['LUN-ORD'] || nom['LUN - ORD'] || '0')),
        lun_horas_te: parseFloat(String(nom['LUN- TE'] || nom['LUN-TE'] || '0')),
        lun_incidencia: String(nom['LUN-INC'] || ''),

        mar_fecha: parseDate(nom['MAR']),
        mar_horas_ord: parseFloat(String(nom['MAR-ORD'] || '0')),
        mar_horas_te: parseFloat(String(nom['MAR - TE'] || '0')),
        mar_incidencia: String(nom['MAR-INC'] || ''),

        mie_fecha: parseDate(nom['MIE']),
        mie_horas_ord: parseFloat(String(nom['MIE-ORD'] || '0')),
        mie_horas_te: parseFloat(String(nom['MIE - TE'] || '0')),
        mie_incidencia: String(nom['MIE-INC'] || ''),

        jue_fecha: parseDate(nom['JUE']),
        jue_horas_ord: parseFloat(String(nom['JUE-ORD'] || '0')),
        jue_horas_te: parseFloat(String(nom['JUE - TE'] || '0')),
        jue_incidencia: String(nom['JUE-INC'] || ''),

        vie_fecha: parseDate(nom['VIE']),
        vie_horas_ord: parseFloat(String(nom['VIE-ORD'] || '0')),
        vie_horas_te: parseFloat(String(nom['VIE - TE'] || '0')),
        vie_incidencia: String(nom['VIE-INC'] || ''),

        sab_fecha: parseDate(nom['SAB']),
        sab_horas_ord: parseFloat(String(nom['SAB-ORD'] || '0')),
        sab_horas_te: parseFloat(String(nom['SAB - TE'] || '0')),
        sab_incidencia: String(nom['SAB-INC'] || ''),

        dom_fecha: parseDate(nom['DOM']),
        dom_horas_ord: parseFloat(String(nom['DOM-ORD'] || '0')),
        dom_horas_te: parseFloat(String(nom['DOM - TE'] || '0')),
        dom_incidencia: String(nom['DOM-INC'] || '')
      };
    }).filter((p: any) => p !== null);

    console.log(`Transformadas: ${prenominaTransformada.length} registros de prenomina`);

    for (let i = 0; i < prenominaTransformada.length; i += BATCH_SIZE) {
      const batch = prenominaTransformada.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('prenomina_horizontal')
        .upsert(batch, { onConflict: 'numero_empleado,semana_inicio' })
        .select();

      if (error) {
        console.error(`Error lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
      } else {
        prenominaInsertada += data?.length || 0;
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${data?.length} registros`);
      }
    }

    // ===========================================
    // PASO 5: VERIFICACIÓN
    // ===========================================
    console.log('\n🔍 PASO 5: Verificando importación...\n');

    const { count: totalEmpleados } = await supabase
      .from('empleados_sftp')
      .select('*', { count: 'exact', head: true });

    const { count: totalBajas } = await supabase
      .from('motivos_baja')
      .select('*', { count: 'exact', head: true });

    const { count: totalPrenomina } = await supabase
      .from('prenomina_horizontal')
      .select('*', { count: 'exact', head: true });

    console.log('='.repeat(80));
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log(`👥 Empleados: ${empleadosInsertados} insertados, ${totalEmpleados} total en BD`);
    console.log(`📉 Bajas: ${bajasInsertadas} insertadas, ${totalBajas} total en BD`);
    console.log(`⏰ Prenomina: ${prenominaInsertada} insertadas, ${totalPrenomina} total en BD`);
    console.log('='.repeat(80) + '\n');

    return {
      empleados: { insertados: empleadosInsertados, total: totalEmpleados },
      bajas: { insertadas: bajasInsertadas, total: totalBajas },
      prenomina: { insertadas: prenominaInsertada, total: totalPrenomina }
    };

  } catch (error) {
    console.error('❌ Error crítico:', error);
    throw error;
  }
}

main()
  .then(result => {
    console.log('✅ Script completado exitosamente\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script fallido\n');
    process.exit(1);
  });
