#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Leyendo tu base de datos...\n');

  // 1. User profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*');

  console.log('👥 USER PROFILES:', profiles?.length, 'registros');
  console.table(profiles);

  // 2. Empleados
  const { data: empleados } = await supabase
    .from('empleados_sftp')
    .select('*')
    .limit(5);

  console.log('\n👔 EMPLEADOS_SFTP (primeros 5):');
  console.table(empleados?.map(e => ({
    numero: e.numero_empleado,
    nombre: e.nombre_completo,
    empresa: e.empresa,
    puesto: e.puesto,
    activo: e.activo
  })));

  // 3. Conteo por empresa
  const { data: empresas } = await supabase
    .from('empleados_sftp')
    .select('empresa')
    .not('empresa', 'is', null);

  const empresaCounts = {};
  empresas?.forEach(e => {
    empresaCounts[e.empresa] = (empresaCounts[e.empresa] || 0) + 1;
  });

  console.log('\n🏢 EMPLEADOS POR EMPRESA:');
  Object.entries(empresaCounts).forEach(([empresa, count]) => {
    console.log(`   ${empresa}: ${count} empleados`);
  });

  // 4. Auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  console.log('\n🔐 AUTH USERS:', authUsers.users.length, 'usuarios');
  console.table(authUsers.users.map(u => ({
    email: u.email,
    created: new Date(u.created_at).toLocaleDateString()
  })));
}

main();
