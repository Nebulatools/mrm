const XLSX = require('xlsx');
const fs = require('fs');

// ========================================
// 1. LEER MOTIVOS BAJAS EXCEL
// ========================================
console.log('=== LEYENDO MOTIVOS BAJAS EXCEL ===');
const wbBajas = XLSX.readFile('/Users/jaco/Desktop/proyectos/mrm_simple/parches/cruce_1/Motivos Bajas (8).xls');
const sheetBajas = wbBajas.Sheets[wbBajas.SheetNames[0]];
const dataBajas = XLSX.utils.sheet_to_json(sheetBajas, { header: 1 });

const motivosBajasExcel = [];
for (let i = 6; i < dataBajas.length; i++) {
  const row = dataBajas[i];
  if (row && row[3]) { // Si tiene número de empleado
    // Convertir fecha de Excel a Date
    let fecha = row[2];
    if (typeof fecha === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      fecha = new Date(excelEpoch.getTime() + fecha * 86400000);
      fecha = fecha.toISOString().split('T')[0];
    }

    motivosBajasExcel.push({
      numero_empleado: parseInt(row[3]),
      fecha_baja: fecha,
      nombre: row[4],
      tipo: row[8],
      motivo: row[9],
      descripcion: row[11],
      observaciones: row[12] || null
    });
  }
}
console.log(`Total registros Excel Motivos Bajas: ${motivosBajasExcel.length}`);

// ========================================
// 2. LEER VALIDACIÓN EMPLEADOS EXCEL (XLSB)
// ========================================
console.log('\n=== LEYENDO VALIDACIÓN EMPLEADOS EXCEL ===');
let empleadosExcel = [];
try {
  const wbEmpleados = XLSX.readFile('/Users/jaco/Desktop/proyectos/mrm_simple/parches/cruce_1/Validacion Alta de empleados (49).xlsb');
  const sheetEmpleados = wbEmpleados.Sheets[wbEmpleados.SheetNames[0]];
  const dataEmpleados = XLSX.utils.sheet_to_json(sheetEmpleados, { header: 1 });

  // El encabezado está en fila 0
  // Columnas basadas en la estructura vista:
  // 0: Número, 1: Gafete, 2: Apellido Paterno, 3: Apellido Materno, 4: Nombres
  // 11: Fecha Ingreso, 16: Puesto, 18: Departamento, 34: Fecha Baja, 35: Activo

  for (let i = 1; i < dataEmpleados.length; i++) {
    const row = dataEmpleados[i];
    if (row && row[0]) {
      const numEmp = row[0];
      if (typeof numEmp === 'number' || (typeof numEmp === 'string' && !isNaN(parseInt(numEmp)))) {
        // Convertir fecha de Excel si es número
        let fechaIngreso = row[11];
        if (typeof fechaIngreso === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          fechaIngreso = new Date(excelEpoch.getTime() + fechaIngreso * 86400000);
          fechaIngreso = fechaIngreso.toISOString().split('T')[0];
        }

        let fechaBaja = row[34];
        if (typeof fechaBaja === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          fechaBaja = new Date(excelEpoch.getTime() + fechaBaja * 86400000);
          fechaBaja = fechaBaja.toISOString().split('T')[0];
        }

        empleadosExcel.push({
          numero_empleado: parseInt(numEmp),
          apellido_paterno: row[2] || '',
          apellido_materno: row[3] || '',
          nombres: row[4] || '',
          genero: row[5] || '',
          fecha_ingreso: fechaIngreso,
          fecha_baja: fechaBaja || null,
          empresa: row[13] || '',
          puesto: row[16] || '',
          departamento: row[18] || '',
          activo: row[35]
        });
      }
    }
  }
  console.log(`Total registros Excel Empleados: ${empleadosExcel.length}`);
} catch (err) {
  console.log('Error leyendo archivo XLSB:', err.message);
}

// ========================================
// 3. LEER DATOS DE SUPABASE (desde archivos guardados)
// ========================================
console.log('\n=== LEYENDO DATOS DE SUPABASE ===');

const motivosBajaFile = '/Users/jaco/.claude/projects/-Users-jaco-Desktop-proyectos-mrm-simple/693dc5cd-028f-4e50-87c3-1f908f5dafdf/tool-results/mcp-supabase-execute_sql-1768892977864.txt';
const empleadosFile = '/Users/jaco/.claude/projects/-Users-jaco-Desktop-proyectos-mrm-simple/693dc5cd-028f-4e50-87c3-1f908f5dafdf/tool-results/mcp-supabase-execute_sql-1768892979388.txt';

let motivosBajaDB = [];
let empleadosDB = [];

try {
  const motivosRaw = fs.readFileSync(motivosBajaFile, 'utf8');
  const motivosJson = JSON.parse(motivosRaw);
  const motivosText = motivosJson[0].text;

  // Extraer el JSON del texto
  const jsonMatch = motivosText.match(/\[.*\]/s);
  if (jsonMatch) {
    motivosBajaDB = JSON.parse(jsonMatch[0]);
  }
  console.log(`Total registros Supabase motivos_baja: ${motivosBajaDB.length}`);
} catch (err) {
  console.log('Error leyendo motivos_baja de Supabase:', err.message);
}

