import { createClient } from '@supabase/supabase-js';

async function forceCleanup() {
  console.log('🧹 LIMPIEZA FORZADA de motivos_baja 2023-2024...');

  // Create client with service role key (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Check initial count
  const { count: before } = await supabase
    .from('motivos_baja')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total registros antes: ${before}`);

  // Get year breakdown
  const { data: years } = await supabase
    .from('motivos_baja')
    .select('fecha_baja');

  const yearCounts: Record<string, number> = {};
  years?.forEach(row => {
    const year = new Date(row.fecha_baja).getFullYear();
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });

  console.log('📊 Registros por año:', yearCounts);

  // Delete 2023
  console.log('🗑️ Eliminando 2023...');
  const { count: deleted2023 } = await supabase
    .from('motivos_baja')
    .delete({ count: 'exact' })
    .gte('fecha_baja', '2023-01-01')
    .lt('fecha_baja', '2024-01-01');

  console.log(`✅ Eliminados 2023: ${deleted2023}`);

  // Delete 2024
  console.log('🗑️ Eliminando 2024...');
  const { count: deleted2024 } = await supabase
    .from('motivos_baja')
    .delete({ count: 'exact' })
    .gte('fecha_baja', '2024-01-01')
    .lt('fecha_baja', '2025-01-01');

  console.log(`✅ Eliminados 2024: ${deleted2024}`);

  // Final count
  const { count: after } = await supabase
    .from('motivos_baja')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total registros después: ${after}`);
  console.log(`📊 Total eliminados: ${(before || 0) - (after || 0)}`);

  process.exit(0);
}

forceCleanup();
