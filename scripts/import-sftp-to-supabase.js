const SftpClient = require('ssh2-sftp-client');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: './apps/web/.env.local' });

const REQUIRED_FILES = {
  prenomina: 'Prenomina Horizontal.csv',
  motivos: 'MotivosBaja.csv',
  incidencias: 'Incidencias.csv',
  empleados: 'Validacion Alta de empleados.xls',
};

function parseDateFromIsoMaybe(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return null;
}

function parseDateFromDDMMYYYY(value) {
  if (!value) return null;
  const str = String(value).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const year = m[3];
  return `${year}-${month}-${day}`;
}

function parseDateFromDDMMYY(value) {
  if (!value) return null;
  const str = String(value).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const yy = parseInt(m[3], 10);
  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  return `${year}-${month}-${day}`;
}

function toCleanString(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function parseIntMaybe(value) {
  const num = parseNumber(value);
  if (num === null) return null;
  return Math.trunc(num);
}

function buildSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase config. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  return createClient(url, key);
}

function buildSftpConfig() {
  const host = process.env.SFTP_HOST;
  const port = parseInt(process.env.SFTP_PORT || '22', 10);
  const username = process.env.SFTP_USER;
  const password = process.env.SFTP_PASSWORD;
  const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';

  if (!host || !username || !password) {
    throw new Error('Missing SFTP config. Ensure SFTP_HOST, SFTP_USER, SFTP_PASSWORD are set.');
  }

  return { host, port, username, password, directory };
}

async function downloadSftpFiles() {
  const config = buildSftpConfig();
  const sftp = new SftpClient();
  await sftp.connect({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    readyTimeout: 20000,
  });

  try {
    const remoteFiles = await sftp.list(config.directory);
    const remoteNames = new Set(remoteFiles.filter((f) => f.type === '-').map((f) => f.name));

    for (const name of Object.values(REQUIRED_FILES)) {
      if (!remoteNames.has(name)) {
        throw new Error(`Missing required file on SFTP: ${name}`);
      }
    }

    const buffers = {};
    for (const [key, name] of Object.entries(REQUIRED_FILES)) {
      const remotePath = `${config.directory}/${name}`;
      buffers[key] = await sftp.get(remotePath);
    }

    return buffers;
  } finally {
    await sftp.end();
  }
}

