-- Tabla de incidencias de asistencia detallada
CREATE TABLE incidencias (
    id SERIAL PRIMARY KEY,
    emp INTEGER NOT NULL, -- Número de empleado
    nombre TEXT,
    fecha DATE NOT NULL,
    turno SMALLINT,
    horario TEXT, -- Formato: 0830_1700
    incidencia TEXT, -- Descripción de la incidencia
    entra TIME WITHOUT TIME ZONE,
    sale TIME WITHOUT TIME ZONE,
    ordinarias NUMERIC DEFAULT 0,
    numero INTEGER,
    inci VARCHAR(10), -- Código de tipo de incidencia (VAC, INC, FJ, FI, etc.)
    status SMALLINT, -- Status numérico de la incidencia
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_incidencias_emp ON incidencias(emp);
CREATE INDEX idx_incidencias_fecha ON incidencias(fecha);
CREATE INDEX idx_incidencias_inci ON incidencias(inci);
CREATE INDEX idx_incidencias_status ON incidencias(status);
CREATE INDEX idx_incidencias_turno ON incidencias(turno);

-- Comentarios
COMMENT ON TABLE incidencias IS 'Registro detallado de incidencias de asistencia por empleado importado desde CSV';
COMMENT ON COLUMN incidencias.emp IS 'Número de empleado';
COMMENT ON COLUMN incidencias.horario IS 'Horario asignado (formato: 0830_1700)';
COMMENT ON COLUMN incidencias.incidencia IS 'Descripción de la incidencia';
COMMENT ON COLUMN incidencias.inci IS 'Código de tipo de incidencia (VAC, INC, FJ, FI, etc.)';
COMMENT ON COLUMN incidencias.status IS 'Status numérico de la incidencia';