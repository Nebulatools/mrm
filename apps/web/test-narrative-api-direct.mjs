/**
 * Test directo de API de narrativa - Diciembre 2025
 * Prueba los 4 tabs con datos reales sin UI
 */

import fs from 'fs';

const API_URL = 'http://localhost:3000/api/narrative';

// Datos reales de Diciembre 2025 (obtenidos de Supabase):
// - 375 activos
// - 17 bajas
// - 902 incidencias (239 empleados, 637 vacaciones, 161 faltas, 63 permisos, 41 salud)
// - 3 negocios, 32 áreas, 18 departamentos, 178 puestos, 2 clasificaciones, 3 ubicaciones

const payloads = {
  resumen: {
    contextData: {
      kpisRotacion: {
        rotacionMensual: 4.53, // 17 bajas / 375 activos prom
        rotacionMensualVoluntaria: 3.47,
        rotacionMensualClaves: 1.06,
        rotacionMensualAnterior: 3.89,
        rotacionMensualVariacion: 16.45,
        rotacionAcumulada: 48.23,
        rotacionAnioActual: 48.23,
        bajasVoluntarias: 13,
        bajasInvoluntarias: 4,
        activosPromedio: 375,
        ingresosMes: 8,
        antigPromMesesActual: 38
      },
      filtrosActivos: {
        empresas: [],
        areas: [],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        poblacionFiltrada: 375,
        poblacionTotal: 375
      },
      periodLabel: 'Diciembre 2025',
      filtersCount: 0
    },
    userLevel: 'manager',
    section: 'overview'
  },

  personal: {
    contextData: {
      headcountActual: 375,
      headcountAnterior: 369,
      headcountVariacion: 1.63,
      ingresosMes: 8,
      bajasMes: 17,
      antigPromMeses: 38,
      distribucionPorArea: { VENTAS: 85, OPERACIONES: 145, SOPORTE: 75, ADMIN: 70 },
      distribucionPorDepartamento: { RH: 12, TI: 18, VENTAS: 85 },
      filtrosActivos: {
        poblacionFiltrada: 375,
        poblacionTotal: 375
      },
      periodLabel: 'Diciembre 2025',
      filtersCount: 0
    },
    userLevel: 'manager',
    section: 'personal'
  },

  incidencias: {
    contextData: {
      incidenciasTotales: 902,
      empleadosConIncidencias: 239,
      faltasPct: 0.53, // 161 faltas / 30375 días-empleado estimados
      saludPct: 0.13,
      permisosPct: 0.21,
      vacacionesPct: 2.10,
      incidenciasPorEmpleado: 2.41, // 902 / 375
      diasLaborados: 30375, // 375 emp * 81 días laborables
      filtrosActivos: {
        poblacionFiltrada: 375,
        poblacionTotal: 375
      },
      periodLabel: 'Diciembre 2025',
      filtersCount: 0
    },
    userLevel: 'manager',
    section: 'incidents'
  },

  rotacion: {
    contextData: {
      rotacionMensualTotal: 4.53,
      rotacionMensualVoluntaria: 3.47,
      rotacionMensualInvoluntaria: 1.06,
      bajasDelMes: 17,
      bajasVoluntarias: 13,
      bajasInvoluntarias: 4,
      motivosDesglose: {
        'Baja Voluntaria': 10,
        'Abandono': 2,
        'Rescisión por desempeño': 3,
        'Término del contrato': 1,
        'Otra razón': 1
      },
      antiguedadPromedio: 38,
      filtrosActivos: {
        poblacionFiltrada: 375,
        poblacionTotal: 375
      },
      periodLabel: 'Diciembre 2025',
      filtersCount: 0
    },
    userLevel: 'manager',
    section: 'retention'
  }
};

const testResults = [];

