-- 🚨 FIX RÁPIDO: Resolver "Cargando..." Infinito
-- Ejecutar DESPUÉS de ver los resultados del diagnóstico

-- ========================================
-- FIX 1: Insertar perfiles faltantes
-- ========================================

-- Esto inserta los 4 perfiles SI NO EXISTEN
INSERT INTO user_profiles (id, email, role, empresa)
SELECT
  id,
  email,
  CASE
    WHEN email = 'admin@mrm.com' THEN 'admin'
    ELSE 'user'
  END as role,
  CASE
    WHEN email = 'admin@mrm.com' THEN NULL
    WHEN email = 'monterrey@mrm.com' THEN 'MOTO REPUESTOS MONTERREY'
    WHEN email = 'total@mrm.com' THEN 'MOTO TOTAL'
    WHEN email = 'norte@mrm.com' THEN 'REPUESTOS Y MOTOCICLETAS DEL NORTE'
  END as empresa
FROM auth.users
WHERE email IN ('admin@mrm.com', 'monterrey@mrm.com', 'total@mrm.com', 'norte@mrm.com')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- FIX 2: Corregir política RLS con deadlock
-- ========================================

-- Eliminar política problemática (si existe)
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- ========================================
-- FIX 3: Crear/Actualizar funciones helper
-- ========================================

-- Función user_empresa() con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.user_empresa()
RETURNS TEXT AS $$
  SELECT empresa FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función is_admin() con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========================================
-- FIX 4: Política simple sin recursión
-- ========================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Debe retornar 4 perfiles
SELECT
  '✅ Perfiles creados:' as resultado,
  COUNT(*) as total
FROM user_profiles;

-- Debe mostrar los 4 usuarios
SELECT
  email,
  role,
  COALESCE(empresa, '(TODAS - admin)') as empresa
FROM user_profiles
ORDER BY email;
