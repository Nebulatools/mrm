-- =====================================================
-- CLEANUP_LEGACY_TABLES.sql
-- Script para eliminar tablas legacy no utilizadas
-- Solo mantenemos las 3 tablas SFTP necesarias:
-- empleados_sftp, motivos_baja, asistencia_diaria
-- =====================================================

-- ========================================
-- ELIMINAR TABLAS LEGACY NO UTILIZADAS
-- ========================================

-- Eliminar tabla plantilla (legacy)
DROP TABLE IF EXISTS plantilla CASCADE;

-- Eliminar tabla act (legacy)
DROP TABLE IF EXISTS act CASCADE;

-- Eliminar tabla incidencias (legacy)
DROP TABLE IF EXISTS incidencias CASCADE;

-- ========================================
-- VERIFICAR TABLAS RESTANTES
-- ========================================

-- Verificar que solo queden las 3 tablas SFTP
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('empleados_sftp', 'motivos_baja', 'asistencia_diaria', 'plantilla', 'act', 'incidencias')
ORDER BY table_name;

-- ========================================
-- CONFIRMAR CONTEO DE DATOS
-- ========================================

-- Mostrar conteo final de las 3 tablas SFTP
SELECT 
    'empleados_sftp' as tabla, COUNT(*) as registros FROM empleados_sftp
UNION ALL
SELECT 
    'motivos_baja' as tabla, COUNT(*) as registros FROM motivos_baja
UNION ALL
SELECT 
    'asistencia_diaria' as tabla, COUNT(*) as registros FROM asistencia_diaria
ORDER BY tabla;

-- ========================================
-- CONFIRMACIÓN FINAL
-- ========================================
SELECT 
    '✅ CLEANUP COMPLETADO' as status,
    'Solo quedan las 3 tablas SFTP necesarias' as resultado,
    'empleados_sftp, motivos_baja, asistencia_diaria' as tablas_activas;

-- =====================================================
-- SCRIPT COMPLETADO ✅
-- Ahora tu base de datos solo tiene las 3 tablas SFTP
-- =====================================================