async function testNarrative(tabName, payload) {
  console.log(`\n🧪 Probando: ${tabName} · Nivel ${payload.userLevel === 'manager' ? 'Ejecutivo' : 'Detalle'}`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const narrative = data.text;

    const result = {
      tab: tabName,
      level: payload.userLevel === 'manager' ? 'Ejecutivo' : 'Detalle',
      section: payload.section,
      success: true,
      narrative: narrative,
      length: narrative.length,
      cached: data.cached,
      validations: {
        hasContent: narrative.length > 50,
        mentionsPeriod: narrative.toLowerCase().includes('diciembre') || narrative.toLowerCase().includes('dic'),
        appropriateLength: payload.userLevel === 'manager' ? narrative.length < 600 : narrative.length > 100,
        hasMetrics: /\d+/.test(narrative),
        hasComparison: narrative.toLowerCase().includes('anterior') || narrative.toLowerCase().includes('comparado'),
        hasRecommendation: narrative.toLowerCase().includes('recomend') || narrative.toLowerCase().includes('implementar')|| narrative.toLowerCase().includes('crucial') || narrative.toLowerCase().includes('debe')
      }
    };

    // Validaciones específicas por tab
    const narrativeLower = narrative.toLowerCase();
    switch (payload.section) {
      case 'overview':
        result.validations.correctContext = narrativeLower.includes('rotación') || narrativeLower.includes('general');
        break;
      case 'personal':
        result.validations.correctContext = narrativeLower.includes('empleado') || narrativeLower.includes('headcount') || narrativeLower.includes('activo') || narrativeLower.includes('plantilla');
        break;
      case 'incidents':
        result.validations.correctContext = narrativeLower.includes('incidencia') || narrativeLower.includes('falta') || narrativeLower.includes('ausentismo');
        break;
      case 'retention':
        result.validations.correctContext = narrativeLower.includes('rotación') || narrativeLower.includes('baja') || narrativeLower.includes('voluntaria');
        break;
    }

    const allPassed = Object.values(result.validations).every(v => v === true);
    result.status = allPassed ? 'PASS' : 'WARNING';

    console.log(`✅ Narrativa generada (${narrative.length} chars)`);
    console.log(`📝 "${narrative.substring(0, 150)}..."`);
    console.log(`Validaciones: ${Object.entries(result.validations).filter(([k,v]) => v).length}/${Object.keys(result.validations).length} ✅`);

    testResults.push(result);
    return result;

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    testResults.push({
      tab: tabName,
      level: payload.userLevel === 'manager' ? 'Ejecutivo' : 'Detalle',
      success: false,
      error: error.message
    });
  }
}

// EJECUTAR PRUEBAS
console.log('🚀 INICIANDO AUDITORÍA DE NARRATIVA - DICIEMBRE 2025\n');
console.log('📊 Datos verificados en Supabase:');
console.log('  - 375 empleados activos');
console.log('  - 17 bajas en el mes');
console.log('  - 902 incidencias totales');
console.log('  - 3 negocios, 32 áreas, 18 departamentos, 178 puestos, 2 clasificaciones, 3 ubicaciones');

// Test 1: Resumen - Ejecutivo
await testNarrative('RESUMEN', payloads.resumen);

// Test 2: Resumen - Detalle
await testNarrative('RESUMEN', { ...payloads.resumen, userLevel: 'analyst' });

// Test 3: Personal - Ejecutivo
await testNarrative('PERSONAL', payloads.personal);

// Test 4: Personal - Detalle
await testNarrative('PERSONAL', { ...payloads.personal, userLevel: 'analyst' });

// Test 5: Incidencias - Ejecutivo
await testNarrative('INCIDENCIAS', payloads.incidencias);

// Test 6: Incidencias - Detalle
await testNarrative('INCIDENCIAS', { ...payloads.incidencias, userLevel: 'analyst' });

// Test 7: Rotación - Ejecutivo
await testNarrative('ROTACIÓN', payloads.rotacion);

// Test 8: Rotación - Detalle
await testNarrative('ROTACIÓN', { ...payloads.rotacion, userLevel: 'analyst' });

// GENERAR REPORTE FINAL
console.log('\n\n📊 ============ RESUMEN DE RESULTADOS ============\n');

const passed = testResults.filter(r => r.status === 'PASS').length;
const warnings = testResults.filter(r => r.status === 'WARNING').length;
const failed = testResults.filter(r => !r.success).length;

console.log(`Total: ${testResults.length} pruebas`);
console.log(`✅ Exitosas: ${passed}`);
console.log(`⚠️ Con advertencias: ${warnings}`);
console.log(`❌ Fallidas: ${failed}`);
console.log(`📈 Tasa de éxito: ${((passed / testResults.length) * 100).toFixed(1)}%`);

// Guardar reporte en archivo
const report = {
  fecha: new Date().toISOString(),
  periodo: 'Diciembre 2025',
  datosReales: {
    activos: 375,
    bajas: 17,
    incidencias: 902,
    filtrosDisponibles: { negocios: 3, areas: 32, departamentos: 18, puestos: 178, clasificaciones: 2, ubicaciones: 3 }
  },
  resultados: testResults,
  resumen: {
    total: testResults.length,
    exitosas: passed,
    advertencias: warnings,
    fallidas: failed,
    tasaExito: `${((passed / testResults.length) * 100).toFixed(1)}%`
  }
};

fs.writeFileSync('test-results/narrativa-api-test-results.json', JSON.stringify(report, null, 2));
console.log('\n📄 Reporte guardado en: test-results/narrativa-api-test-results.json');

// Mostrar tabla de resultados
console.log('\n\n📋 DETALLE POR PRUEBA:\n');
testResults.forEach((r, i) => {
  console.log(`${i+1}. ${r.tab} · ${r.level}: ${r.status || 'FAIL'}`);
  if (r.narrative) {
    console.log(`   Longitud: ${r.length} chars`);
    console.log(`   Validaciones: ${Object.entries(r.validations).filter(([k,v]) => v).map(([k]) => k).join(', ')}`);
  }
  if (r.error) {
    console.log(`   Error: ${r.error}`);
  }
  console.log('');
});

console.log('✅ AUDITORÍA COMPLETA');
