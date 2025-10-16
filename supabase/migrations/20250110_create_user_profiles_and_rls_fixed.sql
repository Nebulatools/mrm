-- Migración: Sistema de autenticación con perfiles de usuario y RLS (CORREGIDA)
-- Fecha: 2025-01-10
-- Descripción: Crea tabla de perfiles, habilita RLS en tablas SFTP con filtrado por empresa
-- NOTA: Funciones helper en esquema public para evitar problemas de permisos

-- ========================================
-- 1. TABLA DE PERFILES DE USUARIO
-- ========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  empresa TEXT, -- NULL para admin, nombre de empresa para usuarios normales
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: los usuarios solo pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: solo admins pueden ver todos los perfiles (SIN RECURSIÓN)
-- IMPORTANTE: Usar is_admin() que tiene SECURITY DEFINER para evitar deadlock
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());  -- ✅ Sin recursión, usa SECURITY DEFINER

-- ========================================
-- 2. FUNCIONES HELPER (en esquema public)
-- ========================================

-- Función para obtener la empresa del usuario actual
CREATE OR REPLACE FUNCTION public.user_empresa()
RETURNS TEXT AS $$
  SELECT empresa FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========================================
-- 3. RLS EN EMPLEADOS_SFTP
-- ========================================

-- Habilitar RLS
ALTER TABLE empleados_sftp ENABLE ROW LEVEL SECURITY;

-- Política: admin ve todo
DROP POLICY IF EXISTS "Admin can view all empleados" ON empleados_sftp;
CREATE POLICY "Admin can view all empleados"
  ON empleados_sftp
  FOR SELECT
  USING (public.is_admin());

-- Política: usuarios ven solo su empresa
DROP POLICY IF EXISTS "Users can view own empresa empleados" ON empleados_sftp;
CREATE POLICY "Users can view own empresa empleados"
  ON empleados_sftp
  FOR SELECT
  USING (
    empresa = public.user_empresa()
  );

-- ========================================
-- 4. RLS EN MOTIVOS_BAJA
-- ========================================

-- Habilitar RLS
ALTER TABLE motivos_baja ENABLE ROW LEVEL SECURITY;

-- Política: admin ve todo
DROP POLICY IF EXISTS "Admin can view all motivos_baja" ON motivos_baja;
CREATE POLICY "Admin can view all motivos_baja"
  ON motivos_baja
  FOR SELECT
  USING (public.is_admin());

-- Política: usuarios ven solo bajas de su empresa
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

-- ========================================
-- 5. RLS EN ASISTENCIA_DIARIA
-- ========================================

-- Habilitar RLS
ALTER TABLE asistencia_diaria ENABLE ROW LEVEL SECURITY;

-- Política: admin ve todo
DROP POLICY IF EXISTS "Admin can view all asistencia" ON asistencia_diaria;
CREATE POLICY "Admin can view all asistencia"
  ON asistencia_diaria
  FOR SELECT
  USING (public.is_admin());

-- Política: usuarios ven solo asistencia de su empresa
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
-- 6. ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_empresa ON user_profiles(empresa);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_empleados_empresa ON empleados_sftp(empresa);
CREATE INDEX IF NOT EXISTS idx_motivos_baja_numero ON motivos_baja(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_asistencia_numero ON asistencia_diaria(numero_empleado);

-- ========================================
-- 7. TRIGGER PARA AUTO-CREAR PERFIL
-- ========================================

-- Función que crea automáticamente un perfil cuando se crea un usuario
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

-- Trigger que ejecuta la función cuando se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 8. INSERTAR PERFILES PARA USUARIOS EXISTENTES
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
