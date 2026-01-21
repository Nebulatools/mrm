const XLSX = require('xlsx');
const fs = require('fs');

// Leer archivos Excel
console.log('Leyendo archivos Excel...\n');

// 1. Leer Motivos Bajas
const motivosPath = './Motivos Bajas (8).xls';
const workbookMotivos = XLSX.readFile(motivosPath);
const sheetMotivos = workbookMotivos.Sheets[workbookMotivos.SheetNames[0]];
const dataMotivos = XLSX.utils.sheet_to_json(sheetMotivos);

console.log(`📄 Motivos Bajas (8).xls:`);
console.log(`   - Registros: ${dataMotivos.length}`);
console.log(`   - Columnas: ${Object.keys(dataMotivos[0] || {}).join(', ')}`);
console.log(`   - Primera fila:`, dataMotivos[0]);
console.log('');

// 2. Leer Validacion Alta de empleados
const altasPath = './Validacion Alta de empleados (49).xlsb';
const workbookAltas = XLSX.readFile(altasPath);
const sheetAltas = workbookAltas.Sheets[workbookAltas.SheetNames[0]];
const dataAltas = XLSX.utils.sheet_to_json(sheetAltas);

console.log(`📄 Validacion Alta de empleados (49).xlsb:`);
console.log(`   - Registros: ${dataAltas.length}`);
console.log(`   - Columnas: ${Object.keys(dataAltas[0] || {}).join(', ')}`);
console.log(`   - Primera fila:`, dataAltas[0]);
console.log('');

// Guardar datos en JSON para análisis
fs.writeFileSync('./motivos_bajas_excel.json', JSON.stringify(dataMotivos, null, 2));
fs.writeFileSync('./altas_empleados_excel.json', JSON.stringify(dataAltas, null, 2));

console.log('✅ Datos extraídos y guardados en JSON');
console.log('   - motivos_bajas_excel.json');
console.log('   - altas_empleados_excel.json');
