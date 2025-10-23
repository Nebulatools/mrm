import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMonths() {
  console.log('📊 Verificando meses disponibles en tabla "incidencias"...\n');

  // Cargar TODAS las incidencias con paginación
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('incidencias')
      .select('fecha, inci')
      .order('fecha', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('❌ Error:', error.message);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(data);
      from += pageSize;

      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  console.log(`✅ Total de incidencias cargadas: ${allData.length}`);

  if (allData.length > 0) {
    console.log(`📅 Primera fecha: ${allData[0].fecha}`);
    console.log(`📅 Última fecha: ${allData[allData.length - 1].fecha}`);

    // Agrupar por mes
    const porMes = {};
    allData.forEach(inc => {
      const mes = inc.fecha.substring(0, 7); // YYYY-MM
      porMes[mes] = (porMes[mes] || 0) + 1;
    });

    console.log('\n📊 DISTRIBUCIÓN POR MES:');
    console.log('─'.repeat(50));
    Object.entries(porMes).sort().forEach(([mes, count]) => {
      const mesName = {
        '01': 'Enero', '02': 'Febrero', '03': 'Marzo',
        '04': 'Abril', '05': 'Mayo', '06': 'Junio',
        '07': 'Julio', '08': 'Agosto', '09': 'Septiembre',
        '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
      };
      const [year, month] = mes.split('-');
      console.log(`  ${mesName[month]} ${year}: ${count.toLocaleString()} incidencias`);
    });
    console.log('─'.repeat(50));
  } else {
    console.log('⚠️ No hay incidencias en la base de datos');
  }
}

verifyMonths().then(() => {
  console.log('\n✅ Verificación completada\n');
  process.exit(0);
});
