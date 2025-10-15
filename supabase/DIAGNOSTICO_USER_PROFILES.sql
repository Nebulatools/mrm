-- 🔍 DIAGNÓSTICO: ¿Por qué useAuth se queda en "Cargando..."?
-- Copia y pega este script en Supabase SQL Editor

-- ========================================
-- TEST 1: ¿Tiene datos la tabla?
-- ========================================

SELECT
  '🔍 TEST 1: Datos en user_profiles' as test,
  COUNT(*) as total_perfiles
FROM user_profiles;

-- ========================================
-- TEST 2: ¿Qué perfiles existen?
-- ========================================

SELECT
  '👥 TEST 2: Perfiles existentes' as test,
  id,
  email,
  role,
  empresa
FROM user_profiles
ORDER BY email;

-- ========================================
-- TEST 3: ¿Usuarios en auth.users sin perfil?
-- ========================================

SELECT
  '⚠️ TEST 3: Usuarios sin perfil' as test,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- ========================================
-- TEST 4: ¿RLS está habilitado?
-- ========================================

SELECT
  '🔒 TEST 4: Estado RLS' as test,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- ========================================
-- TEST 5: ¿Qué políticas RLS existen?
-- ========================================

SELECT
  '📋 TEST 5: Políticas RLS' as test,
  policyname,
  cmd as operacion,
  qual as condicion
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ========================================
-- TEST 6: ¿Existen las funciones helper?
-- ========================================

SELECT
  '🛠️ TEST 6: Funciones helper' as test,
  proname as nombre_funcion,
  prosecdef as tiene_security_definer
FROM pg_proc
WHERE proname IN ('user_empresa', 'is_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ========================================
-- RESULTADO ESPERADO
-- ========================================
-- TEST 1: Debe retornar 4 perfiles
-- TEST 2: Debe mostrar admin, monterrey, total, norte
-- TEST 3: NO debe mostrar usuarios (lista vacía)
-- TEST 4: Debe mostrar rls_enabled = true
-- TEST 5: Debe mostrar al menos 1 política
-- TEST 6: Debe mostrar 2 funciones con security_definer = true
