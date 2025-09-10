-- ============================================================================
-- NUEVO ESQUEMA DE BASE DE DATOS - BASADO EN DATOS REALES SFTP
-- ============================================================================

-- 1. TABLA PRINCIPAL DE EMPLEADOS (desde Prenomina Horizontal.csv)
CREATE TABLE empleados_sftp (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER UNIQUE NOT NULL, -- Campo "N?mero" del CSV
    apellidos VARCHAR(200) NOT NULL,         -- Campo "Nombre" del CSV  
    nombres VARCHAR(200) NOT NULL,           -- Campo "LUN" del CSV
    nombre_completo VARCHAR(400) GENERATED ALWAYS AS (nombres || ' ' || apellidos) STORED,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- 2. TABLA DE ASISTENCIA DIARIA (transformación de formato horizontal a vertical)
CREATE TABLE asistencia_diaria (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER NOT NULL REFERENCES empleados_sftp(numero_empleado),
    fecha DATE NOT NULL,
    dia_semana VARCHAR(10) NOT NULL, -- LUN, MAR, MIE, JUE, VIE, SAB, DOM
    horas_trabajadas DECIMAL(5,4) DEFAULT 0,  -- Campo [DIA] - TE
    horas_incidencia DECIMAL(5,4) DEFAULT 0,  -- Campo [DIA]-INC  
    presente BOOLEAN GENERATED ALWAYS AS (horas_trabajadas > 0) STORED,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    
    -- Índices para mejor performance
    UNIQUE(numero_empleado, fecha),
    INDEX idx_asistencia_fecha (fecha),
    INDEX idx_asistencia_empleado (numero_empleado),
    INDEX idx_asistencia_presente (presente)
);

-- 3. TABLA DE MOTIVOS DE BAJA (desde MotivosBaja.csv)
CREATE TABLE motivos_baja (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER NOT NULL REFERENCES empleados_sftp(numero_empleado),
    fecha_baja TIMESTAMP NOT NULL,           -- Campo "Fecha" del CSV
    tipo VARCHAR(50) NOT NULL,               -- Campo "Tipo" del CSV
    motivo VARCHAR(200) NOT NULL,            -- Campo "Motivo" del CSV  
    descripcion TEXT,                        -- Campo "Descripci?n" del CSV
    observaciones TEXT,                      -- Campo "Observaciones" del CSV
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- 4. TABLA DE IMPORTACIONES SFTP (para auditoría y control)
CREATE TABLE importaciones_sftp (
    id SERIAL PRIMARY KEY,
    archivo VARCHAR(200) NOT NULL,
    registros_procesados INTEGER DEFAULT 0,
    registros_exitosos INTEGER DEFAULT 0,
    registros_errores INTEGER DEFAULT 0,
    fecha_importacion TIMESTAMP DEFAULT NOW(),
    estado VARCHAR(50) DEFAULT 'iniciado', -- iniciado, completado, error
    detalles_error TEXT,
    
    INDEX idx_importacion_fecha (fecha_importacion),
    INDEX idx_importacion_archivo (archivo)
);

-- 5. TABLA DE ERRORES DE IMPORTACIÓN (para debugging)
CREATE TABLE errores_importacion (
    id SERIAL PRIMARY KEY,
    importacion_id INTEGER REFERENCES importaciones_sftp(id),
    numero_fila INTEGER,
    datos_originales TEXT,
    tipo_error VARCHAR(100),
    mensaje_error TEXT,
    fecha_error TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- VISTAS PARA COMPATIBILIDAD CON DASHBOARD ACTUAL
-- ============================================================================

-- Vista que simula la tabla PLANTILLA anterior
CREATE VIEW plantilla_compatible AS
SELECT 
    numero_empleado as emp_id,
    nombre_completo as nombre,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM motivos_baja mb 
            WHERE mb.numero_empleado = e.numero_empleado
        ) THEN 'Inactivo'
        ELSE 'Activo' 
    END as activo,
    fecha_creacion as fecha_ingreso,
    (
        SELECT fecha_baja 
        FROM motivos_baja mb 
        WHERE mb.numero_empleado = e.numero_empleado 
        ORDER BY fecha_baja DESC 
        LIMIT 1
    ) as fecha_baja
FROM empleados_sftp e;

-- Vista que simula la tabla ACT anterior  
CREATE VIEW act_compatible AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY fecha, numero_empleado) as id,
    numero_empleado as emp_id,
    fecha,
    presente
FROM asistencia_diaria
ORDER BY fecha DESC, numero_empleado;

-- Vista que simula la tabla INCIDENCIAS anterior
CREATE VIEW incidencias_compatible AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY fecha, numero_empleado) as id,
    numero_empleado as emp_id,
    fecha,
    CASE 
        WHEN horas_incidencia > 0 THEN 'Incidencia'
        WHEN horas_trabajadas = 0 THEN 'Ausencia'  
        WHEN horas_trabajadas < 8 THEN 'Tardanza'
        ELSE 'Normal'
    END as tipo,
    CASE
        WHEN horas_incidencia > 0 THEN CONCAT('Incidencia: ', horas_incidencia, ' horas')
        WHEN horas_trabajadas = 0 THEN 'Ausencia completa'
        WHEN horas_trabajadas < 8 THEN CONCAT('Horas insuficientes: ', horas_trabajadas)
        ELSE 'Día normal'
    END as descripcion
FROM asistencia_diaria 
WHERE horas_incidencia > 0 OR horas_trabajadas < 8 OR horas_trabajadas = 0;

-- ============================================================================
-- FUNCIONES ÚTILES
-- ============================================================================

-- Función para obtener empleados activos en una fecha específica
CREATE OR REPLACE FUNCTION empleados_activos_en_fecha(fecha_consulta DATE)
RETURNS TABLE(numero_empleado INTEGER, nombre_completo VARCHAR(400)) 
LANGUAGE SQL AS $$
    SELECT e.numero_empleado, e.nombre_completo
    FROM empleados_sftp e
    WHERE e.activo = true
    AND NOT EXISTS (
        SELECT 1 FROM motivos_baja mb 
        WHERE mb.numero_empleado = e.numero_empleado 
        AND mb.fecha_baja::DATE <= fecha_consulta
    );
$$;

-- Función para calcular rotación mensual
CREATE OR REPLACE FUNCTION calcular_rotacion_mensual(año INTEGER, mes INTEGER)
RETURNS DECIMAL(5,2)
LANGUAGE SQL AS $$
    SELECT 
        CASE 
            WHEN empleados_promedio.promedio > 0 THEN
                (bajas_mes.total::DECIMAL / empleados_promedio.promedio) * 100
            ELSE 0
        END as rotacion
    FROM 
        (
            SELECT COUNT(*) as total
            FROM motivos_baja 
            WHERE EXTRACT(YEAR FROM fecha_baja) = año
            AND EXTRACT(MONTH FROM fecha_baja) = mes
        ) bajas_mes,
        (
            SELECT 
                (
                    (SELECT COUNT(*) FROM empleados_activos_en_fecha(DATE(año || '-' || mes || '-01'))) +
                    (SELECT COUNT(*) FROM empleados_activos_en_fecha(DATE(año || '-' || mes || '-' || 
                        EXTRACT(DAY FROM (DATE(año || '-' || mes || '-01') + INTERVAL '1 month - 1 day')))))
                ) / 2.0 as promedio
        ) empleados_promedio;
$$;