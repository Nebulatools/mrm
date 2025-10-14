-- Script de Verificación: RLS Policies de user_profiles
-- Ejecutar en Supabase Dashboard → SQL Editor para diagnosticar el problema

-- ========================================
-- 1. VERIFICAR ESTADO ACTUAL DE RLS
-- ========================================

-- Verificar que RLS está habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- Resultado esperado: rls_enabled = true

-- ========================================
-- 2. LISTAR POLICIES ACTUALES
-- ========================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ========================================
-- 3. VERIFICAR FUNCIONES HELPER
-- ========================================

-- Verificar que is_admin() existe y tiene SECURITY DEFINER
SELECT
  proname as function_name,
  prosecdef as has_security_definer,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname IN ('is_admin', 'user_empresa')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Resultado esperado: has_security_definer = true para ambas funciones

-- ========================================
-- 4. DETECTAR PROBLEMA DE RECURSIÓN
-- ========================================

-- Esta query verifica si la policy "Admins can view all profiles"
-- tiene recursión infinita (consulta user_profiles dentro del USING clause)

SELECT
  policyname,
  CASE
    WHEN qual LIKE '%user_profiles%'
    THEN '❌ RECURSIÓN DETECTADA - Policy consulta user_profiles sin SECURITY DEFINER'
    ELSE '✅ OK - Policy usa función con SECURITY DEFINER'
  END as status,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
  AND policyname = 'Admins can view all profiles';

-- ❌ PROBLEMA: Si usando_clause contiene "user_profiles", hay recursión
-- ✅ SOLUCIÓN: Debe contener "public.is_admin()" solamente

-- ========================================
-- 5. TEST DE PERFORMANCE (Solo para debug)
-- ========================================

-- ADVERTENCIA: No ejecutar si el problema existe (causará timeout)
-- Solo ejecutar DESPUÉS de aplicar el fix

-- Test 1: Listar perfiles (debe responder en <100ms)
\timing on
SELECT id, email, role, empresa FROM user_profiles LIMIT 5;
\timing off

-- Test 2: Verificar que función is_admin() responde rápido
\timing on
SELECT public.is_admin() as is_admin_user;
\timing off

-- ========================================
-- 6. SOLUCIÓN RÁPIDA (Emergency Hotfix)
-- ========================================

-- Si estás en producción y necesitas fix inmediato,
-- ejecuta esta migración:

/*
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());
*/

-- Descomenta las líneas de arriba ↑ y ejecuta si necesitas fix urgente

-- ========================================
-- 7. VERIFICACIÓN POST-FIX
-- ========================================

-- Después de aplicar la migración 20251014_fix_user_profiles_rls_deadlock.sql,
-- ejecutar esta query para confirmar que el fix está aplicado:

SELECT
  policyname,
  CASE
    WHEN qual = '(public.is_admin())'
    THEN '✅ FIX APLICADO CORRECTAMENTE'
    ELSE '❌ FIX NO APLICADO - Revisar migración'
  END as fix_status,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
  AND policyname = 'Admins can view all profiles';

-- Resultado esperado:
-- fix_status: ✅ FIX APLICADO CORRECTAMENTE
-- using_clause: (public.is_admin())
