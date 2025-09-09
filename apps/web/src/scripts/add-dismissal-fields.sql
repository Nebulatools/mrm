-- Add dismissal analysis fields to PLANTILLA table
-- This script adds: puesto (position), motivo_baja (dismissal reason), area (department area)

-- Add puesto column if it doesn't exist
ALTER TABLE "PLANTILLA" 
ADD COLUMN IF NOT EXISTS puesto VARCHAR(150) DEFAULT 'N/A';

-- Add motivo_baja column if it doesn't exist  
ALTER TABLE "PLANTILLA"
ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(100) DEFAULT NULL;

-- Add area column if it doesn't exist
ALTER TABLE "PLANTILLA"
ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT NULL;

-- Update puesto with sample data based on existing info
UPDATE "PLANTILLA" 
SET puesto = CASE 
  WHEN departamento LIKE '%ADMIN%' THEN 'Administrativo'
  WHEN departamento LIKE '%VENTAS%' THEN 'Ejecutivo de Ventas'
  WHEN departamento LIKE '%RRHH%' THEN 'Especialista RRHH'
  WHEN departamento LIKE '%SISTEMAS%' THEN 'Analista de Sistemas'
  WHEN departamento LIKE '%CONTAB%' THEN 'Contador'
  WHEN departamento LIKE '%PRODUC%' THEN 'Operario de Producción'
  WHEN departamento LIKE '%MARKET%' THEN 'Especialista Marketing'
  WHEN departamento LIKE '%LOGIST%' THEN 'Coordinador Logística'
  ELSE 'Empleado General'
END
WHERE puesto = 'N/A' OR puesto IS NULL;

-- Update motivo_baja for employees who are not active
UPDATE "PLANTILLA" 
SET motivo_baja = CASE 
  WHEN NOT activo AND fecha_baja IS NOT NULL THEN 
    CASE 
      WHEN RANDOM() < 0.3 THEN 'Renuncia Voluntaria'
      WHEN RANDOM() < 0.5 THEN 'Fin de Contrato'
      WHEN RANDOM() < 0.7 THEN 'Reestructuración'
      WHEN RANDOM() < 0.85 THEN 'Bajo Rendimiento'
      ELSE 'Otros Motivos'
    END
  ELSE NULL
END
WHERE motivo_baja IS NULL;

-- Update area based on departamento
UPDATE "PLANTILLA" 
SET area = CASE 
  WHEN departamento LIKE '%ADMIN%' OR departamento LIKE '%CONTAB%' THEN 'Administrativa'
  WHEN departamento LIKE '%VENTAS%' OR departamento LIKE '%MARKET%' THEN 'Comercial'
  WHEN departamento LIKE '%RRHH%' THEN 'Recursos Humanos'
  WHEN departamento LIKE '%SISTEMAS%' OR departamento LIKE '%TI%' THEN 'Tecnología'
  WHEN departamento LIKE '%PRODUC%' OR departamento LIKE '%OPERAC%' THEN 'Operaciones'
  WHEN departamento LIKE '%LOGIST%' THEN 'Logística'
  ELSE 'General'
END
WHERE area IS NULL;

-- Create indexes for better performance on dismissal queries
CREATE INDEX IF NOT EXISTS idx_plantilla_motivo_baja ON "PLANTILLA"(motivo_baja);
CREATE INDEX IF NOT EXISTS idx_plantilla_area ON "PLANTILLA"(area);
CREATE INDEX IF NOT EXISTS idx_plantilla_puesto ON "PLANTILLA"(puesto);
CREATE INDEX IF NOT EXISTS idx_plantilla_activo_fecha_baja ON "PLANTILLA"(activo, fecha_baja);

-- Add comments for documentation
COMMENT ON COLUMN "PLANTILLA".puesto IS 'Puesto o cargo del empleado';
COMMENT ON COLUMN "PLANTILLA".motivo_baja IS 'Motivo de la baja del empleado (solo para empleados inactivos)';
COMMENT ON COLUMN "PLANTILLA".area IS 'Área o división del empleado dentro de la empresa';