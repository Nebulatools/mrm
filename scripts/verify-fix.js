#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Verificando si el fix se aplicó correctamente...\n');

  // Simular una consulta como usuario autenticado
  console.log('1️⃣ Probando query con ANON KEY (como el frontend)...');

  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Intentar login
  const { data: authData, error: authError } = await anonSupabase.auth.signInWithPassword({
    email: 'admin@mrm.com',
    password: 'Admin123!MRM'
  });

  if (authError) {
    console.error('❌ Error de autenticación:', authError.message);
    console.log('Verifica la contraseña del usuario admin@mrm.com');
    return;
  }

  console.log('✅ Login exitoso:', authData.user.email);

  // Ahora intentar leer el perfil con el usuario autenticado
  const { data: profile, error: profileError } = await anonSupabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error('❌ Error leyendo perfil:', profileError);
    console.log('\n🚨 ESTE ES EL PROBLEMA:');
    console.log('   Las políticas RLS NO se aplicaron correctamente');
    console.log('\n📋 SOLUCIÓN:');
    console.log('   1. Ve al SQL Editor de Supabase');
    console.log('   2. Ejecuta SOLO esta query:\n');
    console.log(`
-- Crear política simple
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Crear funciones helper
CREATE OR REPLACE FUNCTION public.user_empresa()
RETURNS TEXT AS $$
  SELECT empresa FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
    `.trim());
    console.log('\n');
    return;
  }

  console.log('✅ Perfil leído correctamente:', profile);
  console.log('\n🎉 ¡EL FIX FUNCIONÓ!');
  console.log('👉 Recarga tu navegador (Cmd+Shift+R para limpiar cache)');
  console.log('   y borra cookies de Supabase si el problema persiste.\n');
}

main();
