-- =====================================================
-- CLEAN_SLATE.sql
-- ELIMINAR TODO Y EMPEZAR COMPLETAMENTE LIMPIO
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- ========================================
-- PASO 1: ELIMINAR TODAS LAS TABLAS EXISTENTES
-- ========================================

-- Eliminar tablas principales (orden importante por dependencias)
DROP TABLE IF EXISTS errores_importacion CASCADE;
DROP TABLE IF EXISTS importaciones_sftp CASCADE;
DROP TABLE IF EXISTS asistencia_diaria CASCADE;
DROP TABLE IF EXISTS motivos_baja CASCADE;
DROP TABLE IF EXISTS empleados_sftp CASCADE;
DROP TABLE IF EXISTS incidencias CASCADE;
DROP TABLE IF EXISTS act CASCADE;
DROP TABLE IF EXISTS plantilla CASCADE;

-- ========================================
-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS RLS
-- ========================================

-- Si existen políticas, las eliminamos
DROP POLICY IF EXISTS "Allow all operations on empleados_sftp" ON empleados_sftp;
DROP POLICY IF EXISTS "Allow all operations on motivos_baja" ON motivos_baja;
DROP POLICY IF EXISTS "Allow all operations on asistencia_diaria" ON asistencia_diaria;
DROP POLICY IF EXISTS "Allow all operations on incidencias" ON incidencias;
DROP POLICY IF EXISTS "Allow all operations on act" ON act;
DROP POLICY IF EXISTS "Allow all operations on plantilla" ON plantilla;

-- ========================================
-- PASO 3: ELIMINAR ÍNDICES HUÉRFANOS (SI LOS HAY)
-- ========================================

-- Los índices se eliminan automáticamente con las tablas,
-- pero por si acaso eliminamos cualquier función o tipo custom
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TYPE IF EXISTS empleado_status CASCADE;

-- ========================================
-- PASO 4: LIMPIAR ESQUEMA COMPLETO
-- ========================================

-- Eliminar todas las secuencias asociadas
DROP SEQUENCE IF EXISTS empleados_sftp_id_seq CASCADE;
DROP SEQUENCE IF EXISTS motivos_baja_id_seq CASCADE;
DROP SEQUENCE IF EXISTS asistencia_diaria_id_seq CASCADE;
DROP SEQUENCE IF EXISTS incidencias_id_seq CASCADE;
DROP SEQUENCE IF EXISTS act_id_seq CASCADE;
DROP SEQUENCE IF EXISTS plantilla_id_seq CASCADE;

-- ========================================
-- VERIFICACIÓN: MOSTRAR TABLAS RESTANTES
-- ========================================

-- Ver qué tablas quedan (debería estar vacío o solo tablas del sistema)
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ========================================
-- MENSAJE DE CONFIRMACIÓN
-- ========================================

SELECT 'LIMPIEZA COMPLETA TERMINADA ✅' as status,
       'Todas las tablas han sido eliminadas' as message,
       'Ahora ejecuta SETUP_CLEAN_DATABASE.sql' as next_step;

-- =====================================================
-- SCRIPT COMPLETADO ✅
-- Después de ejecutar este script:
-- 1. Ejecuta SETUP_CLEAN_DATABASE.sql
-- 2. Prueba la importación SFTP
-- =====================================================