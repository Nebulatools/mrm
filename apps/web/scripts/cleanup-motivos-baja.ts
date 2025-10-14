import { supabaseAdmin } from '../src/lib/supabase-admin';

async function cleanupMotivosBaja() {
  console.log('🧹 Limpiando registros de motivos_baja 2023-2024...');

  // Get initial count
  const { count: beforeCount } = await supabaseAdmin
    .from('motivos_baja')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Registros antes de limpieza: ${beforeCount}`);

  // Delete records from 2023 (incorrect data - employee names in tipo)
  const { error: error2023 } = await supabaseAdmin
    .from('motivos_baja')
    .delete()
    .gte('fecha_baja', '2023-01-01')
    .lt('fecha_baja', '2024-01-01');

  if (error2023) {
    console.error('❌ Error eliminando 2023:', error2023);
    process.exit(1);
  }
  console.log('✅ Registros 2023 eliminados');

  // Delete records from 2024 (incorrect data - employee names in tipo)
  const { error: error2024 } = await supabaseAdmin
    .from('motivos_baja')
    .delete()
    .gte('fecha_baja', '2024-01-01')
    .lt('fecha_baja', '2025-01-01');

  if (error2024) {
    console.error('❌ Error eliminando 2024:', error2024);
    process.exit(1);
  }
  console.log('✅ Registros 2024 eliminados');

  // Verify final count
  const { count: afterCount } = await supabaseAdmin
    .from('motivos_baja')
    .select('*', { count: 'exact', head: true });

  const deleted = (beforeCount || 0) - (afterCount || 0);

  console.log('✅ Limpieza completada');
  console.log(`📊 Registros eliminados: ${deleted}`);
  console.log(`📊 Registros restantes (solo 2025): ${afterCount}`);

  process.exit(0);
}

cleanupMotivosBaja();
