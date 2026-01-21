const fs = require('fs');
const XLSX = require('xlsx');

// Funciones helper
function excelDateToJS(excelDate) {
  if (!excelDate || isNaN(excelDate)) return null;
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + excelDate * 86400000);
}

function formatDate(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

function padLeft(str, length) {
  return String(str).padStart(length, ' ');
}

function padRight(str, length) {
  return String(str).padEnd(length, ' ');
}

// ========================================
// LEER DATOS DE SUPABASE (desde comparar-2025.js)
// ========================================

const bajas2025Supabase = [
  {numero_empleado:2517,fecha_baja:"2025-01-06",motivo:"Otra razón"},
  {numero_empleado:1855,fecha_baja:"2025-01-07",motivo:"Otra razón"},
  {numero_empleado:137,fecha_baja:"2025-01-14",motivo:"Rescisión por desempeño"},
  {numero_empleado:2310,fecha_baja:"2025-01-14",motivo:"Rescisión por desempeño"},
  {numero_empleado:2048,fecha_baja:"2025-01-15",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2204,fecha_baja:"2025-01-17",motivo:"Otra razón"},
  {numero_empleado:2535,fecha_baja:"2025-01-17",motivo:"Rescisión por disciplina"},
  {numero_empleado:2548,fecha_baja:"2025-01-19",motivo:"Abandono / No regresó"},
  {numero_empleado:1581,fecha_baja:"2025-01-24",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2401,fecha_baja:"2025-01-24",motivo:"Otro trabajo mejor compensado"},
  {numero_empleado:2379,fecha_baja:"2025-01-28",motivo:"Otra razón"},
  {numero_empleado:2520,fecha_baja:"2025-01-28",motivo:"Otra razón"},
  {numero_empleado:2531,fecha_baja:"2025-01-28",motivo:"Abandono / No regresó"},
  {numero_empleado:2455,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2545,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2554,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2555,fecha_baja:"2025-01-30",motivo:"Abandono / No regresó"},
  {numero_empleado:2560,fecha_baja:"2025-02-02",motivo:"Abandono / No regresó"},
  {numero_empleado:2161,fecha_baja:"2025-02-04",motivo:"Término del contrato"},
  {numero_empleado:2339,fecha_baja:"2025-02-04",motivo:"Término del contrato"},
  {numero_empleado:1444,fecha_baja:"2025-02-06",motivo:"Rescisión por desempeño"},
  {numero_empleado:2462,fecha_baja:"2025-02-07",motivo:"Abandono / No regresó"},
  {numero_empleado:2565,fecha_baja:"2025-02-09",motivo:"Abandono / No regresó"},
  {numero_empleado:2171,fecha_baja:"2025-02-10",motivo:"Rescisión por desempeño"},
  {numero_empleado:2451,fecha_baja:"2025-02-10",motivo:"Otra razón"},
  {numero_empleado:2542,fecha_baja:"2025-02-10",motivo:"Abandono / No regresó"},
  {numero_empleado:2544,fecha_baja:"2025-02-11",motivo:"Abandono / No regresó"},
  {numero_empleado:2578,fecha_baja:"2025-02-16",motivo:"Abandono / No regresó"},
  {numero_empleado:2556,fecha_baja:"2025-02-17",motivo:"Abandono / No regresó"},
  {numero_empleado:2558,fecha_baja:"2025-02-17",motivo:"Abandono / No regresó"},
  {numero_empleado:2522,fecha_baja:"2025-02-18",motivo:"Otra razón"},
  {numero_empleado:2524,fecha_baja:"2025-02-20",motivo:"Otra razón"},
  {numero_empleado:1962,fecha_baja:"2025-02-21",motivo:"Rescisión por desempeño"},
  {numero_empleado:2584,fecha_baja:"2025-02-22",motivo:"Abandono / No regresó"},
  {numero_empleado:2587,fecha_baja:"2025-02-23",motivo:"Abandono / No regresó"},
  {numero_empleado:1969,fecha_baja:"2025-02-24",motivo:"Rescisión por desempeño"},
  {numero_empleado:2119,fecha_baja:"2025-02-24",motivo:"Rescisión por disciplina"},
  {numero_empleado:2297,fecha_baja:"2025-02-26",motivo:"Otra razón"},
  {numero_empleado:2567,fecha_baja:"2025-02-26",motivo:"Abandono / No regresó"}
];

// ========================================
// LEER EXCEL BAJAS
// ========================================

const wbBajas = XLSX.readFile('./Motivos Bajas (8).xls');
const sheetBajas = wbBajas.Sheets[wbBajas.SheetNames[0]];
const dataBajas = XLSX.utils.sheet_to_json(sheetBajas, { header: 1 });

const bajasExcel = [];
for (let i = 6; i < dataBajas.length; i++) {
  const row = dataBajas[i];
  if (row && row[3]) {
    let fecha = row[2];
    let fechaStr = null;
    if (typeof fecha === 'number') {
      fechaStr = formatDate(excelDateToJS(fecha));
    }

    if (fechaStr && fechaStr.startsWith('2025')) {
      bajasExcel.push({
        numero_empleado: parseInt(row[3]),
        fecha_baja: fechaStr,
        nombre: row[4],
        motivo: row[9]
      });
    }
  }
}

// ========================================
// LEER EXCEL EMPLEADOS
// ========================================

const wbEmpleados = XLSX.readFile('./Validacion Alta de empleados (49).xlsb');
const sheetEmpleados = wbEmpleados.Sheets[wbEmpleados.SheetNames[0]];
const dataEmpleados = XLSX.utils.sheet_to_json(sheetEmpleados, { header: 1 });

const empleadosExcel = [];
for (let i = 1; i < dataEmpleados.length; i++) {
  const row = dataEmpleados[i];
  if (row && row[0]) {
    const numEmp = parseInt(row[0]);
    if (!isNaN(numEmp)) {
      let fechaIngreso = row[8];
      let fechaIngresoStr = null;
      if (typeof fechaIngreso === 'number') {
        fechaIngresoStr = formatDate(excelDateToJS(fechaIngreso));
      }

      if (fechaIngresoStr && fechaIngresoStr.startsWith('2025')) {
        empleadosExcel.push({
          numero_empleado: numEmp,
          fecha_ingreso: fechaIngresoStr,
          nombre: `${row[1]} ${row[2]}`.trim()
        });
      }
    }
  }
}

// Simular altas de Supabase (agrupadas por mes según el reporte anterior)
const altasSupabasePorMes = {
  "2025-01": 22, "2025-02": 40, "2025-03": 22, "2025-04": 24,
  "2025-05": 19, "2025-06": 28, "2025-07": 21, "2025-08": 40,
  "2025-09": 13, "2025-10": 14, "2025-11": 18, "2025-12": 11
};

// ========================================
// AGRUPAR POR MES
// ========================================

const altasExcelPorMes = {};
const bajasExcelPorMes = {};
const bajasSupabasePorMes = {};

empleadosExcel.forEach(emp => {
  const mes = emp.fecha_ingreso.substring(0, 7);
  if (!altasExcelPorMes[mes]) altasExcelPorMes[mes] = [];
  altasExcelPorMes[mes].push(emp);
});

bajasExcel.forEach(baja => {
  const mes = baja.fecha_baja.substring(0, 7);
  if (!bajasExcelPorMes[mes]) bajasExcelPorMes[mes] = [];
  bajasExcelPorMes[mes].push(baja);
});

bajas2025Supabase.forEach(baja => {
  const mes = baja.fecha_baja.substring(0, 7);
  if (!bajasSupabasePorMes[mes]) bajasSupabasePorMes[mes] = [];
  bajasSupabasePorMes[mes].push(baja);
});

// ========================================
// GENERAR REPORTE DESGLOSADO
// ========================================

const WIDTH = 140;
const linea = '='.repeat(WIDTH);
const lineaSimple = '-'.repeat(WIDTH);

let reporte = '';

reporte += linea + '\n';
reporte += '     REPORTE DESGLOSADO POR EMPLEADO - COMPARACION SUPABASE vs EXCEL\n';
reporte += '                         AÑO 2025 - Proyecto mrm_simple\n';
reporte += `                      Fecha: ${new Date().toLocaleString('es-MX')}\n`;
reporte += linea + '\n\n';

reporte += 'EXPLICACION:\n';
reporte += '============\n';
reporte += 'Este reporte muestra CADA empleado que tuvo ingreso o baja en 2025,\n';
reporte += 'comparando si aparece en Supabase y en los archivos Excel.\n\n';
reporte += 'COLUMNAS:\n';
reporte += '  • ID: Numero de empleado\n';
reporte += '  • FECHA: Fecha de ingreso o baja\n';
reporte += '  • SUPABASE: Si aparece en la base de datos (SI/NO)\n';
reporte += '  • EXCEL: Si aparece en el archivo Excel (SI/NO)\n';
reporte += '  • MATCH: Si coincide en ambas fuentes (✅ = Si, ❌ = No)\n\n';
reporte += linea + '\n\n';

const meses = [
  { key: '2025-01', nombre: 'ENERO' },
  { key: '2025-02', nombre: 'FEBRERO' },
  { key: '2025-03', nombre: 'MARZO' },
  { key: '2025-04', nombre: 'ABRIL' },
  { key: '2025-05', nombre: 'MAYO' },
  { key: '2025-06', nombre: 'JUNIO' },
  { key: '2025-07', nombre: 'JULIO' },
  { key: '2025-08', nombre: 'AGOSTO' },
  { key: '2025-09', nombre: 'SEPTIEMBRE' },
  { key: '2025-10', nombre: 'OCTUBRE' },
  { key: '2025-11', nombre: 'NOVIEMBRE' },
  { key: '2025-12', nombre: 'DICIEMBRE' }
];

meses.forEach(({ key, nombre }) => {
  const bajasS = bajasSupabasePorMes[key] || [];
  const bajasE = bajasExcelPorMes[key] || [];
  const altasE = altasExcelPorMes[key] || [];

  reporte += '\n' + linea + '\n';
  reporte += `>>> ${nombre} (${key}) <<<\n`;
  reporte += linea + '\n\n';

  // BAJAS del mes
  if (bajasS.length > 0 || bajasE.length > 0) {
    reporte += `BAJAS DEL MES (Total: Supabase=${bajasS.length}, Excel=${bajasE.length})\n`;
    reporte += lineaSimple + '\n';
    reporte += `┌──────────┬──────────────┬───────────────────────────────┬────────────┬────────────┬────────┐\n`;
    reporte += `│    ID    │    FECHA     │           MOTIVO              │  SUPABASE  │   EXCEL    │ MATCH  │\n`;
    reporte += `├──────────┼──────────────┼───────────────────────────────┼────────────┼────────────┼────────┤\n`;

    // Crear un Set de todos los IDs
    const idsSet = new Set();
    bajasS.forEach(b => idsSet.add(b.numero_empleado));
    bajasE.forEach(b => idsSet.add(b.numero_empleado));

    const todosIds = Array.from(idsSet).sort((a, b) => a - b);

    todosIds.forEach(id => {
      const enSupabase = bajasS.find(b => b.numero_empleado === id);
      const enExcel = bajasE.find(b => b.numero_empleado === id);

      const fecha = enSupabase ? enSupabase.fecha_baja : (enExcel ? enExcel.fecha_baja : '');
      const motivo = enSupabase ? enSupabase.motivo : (enExcel ? enExcel.motivo : '');
      const match = enSupabase && enExcel ? '✅' : '❌';
      const supabaseCol = enSupabase ? '    SI    ' : '    --    ';
      const excelCol = enExcel ? '    SI    ' : '    --    ';

      reporte += `│ ${padLeft(id, 8)} │  ${fecha}  │ ${padRight(motivo.substring(0, 29), 29)} │ ${supabaseCol} │ ${excelCol} │  ${match}  │\n`;
    });

    reporte += `└──────────┴──────────────┴───────────────────────────────┴────────────┴────────────┴────────┘\n\n`;

    // Mostrar solo las diferencias
    const soloSupabase = bajasS.filter(bs => !bajasE.find(be => be.numero_empleado === bs.numero_empleado));
    const soloExcel = bajasE.filter(be => !bajasS.find(bs => bs.numero_empleado === be.numero_empleado));

    if (soloSupabase.length > 0) {
      reporte += `⚠️  SOLO EN SUPABASE (${soloSupabase.length}): ${soloSupabase.map(b => `#${b.numero_empleado}`).join(', ')}\n`;
    }
    if (soloExcel.length > 0) {
      reporte += `⚠️  SOLO EN EXCEL (${soloExcel.length}): ${soloExcel.map(b => `#${b.numero_empleado}`).join(', ')}\n`;
    }
    if (soloSupabase.length === 0 && soloExcel.length === 0) {
      reporte += `✅ TODAS LAS BAJAS COINCIDEN PERFECTAMENTE\n`;
    }
    reporte += '\n';
  }

  // INGRESOS del mes
  if (altasE.length > 0) {
    reporte += `INGRESOS DEL MES (Excel=${altasE.length}, Supabase=${altasSupabasePorMes[key] || 0})\n`;
    reporte += lineaSimple + '\n';

    const diff = altasE.length - (altasSupabasePorMes[key] || 0);
    if (diff !== 0) {
      reporte += `⚠️  DIFERENCIA: ${diff > 0 ? '+' : ''}${diff} (Excel tiene ${diff > 0 ? 'mas' : 'menos'})\n\n`;
      reporte += 'EMPLEADOS EN EXCEL:\n';
      altasE.forEach(emp => {
        reporte += `   • ID: ${padLeft(emp.numero_empleado, 5)}  |  Fecha: ${emp.fecha_ingreso}  |  Nombre: ${emp.nombre}\n`;
      });
    } else {
      reporte += `✅ CANTIDADES COINCIDEN (${altasE.length} ingresos)\n`;
    }
    reporte += '\n';
  }
});

reporte += '\n' + linea + '\n';
reporte += '                                 FIN DEL REPORTE DESGLOSADO\n';
reporte += linea + '\n';

// Guardar
fs.writeFileSync('./REPORTE_DESGLOSE_EMPLEADOS.txt', reporte);
console.log('✅ Reporte desglosado generado: REPORTE_DESGLOSE_EMPLEADOS.txt');
console.log('   📋 Ver cada empleado con diferencias mes por mes');
