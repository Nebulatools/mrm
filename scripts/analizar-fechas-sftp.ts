#!/usr/bin/env tsx
/**
 * Script para analizar archivos SFTP y detectar rangos de fechas
 */
import * as fs from 'fs';
import * as path from 'path';

interface ResumenArchivo {
  nombre: string;
  registros: number;
  columnas: string[];
  columnasFecha: string[];
  rangoFechas?: {
    inicio: string;
    fin: string;
    totalFechasValidas: number;
  };
}

function parsearFecha(valor: string): Date | null {
  if (!valor || valor === 'NULL' || valor === '') return null;

  // Limpiar el valor
  valor = valor.trim().replace(/^"|"$/g, '');

  // Formato ISO 8601 con timezone: 2026-01-05T00:00:00-08:00
  const isoMatch = valor.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    const fecha = new Date(valor);
    if (!isNaN(fecha.getTime())) return fecha;
  }

  // Formato YYYY-MM-DD
  const iso2Match = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso2Match) {
    const fecha = new Date(valor);
    if (!isNaN(fecha.getTime())) return fecha;
  }

  // Formato DD/MM/YY (2 dígitos para año)
  const ddmmyyMatch = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (ddmmyyMatch) {
    const [, d, m, yy] = ddmmyyMatch;
    // Convertir año de 2 dígitos a 4 (asumiendo 1900-2099)
    const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
    const fecha = new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(fecha.getTime())) return fecha;
  }

  // Formato DD/MM/YYYY (4 dígitos para año)
  const ddmmyyyyMatch = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, d, m, y] = ddmmyyyyMatch;
    const fecha = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(fecha.getTime())) return fecha;
  }

  // Formato D/M/YYYY
  const dMyyyyMatch = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dMyyyyMatch) {
    const [, d, m, y] = dMyyyyMatch;
    const fecha = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(fecha.getTime())) return fecha;
  }

  return null;
}

function analizarCSV(archivoCSV: string): ResumenArchivo {
  console.log(`\n📊 Analizando: ${path.basename(archivoCSV)}`);

  const contenido = fs.readFileSync(archivoCSV, 'utf8');
  const lineas = contenido.split('\n').filter(l => l.trim());

  if (lineas.length === 0) {
    return {
      nombre: path.basename(archivoCSV),
      registros: 0,
      columnas: [],
      columnasFecha: []
    };
  }

  // Parsear header
  const columnas = lineas[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  const registros = lineas.length - 1;

  console.log(`   Registros: ${registros.toLocaleString('es-MX')}`);
  console.log(`   Columnas: ${columnas.length}`);

  // Detectar columnas de fecha
  const columnasLower = columnas.map(c => c.toLowerCase());
  const indicesFecha = columnasLower
    .map((col, idx) => col.includes('fecha') ? idx : -1)
    .filter(idx => idx !== -1);

  const columnasFecha = indicesFecha.map(idx => columnas[idx]);

  if (columnasFecha.length > 0) {
    console.log(`   Columnas con fecha detectadas: ${columnasFecha.join(', ')}`);
  }

  let rangoFechas: { inicio: string; fin: string; totalFechasValidas: number } | undefined;

  if (indicesFecha.length > 0 && registros > 0) {
    const fechas: Date[] = [];

    // Analizar TODAS las líneas
    console.log(`   Procesando fechas...`);
    for (let i = 1; i < lineas.length; i++) {
      // Usar regex para split considerando comillas
      const valores = lineas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];

      for (const idx of indicesFecha) {
        const valor = valores[idx];
        if (valor) {
          const fecha = parsearFecha(valor);
          if (fecha) fechas.push(fecha);
        }
      }
    }

    console.log(`   Fechas válidas encontradas: ${fechas.length.toLocaleString('es-MX')}`);

    if (fechas.length > 0) {
      fechas.sort((a, b) => a.getTime() - b.getTime());
      rangoFechas = {
        inicio: fechas[0].toISOString().split('T')[0],
        fin: fechas[fechas.length - 1].toISOString().split('T')[0],
        totalFechasValidas: fechas.length
      };
      console.log(`   ✅ Rango: ${rangoFechas.inicio} → ${rangoFechas.fin}`);
    } else {
      console.log(`   ⚠️  No se pudieron parsear fechas válidas`);
    }
  }

  return {
    nombre: path.basename(archivoCSV),
    registros,
    columnas,
    columnasFecha,
    rangoFechas
  };
}

