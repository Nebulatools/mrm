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


METODOLOGÍA DE CÁLCULO
=======================

Este reporte compara los datos de INGRESOS y BAJAS del año 2025 entre:
  1. Base de datos Supabase (tablas: empleados_sftp, motivos_baja)
  2. Archivos Excel (Validacion Alta de empleados.xlsb, Motivos Bajas.xls)


📊 CÁLCULO DE INGRESOS (ALTAS)
================================

SUPABASE:
---------
  • Tabla: empleados_sftp
  • Columna: fecha_ingreso
  • Query SQL:
    SELECT COUNT(*)
    FROM empleados_sftp
    WHERE EXTRACT(YEAR FROM fecha_ingreso) = 2025
    GROUP BY TO_CHAR(DATE_TRUNC('month', fecha_ingreso), 'YYYY-MM')

  • Total registros: 1,051 empleados en la tabla
  • Registros 2025: 272 ingresos con fecha_ingreso en 2025
  • Agrupación: Por mes usando TO_CHAR(DATE_TRUNC('month', fecha_ingreso), 'YYYY-MM')

EXCEL:
------
  • Archivo: Validacion Alta de empleados (49).xlsb
  • Columna: "Fecha Ingreso" (columna 11 / columna K en el Excel original)
  • Proceso:
    1. Leer archivo Excel completo (1,054 empleados)
    2. Convertir fecha Excel a formato ISO (número Excel → JavaScript Date → 'YYYY-MM-DD')
    3. Filtrar solo registros donde fecha_ingreso comienza con '2025'
    4. Contar por mes (año-mes: '2025-01', '2025-02', etc.)

  • Total registros: 1,054 empleados en el archivo
  • Registros 2025: 271 ingresos con "Fecha Ingreso" en 2025
  • Agrupación: Por año-mes extraído de la fecha


📊 CÁLCULO DE BAJAS
====================

SUPABASE:
---------
  • Tabla: motivos_baja
  • Columna: fecha_baja
  • Query SQL:
    SELECT COUNT(*)
    FROM motivos_baja
    WHERE EXTRACT(YEAR FROM fecha_baja) = 2025
    GROUP BY TO_CHAR(DATE_TRUNC('month', fecha_baja), 'YYYY-MM')

  • Total registros: 676 bajas en la tabla (todas las fechas)
  • Registros 2025: 236 bajas con fecha_baja en 2025
  • Columnas adicionales: numero_empleado, tipo, motivo, descripcion, observaciones
  • Agrupación: Por mes usando TO_CHAR(DATE_TRUNC('month', fecha_baja), 'YYYY-MM')

EXCEL:
------
  • Archivo: Motivos Bajas (8).xls
  • Columna: Columna 2 (índice __EMPTY_2 después de parsear JSON - columna "Fecha" en Excel)
  • Columnas relacionadas:
    - Columna 3 (__EMPTY_3): Número de empleado
    - Columna 4 (__EMPTY_4): Nombre del empleado
    - Columna 9 (__EMPTY_9): Motivo de la baja

  • Proceso:
    1. Leer archivo Excel y convertir a JSON
    2. Saltar las primeras 3 filas (headers)
    3. Convertir fecha Excel a formato ISO
    4. Filtrar solo registros donde fecha_baja comienza con '2025'
    5. Contar por mes

  • Total registros: 242 registros en el archivo (incluye headers)
  • Registros 2025: 236 bajas con fecha en 2025
  • Agrupación: Por año-mes extraído de la fecha


DIFERENCIAS = EXCEL - SUPABASE
================================
  • Número positivo (+): Excel tiene MÁS registros
  • Número negativo (-): Supabase tiene MÁS registros
  • Cero (0): Cantidades IDÉNTICAS


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


HALLAZGOS CLAVE:
================
  ✅ BAJAS 2025: Los 236 registros coinciden PERFECTAMENTE (100% sincronizado)

  ⚠️  INGRESOS 2025: Diferencia de 1 registro
      → Supabase: 272 ingresos (tabla empleados_sftp, columna fecha_ingreso)
      → Excel: 271 ingresos (archivo Validacion Alta empleados, columna "Fecha Ingreso")
      → Supabase tiene 1 ingreso más que Excel

  ⚠️  BASE GENERAL: Diferencia de 3 empleados
      → Supabase: 1,051 empleados totales
      → Excel: 1,054 empleados totales
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
console.log('\n✅ REPORTE ACTUALIZADO: REPORTE_TABLA_SIMPLE.txt');
console.log('   📊 Ahora incluye la metodología completa de cálculo\n');
