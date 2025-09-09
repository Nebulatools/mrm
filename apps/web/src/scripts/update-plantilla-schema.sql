-- Agregar campos necesarios para análisis de retención
ALTER TABLE "PLANTILLA" 
ADD COLUMN IF NOT EXISTS puesto VARCHAR(150) DEFAULT 'N/A',
ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT NULL;

-- Actualizar registros existentes con datos de ejemplo
UPDATE "PLANTILLA" 
SET 
    puesto = CASE 
        WHEN departamento = 'IT' THEN 'Desarrollador'
        WHEN departamento = 'RRHH' THEN 'Especialista RRHH'
        WHEN departamento = 'Ventas' THEN 'Ejecutivo Ventas'
        WHEN departamento = 'Marketing' THEN 'Analista Marketing'
        WHEN departamento = 'Finanzas' THEN 'Contador'
        ELSE 'Empleado General'
    END,
    area = CASE 
        WHEN departamento IN ('IT', 'Marketing') THEN 'Corporativo'
        WHEN departamento IN ('Ventas', 'Finanzas') THEN 'Comercial'
        WHEN departamento = 'RRHH' THEN 'Administrativo'
        ELSE 'Operativo'
    END
WHERE puesto = 'N/A' OR area IS NULL;

-- Actualizar motivos de baja para empleados inactivos
UPDATE "PLANTILLA" 
SET motivo_baja = CASE 
    WHEN RANDOM() < 0.3 THEN 'Renuncia Voluntaria'
    WHEN RANDOM() < 0.6 THEN 'Mejor Oportunidad'
    WHEN RANDOM() < 0.8 THEN 'Motivos Personales'
    WHEN RANDOM() < 0.9 THEN 'Despido Disciplinario'
    ELSE 'Fin de Contrato'
END
WHERE activo = false AND motivo_baja IS NULL;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_plantilla_puesto ON "PLANTILLA"(puesto);
CREATE INDEX IF NOT EXISTS idx_plantilla_motivo_baja ON "PLANTILLA"(motivo_baja);
CREATE INDEX IF NOT EXISTS idx_plantilla_area ON "PLANTILLA"(area);