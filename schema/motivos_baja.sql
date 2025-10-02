-- Tabla de motivos de baja/terminaciones
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

-- Índices para mejorar rendimiento
CREATE INDEX idx_motivos_numero_empleado ON motivos_baja(numero_empleado);
CREATE INDEX idx_motivos_fecha_baja ON motivos_baja(fecha_baja);
CREATE INDEX idx_motivos_tipo ON motivos_baja(tipo);
CREATE INDEX idx_motivos_motivo ON motivos_baja(motivo);

-- Comentarios
COMMENT ON TABLE motivos_baja IS 'Registro de terminaciones y motivos de baja';
COMMENT ON COLUMN motivos_baja.numero_empleado IS 'Referencia al empleado (FK a empleados_sftp.numero_empleado)';
COMMENT ON COLUMN motivos_baja.tipo IS 'Clasificación del tipo de baja';
COMMENT ON COLUMN motivos_baja.motivo IS 'Motivo específico de la terminación';