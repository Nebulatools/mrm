#!/usr/bin/env tsx
/**
 * Test de la query del modelo de rotación
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuery() {
  console.log('🧪 Probando query simplificada del modelo de rotación\n');

  // Query simplificada para probar ventana deslizante
  const query = `
WITH historical_windows AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '365 days',
        CURRENT_DATE - INTERVAL '90 days',
        INTERVAL '1 month'
    )::date AS snapshot_date
),
employee_snapshots AS (
    SELECT
        e.numero_empleado AS employee_id,
        w.snapshot_date,
        e.fecha_baja,
        -- Target: ¿Se dio de baja entre [snapshot_date+1, snapshot_date+90]?
        CASE
            WHEN e.fecha_baja >= w.snapshot_date + INTERVAL '1 day'
             AND e.fecha_baja <= w.snapshot_date + INTERVAL '90 days'
            THEN 1
            ELSE 0
        END AS target_rotacion_90d,
        EXTRACT(EPOCH FROM (w.snapshot_date - e.fecha_ingreso)) / 86400.0 AS tenure_days
    FROM empleados_sftp e
    CROSS JOIN historical_windows w
    WHERE e.fecha_ingreso < w.snapshot_date
      AND (e.fecha_baja IS NULL OR e.fecha_baja >= w.snapshot_date)
)
SELECT
    COUNT(*) as total_snapshots,
    COUNT(DISTINCT employee_id) as empleados_unicos,
    COUNT(DISTINCT snapshot_date) as fechas_snapshot,
    SUM(target_rotacion_90d) as casos_positivos,
    COUNT(*) - SUM(target_rotacion_90d) as casos_negativos,
    ROUND(AVG(tenure_days)::numeric, 1) as tenure_promedio_dias
FROM employee_snapshots;
  `;

  console.log('Ejecutando query...\n');

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) {
    console.error('❌ Error:', error);

    // Intentar con query directa
    console.log('\n🔄 Intentando con función personalizada...\n');

    // Probemos primero con una query más simple
    const { data: simpleData, error: simpleError } = await supabase
      .from('empleados_sftp')
      .select('numero_empleado, fecha_ingreso, fecha_baja', { count: 'exact', head: false })
      .limit(5);

    if (simpleError) {
      console.error('❌ Error con query simple:', simpleError);
    } else {
      console.log('✅ Query simple funcionó:');
      console.log('Primeros 5 empleados:', simpleData);

      // Ahora probemos calcular el target manualmente en TypeScript
      console.log('\n📊 Calculando target manualmente...');

      const { data: allEmpleados, error: allError } = await supabase
        .from('empleados_sftp')
        .select('numero_empleado, fecha_ingreso, fecha_baja');

      if (!allError && allEmpleados) {
        const snapshots: any[] = [];
        const now = new Date();
        const startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const endDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

        // Generar snapshots mensuales
        for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
          const snapshotDate = new Date(d);

          allEmpleados.forEach((emp: any) => {
            const fechaIngreso = new Date(emp.fecha_ingreso);
            const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;

            // Solo empleados activos en snapshot_date
            if (fechaIngreso < snapshotDate && (!fechaBaja || fechaBaja >= snapshotDate)) {
              const snapshot90Later = new Date(snapshotDate);
              snapshot90Later.setDate(snapshot90Later.getDate() + 90);

              const target = fechaBaja &&
                fechaBaja > snapshotDate &&
                fechaBaja <= snapshot90Later ? 1 : 0;

              snapshots.push({
                employee_id: emp.numero_empleado,
                snapshot_date: snapshotDate.toISOString().split('T')[0],
                target_rotacion_90d: target,
                fecha_baja: fechaBaja?.toISOString().split('T')[0] || null,
              });
            }
          });
        }

        const positivos = snapshots.filter(s => s.target_rotacion_90d === 1).length;
        const negativos = snapshots.length - positivos;

        console.log('\n📊 RESULTADOS:');
        console.log(`   Total snapshots: ${snapshots.length}`);
        console.log(`   Empleados únicos: ${new Set(snapshots.map(s => s.employee_id)).size}`);
        console.log(`   Casos positivos (rotación): ${positivos}`);
        console.log(`   Casos negativos (no rotación): ${negativos}`);
        console.log(`   Tasa positiva: ${(positivos / snapshots.length * 100).toFixed(1)}%`);

        if (positivos >= 2) {
          console.log('\n✅ ¡Dataset válido! Tienes suficientes casos positivos para entrenar.');

          // Mostrar algunos ejemplos de casos positivos
          const ejemplosPositivos = snapshots.filter(s => s.target_rotacion_90d === 1).slice(0, 5);
          console.log('\n📝 Ejemplos de casos positivos:');
          ejemplosPositivos.forEach((s, i) => {
            console.log(`   ${i + 1}. Empleado ${s.employee_id} en ${s.snapshot_date} → Baja: ${s.fecha_baja}`);
          });
        } else {
          console.log('\n⚠️  Pocos casos positivos. Necesitas más bajas históricas.');
        }
      }
    }
  } else {
    console.log('✅ Query ejecutada:', data);
  }
}

testQuery().catch(console.error);
