-- Migración: Asegurar que NO hay recursión en políticas RLS
-- Fecha: 2025-10-16
-- Descripción: Fix definitivo para evitar loading infinito en producción
-- Ejecutar en: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/sql

-- ========================================
-- ELIMINAR POLÍTICAS CON RECURSIÓN
-- ========================================

-- Esta política causa deadlock si consulta user_profiles dentro de su propio USING clause
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- ========================================
-- RECREAR POLÍTICA SIN RECURSIÓN
-- ========================================

-- CORRECTO: Usa is_admin() que tiene SECURITY DEFINER
-- Esto evita la recursión porque la función se ejecuta con privilegios elevados
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());  -- ✅ Sin recursión

-- ========================================
-- VERIFICAR FUNCIONES HELPER EXISTEN
-- ========================================

-- Verificar que is_admin() existe y tiene SECURITY DEFINER
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND prosecdef = true  -- Debe tener SECURITY DEFINER
  ) THEN
    RAISE EXCEPTION 'Función is_admin() no existe o no tiene SECURITY DEFINER. Ejecutar migración 20250110 primero.';
  END IF;

  RAISE NOTICE '✅ Función is_admin() existe con SECURITY DEFINER';
END $$;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

-- Esta query debe retornar "✅ CORRECTO"
SELECT
  policyname,
  CASE
    WHEN qual LIKE '%is_admin()%' AND qual NOT LIKE '%user_profiles%'
    THEN '✅ CORRECTO - Sin recursión'
    WHEN qual LIKE '%user_profiles%'
    THEN '❌ ERROR - Recursión detectada'
    ELSE '⚠️ ADVERTENCIA - Policy inesperada: ' || qual
  END as status,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
  AND policyname = 'Admins can view all profiles';

-- Resultado esperado: "✅ CORRECTO - Sin recursión"
