-- VERIFICACIÓN RÁPIDA: ¿El fix está aplicado?
-- Ejecuta esto en SQL Editor de Supabase

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