try {
  const empleadosRaw = fs.readFileSync(empleadosFile, 'utf8');
  const empleadosJson = JSON.parse(empleadosRaw);
  const empleadosText = empleadosJson[0].text;

  // Extraer el JSON del texto
  const jsonMatch = empleadosText.match(/\[.*\]/s);
  if (jsonMatch) {
    empleadosDB = JSON.parse(jsonMatch[0]);
  }
  console.log(`Total registros Supabase empleados_sftp: ${empleadosDB.length}`);
} catch (err) {
  console.log('Error leyendo empleados_sftp de Supabase:', err.message);
}

// ========================================
// 4. COMPARAR MOTIVOS BAJA
// ========================================
console.log('\n=== COMPARANDO MOTIVOS BAJA ===');

const excelNums = new Set(motivosBajasExcel.map(m => m.numero_empleado));
const dbNums = new Set(motivosBajaDB.map(m => m.numero_empleado));

const soloEnExcel = motivosBajasExcel.filter(m => !dbNums.has(m.numero_empleado));
const soloEnDB = motivosBajaDB.filter(m => !excelNums.has(m.numero_empleado));

// Registros que están en ambos pero pueden tener diferencias
const enAmbos = motivosBajasExcel.filter(m => dbNums.has(m.numero_empleado));
const diferencias = [];

for (const excelRec of enAmbos) {
  const dbRec = motivosBajaDB.find(d => d.numero_empleado === excelRec.numero_empleado);
  if (dbRec) {
    const diffs = [];
    if (excelRec.fecha_baja !== dbRec.fecha_baja) {
      diffs.push(`fecha_baja: Excel="${excelRec.fecha_baja}" vs DB="${dbRec.fecha_baja}"`);
    }
    if (excelRec.motivo !== dbRec.motivo) {
      diffs.push(`motivo: Excel="${excelRec.motivo}" vs DB="${dbRec.motivo}"`);
    }
    if (diffs.length > 0) {
      diferencias.push({
        numero_empleado: excelRec.numero_empleado,
        nombre: excelRec.nombre,
        diferencias: diffs
      });
    }
  }
}

console.log(`Solo en Excel: ${soloEnExcel.length}`);
console.log(`Solo en DB: ${soloEnDB.length}`);
console.log(`Con diferencias: ${diferencias.length}`);

// ========================================
// 5. COMPARAR EMPLEADOS
// ========================================
console.log('\n=== COMPARANDO EMPLEADOS ===');

const excelEmpNums = new Set(empleadosExcel.map(e => e.numero_empleado));
const dbEmpNums = new Set(empleadosDB.map(e => e.numero_empleado));

const empSoloEnExcel = empleadosExcel.filter(e => !dbEmpNums.has(e.numero_empleado));
const empSoloEnDB = empleadosDB.filter(e => !excelEmpNums.has(e.numero_empleado));

console.log(`Solo en Excel: ${empSoloEnExcel.length}`);
console.log(`Solo en DB: ${empSoloEnDB.length}`);

// ========================================
// 6. GENERAR REPORTE
// ========================================
console.log('\n=== GENERANDO REPORTE ===');

