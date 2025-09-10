-- =====================================================
-- SETUP_CLEAN_DATABASE.sql
-- Script completo para configurar base de datos SFTP
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- ========================================
-- PASO 1: LIMPIAR DATOS EXISTENTES
-- ========================================
TRUNCATE TABLE IF EXISTS motivos_baja CASCADE;
TRUNCATE TABLE IF EXISTS empleados_sftp CASCADE;
TRUNCATE TABLE IF EXISTS asistencia_diaria CASCADE;
TRUNCATE TABLE IF EXISTS plantilla CASCADE;
TRUNCATE TABLE IF EXISTS incidencias CASCADE;
TRUNCATE TABLE IF EXISTS act CASCADE;

-- ========================================
-- PASO 2: ELIMINAR TABLAS EXISTENTES
-- ========================================
DROP TABLE IF EXISTS motivos_baja CASCADE;
DROP TABLE IF EXISTS empleados_sftp CASCADE;
DROP TABLE IF EXISTS asistencia_diaria CASCADE;

-- ========================================
-- PASO 3: CREAR TABLA PRINCIPAL DE EMPLEADOS
-- ========================================
CREATE TABLE empleados_sftp (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER UNIQUE NOT NULL,
    apellidos VARCHAR(200) NOT NULL,
    nombres VARCHAR(200) NOT NULL,
    nombre_completo VARCHAR(400),
    gafete VARCHAR(50),
    genero VARCHAR(20),
    imss VARCHAR(50),
    fecha_nacimiento DATE,
    estado VARCHAR(100),
    fecha_ingreso DATE NOT NULL,
    fecha_antiguedad DATE,
    empresa VARCHAR(200),
    registro_patronal VARCHAR(50),
    codigo_puesto VARCHAR(20),
    puesto VARCHAR(100),
    codigo_depto VARCHAR(20),
    departamento VARCHAR(100),
    codigo_cc VARCHAR(20),
    cc VARCHAR(100),
    subcuenta_cc VARCHAR(100),
    clasificacion VARCHAR(50),
    codigo_area VARCHAR(20),
    area VARCHAR(100),
    ubicacion VARCHAR(200),
    tipo_nomina VARCHAR(100),
    turno VARCHAR(100),
    prestacion_ley VARCHAR(100),
    paquete_prestaciones VARCHAR(100),
    fecha_baja DATE,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PASO 4: CREAR TABLA DE MOTIVOS DE BAJA
-- ========================================
CREATE TABLE motivos_baja (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER NOT NULL,
    fecha_baja DATE NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    motivo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    observaciones TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PASO 5: CREAR TABLA DE ASISTENCIA DIARIA
-- ========================================
CREATE TABLE asistencia_diaria (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER NOT NULL,
    fecha DATE NOT NULL,
    dia_semana VARCHAR(20),
    horas_trabajadas DECIMAL(4,2) DEFAULT 8.0,
    horas_incidencia DECIMAL(4,2) DEFAULT 0.0,
    presente BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(numero_empleado, fecha)
);

-- ========================================
-- PASO 6: ACTUALIZAR TABLA PLANTILLA (LEGACY)
-- ========================================
-- Agregar columnas faltantes a plantilla para compatibilidad
ALTER TABLE plantilla 
ADD COLUMN IF NOT EXISTS puesto VARCHAR(100),
ADD COLUMN IF NOT EXISTS area VARCHAR(100),
ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(200);

-- ========================================
-- PASO 7: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ========================================
-- Índices empleados_sftp
CREATE INDEX IF NOT EXISTS idx_empleados_sftp_numero ON empleados_sftp(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_empleados_sftp_activo ON empleados_sftp(activo);
CREATE INDEX IF NOT EXISTS idx_empleados_sftp_departamento ON empleados_sftp(departamento);
CREATE INDEX IF NOT EXISTS idx_empleados_sftp_fecha_ingreso ON empleados_sftp(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_empleados_sftp_empresa ON empleados_sftp(empresa);

-- Índices motivos_baja
CREATE INDEX IF NOT EXISTS idx_motivos_baja_numero ON motivos_baja(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_motivos_baja_fecha ON motivos_baja(fecha_baja);
CREATE INDEX IF NOT EXISTS idx_motivos_baja_tipo ON motivos_baja(tipo);

-- Índices asistencia_diaria
CREATE INDEX IF NOT EXISTS idx_asistencia_diaria_numero ON asistencia_diaria(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_asistencia_diaria_fecha ON asistencia_diaria(fecha);

-- Índices plantilla (legacy)
CREATE INDEX IF NOT EXISTS idx_plantilla_activo ON plantilla(activo);
CREATE INDEX IF NOT EXISTS idx_plantilla_departamento ON plantilla(departamento);
CREATE INDEX IF NOT EXISTS idx_plantilla_fecha_ingreso ON plantilla(fecha_ingreso);

-- ========================================
-- PASO 8: CONFIGURAR SEGURIDAD RLS (OPCIONAL)
-- ========================================
-- Habilitar Row Level Security
ALTER TABLE empleados_sftp ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivos_baja ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_diaria ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para desarrollo
CREATE POLICY "Allow all operations on empleados_sftp" ON empleados_sftp
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on motivos_baja" ON motivos_baja
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on asistencia_diaria" ON asistencia_diaria
    FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- PASO 9: INSERTAR DATOS DE PRUEBA (OPCIONAL)
-- ========================================
-- Insertar un empleado de prueba para verificar
INSERT INTO empleados_sftp (
    numero_empleado,
    apellidos,
    nombres,
    nombre_completo,
    departamento,
    puesto,
    area,
    fecha_ingreso,
    empresa,
    activo
) VALUES (
    9999,
    'Prueba',
    'Usuario',
    'Usuario Prueba',
    'SISTEMAS',
    'DESARROLLADOR',
    'TECNOLOGÍA',
    '2024-01-01',
    'MOTO TOTAL',
    true
) ON CONFLICT (numero_empleado) DO NOTHING;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
-- Mostrar estructura de tablas creadas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('empleados_sftp', 'motivos_baja', 'asistencia_diaria')
ORDER BY table_name, ordinal_position;

-- Mostrar conteo de registros
SELECT 
    'empleados_sftp' as tabla, COUNT(*) as registros FROM empleados_sftp
UNION ALL
SELECT 
    'motivos_baja' as tabla, COUNT(*) as registros FROM motivos_baja
UNION ALL
SELECT 
    'asistencia_diaria' as tabla, COUNT(*) as registros FROM asistencia_diaria
UNION ALL
SELECT 
    'plantilla' as tabla, COUNT(*) as registros FROM plantilla;

-- =====================================================
-- SCRIPT COMPLETADO ✅
-- Ahora puedes ejecutar la importación SFTP
-- =====================================================