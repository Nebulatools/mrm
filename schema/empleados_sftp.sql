-- Tabla principal de empleados (datos desde SFTP)
CREATE TABLE empleados_sftp (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER UNIQUE NOT NULL,
    apellidos VARCHAR(200) NOT NULL,
    nombres VARCHAR(200) NOT NULL,
    nombre_completo VARCHAR(400),
    gafete VARCHAR(50),
    genero VARCHAR(10),
    imss VARCHAR(20),
    fecha_nacimiento DATE,
    estado VARCHAR(100),
    fecha_ingreso DATE NOT NULL,
    fecha_antiguedad DATE,
    empresa VARCHAR(200),
    registro_patronal VARCHAR(100),
    codigo_puesto VARCHAR(50),
    puesto VARCHAR(100),
    codigo_depto VARCHAR(50),
    departamento VARCHAR(100),
    codigo_cc VARCHAR(50),
    cc VARCHAR(100),
    subcuenta_cc VARCHAR(100),
    clasificacion VARCHAR(100),
    codigo_area VARCHAR(50),
    area VARCHAR(100),
    ubicacion VARCHAR(100),
    tipo_nomina VARCHAR(50),
    turno VARCHAR(50),
    prestacion_ley VARCHAR(100),
    paquete_prestaciones VARCHAR(100),
    fecha_baja DATE,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_empleados_numero ON empleados_sftp(numero_empleado);
CREATE INDEX idx_empleados_activo ON empleados_sftp(activo);
CREATE INDEX idx_empleados_departamento ON empleados_sftp(departamento);
CREATE INDEX idx_empleados_puesto ON empleados_sftp(puesto);
CREATE INDEX idx_empleados_area ON empleados_sftp(area);
CREATE INDEX idx_empleados_fecha_ingreso ON empleados_sftp(fecha_ingreso);
CREATE INDEX idx_empleados_fecha_baja ON empleados_sftp(fecha_baja);

-- Comentarios
COMMENT ON TABLE empleados_sftp IS 'Datos maestros de empleados importados desde SFTP';
COMMENT ON COLUMN empleados_sftp.numero_empleado IS 'Número único de empleado';
COMMENT ON COLUMN empleados_sftp.activo IS 'Estado actual del empleado';