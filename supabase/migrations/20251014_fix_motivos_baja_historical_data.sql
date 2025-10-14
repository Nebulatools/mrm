-- Migración para corregir registros históricos en motivos_baja (2023-2024)
-- Problema: 421 registros tienen los campos intercambiados
-- Estructura incorrecta: tipo=nombre, motivo="Baja", descripcion=categoría
-- Estructura correcta: tipo="Baja", motivo=categoría, descripcion=categoría

-- ============================================================================
-- PASO 1: Crear tabla temporal de respaldo
-- ============================================================================
CREATE TABLE IF NOT EXISTS motivos_baja_backup_20251014 AS
SELECT * FROM motivos_baja WHERE fecha_baja < '2025-01-01';

-- ============================================================================
-- PASO 2: Crear tabla temporal para análisis
-- ============================================================================
CREATE TEMP TABLE motivos_baja_analysis AS
SELECT
  id,
  numero_empleado,
  fecha_baja,
  tipo AS tipo_original,
  motivo AS motivo_original,
  descripcion AS descripcion_original,
  CASE
    -- Si tipo contiene "Baja", ya está correcto
    WHEN tipo = 'Baja' THEN tipo
    -- Si motivo contiene "Baja", los campos están intercambiados
    WHEN motivo = 'Baja' THEN 'Baja'
    ELSE tipo
  END AS tipo_nuevo,
  CASE
    -- Si tipo contiene "Baja", ya está correcto
    WHEN tipo = 'Baja' THEN motivo
    -- Si motivo contiene "Baja", usar descripcion como nuevo motivo
    WHEN motivo = 'Baja' THEN COALESCE(descripcion, 'Motivo no especificado')
    ELSE motivo
  END AS motivo_nuevo,
  CASE
    -- Si tipo contiene "Baja", ya está correcto
    WHEN tipo = 'Baja' THEN descripcion
    -- Si motivo contiene "Baja", usar descripcion como descripcion nueva
    WHEN motivo = 'Baja' THEN descripcion
    ELSE descripcion
  END AS descripcion_nueva,
  CASE
    WHEN tipo = 'Baja' THEN 'correcto'
    WHEN motivo = 'Baja' THEN 'necesita_correccion'
    ELSE 'revisar_manual'
  END AS status_registro
FROM motivos_baja
WHERE fecha_baja < '2025-01-01';

-- ============================================================================
-- PASO 3: Mostrar resumen de cambios (para logging)
-- ============================================================================
DO $$
DECLARE
  total_registros INT;
  registros_correctos INT;
  registros_a_corregir INT;
  registros_revisar INT;
BEGIN
  SELECT COUNT(*) INTO total_registros FROM motivos_baja_analysis;
  SELECT COUNT(*) INTO registros_correctos FROM motivos_baja_analysis WHERE status_registro = 'correcto';
  SELECT COUNT(*) INTO registros_a_corregir FROM motivos_baja_analysis WHERE status_registro = 'necesita_correccion';
  SELECT COUNT(*) INTO registros_revisar FROM motivos_baja_analysis WHERE status_registro = 'revisar_manual';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ANÁLISIS DE REGISTROS HISTÓRICOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de registros históricos: %', total_registros;
  RAISE NOTICE 'Registros correctos (ya tienen tipo=Baja): %', registros_correctos;
  RAISE NOTICE 'Registros que necesitan corrección: %', registros_a_corregir;
  RAISE NOTICE 'Registros que requieren revisión manual: %', registros_revisar;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PASO 4: Aplicar correcciones
-- ============================================================================
UPDATE motivos_baja mb
SET
  tipo = analysis.tipo_nuevo,
  motivo = analysis.motivo_nuevo,
  descripcion = analysis.descripcion_nueva
FROM motivos_baja_analysis analysis
WHERE mb.id = analysis.id
  AND analysis.status_registro = 'necesita_correccion';

-- ============================================================================
-- PASO 5: Crear tabla de registros que necesitan revisión manual
-- ============================================================================
CREATE TABLE IF NOT EXISTS motivos_baja_revisar_manual AS
SELECT
  id,
  numero_empleado,
  fecha_baja,
  tipo_original,
  motivo_original,
  descripcion_original,
  'Registro que requiere revisión manual' AS nota
FROM motivos_baja_analysis
WHERE status_registro = 'revisar_manual';

-- ============================================================================
-- PASO 6: Crear índices para mejorar el rendimiento
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_motivos_baja_fecha ON motivos_baja(fecha_baja);
CREATE INDEX IF NOT EXISTS idx_motivos_baja_tipo ON motivos_baja(tipo);
CREATE INDEX IF NOT EXISTS idx_motivos_baja_numero_empleado ON motivos_baja(numero_empleado);

-- ============================================================================
-- PASO 7: Agregar constraint para prevenir datos inconsistentes en el futuro
-- ============================================================================
-- Comentado por ahora, se puede habilitar cuando se confirme que todos los datos son correctos
-- ALTER TABLE motivos_baja
-- ADD CONSTRAINT check_tipo_baja
-- CHECK (tipo IN ('Baja', 'Renuncia', 'Despido', 'Término de Contrato', 'Otra razón'));

-- ============================================================================
-- PASO 8: Validación final
-- ============================================================================
DO $$
DECLARE
  registros_corregidos INT;
  total_tipo_baja INT;
BEGIN
  -- Contar registros que fueron corregidos
  SELECT COUNT(*) INTO registros_corregidos
  FROM motivos_baja
  WHERE fecha_baja < '2025-01-01'
    AND tipo = 'Baja';

  -- Total de registros con tipo = 'Baja' en el período histórico
  SELECT COUNT(*) INTO total_tipo_baja
  FROM motivos_baja
  WHERE fecha_baja < '2025-01-01';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDACIÓN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registros históricos con tipo=Baja: % de %', registros_corregidos, total_tipo_baja;
  RAISE NOTICE 'Porcentaje corregido: %%%', ROUND((registros_corregidos::NUMERIC / total_tipo_baja::NUMERIC) * 100, 2);
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tabla de respaldo: motivos_baja_backup_20251014';
  RAISE NOTICE 'Registros para revisar: motivos_baja_revisar_manual';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- NOTAS DE REVERSIÓN
-- ============================================================================
-- Si necesitas revertir los cambios, ejecuta:
-- DELETE FROM motivos_baja WHERE fecha_baja < '2025-01-01';
-- INSERT INTO motivos_baja SELECT id, numero_empleado, fecha_baja, tipo, motivo, descripcion, fecha_creacion
-- FROM motivos_baja_backup_20251014;
-- DROP TABLE motivos_baja_backup_20251014;
-- DROP TABLE motivos_baja_revisar_manual;
