import { supabaseAdmin } from '../src/lib/supabase-admin';

async function cleanupWithSQL() {
  console.log('🧹 Limpiando registros de motivos_baja usando SQL directo...');

  // First, check total count
  const { data: beforeData, error: beforeError } = await supabaseAdmin.rpc('exec_sql', {
    sql: 'SELECT COUNT(*) as total FROM motivos_baja'
  });

  if (beforeError) {
    // Try direct query instead
    const { count } = await supabaseAdmin
      .from('motivos_baja')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Total records (via count): ${count}`);
  } else {
    console.log('📊 Before:', beforeData);
  }

  // Delete using raw SQL
  console.log('🗑️ Ejecutando DELETE para 2023 y 2024...');

  const { data: deleteData, error: deleteError } = await supabaseAdmin.rpc('exec_sql', {
    sql: "DELETE FROM motivos_baja WHERE EXTRACT(YEAR FROM fecha_baja) IN (2023, 2024)"
  });

  if (deleteError) {
    console.error('❌ Error con rpc:', deleteError);
    console.log('Intentando con query builder...');

    // Try with query builder
    const { error: e1 } = await supabaseAdmin
      .from('motivos_baja')
      .delete()
      .gte('fecha_baja', '2023-01-01')
      .lt('fecha_baja', '2024-01-01');

    if (e1) console.error('Error 2023:', e1);
    else console.log('✅ 2023 deleted');

    const { error: e2 } = await supabaseAdmin
      .from('motivos_baja')
      .delete()
      .gte('fecha_baja', '2024-01-01')
      .lt('fecha_baja', '2025-01-01');

    if (e2) console.error('Error 2024:', e2);
    else console.log('✅ 2024 deleted');
  } else {
    console.log('✅ Delete result:', deleteData);
  }

  // Final count
  const { count: afterCount } = await supabaseAdmin
    .from('motivos_baja')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Registros finales: ${afterCount}`);

  process.exit(0);
}

cleanupWithSQL();
