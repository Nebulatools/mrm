#!/usr/bin/env tsx
import SftpClient from 'ssh2-sftp-client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

interface ResumenArchivo {
  nombre: string;
  registros: number;
  rangoFechas?: {
    inicio: string;
    fin: string;
  };
  columnas: string[];
}

function parsearFecha(valor: string): Date | null {
  if (!valor) return null;

  // Limpiar el valor
  valor = valor.trim().replace(/^"|"$/g, '');

  // Intentar varios formatos
  const formatos = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];

  for (const formato of formatos) {
    const match = valor.match(formato);
    if (match) {
      let fecha: Date;
      if (formato === formatos[0]) {
        fecha = new Date(valor);
      } else {
        const [, d, m, y] = match;
        fecha = new Date(`${y}-${m}-${d}`);
      }
      if (!isNaN(fecha.getTime())) {
        return fecha;
      }
    }
  }

  return null;
}

function analizarCSV(archivoCSV: string): ResumenArchivo {
  const contenido = fs.readFileSync(archivoCSV, 'utf8');
  const lineas = contenido.split('\n').filter(l => l.trim());

  if (lineas.length === 0) {
    return {
      nombre: path.basename(archivoCSV),
      registros: 0,
      columnas: []
    };
  }

  const columnas = lineas[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  const registros = lineas.length - 1;

  // Detectar columnas de fecha
  const columnasLower = columnas.map(c => c.toLowerCase());
  const indicesFecha = columnasLower
    .map((col, idx) => col.includes('fecha') ? idx : -1)
    .filter(idx => idx !== -1);

  let rangoFechas: { inicio: string; fin: string } | undefined;

  if (indicesFecha.length > 0 && registros > 0) {
    const fechas: Date[] = [];

    // Analizar las primeras 1000 líneas para eficiencia
    for (let i = 1; i < Math.min(lineas.length, 1000); i++) {
      const valores = lineas[i].split(',');
      for (const idx of indicesFecha) {
        const valor = valores[idx];
        if (valor) {
          const fecha = parsearFecha(valor);
          if (fecha) fechas.push(fecha);
        }
      }
    }

    if (fechas.length > 0) {
      fechas.sort((a, b) => a.getTime() - b.getTime());
      rangoFechas = {
        inicio: fechas[0].toISOString().split('T')[0],
        fin: fechas[fechas.length - 1].toISOString().split('T')[0]
      };
    }
  }

  return {
    nombre: path.basename(archivoCSV),
    registros,
    columnas,
    rangoFechas
  };
}

function convertirExcelACSV(archivoExcel: string): string {
  console.log(`🔄 Convirtiendo a CSV: ${path.basename(archivoExcel)}`);

  const workbook = XLSX.readFile(archivoExcel);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const archivoCSV = archivoExcel.replace(/\.xlsx?$/i, '.csv');

  fs.writeFileSync(archivoCSV, csv, 'utf8');
  console.log(`✅ Convertido: ${path.basename(archivoCSV)}\n`);

  return archivoCSV;
}

function generarResumen(resumen: ResumenArchivo[], outputDir: string) {
  const contenido = `# Resumen de Archivos SFTP

**Fecha de descarga:** ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
**Directorio SFTP:** ${process.env.SFTP_DIRECTORY || 'ReportesRH'}
**Total de archivos:** ${resumen.length}

---

${resumen.map(archivo => `
## ${archivo.nombre}

- **Registros:** ${archivo.registros.toLocaleString('es-MX')}
- **Columnas:** ${archivo.columnas.length}
${archivo.rangoFechas ? `- **Rango de fechas:** ${archivo.rangoFechas.inicio} → ${archivo.rangoFechas.fin}` : '- **Rango de fechas:** No detectado'}

**Columnas disponibles:**
${archivo.columnas.map(c => `- ${c}`).join('\n')}

---
`).join('\n')}

## Resumen Ejecutivo

| Archivo | Registros | Rango de Fechas |
|---------|-----------|-----------------|
${resumen.map(a => `| ${a.nombre} | ${a.registros.toLocaleString('es-MX')} | ${a.rangoFechas ? `${a.rangoFechas.inicio} → ${a.rangoFechas.fin}` : 'N/A'} |`).join('\n')}

## Notas

- Todos los archivos Excel (.xls/.xlsx) han sido convertidos a formato CSV
- Las fechas se detectaron automáticamente de columnas que contienen "fecha"
- Los archivos están disponibles en: \`analisis-sftp-actual/\`
`;

  const rutaResumen = path.join(outputDir, 'RESUMEN.md');
  fs.writeFileSync(rutaResumen, contenido, 'utf8');
  console.log('✅ Resumen generado: analisis-sftp-actual/RESUMEN.md\n');
}

async function descargarArchivos() {
  const sftp = new SftpClient();
  const outputDir = path.join(__dirname, '../analisis-sftp-actual');
  const resumen: ResumenArchivo[] = [];

  // Crear directorio si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log('📡 Conectando a SFTP...');

    await sftp.connect({
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!,
      readyTimeout: 30000
    });

    console.log('✅ Conectado\n');

    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';
    const archivos = [
      'Validacion Alta de empleados.xls',
      'MotivosBaja.csv',
      'Incidencias.csv',
      'Prenomina Horizontal.csv'
    ];

    for (const archivo of archivos) {
      console.log(`📥 Descargando: ${archivo}...`);
      const remotePath = `${directory}/${archivo}`;
      const localPath = path.join(outputDir, archivo);

      await sftp.get(remotePath, localPath);
      console.log(`✅ Guardado: analisis-sftp-actual/${archivo}`);

      // Convertir a CSV si es Excel
      let archivoParaAnalizar = localPath;
      if (archivo.endsWith('.xls') || archivo.endsWith('.xlsx')) {
        archivoParaAnalizar = convertirExcelACSV(localPath);
      } else {
        console.log('');
      }

      // Analizar el archivo CSV
      const info = analizarCSV(archivoParaAnalizar);
      resumen.push(info);
    }

    await sftp.end();

    console.log('✅ Todos los archivos descargados\n');

    // Generar resumen
    console.log('📄 Generando resumen...');
    generarResumen(resumen, outputDir);

    console.log('🎉 Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
    await sftp.end();
    process.exit(1);
  }
}

descargarArchivos();
