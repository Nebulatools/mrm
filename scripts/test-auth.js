#!/usr/bin/env node
/**
 * Quick auth/profile test against Supabase using anon key.
 * Uses the four provided credentials to verify:
 * - signInWithPassword works
 * - reading public.user_profiles returns quickly (no hang)
 *
 * Run: node scripts/test-auth.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const USERS = [
  { email: 'admin@mrm.com', password: 'Admin123!MRM', expectRole: 'admin', expectEmpresa: null },
  { email: 'monterrey@mrm.com', password: 'Monterrey123!MRM', expectRole: 'user', expectEmpresa: 'MOTO REPUESTOS MONTERREY' },
  { email: 'total@mrm.com', password: 'Total123!MRM', expectRole: 'user', expectEmpresa: 'MOTO TOTAL' },
  { email: 'norte@mrm.com', password: 'Norte123!MRM', expectRole: 'user', expectEmpresa: 'REPUESTOS Y MOTOCICLETAS DEL NORTE' },
];

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), ms)),
  ]);
}

async function testUser(user) {
  const client = createClient(supabaseUrl, anonKey);
  process.stdout.write(`\n→ Testing ${user.email} ... `);
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signInError) {
    console.error(`\n  ✗ signIn error: ${signInError.message}`);
    return false;
  }
  const uid = signInData.user.id;

  // read profile with timeout 5s
  const profilePromise = client.from('user_profiles').select('*').eq('id', uid).single();
  let profile, profileError;
  try {
    ({ data: profile, error: profileError } = await withTimeout(profilePromise, 5000));
  } catch (e) {
    console.error(`\n  ✗ profile timeout: ${e.message}`);
    return false;
  }
  if (profileError) {
    console.error(`\n  ✗ profile error: ${profileError.message}`);
    return false;
  }
  const roleOk = profile.role === user.expectRole;
  const empresaOk = (profile.empresa || null) === user.expectEmpresa;
  if (!roleOk || !empresaOk) {
    console.error(`\n  ✗ profile mismatch: got role=${profile.role}, empresa=${profile.empresa}`);
    return false;
  }
  console.log('✓ OK');
  await client.auth.signOut();
  return true;
}

(async () => {
  console.log(`Testing Supabase at ${supabaseUrl}`);
  let ok = true;
  for (const u of USERS) {
    const res = await testUser(u);
    ok = ok && res;
  }
  if (!ok) process.exit(1);
})();

