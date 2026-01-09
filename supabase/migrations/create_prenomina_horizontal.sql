-- Crear tabla prenomina_horizontal para datos de horas semanales
CREATE TABLE IF NOT EXISTS prenomina_horizontal (
  -- Identificación
  id SERIAL PRIMARY KEY,
  numero_empleado INTEGER NOT NULL,
  nombre VARCHAR(200) NOT NULL,

  -- Identificación de Semana
  semana_inicio DATE NOT NULL,
  semana_fin DATE NOT NULL,

  -- Lunes
  lun_fecha DATE,
  lun_horas_ord DECIMAL(6,2) DEFAULT 0,
  lun_horas_te DECIMAL(6,2) DEFAULT 0,
  lun_incidencia VARCHAR(200),

  -- Martes
  mar_fecha DATE,
  mar_horas_ord DECIMAL(6,2) DEFAULT 0,
  mar_horas_te DECIMAL(6,2) DEFAULT 0,
  mar_incidencia VARCHAR(200),

  -- Miércoles
  mie_fecha DATE,
  mie_horas_ord DECIMAL(6,2) DEFAULT 0,
  mie_horas_te DECIMAL(6,2) DEFAULT 0,
  mie_incidencia VARCHAR(200),

  -- Jueves
  jue_fecha DATE,
  jue_horas_ord DECIMAL(6,2) DEFAULT 0,
  jue_horas_te DECIMAL(6,2) DEFAULT 0,
  jue_incidencia VARCHAR(200),

  -- Viernes
  vie_fecha DATE,
  vie_horas_ord DECIMAL(6,2) DEFAULT 0,
  vie_horas_te DECIMAL(6,2) DEFAULT 0,
  vie_incidencia VARCHAR(200),

  -- Sábado
  sab_fecha DATE,
  sab_horas_ord DECIMAL(6,2) DEFAULT 0,
  sab_horas_te DECIMAL(6,2) DEFAULT 0,
  sab_incidencia VARCHAR(200),

  -- Domingo
  dom_fecha DATE,
  dom_horas_ord DECIMAL(6,2) DEFAULT 0,
  dom_horas_te DECIMAL(6,2) DEFAULT 0,
  dom_incidencia VARCHAR(200),

  -- Totales Calculados Automáticamente
  total_horas_ord DECIMAL(8,2) GENERATED ALWAYS AS (
    COALESCE(lun_horas_ord, 0) + COALESCE(mar_horas_ord, 0) +
    COALESCE(mie_horas_ord, 0) + COALESCE(jue_horas_ord, 0) +
    COALESCE(vie_horas_ord, 0) + COALESCE(sab_horas_ord, 0) +
    COALESCE(dom_horas_ord, 0)
  ) STORED,

  total_horas_te DECIMAL(8,2) GENERATED ALWAYS AS (
    COALESCE(lun_horas_te, 0) + COALESCE(mar_horas_te, 0) +
    COALESCE(mie_horas_te, 0) + COALESCE(jue_horas_te, 0) +
    COALESCE(vie_horas_te, 0) + COALESCE(sab_horas_te, 0) +
    COALESCE(dom_horas_te, 0)
  ) STORED,

  total_horas_semana DECIMAL(8,2) GENERATED ALWAYS AS (
    COALESCE(lun_horas_ord, 0) + COALESCE(mar_horas_ord, 0) +
    COALESCE(mie_horas_ord, 0) + COALESCE(jue_horas_ord, 0) +
    COALESCE(vie_horas_ord, 0) + COALESCE(sab_horas_ord, 0) +
    COALESCE(dom_horas_ord, 0) +
    COALESCE(lun_horas_te, 0) + COALESCE(mar_horas_te, 0) +
    COALESCE(mie_horas_te, 0) + COALESCE(jue_horas_te, 0) +
    COALESCE(vie_horas_te, 0) + COALESCE(sab_horas_te, 0) +
    COALESCE(dom_horas_te, 0)
  ) STORED,

  -- Metadata
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_empleado_semana UNIQUE(numero_empleado, semana_inicio),
  CONSTRAINT check_semana_valida CHECK(semana_fin >= semana_inicio),
  CONSTRAINT check_horas_validas CHECK(
    total_horas_semana >= 0 AND total_horas_semana <= 168
  )
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_prenomina_numero_empleado ON prenomina_horizontal(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_prenomina_semana ON prenomina_horizontal(semana_inicio, semana_fin);
CREATE INDEX IF NOT EXISTS idx_prenomina_fecha_creacion ON prenomina_horizontal(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_prenomina_horas_extras ON prenomina_horizontal(total_horas_te) WHERE total_horas_te > 0;

-- Habilitar RLS (Row Level Security)
ALTER TABLE prenomina_horizontal ENABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE prenomina_horizontal IS 'Registro semanal de horas trabajadas (ordinarias y extras) por empleado';
COMMENT ON COLUMN prenomina_horizontal.numero_empleado IS 'Referencia a empleados_sftp.numero_empleado (FK lógica)';
COMMENT ON COLUMN prenomina_horizontal.semana_inicio IS 'Lunes de la semana';
COMMENT ON COLUMN prenomina_horizontal.semana_fin IS 'Domingo de la semana';
COMMENT ON COLUMN prenomina_horizontal.total_horas_ord IS 'Suma automática de horas ordinarias de la semana';
COMMENT ON COLUMN prenomina_horizontal.total_horas_te IS 'Suma automática de horas extras de la semana';
COMMENT ON COLUMN prenomina_horizontal.total_horas_semana IS 'Total general de horas trabajadas en la semana';
