-- =============================================================================
-- SCRIPT 1: 1_crear_tabla_incidencias.sql
-- OBJETIVO: SOLO crear la estructura de la tabla incidencias
-- FORMATO DEL CSV: EMP,NOMBRE,Fecha,Turno,Horario,Incidencia,Entra,Sale,Ordinarias,#,INCI,Status
-- =============================================================================

-- Crear tabla incidencias siguiendo la estructura del CSV
CREATE TABLE IF NOT EXISTS public.incidencias (
    id SERIAL PRIMARY KEY,
    emp INTEGER NOT NULL,              -- EMP (número empleado)
    nombre TEXT,                       -- NOMBRE (puede ser "0" o nombre real)
    fecha DATE NOT NULL,               -- Fecha
    turno SMALLINT,                    -- Turno
    horario TEXT,                      -- Horario (ej. 0830_1700)
    incidencia TEXT,                   -- Incidencia (ej. "Justif, No checó")
    entra TIME,                        -- Entra (hora entrada)
    sale TIME,                         -- Sale (hora salida)
    ordinarias NUMERIC(6,2) DEFAULT 0, -- Ordinarias (horas)
    numero INTEGER,                    -- "#" columna del CSV
    inci VARCHAR(10),                  -- INCI (VAC, INC, FJ, FI, etc.)
    status SMALLINT,                   -- Status
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Índice único para evitar duplicados
    UNIQUE(emp, fecha, incidencia, inci)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_incidencias_emp ON incidencias(emp);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON incidencias(fecha);
CREATE INDEX IF NOT EXISTS idx_incidencias_inci ON incidencias(inci);
CREATE INDEX IF NOT EXISTS idx_incidencias_status ON incidencias(status);

-- Habilitar RLS siguiendo patrón de otras tablas
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "Enable read access for all users" ON incidencias FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON incidencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON incidencias FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON incidencias FOR DELETE USING (true);

-- Comentarios para documentación
COMMENT ON TABLE incidencias IS 'Registro detallado de incidencias de asistencia por empleado importado desde CSV';
COMMENT ON COLUMN incidencias.emp IS 'Número de empleado';
COMMENT ON COLUMN incidencias.incidencia IS 'Descripción de la incidencia';
COMMENT ON COLUMN incidencias.inci IS 'Código de tipo de incidencia (VAC, INC, FJ, FI, etc.)';
COMMENT ON COLUMN incidencias.horario IS 'Horario asignado (formato: 0830_1700)';
COMMENT ON COLUMN incidencias.status IS 'Status numérico de la incidencia';

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla incidencias creada exitosamente' AS resultado;

-- =============================================================================
-- SIGUIENTE PASO: Ejecuta 2_poblar_tabla_incidencias.sql para insertar datos
-- =============================================================================