-- 🔍 DIAGNÓSTICO: ¿Por qué useAuth se queda en "Cargando..."?
-- Copia y pega en: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/sql

-- ========================================
-- 1. ¿Qué políticas RLS tiene user_profiles?
-- ========================================

SELECT
  'Política RLS' as tipo,
  policyname as nombre,
  cmd as operacion,
  qual as condicion
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ========================================
-- 2. ¿Existen las funciones helper?
-- ========================================

SELECT
  'Función Helper' as tipo,
  proname as nombre,
  prosecdef as tiene_security_definer
FROM pg_proc
WHERE proname IN ('user_empresa', 'is_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ========================================
-- 3. ¿Qué perfiles hay? (con Service Role bypasea RLS)
-- ========================================

SELECT
  'Perfil' as tipo,
  email,
  role,
  empresa
FROM user_profiles
ORDER BY email;

-- ========================================
-- PROBLEMAS COMUNES:
-- ========================================

-- ❌ PROBLEMA: Política recursiva
-- Si ves una policy "Admins can view all profiles" con condición:
-- EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
-- Eso causa DEADLOCK porque consulta user_profiles dentro de su propia policy

-- ✅ SOLUCIÓN: La policy debe usar la función is_admin():
-- USING (public.is_admin())

-- ========================================
-- FIX RÁPIDO si hay recursión:
-- ========================================

-- Descomentar y ejecutar SI ves recursión:
/*
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);
*/
