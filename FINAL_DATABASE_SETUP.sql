-- ============================================================================
-- MIGRACIÓN COMPLETA - TRANSFORMACIÓN TOTAL AL SFTP
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- PASO 1: LIMPIAR DATOS ANTIGUOS
-- ============================================================================

-- Limpiar tablas existentes completamente
DELETE FROM "ACT" WHERE id > 0;
DELETE FROM "INCIDENCIAS" WHERE id > 0;
DELETE FROM "PLANTILLA" WHERE id > 0;

-- PASO 2: CREAR NUEVAS TABLAS BASADAS EN SFTP
-- ============================================================================

-- Crear tablas principales basadas en estructura SFTP
DROP TABLE IF EXISTS empleados_sftp CASCADE;
DROP TABLE IF EXISTS asistencia_diaria CASCADE;  
DROP TABLE IF EXISTS motivos_baja CASCADE;
DROP TABLE IF EXISTS importaciones_sftp CASCADE;
DROP TABLE IF EXISTS errores_importacion CASCADE;

-- 1. TABLA PRINCIPAL DE EMPLEADOS
CREATE TABLE empleados_sftp (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER UNIQUE NOT NULL,
    apellidos VARCHAR(200) NOT NULL,         
    nombres VARCHAR(200) NOT NULL,           
    nombre_completo VARCHAR(400) GENERATED ALWAYS AS (nombres || ' ' || apellidos) STORED,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- 2. TABLA DE ASISTENCIA DIARIA  
CREATE TABLE asistencia_diaria (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER NOT NULL REFERENCES empleados_sftp(numero_empleado) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    dia_semana VARCHAR(10) NOT NULL,
    horas_trabajadas DECIMAL(5,4) DEFAULT 0,
    horas_incidencia DECIMAL(5,4) DEFAULT 0,  
    presente BOOLEAN GENERATED ALWAYS AS (horas_trabajadas > 0) STORED,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Índices para mejor performance
CREATE UNIQUE INDEX idx_asistencia_empleado_fecha ON asistencia_diaria(numero_empleado, fecha);
CREATE INDEX idx_asistencia_fecha ON asistencia_diaria(fecha);
CREATE INDEX idx_asistencia_presente ON asistencia_diaria(presente);

-- 3. TABLA DE MOTIVOS DE BAJA
CREATE TABLE motivos_baja (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER NOT NULL REFERENCES empleados_sftp(numero_empleado) ON DELETE CASCADE,
    fecha_baja TIMESTAMP NOT NULL,           
    tipo VARCHAR(50) NOT NULL,               
    motivo VARCHAR(200) NOT NULL,            
    descripcion TEXT,                        
    observaciones TEXT,                      
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- 4. TABLA DE IMPORTACIONES SFTP
CREATE TABLE importaciones_sftp (
    id SERIAL PRIMARY KEY,
    archivo VARCHAR(200) NOT NULL,
    registros_procesados INTEGER DEFAULT 0,
    registros_exitosos INTEGER DEFAULT 0,
    registros_errores INTEGER DEFAULT 0,
    fecha_importacion TIMESTAMP DEFAULT NOW(),
    estado VARCHAR(50) DEFAULT 'iniciado',
    detalles_error TEXT
);

CREATE INDEX idx_importacion_fecha ON importaciones_sftp(fecha_importacion);
CREATE INDEX idx_importacion_archivo ON importaciones_sftp(archivo);

-- 5. TABLA DE ERRORES DE IMPORTACIÓN
CREATE TABLE errores_importacion (
    id SERIAL PRIMARY KEY,
    importacion_id INTEGER REFERENCES importaciones_sftp(id) ON DELETE CASCADE,
    numero_fila INTEGER,
    datos_originales TEXT,
    tipo_error VARCHAR(100),
    mensaje_error TEXT,
    fecha_error TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PASO 3: CREAR VISTAS DE COMPATIBILIDAD CON DASHBOARD ACTUAL
-- ============================================================================

-- Vista PLANTILLA compatible (reemplaza tabla anterior)
DROP VIEW IF EXISTS plantilla CASCADE;
CREATE OR REPLACE VIEW plantilla AS
SELECT 
    numero_empleado as id,
    CONCAT('EMP', LPAD(numero_empleado::TEXT, 3, '0')) as emp_id,
    nombre_completo as nombre,
    'RH' as departamento, -- Valor por defecto, se puede mejorar después
    'Empleado' as area,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM motivos_baja mb 
            WHERE mb.numero_empleado = e.numero_empleado
        ) THEN false
        ELSE true 
    END as activo,
    fecha_creacion as fecha_ingreso,
    (
        SELECT fecha_baja::DATE
        FROM motivos_baja mb 
        WHERE mb.numero_empleado = e.numero_empleado 
        ORDER BY fecha_baja DESC 
        LIMIT 1
    ) as fecha_baja,
    'Empleado' as puesto,
    (
        SELECT motivo
        FROM motivos_baja mb 
        WHERE mb.numero_empleado = e.numero_empleado 
        ORDER BY fecha_baja DESC 
        LIMIT 1
    ) as motivo_baja,
    fecha_creacion,
    fecha_actualizacion as updated_at
FROM empleados_sftp e;

-- Vista ACT compatible
DROP VIEW IF EXISTS act CASCADE;
CREATE OR REPLACE VIEW act AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY fecha DESC, numero_empleado) as id,
    CONCAT('EMP', LPAD(numero_empleado::TEXT, 3, '0')) as emp_id,
    fecha,
    presente,
    fecha_creacion as created_at
FROM asistencia_diaria
ORDER BY fecha DESC, numero_empleado;

-- Vista INCIDENCIAS compatible
DROP VIEW IF EXISTS incidencias CASCADE;
CREATE OR REPLACE VIEW incidencias AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY fecha DESC, numero_empleado) as id,
    CONCAT('EMP', LPAD(numero_empleado::TEXT, 3, '0')) as emp_id,
    fecha,
    CASE 
        WHEN horas_incidencia > 0 THEN 'Incidencia'
        WHEN horas_trabajadas = 0 THEN 'Ausencia sin justificar'
        WHEN horas_trabajadas < 4 THEN 'Tardanza'
        ELSE 'Normal'
    END as tipo,
    CASE
        WHEN horas_incidencia > 0 THEN CONCAT('Incidencia registrada: ', horas_incidencia, ' horas')
        WHEN horas_trabajadas = 0 THEN 'Ausencia completa del día'
        WHEN horas_trabajadas < 4 THEN CONCAT('Llegó tarde - Solo trabajó ', horas_trabajadas, ' horas')
        ELSE 'Día normal de trabajo'
    END as descripcion,
    fecha_creacion as created_at
FROM asistencia_diaria 
WHERE horas_incidencia > 0 OR horas_trabajadas < 4 OR horas_trabajadas = 0;

-- PASO 4: MENSAJE DE CONFIRMACIÓN
-- ============================================================================
-- MENSAJE DE CONFIRMACIÓN - TRANSFORMACIÓN COMPLETA
SELECT 
    '🎉 ¡TRANSFORMACIÓN COMPLETA AL SFTP LISTA!' as mensaje,
    '📊 Nuevas tablas creadas: empleados_sftp, asistencia_diaria, motivos_baja' as detalle,
    '🔄 Vistas de compatibilidad: plantilla, act, incidencias' as compatibilidad,
    '🚀 Listo para importar datos reales desde SFTP' as siguiente_paso;
