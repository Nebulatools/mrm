-- Tabla de asistencia diaria
CREATE TABLE asistencia_diaria (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER NOT NULL,
    fecha DATE NOT NULL,
    dia_semana VARCHAR(20),
    horas_trabajadas NUMERIC(4,2) DEFAULT 8.0,
    horas_incidencia NUMERIC(4,2) DEFAULT 0.0,
    presente BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint de unicidad por empleado y fecha
    UNIQUE(numero_empleado, fecha)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_asistencia_numero_empleado ON asistencia_diaria(numero_empleado);
CREATE INDEX idx_asistencia_fecha ON asistencia_diaria(fecha);
CREATE INDEX idx_asistencia_presente ON asistencia_diaria(presente);
CREATE INDEX idx_asistencia_horas_incidencia ON asistencia_diaria(horas_incidencia);

-- Comentarios
COMMENT ON TABLE asistencia_diaria IS 'Registro diario de asistencia y horas trabajadas';
COMMENT ON COLUMN asistencia_diaria.numero_empleado IS 'Referencia al empleado (FK a empleados_sftp.numero_empleado)';
COMMENT ON COLUMN asistencia_diaria.horas_trabajadas IS 'Horas efectivamente trabajadas';
COMMENT ON COLUMN asistencia_diaria.horas_incidencia IS 'Horas de incidencia (faltas, permisos, etc.)';