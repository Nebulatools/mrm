import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from apps/web/.env.local
dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔑 Conectando a Supabase...');
console.log('URL:', supabaseUrl);
console.log('Key configurada:', supabaseKey ? 'SÍ' : 'NO');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  try {
    // Consultar incidencias 2025
    console.log('\n📊 Consultando tabla "incidencias" para 2025...');
    // Consultar TODO sin filtro de fecha primero
    console.log('\n🔍 Paso 1: Ver TODAS las fechas disponibles...');
    const { data: allDates } = await supabase
      .from('incidencias')
      .select('fecha')
      .order('fecha', { ascending: true })
      .limit(100);

    if (allDates && allDates.length > 0) {
      console.log(`  Primera fecha: ${allDates[0].fecha}`);
      console.log(`  Última fecha: ${allDates[allDates.length - 1].fecha}`);
    }

    // Ahora consultar 2025
    console.log('\n🔍 Paso 2: Consultar TODO el año 2025...');
    const { data: incidencias, error: incError, count } = await supabase
      .from('incidencias')
      .select('id, emp, fecha, inci', { count: 'exact' })
      .gte('fecha', '2025-01-01')
      .lte('fecha', '2025-12-31')
      .order('fecha')
      .limit(10000); // Aumentar límite

    console.log(`  Total count: ${count}`);
    console.log(`  Registros obtenidos: ${incidencias?.length || 0}`);

    if (incError) {
      console.error('❌ Error:', incError.message);
    } else {
      console.log(`✅ Total registros: ${incidencias?.length || 0}`);

      // Agrupar por mes
      const porMes = {};
      (incidencias || []).forEach(inc => {
        const mes = inc.fecha.substring(0, 7);
        porMes[mes] = (porMes[mes] || 0) + 1;
      });

      console.log('\n📅 Distribución por mes:');
      Object.entries(porMes).sort().forEach(([mes, count]) => {
        console.log(`  ${mes}: ${count} registros`);
      });

      if (incidencias && incidencias.length > 0) {
        console.log('\n🔍 Primeros 5 registros:');
        incidencias.slice(0, 5).forEach(inc => {
          console.log(`  - ID: ${inc.id}, Emp: ${inc.emp}, Fecha: ${inc.fecha}, Tipo: ${inc.inci}`);
        });
      }
    }

    // Consultar asistencia_diaria 2025
    console.log('\n\n📊 Consultando tabla "asistencia_diaria" para 2025...');
    const { data: asistencia, error: asistError } = await supabase
      .from('asistencia_diaria')
      .select('id, numero_empleado, fecha, horas_incidencia')
      .gte('fecha', '2025-01-01')
      .lte('fecha', '2025-12-31')
      .gt('horas_incidencia', 0)
      .order('fecha');

    if (asistError) {
      console.error('❌ Error:', asistError.message);
    } else {
      console.log(`✅ Total registros con incidencias: ${asistencia?.length || 0}`);

      // Agrupar por mes
      const porMes2 = {};
      (asistencia || []).forEach(asist => {
        const mes = asist.fecha.substring(0, 7);
        porMes2[mes] = (porMes2[mes] || 0) + 1;
      });

      console.log('\n📅 Distribución por mes:');
      Object.entries(porMes2).sort().forEach(([mes, count]) => {
        console.log(`  ${mes}: ${count} registros`);
      });

      if (asistencia && asistencia.length > 0) {
        console.log('\n🔍 Primeros 5 registros:');
        asistencia.slice(0, 5).forEach(asist => {
          console.log(`  - ID: ${asist.id}, Emp: ${asist.numero_empleado}, Fecha: ${asist.fecha}, Horas Inc: ${asist.horas_incidencia}`);
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Error general:', error.message);
  }
}

checkData().then(() => {
  console.log('\n✅ Consulta completada');
  process.exit(0);
});
