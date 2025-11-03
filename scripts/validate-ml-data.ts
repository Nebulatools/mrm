#!/usr/bin/env tsx
/**
 * Script de Validación de Datos para Modelo de Rotación
 *
 * Ejecutar: npx tsx scripts/validate-ml-data.ts
 *
 * Verifica si tienes datos suficientes para entrenar el modelo de predicción de rotación.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ValidationResult {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  data?: any;
}

const results: ValidationResult[] = [];

async function runValidation() {
  console.log('🔍 VALIDACIÓN DE DATOS PARA MODELO DE ROTACIÓN\n');
  console.log('='.repeat(80));
  console.log('');

  // 1. Verificar bajas históricas
  console.log('1️⃣  Verificando bajas históricas...');
  const { data: bajas, error: bajasError } = await supabase.rpc('validar_bajas_historicas').single();

  if (bajasError) {
    // Fallback: ejecutar query directamente
    const { data: bajasData, error: bajasError2 } = await supabase
      .from('motivos_baja')
      .select('*', { count: 'exact', head: true });

    if (bajasError2) {
      results.push({
        name: 'Bajas Históricas',
        status: 'fail',
        message: `Error al consultar: ${bajasError2.message}`,
      });
    } else {
      const total = bajasData || 0;
      results.push({
        name: 'Bajas Históricas',
        status: total >= 30 ? 'pass' : 'warning',
        message: `Total de bajas: ${total} ${total >= 30 ? '✅' : '⚠️ (mínimo 30 recomendado)'}`,
        data: { total_bajas: total },
      });
    }
  }

  // 2. Empleados activos
  console.log('2️⃣  Contando empleados activos...');
  const { count: activosCount, error: activosError } = await supabase
    .from('empleados_sftp')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true);

  if (activosError) {
    results.push({
      name: 'Empleados Activos',
      status: 'fail',
      message: `Error: ${activosError.message}`,
    });
  } else {
    results.push({
      name: 'Empleados Activos',
      status: activosCount >= 50 ? 'pass' : 'warning',
      message: `Total activos: ${activosCount} ${activosCount >= 50 ? '✅' : '⚠️ (mínimo 50 recomendado)'}`,
      data: { total_activos: activosCount },
    });
  }

  // 3. Distribución de bajas por mes
  console.log('3️⃣  Analizando distribución temporal de bajas...');
  const { data: distribucion, error: distError } = await supabase
    .from('motivos_baja')
    .select('fecha_baja')
    .gte('fecha_baja', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  if (distError) {
    results.push({
      name: 'Distribución Temporal',
      status: 'fail',
      message: `Error: ${distError.message}`,
    });
  } else {
    const bajasPorMes = distribucion?.reduce((acc: any, b: any) => {
      const mes = new Date(b.fecha_baja).toISOString().substring(0, 7);
      acc[mes] = (acc[mes] || 0) + 1;
      return acc;
    }, {}) || {};

    const mesesConBajas = Object.keys(bajasPorMes).length;
    results.push({
      name: 'Distribución Temporal',
      status: mesesConBajas >= 6 ? 'pass' : 'warning',
      message: `Meses con bajas: ${mesesConBajas}/12 ${mesesConBajas >= 6 ? '✅' : '⚠️'}`,
      data: { meses_con_bajas: mesesConBajas, detalle: bajasPorMes },
    });
  }

  // 4. Incidencias
  console.log('4️⃣  Verificando datos de incidencias...');
  const { data: incidencias, error: inciError } = await supabase
    .from('incidencias')
    .select('emp', { count: 'exact' })
    .gte('fecha', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (inciError) {
    results.push({
      name: 'Datos de Incidencias',
      status: 'warning',
      message: `No se pudieron verificar incidencias: ${inciError.message}`,
    });
  } else {
    const empleadosConIncidencias = new Set(incidencias?.map((i: any) => i.emp)).size || 0;
    const cobertura = activosCount > 0 ? (empleadosConIncidencias / activosCount) * 100 : 0;

    results.push({
      name: 'Datos de Incidencias',
      status: cobertura >= 70 ? 'pass' : 'warning',
      message: `Cobertura: ${cobertura.toFixed(1)}% ${cobertura >= 70 ? '✅' : '⚠️ (70% recomendado)'}`,
      data: { empleados_con_incidencias: empleadosConIncidencias, cobertura_pct: cobertura },
    });
  }

  // 5. Calidad de datos
  console.log('5️⃣  Verificando calidad de datos...');
  const { data: empleadosSinFecha, error: calidadError } = await supabase
    .from('empleados_sftp')
    .select('numero_empleado', { count: 'exact', head: true })
    .is('fecha_ingreso', null);

  if (!calidadError) {
    const sinFecha = empleadosSinFecha || 0;
    results.push({
      name: 'Calidad de Datos',
      status: sinFecha === 0 ? 'pass' : 'warning',
      message: `Empleados sin fecha_ingreso: ${sinFecha} ${sinFecha === 0 ? '✅' : '⚠️'}`,
      data: { empleados_sin_fecha: sinFecha },
    });
  }

  // Mostrar resultados
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESULTADOS DE VALIDACIÓN\n');

  let passes = 0;
  let warnings = 0;
  let fails = 0;

  results.forEach((r) => {
    const icon = r.status === 'pass' ? '✅' : r.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${r.name}: ${r.message}`);
    if (r.data) {
      console.log(`   Datos: ${JSON.stringify(r.data, null, 2)}`);
    }

    if (r.status === 'pass') passes++;
    if (r.status === 'warning') warnings++;
    if (r.status === 'fail') fails++;
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 RESUMEN FINAL\n');
  console.log(`✅ Checks Pasados: ${passes}`);
  console.log(`⚠️  Advertencias: ${warnings}`);
  console.log(`❌ Fallos: ${fails}`);

  console.log('\n📋 RECOMENDACIÓN\n');

  if (fails > 0) {
    console.log('❌ NO LISTO: Hay errores críticos que deben corregirse antes de entrenar.');
    console.log('   Revisa las queries fallidas y verifica la conexión a Supabase.');
  } else if (passes >= 4 && warnings <= 1) {
    console.log('✅ LISTO PARA ENTRENAR: Tienes datos suficientes para el modelo de rotación.');
    console.log('   Puedes proceder con la implementación de ventana deslizante.');
    console.log('\n   Siguiente paso:');
    console.log('   - Implementar corrección del modelo según docs/ml/ROTATION_MODEL_DIAGNOSIS.md');
  } else if (warnings >= 3) {
    console.log('⚠️  DATOS LIMITADOS: Puedes entrenar pero con precaución.');
    console.log('   Considera usar el target proxy temporal mientras recolectas más datos.');
    console.log('\n   Opciones:');
    console.log('   A) Esperar más datos (3-6 meses)');
    console.log('   B) Usar target proxy temporal para demostración');
    console.log('   C) Importar datos históricos si existen');
  } else {
    console.log('⚠️  REVISAR: Algunos checks no pasaron.');
    console.log('   Revisa las advertencias arriba y decide si proceder.');
  }

  console.log('\n' + '='.repeat(80));
}

runValidation().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
