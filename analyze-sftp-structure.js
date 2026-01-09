// Script para analizar estructura de archivos SFTP
const SftpClient = require('ssh2-sftp-client');
const XLSX = require('xlsx');

const SFTP_CONFIG = {
  host: '148.244.90.21',
  port: 5062,
  username: 'rhmrm',
  password: '!M3Gu5t4S0nar98!@',
  readyTimeout: 10000
};

const SFTP_DIRECTORY = 'ReportesRH';

async function analyzeSFTPFiles() {
  const sftp = new SftpClient();

  try {
    console.log('🔌 Conectando a SFTP...');
    await sftp.connect(SFTP_CONFIG);
    console.log('✅ Conectado exitosamente\n');

    // Listar archivos
    console.log('📂 Listando archivos en', SFTP_DIRECTORY);
    const fileList = await sftp.list(SFTP_DIRECTORY);

    console.log(`\n📋 Archivos encontrados: ${fileList.length}`);
    fileList.forEach(file => {
      console.log(`  - ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    });

    // Analizar archivo de empleados
    const empleadosFile = fileList.find(f =>
      f.name.toLowerCase().includes('validacion') &&
      f.name.toLowerCase().includes('empleados')
    );

    if (!empleadosFile) {
      console.log('\n❌ No se encontró archivo de empleados');
      return;
    }

    console.log(`\n🔍 Analizando: ${empleadosFile.name}`);
    const filePath = `${SFTP_DIRECTORY}/${empleadosFile.name}`;
    const fileContent = await sftp.get(filePath);

    // Parsear Excel
    const workbook = XLSX.read(fileContent, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    console.log(`\n📊 Hoja: ${firstSheetName}`);

    // Obtener headers
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    const headers = rows[0];
    console.log(`\n✨ Columnas encontradas (${headers.length}):`);
    headers.forEach((header, index) => {
      console.log(`  ${index + 1}. "${header}"`);
    });

    // Obtener primera fila de datos
    const firstDataRow = rows[1];
    console.log(`\n📝 Primer registro de datos:`);
    headers.forEach((header, index) => {
      const value = firstDataRow[index];
      const displayValue = value === undefined || value === null ? '(vacío)' :
                          typeof value === 'string' ? `"${value}"` : value;
      console.log(`  ${header}: ${displayValue}`);
    });

    // Buscar columna de género con diferentes variaciones
    const generoVariations = [
      'Género', 'Genero', 'G?nero', 'GÉNERO', 'GENERO',
      'Sexo', 'SEXO', 'Sex', 'Gender', 'GENDER'
    ];

    console.log(`\n🔎 Búsqueda de columna de género:`);
    let generoColumnFound = null;

    headers.forEach((header, index) => {
      const normalized = header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

      generoVariations.forEach(variation => {
        const varNormalized = variation.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (normalized === varNormalized || normalized.includes(varNormalized)) {
          generoColumnFound = {
            name: header,
            index: index,
            sampleValue: firstDataRow[index]
          };
        }
      });
    });

    if (generoColumnFound) {
      console.log(`  ✅ ENCONTRADA: "${generoColumnFound.name}"`);
      console.log(`     Posición: columna ${generoColumnFound.index + 1}`);
      console.log(`     Valor de muestra: "${generoColumnFound.sampleValue}"`);

      // Verificar distribución de valores
      const dataRows = rows.slice(1, Math.min(100, rows.length));
      const generoValues = {};
      dataRows.forEach(row => {
        const value = row[generoColumnFound.index] || '(vacío)';
        generoValues[value] = (generoValues[value] || 0) + 1;
      });

      console.log(`\n     Distribución en primeros ${dataRows.length} registros:`);
      Object.entries(generoValues).forEach(([value, count]) => {
        console.log(`       - "${value}": ${count} registros`);
      });
    } else {
      console.log(`  ❌ NO ENCONTRADA - No existe columna de género en el archivo`);
    }

    // Análizar archivo de nómina
    console.log('\n\n' + '='.repeat(60));
    const nominaFile = fileList.find(f =>
      f.name.toLowerCase().includes('prenomina') ||
      f.name.toLowerCase().includes('nomina')
    );

    if (nominaFile) {
      console.log(`\n🔍 Analizando: ${nominaFile.name}`);
      const nominaPath = `${SFTP_DIRECTORY}/${nominaFile.name}`;
      const nominaContent = await sftp.get(nominaPath);

      if (nominaFile.name.toLowerCase().endsWith('.csv')) {
        const csvText = nominaContent.toString('utf8');
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          console.log(`\n✨ Columnas de nómina (${headers.length}):`);
          headers.forEach((header, index) => {
            console.log(`  ${index + 1}. "${header}"`);
          });
        }
      }
    }

    await sftp.end();
    console.log('\n\n✅ Análisis completado');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await sftp.end();
    process.exit(1);
  }
}

analyzeSFTPFiles();
