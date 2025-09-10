-- =====================================================
-- NUCLEAR_CLEAN.sql 
-- ELIMINACIÓN NUCLEAR DE TODAS LAS TABLAS
-- Para cuando las tablas son más resistentes que una cucaracha 🪳
-- =====================================================

-- ========================================
-- PASO 1: DESACTIVAR TODAS LAS RESTRICCIONES
-- ========================================
SET session_replication_role = replica;

-- ========================================
-- PASO 2: FORZAR ELIMINACIÓN DE TODAS LAS TABLAS
-- ========================================

-- Eliminar en orden específico para evitar dependencias
DROP TABLE IF EXISTS errores_importacion CASCADE;
DROP TABLE IF EXISTS importaciones_sftp CASCADE;
DROP TABLE IF EXISTS asistencia_diaria CASCADE;
DROP TABLE IF EXISTS motivos_baja CASCADE;
DROP TABLE IF EXISTS empleados_sftp CASCADE;
DROP TABLE IF EXISTS incidencias CASCADE;
DROP TABLE IF EXISTS act CASCADE;
DROP TABLE IF EXISTS plantilla CASCADE;

-- ========================================
-- PASO 3: ELIMINAR CUALQUIER VISTA QUE DEPENDA
-- ========================================
DROP VIEW IF EXISTS vista_empleados CASCADE;
DROP VIEW IF EXISTS vista_activos CASCADE;
DROP VIEW IF EXISTS vista_bajas CASCADE;

-- ========================================
-- PASO 4: ELIMINAR FUNCIONES Y TRIGGERS
-- ========================================
DROP FUNCTION IF EXISTS actualizar_timestamp() CASCADE;
DROP FUNCTION IF EXISTS calcular_kpis() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- PASO 5: ELIMINAR TIPOS PERSONALIZADOS
-- ========================================
DROP TYPE IF EXISTS estado_empleado CASCADE;
DROP TYPE IF EXISTS tipo_incidencia CASCADE;

-- ========================================
-- PASO 6: SCRIPT DINÁMICO PARA ELIMINAR TODO
-- ========================================

-- Este script encuentra TODAS las tablas del usuario y las elimina
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Buscar todas las tablas en el schema public
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP 
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP; 
END $$;

-- ========================================
-- PASO 7: REACTIVAR RESTRICCIONES
-- ========================================
SET session_replication_role = DEFAULT;

-- ========================================
-- PASO 8: VERIFICAR QUE TODO ESTÉ ELIMINADO
-- ========================================

-- Contar tablas restantes (debería ser 0)
SELECT COUNT(*) as tablas_restantes 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Mostrar cualquier tabla que aún exista
SELECT table_name as "⚠️ TABLA QUE AÚN EXISTE"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- ========================================
-- CONFIRMACIÓN FINAL
-- ========================================
SELECT 
    '🧨 ELIMINACIÓN NUCLEAR COMPLETADA' as status,
    'Si ves 0 tablas restantes, está limpio' as resultado,
    'Ahora ejecuta SETUP_CLEAN_DATABASE.sql' as siguiente_paso;

-- =====================================================
-- FIN DEL APOCALIPSIS 💀
-- Las tablas han sido eliminadas de la existencia
-- =====================================================