-- 🚨 FIX FINAL: Eliminar recursión en política RLS
-- Proyecto: ufdlwhdrrvktthcxwpzt
-- Problema: Browser client hace timeout esperando query que nunca termina
-- Causa: Política "Admins can view all profiles" tiene recursión infinita
--
-- EJECUTA ESTE SCRIPT EN:
-- https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/sql
--
-- Después de ejecutar, recarga tu app → loading desaparece INMEDIATAMENTE

-- ========================================
-- ELIMINAR POLÍTICA CON RECURSIÓN
-- ========================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- ========================================
-- RECREAR POLÍTICA SIN RECURSIÓN
-- ========================================

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());

-- ========================================
-- VERIFICAR QUE EL FIX ESTÁ APLICADO
-- ========================================

SELECT
  policyname,
  CASE
    WHEN qual LIKE '%is_admin()%' AND qual NOT LIKE '%user_profiles%'
    THEN '✅ FIX APLICADO - Sin recursión'
    WHEN qual LIKE '%user_profiles%'
    THEN '❌ RECURSIÓN DETECTADA'
    ELSE '⚠️ Revisar: ' || qual
  END as status,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
  AND policyname = 'Admins can view all profiles';

-- Resultado esperado: "✅ FIX APLICADO - Sin recursión"
