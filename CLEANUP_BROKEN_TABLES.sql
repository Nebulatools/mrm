-- ============================================================================
-- CLEANUP SCRIPT - REMOVE BROKEN/UNUSED TABLES
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Remove old uppercase tables that are no longer working
DROP TABLE IF EXISTS "ACT" CASCADE;
DROP TABLE IF EXISTS "INCIDENCIAS" CASCADE; 
DROP TABLE IF EXISTS "PLANTILLA" CASCADE;

-- Remove any other legacy tables that might exist
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS absence_records CASCADE;
DROP TABLE IF EXISTS payroll_records CASCADE;

-- Clean up any orphaned indexes or constraints from old tables
-- (PostgreSQL will automatically drop them with CASCADE, but just to be safe)

-- Verify current tables (should only have SFTP-based tables and views)
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

-- ============================================================================
-- CONFIRMATION MESSAGE
-- ============================================================================
SELECT '✅ Tablas rotas eliminadas exitosamente' as status,
       'Solo quedan las tablas SFTP y vistas funcionando' as detalle;