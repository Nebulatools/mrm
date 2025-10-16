-- 🚨 PRODUCCIÓN: FIX URGENTE para Loading Infinito
-- Proyecto: ufdlwhdrrvktthcxwpzt
-- Fecha: 2025-10-15
--
-- PROBLEMA: Política "Admins can view all profiles" tiene recursión infinita
-- SOLUCIÓN: Usar función is_admin() con SECURITY DEFINER
--
-- INSTRUCCIONES:
-- 1. Ve a: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/sql
-- 2. Copia y pega TODO este archivo
-- 3. Click en RUN
-- 4. Espera confirmación "Migration completed successfully"
-- 5. Recarga tu app en producción

-- ========================================
-- PASO 1: VERIFICAR QUE is_admin() EXISTE
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION '❌ ERROR: Función is_admin() no existe. Ejecuta EMERGENCY_HOTFIX.sql primero.';
  END IF;

  RAISE NOTICE '✅ Función is_admin() existe';
END $$;

-- ========================================
-- PASO 2: ELIMINAR POLÍTICA CON RECURSIÓN
-- ========================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- ========================================
-- PASO 3: RECREAR POLÍTICA SIN RECURSIÓN
-- ========================================

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());  -- ✅ Sin recursión, usa SECURITY DEFINER

-- ========================================
-- PASO 3.5: CONFIRMAR APLICACIÓN
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Política corregida aplicada';
END $$;

-- ========================================
-- PASO 4: VERIFICACIÓN FINAL
-- ========================================

-- Esta query debe retornar "✅ FIX APLICADO"
SELECT
  policyname,
  CASE
    WHEN qual LIKE '%is_admin()%' AND qual NOT LIKE '%user_profiles%'
    THEN '✅ FIX APLICADO CORRECTAMENTE - Sin recursión'
    WHEN qual LIKE '%user_profiles%'
    THEN '❌ ERROR: Recursión detectada - ' || qual
    ELSE '⚠️ ADVERTENCIA: Policy inesperada - ' || qual
  END as status,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
  AND policyname = 'Admins can view all profiles';

-- ========================================
-- ✅ DONE!
-- ========================================
-- Si ves "✅ FIX APLICADO CORRECTAMENTE", recarga tu app
-- El loading debe desaparecer INMEDIATAMENTE
