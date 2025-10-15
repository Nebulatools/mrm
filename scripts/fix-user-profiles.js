#!/usr/bin/env node

/**
 * 🚨 EMERGENCY FIX: Crear user_profiles y resolver loading infinito
 *
 * Ejecutar con: node scripts/fix-user-profiles.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Verifica que apps/web/.env.local tenga:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

const SQL_FIX = `
-- Crear tabla user_profiles si no existe
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  empresa TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política simple sin recursión
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Funciones helper con SECURITY DEFINER
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

-- RLS en empleados_sftp
ALTER TABLE empleados_sftp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all empleados" ON empleados_sftp;
CREATE POLICY "Admin can view all empleados"
  ON empleados_sftp FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own empresa empleados" ON empleados_sftp;
CREATE POLICY "Users can view own empresa empleados"
  ON empleados_sftp FOR SELECT
  USING (empresa = public.user_empresa());

-- RLS en motivos_baja
ALTER TABLE motivos_baja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all motivos_baja" ON motivos_baja;
CREATE POLICY "Admin can view all motivos_baja"
  ON motivos_baja FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own empresa motivos_baja" ON motivos_baja;
CREATE POLICY "Users can view own empresa motivos_baja"
  ON motivos_baja FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados_sftp
      WHERE empleados_sftp.numero_empleado = motivos_baja.numero_empleado
      AND empleados_sftp.empresa = public.user_empresa()
    )
  );

-- RLS en asistencia_diaria
ALTER TABLE asistencia_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all asistencia" ON asistencia_diaria;
CREATE POLICY "Admin can view all asistencia"
  ON asistencia_diaria FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own empresa asistencia" ON asistencia_diaria;
CREATE POLICY "Users can view own empresa asistencia"
  ON asistencia_diaria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados_sftp
      WHERE empleados_sftp.numero_empleado = asistencia_diaria.numero_empleado
      AND empleados_sftp.empresa = public.user_empresa()
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_empresa ON user_profiles(empresa);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_empleados_empresa ON empleados_sftp(empresa);
CREATE INDEX IF NOT EXISTS idx_motivos_baja_numero ON motivos_baja(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_asistencia_numero ON asistencia_diaria(numero_empleado);

-- Trigger para auto-crear perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, empresa)
  VALUES (
    new.id,
    new.email,
    CASE
      WHEN new.email LIKE '%admin%' THEN 'admin'
      ELSE 'user'
    END,
    CASE
      WHEN new.email LIKE '%admin%' THEN NULL
      WHEN new.email LIKE '%monterrey%' THEN 'MOTO REPUESTOS MONTERREY'
      WHEN new.email LIKE '%total%' THEN 'MOTO TOTAL'
      WHEN new.email LIKE '%norte%' THEN 'REPUESTOS Y MOTOCICLETAS DEL NORTE'
      ELSE NULL
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insertar perfiles existentes
INSERT INTO user_profiles (id, email, role, empresa)
SELECT
  id,
  email,
  CASE
    WHEN email = 'admin@mrm.com' THEN 'admin'
    ELSE 'user'
  END as role,
  CASE
    WHEN email = 'admin@mrm.com' THEN NULL
    WHEN email = 'monterrey@mrm.com' THEN 'MOTO REPUESTOS MONTERREY'
    WHEN email = 'total@mrm.com' THEN 'MOTO TOTAL'
    WHEN email = 'norte@mrm.com' THEN 'REPUESTOS Y MOTOCICLETAS DEL NORTE'
  END as empresa
FROM auth.users
WHERE email IN ('admin@mrm.com', 'monterrey@mrm.com', 'total@mrm.com', 'norte@mrm.com')
ON CONFLICT (id) DO NOTHING;
`;

async function main() {
  console.log('🚀 Iniciando fix de user_profiles...\n');
  console.log('📡 Conectando a:', supabaseUrl);
  console.log('');

  console.log('⚠️  NOTA IMPORTANTE:');
  console.log('   Este script NO puede ejecutar SQL DDL (CREATE TABLE, etc.)');
  console.log('   Solo puede insertar datos en tablas existentes.\n');
  console.log('👉 Para crear las tablas y políticas RLS:');
  console.log('   1. Ve a: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/sql');
  console.log('   2. Copia TODO el contenido de: supabase/EMERGENCY_HOTFIX.sql');
  console.log('   3. Pégalo y click en RUN');
  console.log('   4. Luego ejecuta este script para verificar\n');
  console.log('─'.repeat(60));

  try {
    // Verificar si la tabla existe intentando leer de ella
    console.log('\n🔍 Verificando si user_profiles existe...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('email, role, empresa')
      .limit(10);

    if (profilesError) {
      if (profilesError.code === 'PGRST204' || profilesError.message.includes('relation') || profilesError.message.includes('does not exist')) {
        console.error('\n❌ La tabla user_profiles NO EXISTE');
        console.log('\n📋 EJECUTA ESTO PRIMERO:');
        console.log('1. Ve a: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/sql');
        console.log('2. Abre el archivo: supabase/EMERGENCY_HOTFIX.sql');
        console.log('3. Copia TODO su contenido');
        console.log('4. Pégalo en el SQL Editor de Supabase');
        console.log('5. Click en RUN (botón verde)\n');
        process.exit(1);
      }
      throw profilesError;
    }

    console.log(`✅ Tabla user_profiles existe (${profiles.length} perfiles encontrados)\n`);

    if (profiles.length === 0) {
      console.log('⚠️  La tabla está vacía. Insertando perfiles...');

      // Obtener usuarios de auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error('❌ Error obteniendo usuarios:', authError.message);
        process.exit(1);
      }

      const targetEmails = ['admin@mrm.com', 'monterrey@mrm.com', 'total@mrm.com', 'norte@mrm.com'];
      const usersToInsert = authUsers.users.filter(u => targetEmails.includes(u.email));

      if (usersToInsert.length === 0) {
        console.log('❌ No se encontraron usuarios en auth.users');
        console.log('   Verifica que los usuarios estén creados en Authentication');
        process.exit(1);
      }

      // Insertar perfiles
      const profilesToInsert = usersToInsert.map(user => ({
        id: user.id,
        email: user.email,
        role: user.email === 'admin@mrm.com' ? 'admin' : 'user',
        empresa: user.email === 'admin@mrm.com' ? null :
                 user.email === 'monterrey@mrm.com' ? 'MOTO REPUESTOS MONTERREY' :
                 user.email === 'total@mrm.com' ? 'MOTO TOTAL' :
                 user.email === 'norte@mrm.com' ? 'REPUESTOS Y MOTOCICLETAS DEL NORTE' : null
      }));

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert(profilesToInsert);

      if (insertError) {
        console.error('❌ Error insertando perfiles:', insertError.message);
        process.exit(1);
      }

      console.log(`✅ ${profilesToInsert.length} perfiles insertados correctamente\n`);

      // Volver a leer para mostrar
      const { data: newProfiles } = await supabase
        .from('user_profiles')
        .select('email, role, empresa')
        .order('email');

      profiles = newProfiles;
    }

    console.log('✅ Perfiles en user_profiles:\n');
    console.log('   Email                      | Role   | Empresa');
    console.log('   ' + '─'.repeat(75));
    profiles.forEach(profile => {
      const empresaDisplay = profile.empresa || '(TODAS - admin)';
      console.log(`   ${profile.email.padEnd(27)} | ${profile.role.padEnd(6)} | ${empresaDisplay}`);
    });

    console.log('\n🎉 ¡VERIFICACIÓN COMPLETADA!');
    console.log('👉 Recarga tu app en el navegador (Cmd+R)');
    console.log('   El "Cargando..." debería desaparecer ahora.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 Si el error persiste, ejecuta manualmente en Supabase SQL Editor:');
    console.log('   supabase/EMERGENCY_HOTFIX.sql\n');
    process.exit(1);
  }
}

main();
