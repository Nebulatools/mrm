-- 🚨 FIX DEFINITIVO: Crear user_profiles en el proyecto CORRECTO
-- Proyecto: vnyzjdtqruvofefexaue (mrm_simple)
-- Fecha: 2025-10-15
--
-- PROBLEMA REAL: La tabla user_profiles NO EXISTE en tu proyecto de producción
-- Tu app busca esta tabla y se queda esperando infinitamente
--
-- INSTRUCCIONES:
-- 1. Ve a: https://supabase.com/dashboard/project/vnyzjdtqruvofefexaue/sql
-- 2. Copia y pega TODO este archivo
-- 3. Click en RUN
-- 4. Espera que termine (puede tomar 10-15 segundos)
-- 5. Recarga tu app → El loading debe desaparecer INMEDIATAMENTE

-- ========================================
-- PASO 1: CREAR TABLA user_profiles
-- ========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  empresa TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PASO 2: HABILITAR RLS
-- ========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: usuarios ven su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ========================================
-- PASO 3: CREAR FUNCIONES HELPER
-- ========================================

-- Función is_admin() con SECURITY DEFINER (evita recursión)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función user_empresa() con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.user_empresa()
RETURNS TEXT AS $$
  SELECT empresa FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========================================
-- PASO 4: POLÍTICA DE ADMIN (SIN RECURSIÓN)
-- ========================================

-- Política: admins ven todos los perfiles (usando is_admin sin recursión)
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());

-- ========================================
-- PASO 5: RLS EN TABLAS SFTP
-- ========================================

-- RLS en empleados_sftp
ALTER TABLE empleados_sftp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all empleados" ON empleados_sftp;
CREATE POLICY "Admin can view all empleados"
  ON empleados_sftp
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own empresa empleados" ON empleados_sftp;
CREATE POLICY "Users can view own empresa empleados"
  ON empleados_sftp
  FOR SELECT
  USING (empresa = public.user_empresa());

-- RLS en motivos_baja
ALTER TABLE motivos_baja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all motivos_baja" ON motivos_baja;
CREATE POLICY "Admin can view all motivos_baja"
  ON motivos_baja
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own empresa motivos_baja" ON motivos_baja;
CREATE POLICY "Users can view own empresa motivos_baja"
  ON motivos_baja
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados_sftp
      WHERE empleados_sftp.numero_empleado = motivos_baja.numero_empleado
      AND empleados_sftp.empresa = public.user_empresa()
    )
  );

-- RLS en asistencia_diaria
ALTER TABLE asistencia_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all asistencia" ON asistencia_diaria;
CREATE POLICY "Admin can view all asistencia"
  ON asistencia_diaria
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own empresa asistencia" ON asistencia_diaria;
CREATE POLICY "Users can view own empresa asistencia"
  ON asistencia_diaria
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados_sftp
      WHERE empleados_sftp.numero_empleado = asistencia_diaria.numero_empleado
      AND empleados_sftp.empresa = public.user_empresa()
    )
  );

-- ========================================
-- PASO 6: ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_empresa ON user_profiles(empresa);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_empleados_empresa ON empleados_sftp(empresa);
CREATE INDEX IF NOT EXISTS idx_motivos_baja_numero ON motivos_baja(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_asistencia_numero ON asistencia_diaria(numero_empleado);

-- ========================================
-- PASO 7: TRIGGER AUTO-CREAR PERFIL
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, empresa)
  VALUES (
    new.id,
    new.email,
    CASE
      WHEN new.email LIKE '%admin%' THEN 'admin'
      ELSE 'user'
    END,
    CASE
      WHEN new.email LIKE '%admin%' THEN NULL
      WHEN new.email LIKE '%monterrey%' THEN 'MOTO REPUESTOS MONTERREY'
      WHEN new.email LIKE '%total%' THEN 'MOTO TOTAL'
      WHEN new.email LIKE '%norte%' THEN 'REPUESTOS Y MOTOCICLETAS DEL NORTE'
      ELSE NULL
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- PASO 8: INSERTAR PERFILES EXISTENTES
-- ========================================

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
-- ✅ VERIFICACIÓN FINAL
-- ========================================

-- Debe retornar 4 perfiles
SELECT
  email,
  role,
  COALESCE(empresa, 'TODAS (admin)') as empresa
FROM user_profiles
ORDER BY email;
