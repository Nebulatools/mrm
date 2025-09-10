-- =====================================================
-- SETUP_CLEAN_DATABASE_FIXED.sql
-- Script completo CORREGIDO para configurar base de datos SFTP
-- Ejecutar DESPUÉS de NUCLEAR_CLEAN.sql
-- =====================================================

-- ========================================
-- PASO 1: CREAR TABLA PRINCIPAL DE EMPLEADOS
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
-- PASO 2: CREAR TABLA DE MOTIVOS DE BAJA
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
-- PASO 3: CREAR TABLA DE ASISTENCIA DIARIA
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
-- PASO 4: CREAR TABLA PLANTILLA (LEGACY COMPATIBILITY)
-- ========================================
CREATE TABLE plantilla (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    departamento VARCHAR(100) NOT NULL DEFAULT 'RH',
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_ingreso DATE NOT NULL,
    fecha_baja DATE,
    puesto VARCHAR(100),
    area VARCHAR(100),
    motivo_baja VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PASO 5: CREAR TABLA INCIDENCIAS
-- ========================================
CREATE TABLE incidencias (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PASO 6: CREAR TABLA ACT
-- ========================================
CREATE TABLE act (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    presente BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(emp_id, fecha)
);

-- ========================================
-- PASO 7: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ========================================

-- Índices empleados_sftp
CREATE INDEX idx_empleados_sftp_numero ON empleados_sftp(numero_empleado);
CREATE INDEX idx_empleados_sftp_activo ON empleados_sftp(activo);
CREATE INDEX idx_empleados_sftp_departamento ON empleados_sftp(departamento);
CREATE INDEX idx_empleados_sftp_fecha_ingreso ON empleados_sftp(fecha_ingreso);
CREATE INDEX idx_empleados_sftp_empresa ON empleados_sftp(empresa);

-- Índices motivos_baja
CREATE INDEX idx_motivos_baja_numero ON motivos_baja(numero_empleado);
CREATE INDEX idx_motivos_baja_fecha ON motivos_baja(fecha_baja);
CREATE INDEX idx_motivos_baja_tipo ON motivos_baja(tipo);

-- Índices asistencia_diaria
CREATE INDEX idx_asistencia_diaria_numero ON asistencia_diaria(numero_empleado);
CREATE INDEX idx_asistencia_diaria_fecha ON asistencia_diaria(fecha);

-- Índices plantilla (legacy)
CREATE INDEX idx_plantilla_activo ON plantilla(activo);
CREATE INDEX idx_plantilla_departamento ON plantilla(departamento);
CREATE INDEX idx_plantilla_fecha_ingreso ON plantilla(fecha_ingreso);
CREATE INDEX idx_plantilla_emp_id ON plantilla(emp_id);

-- Índices incidencias
CREATE INDEX idx_incidencias_fecha ON incidencias(fecha);
CREATE INDEX idx_incidencias_emp_id ON incidencias(emp_id);
CREATE INDEX idx_incidencias_tipo ON incidencias(tipo);

-- Índices act
CREATE INDEX idx_act_fecha ON act(fecha);
CREATE INDEX idx_act_emp_id ON act(emp_id);

-- ========================================
-- PASO 8: CONFIGURAR SEGURIDAD RLS
-- ========================================

-- Habilitar Row Level Security
ALTER TABLE empleados_sftp ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivos_baja ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE act ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para desarrollo
CREATE POLICY "Allow all operations on empleados_sftp" ON empleados_sftp
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on motivos_baja" ON motivos_baja
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on asistencia_diaria" ON asistencia_diaria
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on plantilla" ON plantilla
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on incidencias" ON incidencias
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on act" ON act
    FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- PASO 9: INSERTAR DATOS DE PRUEBA
-- ========================================

-- Insertar empleado de prueba en empleados_sftp
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
);

-- Insertar empleado de prueba en plantilla (compatibilidad)
INSERT INTO plantilla (
    emp_id,
    nombre,
    departamento,
    puesto,
    area,
    fecha_ingreso,
    activo
) VALUES (
    'TEST001',
    'Usuario Prueba',
    'SISTEMAS',
    'DESARROLLADOR',
    'TECNOLOGÍA',
    '2024-01-01',
    true
);

-- ========================================
-- PASO 10: VERIFICACIÓN FINAL
-- ========================================

-- Mostrar estructura de tablas creadas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('empleados_sftp', 'motivos_baja', 'asistencia_diaria', 'plantilla', 'incidencias', 'act')
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
    'plantilla' as tabla, COUNT(*) as registros FROM plantilla
UNION ALL
SELECT 
    'incidencias' as tabla, COUNT(*) as registros FROM incidencias
UNION ALL
SELECT 
    'act' as tabla, COUNT(*) as registros FROM act;

-- ========================================
-- CONFIRMACIÓN DE ÉXITO
-- ========================================
SELECT 
    '✅ SETUP COMPLETADO EXITOSAMENTE' as status,
    'Todas las tablas creadas correctamente' as resultado,
    'Ahora puedes ejecutar la importación SFTP' as siguiente_paso;

-- =====================================================
-- SCRIPT COMPLETADO ✅
-- Ahora ve a http://localhost:3007/admin
-- Y ejecuta "Ejecutar Importación Real"
-- =====================================================