function parsePrenomina(buffer) {
  const text = buffer.toString('utf8');
  const parsed = Papa.parse(text, { skipEmptyLines: true });
  if (parsed.errors?.length) {
    throw new Error(`Prenomina CSV parse error: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data;
  if (!rows || rows.length < 2) {
    return { nameByNumero: new Map(), asistencias: [] };
  }

  const nameByNumero = new Map();
  const asistencias = [];

  const DIA_GROUPS = [
    { dia: 'LUN', dateIdx: 2, ordIdx: 3, incIdx: 5 },
    { dia: 'MAR', dateIdx: 6, ordIdx: 7, incIdx: 9 },
    { dia: 'MIE', dateIdx: 10, ordIdx: 11, incIdx: 13 },
    { dia: 'JUE', dateIdx: 14, ordIdx: 15, incIdx: 17 },
    { dia: 'VIE', dateIdx: 18, ordIdx: 19, incIdx: 21 },
    { dia: 'SAB', dateIdx: 22, ordIdx: 23, incIdx: 25 },
    { dia: 'DOM', dateIdx: 26, ordIdx: 27, incIdx: 29 },
  ];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length < 2) continue;

    const numero = parseIntMaybe(row[0]);
    const nombreCompleto = toCleanString(row[1]);
    if (!numero || !nombreCompleto) continue;

    if (!nameByNumero.has(numero)) {
      let apellidos = '';
      let nombres = '';
      if (nombreCompleto.includes(', ')) {
        const [last, first] = nombreCompleto.split(', ');
        apellidos = (last || '').trim();
        nombres = (first || '').trim();
      } else {
        const parts = nombreCompleto.split(' ').filter(Boolean);
        if (parts.length >= 2) {
          nombres = parts[0];
          apellidos = parts.slice(1).join(' ');
        } else {
          apellidos = nombreCompleto;
          nombres = 'N/A';
        }
      }

      nameByNumero.set(numero, {
        apellidos,
        nombres,
        nombre_completo: nombreCompleto,
      });
    }

    for (const { dia, dateIdx, ordIdx, incIdx } of DIA_GROUPS) {
      const fecha = parseDateFromDDMMYYYY(row[dateIdx]);
      if (!fecha) continue;

      const horas = Math.min(parseNumber(row[ordIdx]) || 0, 24);
      const horasInc = Math.min(parseNumber(row[incIdx]) || 0, 24);

      asistencias.push({
        numero_empleado: numero,
        fecha,
        dia_semana: dia,
        horas_trabajadas: horas,
        horas_incidencia: horasInc,
        presente: horas > 0,
      });
    }
  }

  return { nameByNumero, asistencias };
}

function parseEmpleadosXls(buffer, nameByNumero) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const empleados = [];
  for (const record of rows) {
    const numero = parseIntMaybe(record['N?mero']);
    if (!numero) continue;

    const nombresInfo = nameByNumero.get(numero) || null;
    const apellidos = (nombresInfo?.apellidos || 'Sin Apellidos').trim();
    const nombres = (nombresInfo?.nombres || 'Sin Nombres').trim();
    const nombre_completo = nombresInfo?.nombre_completo || null;

    const fecha_ingreso =
      parseDateFromDDMMYY(record['Fecha Ingreso']) ||
      parseDateFromDDMMYYYY(record['Fecha Ingreso']) ||
      '2000-01-01';

    const activoRaw = toCleanString(record['Activo']);
    const activo = (activoRaw || '').toUpperCase() === 'SI' || (activoRaw || '').toUpperCase() === 'TRUE';

    empleados.push({
      numero_empleado: numero,
      apellidos,
      nombres,
      nombre_completo,
      gafete: toCleanString(record['Gafete']),
      genero: toCleanString(record['G?nero']),
      imss: record['IMSS'] === null || record['IMSS'] === undefined ? null : String(record['IMSS']),
      fecha_nacimiento:
        parseDateFromDDMMYY(record['Fecha de Nacimiento']) || parseDateFromDDMMYYYY(record['Fecha de Nacimiento']),
      estado: toCleanString(record['Estado']),
      fecha_ingreso,
      fecha_antiguedad:
        parseDateFromDDMMYY(record['Fecha Antig?edad']) || parseDateFromDDMMYYYY(record['Fecha Antig?edad']),
      empresa: toCleanString(record['Empresa']),
      registro_patronal: toCleanString(record['No. Registro Patronal']),
      codigo_puesto: toCleanString(record['CodigoPuesto']),
      puesto: toCleanString(record['Puesto']),
      codigo_depto: toCleanString(record['C?digo Depto']),
      departamento: toCleanString(record['Departamento']),
      codigo_cc: toCleanString(record['C?digo de CC']),
      cc: toCleanString(record['CC']),
      subcuenta_cc: toCleanString(record['Subcuenta CC']),
      clasificacion: toCleanString(record['Clasificaci?n']),
      codigo_area: toCleanString(record['Codigo Area']),
      area: toCleanString(record['Area']),
      ubicacion: toCleanString(record['Ubicaci?n']),
      tipo_nomina: toCleanString(record['Tipo de N?mina']),
      turno: toCleanString(record['Turno']),
      prestacion_ley: toCleanString(record['Prestaci?n de Ley']),
      paquete_prestaciones: toCleanString(record['Paquete de Prestaciones']),
      fecha_baja: parseDateFromDDMMYY(record['Fecha Baja']) || parseDateFromDDMMYYYY(record['Fecha Baja']),
      activo,
    });
  }

  return empleados;
}

function parseMotivosBaja(buffer) {
  const text = buffer.toString('utf8');
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    throw new Error(`MotivosBaja CSV parse error: ${parsed.errors[0].message}`);
  }

  const motivos = [];
  for (const row of parsed.data) {
    const numero = parseIntMaybe(row['#']);
    const fecha_baja = parseDateFromIsoMaybe(row['Fecha']);
    const tipo = toCleanString(row['Tipo']);
    const motivo = toCleanString(row['Motivo']);
    if (!numero || !fecha_baja || !tipo || !motivo) continue;

    motivos.push({
      numero_empleado: numero,
      fecha_baja,
      tipo,
      motivo,
      descripcion: toCleanString(row['Descripci?n'] ?? row['Descripcion']),
      observaciones: toCleanString(row['Observaciones']),
    });
  }

  return motivos;
}

function parseIncidencias(buffer) {
  const text = buffer.toString('utf8');
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    throw new Error(`Incidencias CSV parse error: ${parsed.errors[0].message}`);
  }

  const incidencias = [];
  for (const row of parsed.data) {
    const emp = parseIntMaybe(row['N?mero'] ?? row['Numero']);
    const fecha = parseDateFromIsoMaybe(row['Fecha']);
    if (!emp || !fecha) continue;

    incidencias.push({
      emp,
      nombre: toCleanString(row['Nombre']),
      fecha,
      turno: parseIntMaybe(row['Turno']),
      horario: toCleanString(row['Horario']),
      incidencia: toCleanString(row['Incidencia']),
      entra: toCleanString(row['Entra']),
      sale: toCleanString(row['Sale']),
      ordinarias: parseNumber(row['Ordinarias']) ?? 0,
      numero: parseIntMaybe(row['#']),
      inci: toCleanString(row['INCI']),
      status: parseIntMaybe(row['Status']),
      ubicacion2: toCleanString(row['Ubicacion2']),
    });
  }

  return incidencias;
}

async function insertBatched(supabase, table, rows, batchSize) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      throw new Error(`Insert failed for ${table} batch starting ${i}: ${error.message}`);
    }
    inserted += batch.length;
  }
  return inserted;
}

async function main() {
  console.log('🔌 Connecting to SFTP and downloading exports...');
  const files = await downloadSftpFiles();

  console.log('📄 Parsing Prenomina Horizontal (names + attendance)...');
  const { nameByNumero, asistencias } = parsePrenomina(files.prenomina);
  console.log(`  Names mapped: ${nameByNumero.size}`);
  console.log(`  Attendance rows: ${asistencias.length}`);

  console.log('📄 Parsing Validacion Alta de empleados.xls...');
  const empleados = parseEmpleadosXls(files.empleados, nameByNumero);
  console.log(`  Employees rows: ${empleados.length}`);

  console.log('📄 Parsing MotivosBaja.csv...');
  const motivos = parseMotivosBaja(files.motivos);
  console.log(`  Motivos rows: ${motivos.length}`);

  console.log('📄 Parsing Incidencias.csv...');
  const incidencias = parseIncidencias(files.incidencias);
  console.log(`  Incidencias rows: ${incidencias.length}`);

  console.log('🔌 Connecting to Supabase (service role)...');
  const supabase = buildSupabaseAdmin();

  console.log('⬆️  Inserting empleados_sftp...');
  const empleadosInserted = await insertBatched(supabase, 'empleados_sftp', empleados, 200);

  console.log('⬆️  Inserting asistencia_diaria...');
  const asistenciasInserted = await insertBatched(supabase, 'asistencia_diaria', asistencias, 1000);

  console.log('⬆️  Inserting motivos_baja...');
  const motivosInserted = await insertBatched(supabase, 'motivos_baja', motivos, 500);

  console.log('⬆️  Inserting incidencias...');
  const incidenciasInserted = await insertBatched(supabase, 'incidencias', incidencias, 500);

  console.log('\n✅ Done.');
  console.log(
    JSON.stringify(
      {
        empleadosInserted,
        asistenciasInserted,
        motivosInserted,
        incidenciasInserted,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});

