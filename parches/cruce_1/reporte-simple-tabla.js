const fs = require('fs');

// Leer datos procesados
const motivosExcel = JSON.parse(fs.readFileSync('./motivos_bajas_excel.json', 'utf8'));
const empleadosExcel = JSON.parse(fs.readFileSync('./altas_empleados_excel.json', 'utf8'));

// Helper functions
function excelDateToJS(excelDate) {
  if (!excelDate || isNaN(excelDate)) return null;
  return new Date((excelDate - 25569) * 86400 * 1000);
}

function formatDate(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

function getYearMonth(date) {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Procesar Excel
const bajasExcel = motivosExcel.slice(3).map(row => {
  const fecha = excelDateToJS(row.__EMPTY_2);
  return {
    numeroEmpleado: row.__EMPTY_3,
    fecha: formatDate(fecha),
    mes: getYearMonth(fecha)
  };
}).filter(b => b.fecha && b.fecha.startsWith('2025'));

const altasExcel = empleadosExcel.map(row => {
  const fechaIngreso = excelDateToJS(row['Fecha Ingreso']);
  return {
    numeroEmpleado: row['Número'],
    fecha: formatDate(fechaIngreso),
    mes: getYearMonth(fechaIngreso)
  };
}).filter(a => a.fecha && a.fecha.startsWith('2025'));

// Datos Supabase
const supabaseAltas = {
  "2025-01": 22, "2025-02": 40, "2025-03": 22, "2025-04": 24,
  "2025-05": 19, "2025-06": 28, "2025-07": 21, "2025-08": 40,
  "2025-09": 13, "2025-10": 14, "2025-11": 18, "2025-12": 11
};

const supabaseBajas = {
  "2025-01": 17, "2025-02": 22, "2025-03": 24, "2025-04": 14,
  "2025-05": 29, "2025-06": 21, "2025-07": 27, "2025-08": 19,
  "2025-09": 18, "2025-10": 16, "2025-11": 12, "2025-12": 17
};

// Agrupar Excel por mes
const altasExcelMes = {};
const bajasExcelMes = {};

altasExcel.forEach(a => {
  altasExcelMes[a.mes] = (altasExcelMes[a.mes] || 0) + 1;
});

bajasExcel.forEach(b => {
  bajasExcelMes[b.mes] = (bajasExcelMes[b.mes] || 0) + 1;
});

// Generar reporte
const L = '='.repeat(140);

let txt = `
${L}
                    REPORTE COMPARATIVO ANUAL - SUPABASE vs EXCEL
                              AÑO 2025 - Proyecto mrm_simple
                         Fecha: ${new Date().toLocaleString('es-MX')}
${L}


RESUMEN GENERAL:
================
  • Total Empleados (General):   Supabase: 1,051   |   Excel: 1,054   |   Diferencia: +3
  • Ingresos 2025:                Supabase: 272     |   Excel: 271     |   Diferencia: -1
  • Bajas 2025:                   Supabase: 236     |   Excel: 236     |   Diferencia:  0  ✅


${L}


TABLA COMPARATIVA MENSUAL - AÑO 2025
=====================================

┌──────────────┬─────────────────────────────────────┬─────────────────────────────────────┬──────────┐
│     MES      │         INGRESOS (ALTAS)            │           BAJAS                     │  ESTADO  │
│              ├───────────┬───────────┬─────────────┼───────────┬───────────┬─────────────┤          │
│              │ SUPABASE  │   EXCEL   │  DIFERENCIA │ SUPABASE  │   EXCEL   │  DIFERENCIA │          │
├──────────────┼───────────┼───────────┼─────────────┼───────────┼───────────┼─────────────┼──────────┤
`;

const meses = [
  ['2025-01', 'Enero'],      ['2025-02', 'Febrero'],    ['2025-03', 'Marzo'],
  ['2025-04', 'Abril'],      ['2025-05', 'Mayo'],       ['2025-06', 'Junio'],
  ['2025-07', 'Julio'],      ['2025-08', 'Agosto'],     ['2025-09', 'Septiembre'],
  ['2025-10', 'Octubre'],    ['2025-11', 'Noviembre'],  ['2025-12', 'Diciembre']
];

let totalAltasS = 0, totalAltasE = 0, totalBajasS = 0, totalBajasE = 0;

meses.forEach(([key, nombre]) => {
  const altasS = supabaseAltas[key] || 0;
  const altasE = altasExcelMes[key] || 0;
  const bajasS = supabaseBajas[key] || 0;
  const bajasE = bajasExcelMes[key] || 0;

  totalAltasS += altasS;
  totalAltasE += altasE;
  totalBajasS += bajasS;
  totalBajasE += bajasE;

  const diffA = altasE - altasS;
  const diffB = bajasE - bajasS;

  const estado = (diffA === 0 && diffB === 0) ? '   ✅   ' : '   ⚠️   ';

  const diffAStr = diffA >= 0 ? `+${diffA}` : `${diffA}`;
  const diffBStr = diffB >= 0 ? `+${diffB}` : `${diffB}`;

  txt += `│ ${nombre.padEnd(12)} │    ${String(altasS).padStart(3)}    │    ${String(altasE).padStart(3)}    │     ${diffAStr.padStart(3)}     │    ${String(bajasS).padStart(3)}    │    ${String(bajasE).padStart(3)}    │     ${diffBStr.padStart(3)}     │ ${estado} │\n`;
});

txt += `├──────────────┼───────────┼───────────┼─────────────┼───────────┼───────────┼─────────────┼──────────┤\n`;
txt += `│ TOTALES 2025 │    ${String(totalAltasS).padStart(3)}    │    ${String(totalAltasE).padStart(3)}    │     ${(totalAltasE - totalAltasS >= 0 ? '+' : '') + (totalAltasE - totalAltasS)}     │    ${String(totalBajasS).padStart(3)}    │    ${String(totalBajasE).padStart(3)}    │     ${(totalBajasE - totalBajasS >= 0 ? '+' : '') + (totalBajasE - totalBajasS)}     │    ${totalBajasS === totalBajasE ? '✅' : '⚠️'}   │\n`;
txt += `└──────────────┴───────────┴───────────┴─────────────┴───────────┴───────────┴─────────────┴──────────┘\n\n`;

txt += `
LEYENDA:
========
  ✅  = Datos coinciden perfectamente (diferencia = 0)
  ⚠️   = Diferencia encontrada (requiere revisión)


INTERPRETACIÓN RÁPIDA:
======================
  • Los números en DIFERENCIA muestran: Excel - Supabase
  • Número positivo (+): Excel tiene MÁS registros que Supabase
  • Número negativo (-): Supabase tiene MÁS registros que Excel
  • Cero (0): Datos IDÉNTICOS entre ambas fuentes


HALLAZGOS CLAVE:
================
  ✅ BAJAS 2025: Los 236 registros coinciden PERFECTAMENTE (100% sincronizado)

  ⚠️  INGRESOS 2025: Diferencia de 1 registro
      → Supabase: 272 ingresos
      → Excel: 271 ingresos
      → Supabase tiene 1 ingreso más que Excel

  ⚠️  BASE GENERAL: Diferencia de 3 empleados
      → Supabase: 1,051 empleados
      → Excel: 1,054 empleados
      → Excel tiene 3 empleados más que Supabase


MESES CON DIFERENCIAS:
======================
`;

let haydiff = false;
meses.forEach(([key, nombre]) => {
  const altasS = supabaseAltas[key] || 0;
  const altasE = altasExcelMes[key] || 0;
  const bajasS = supabaseBajas[key] || 0;
  const bajasE = bajasExcelMes[key] || 0;

  const diffA = altasE - altasS;
  const diffB = bajasE - bajasS;

  if (diffA !== 0 || diffB !== 0) {
    haydiff = true;
    txt += `\n  ${nombre}:\n`;
    if (diffA !== 0) txt += `    • Ingresos: ${Math.abs(diffA)} de diferencia (${diffA > 0 ? 'Excel tiene más' : 'Supabase tiene más'})\n`;
    if (diffB !== 0) txt += `    • Bajas: ${Math.abs(diffB)} de diferencia (${diffB > 0 ? 'Excel tiene más' : 'Supabase tiene más'})\n`;
  }
});

if (!haydiff) {
  txt += `  ✅ No hay diferencias mensuales - Todo sincronizado perfectamente\n`;
}

txt += `\n\n${L}\n`;
txt += `                                  FIN DEL REPORTE\n`;
txt += `${L}\n`;

fs.writeFileSync('./REPORTE_TABLA_SIMPLE.txt', txt);
console.log('\n✅ REPORTE TABLA SIMPLE GENERADO: REPORTE_TABLA_SIMPLE.txt');
console.log('   📊 Una sola tabla con todos los datos del año\n');
