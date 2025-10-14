-- Migración: Corregir deadlock en RLS policies de user_profiles
-- Fecha: 2025-10-14
-- Descripción: Elimina recursión infinita en policy "Admins can view all profiles"
-- Root Cause: La policy estaba consultando user_profiles dentro del USING clause sin SECURITY DEFINER
-- Solución: Usar función is_admin() que tiene SECURITY DEFINER

-- ========================================
-- CORREGIR POLICY DE ADMIN
-- ========================================

-- Eliminar la policy recursiva existente
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Recrear usando la función is_admin() con SECURITY DEFINER
-- Esta función ya existe y está diseñada específicamente para evitar recursión
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());  -- ✅ Usa función con SECURITY DEFINER, no hay recursión

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar que las políticas están correctamente configuradas
DO $$
BEGIN
  -- Verificar que la función is_admin existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Función public.is_admin() no existe. Ejecutar migración 20250110 primero.';
  END IF;

  -- Verificar que RLS está habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS no está habilitado en user_profiles';
  END IF;

  RAISE NOTICE 'Migración completada exitosamente. RLS policies corregidas.';
END $$;