function generarResumen(resumen: ResumenArchivo[]) {
  const contenido = `# Resumen de Archivos SFTP - Análisis de Fechas

**Fecha de análisis:** ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
**Total de archivos:** ${resumen.length}

---

## Resumen Ejecutivo

| Archivo | Registros | Rango de Fechas | Fechas Válidas |
|---------|-----------|-----------------|----------------|
${resumen.map(a => `| ${a.nombre} | ${a.registros.toLocaleString('es-MX')} | ${a.rangoFechas ? `${a.rangoFechas.inicio} → ${a.rangoFechas.fin}` : 'N/A'} | ${a.rangoFechas?.totalFechasValidas.toLocaleString('es-MX') || 'N/A'} |`).join('\n')}

---

${resumen.map(archivo => `
## ${archivo.nombre}

- **Registros:** ${archivo.registros.toLocaleString('es-MX')}
- **Columnas totales:** ${archivo.columnas.length}
- **Columnas con fechas:** ${archivo.columnasFecha.length > 0 ? archivo.columnasFecha.join(', ') : 'Ninguna'}
${archivo.rangoFechas ? `- **Rango de fechas:** ${archivo.rangoFechas.inicio} → ${archivo.rangoFechas.fin}
- **Total de fechas válidas:** ${archivo.rangoFechas.totalFechasValidas.toLocaleString('es-MX')}` : '- **Rango de fechas:** No detectado'}

**Todas las columnas:**
${archivo.columnas.map(c => `- ${c}`).join('\n')}

---
`).join('\n')}

## Notas Técnicas

### Formatos de fecha soportados:
- \`DD/MM/YY\` (ej: 16/06/01 = 16 de junio de 2001)
- \`DD/MM/YYYY\` (ej: 16/06/2001)
- \`YYYY-MM-DD\` (formato ISO)
- \`YYYY-MM-DDTHH:MM:SS±TZ\` (formato ISO con timezone)

### Interpretación de años de 2 dígitos:
- 00-49 = 2000-2049
- 50-99 = 1950-1999

### Columnas analizadas:
- Se buscan automáticamente columnas que contienen la palabra "fecha" (case-insensitive)
- Se analizan TODOS los registros de cada archivo para determinar el rango completo
`;

  const rutaResumen = path.join(process.cwd(), 'analisis-sftp-actual', 'RESUMEN.md');
  fs.writeFileSync(rutaResumen, contenido, 'utf8');
  console.log(`\n✅ Resumen generado: analisis-sftp-actual/RESUMEN.md`);
}

// Analizar archivos
const baseDir = path.join(process.cwd(), 'analisis-sftp-actual');

// Buscar archivos CSV recursivamente
function buscarCSV(dir: string): string[] {
  const archivos: string[] = [];

  function buscar(currentDir: string) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        buscar(fullPath);
      } else if (item.endsWith('.csv')) {
        archivos.push(fullPath);
      }
    }
  }

  buscar(dir);
  return archivos;
}

console.log('🔍 Buscando archivos CSV...');
const archivosCSV = buscarCSV(baseDir);

console.log(`\n📁 Encontrados ${archivosCSV.length} archivos CSV`);

const resumen: ResumenArchivo[] = [];

for (const archivo of archivosCSV) {
  const info = analizarCSV(archivo);
  resumen.push(info);
}

console.log('\n📄 Generando resumen...');
generarResumen(resumen);

console.log('\n🎉 Análisis completado exitosamente');