const reporte = `# REPORTE DE CRUCE DE DATOS
## Fecha: ${new Date().toISOString().split('T')[0]}

---

## 1. RESUMEN MOTIVOS DE BAJA

| Fuente | Total Registros |
|--------|-----------------|
| Excel (Motivos Bajas (8).xls) | ${motivosBajasExcel.length} |
| Supabase (motivos_baja) | ${motivosBajaDB.length} |
| **Solo en Excel** | **${soloEnExcel.length}** |
| **Solo en Supabase** | **${soloEnDB.length}** |
| En ambos con diferencias | ${diferencias.length} |

### 1.1 Registros SOLO en Excel (${soloEnExcel.length})
Estos empleados tienen baja registrada en el Excel pero NO están en Supabase:

${soloEnExcel.length > 0 ? `
| # Empleado | Nombre | Fecha Baja | Motivo |
|------------|--------|------------|--------|
${soloEnExcel.map(r => `| ${r.numero_empleado} | ${r.nombre || ''} | ${r.fecha_baja} | ${r.motivo} |`).join('\n')}
` : '*Ninguno*'}

### 1.2 Registros SOLO en Supabase (${soloEnDB.length})
Estos empleados tienen baja en Supabase pero NO están en el Excel actual:

${soloEnDB.length > 0 ? `
| # Empleado | Fecha Baja | Motivo |
|------------|------------|--------|
${soloEnDB.slice(0, 100).map(r => `| ${r.numero_empleado} | ${r.fecha_baja} | ${r.motivo} |`).join('\n')}
${soloEnDB.length > 100 ? `\n... y ${soloEnDB.length - 100} más` : ''}
` : '*Ninguno*'}

### 1.3 Diferencias en registros que están en ambos (${diferencias.length})
${diferencias.length > 0 ? `
| # Empleado | Nombre | Diferencias |
|------------|--------|-------------|
${diferencias.map(r => `| ${r.numero_empleado} | ${r.nombre} | ${r.diferencias.join('; ')} |`).join('\n')}
` : '*Sin diferencias encontradas*'}

---

## 2. RESUMEN EMPLEADOS

| Fuente | Total Registros |
|--------|-----------------|
| Excel (Validacion Alta de empleados.xlsb) | ${empleadosExcel.length} |
| Supabase (empleados_sftp) | ${empleadosDB.length} |
| **Solo en Excel** | **${empSoloEnExcel.length}** |
| **Solo en Supabase** | **${empSoloEnDB.length}** |

### 2.1 Empleados SOLO en Excel (${empSoloEnExcel.length})
Estos empleados están en el Excel pero NO en Supabase:

${empSoloEnExcel.length > 0 ? `
| # Empleado | Nombre Completo | Empresa | Puesto |
|------------|-----------------|---------|--------|
${empSoloEnExcel.slice(0, 100).map(r => `| ${r.numero_empleado} | ${r.apellido_paterno} ${r.apellido_materno}, ${r.nombres} | ${r.empresa} | ${r.puesto} |`).join('\n')}
${empSoloEnExcel.length > 100 ? `\n... y ${empSoloEnExcel.length - 100} más` : ''}
` : '*Ninguno*'}

### 2.2 Empleados SOLO en Supabase (${empSoloEnDB.length})
Estos empleados están en Supabase pero NO en el Excel actual:

${empSoloEnDB.length > 0 ? `
| # Empleado | Apellidos | Nombres | Activo |
|------------|-----------|---------|--------|
${empSoloEnDB.slice(0, 100).map(r => `| ${r.numero_empleado} | ${r.apellidos} | ${r.nombres} | ${r.activo ? 'Sí' : 'No'} |`).join('\n')}
${empSoloEnDB.length > 100 ? `\n... y ${empSoloEnDB.length - 100} más` : ''}
` : '*Ninguno*'}

---

## 3. CONCLUSIONES Y ACCIONES RECOMENDADAS

### Para Motivos de Baja:
${soloEnExcel.length > 0 ? `- **ACCIÓN REQUERIDA**: Hay ${soloEnExcel.length} registros de baja en Excel que NO están en Supabase. Se deben importar.` : '- ✅ Todos los registros del Excel están en Supabase.'}
${soloEnDB.length > 0 ? `- **INFO**: Hay ${soloEnDB.length} registros en Supabase que no están en este Excel (pueden ser de importaciones anteriores o rangos de fecha diferentes).` : ''}
${diferencias.length > 0 ? `- **REVISAR**: Hay ${diferencias.length} registros con diferencias entre Excel y Supabase.` : '- ✅ Los registros coincidentes tienen los mismos datos.'}

### Para Empleados:
${empSoloEnExcel.length > 0 ? `- **ACCIÓN REQUERIDA**: Hay ${empSoloEnExcel.length} empleados en Excel que NO están en Supabase. Se deben importar.` : '- ✅ Todos los empleados del Excel están en Supabase.'}
${empSoloEnDB.length > 0 ? `- **INFO**: Hay ${empSoloEnDB.length} empleados en Supabase que no están en este Excel (pueden ser empleados dados de baja no incluidos en el reporte).` : ''}

---

## 4. NÚMEROS DE EMPLEADO PARA REFERENCIA RÁPIDA

### Bajas solo en Excel (para importar):
${soloEnExcel.length > 0 ? soloEnExcel.map(r => r.numero_empleado).join(', ') : 'Ninguno'}

### Empleados solo en Excel (para importar):
${empSoloEnExcel.length > 0 ? empSoloEnExcel.map(r => r.numero_empleado).join(', ') : 'Ninguno'}

---
*Reporte generado automáticamente el ${new Date().toISOString()}*
`;

fs.writeFileSync('/Users/jaco/Desktop/proyectos/mrm_simple/REPORTE_CRUCE_DATOS.md', reporte);
console.log('Reporte guardado en: REPORTE_CRUCE_DATOS.md');

// También guardar datos detallados en JSON
const datosDetallados = {
  fechaReporte: new Date().toISOString(),
  motivosBaja: {
    totalExcel: motivosBajasExcel.length,
    totalDB: motivosBajaDB.length,
    soloEnExcel,
    soloEnDB,
    diferencias
  },
  empleados: {
    totalExcel: empleadosExcel.length,
    totalDB: empleadosDB.length,
    soloEnExcel: empSoloEnExcel,
    soloEnDB: empSoloEnDB
  }
};

fs.writeFileSync('/Users/jaco/Desktop/proyectos/mrm_simple/REPORTE_CRUCE_DATOS.json', JSON.stringify(datosDetallados, null, 2));
console.log('Datos detallados guardados en: REPORTE_CRUCE_DATOS.json');
