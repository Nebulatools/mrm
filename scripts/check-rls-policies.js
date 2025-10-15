#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO: Verificar políticas RLS que causan deadlock
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('🔍 Diagnóstico de Políticas RLS\n');

  try {
    // Verificar políticas usando una query SQL raw
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual as condition
        FROM pg_policies
        WHERE tablename = 'user_profiles'
        ORDER BY policyname;
      `
    });

    if (error) {
      console.log('⚠️  No se pudo ejecutar query directa.');
      console.log('📋 Ejecuta esto manualmente en Supabase SQL Editor:\n');
      console.log(`
SELECT
  tablename,
  policyname,
  cmd as operacion,
  qual as condicion
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
      `.trim());
      console.log('\n');
      process.exit(1);
    }

    console.log('✅ Políticas RLS encontradas:\n');
    console.table(data);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 EJECUTA MANUALMENTE en Supabase SQL Editor:\n');
    console.log(`
-- Verificar políticas RLS
SELECT
  tablename,
  policyname,
  cmd as operacion,
  qual as condicion
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Verificar funciones helper
SELECT
  proname as funcion,
  prosecdef as security_definer
FROM pg_proc
WHERE proname IN ('user_empresa', 'is_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `.trim());
    console.log('\n');
  }
}

main();
