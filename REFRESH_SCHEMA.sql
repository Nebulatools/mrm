-- =====================================================
-- REFRESH_SCHEMA.sql
-- FORZAR ACTUALIZACIÓN DEL CACHÉ DE SUPABASE
-- =====================================================

-- ========================================
-- PASO 1: VERIFICAR ESTRUCTURA ACTUAL
-- ========================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('empleados_sftp', 'motivos_baja')
ORDER BY table_name, ordinal_position;

-- ========================================
-- PASO 2: FORZAR REFRESH DEL SCHEMA
-- ========================================

-- Notificar a PostgREST que el schema cambió
NOTIFY pgrst, 'reload schema';

-- Alternar RLS para forzar refresh
ALTER TABLE empleados_sftp DISABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_sftp ENABLE ROW LEVEL SECURITY;

ALTER TABLE motivos_baja DISABLE ROW LEVEL SECURITY;
ALTER TABLE motivos_baja ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PASO 3: VERIFICAR QUE FUNCIONA
-- ========================================

-- Test inserción simple
INSERT INTO empleados_sftp (
    numero_empleado,
    apellidos,
    nombres,
    nombre_completo,
    departamento,
    area,
    clasificacion,
    fecha_ingreso,
    activo
) VALUES (
    9998,
    'Test',
    'Usuario',
    'Usuario Test',
    'SISTEMAS',
    'Tecnología',
    'Confianza',
    '2024-01-01',
    true
) ON CONFLICT (numero_empleado) DO UPDATE SET
    apellidos = EXCLUDED.apellidos;

-- Verificar que se insertó
SELECT 
    numero_empleado,
    nombre_completo,
    departamento,
    area,
    clasificacion
FROM empleados_sftp 
WHERE numero_empleado = 9998;

-- ========================================
-- CONFIRMACIÓN
-- ========================================
SELECT 
    '✅ SCHEMA REFRESH COMPLETADO' as status,
    'Caché de Supabase actualizado correctamente' as resultado,
    'Ahora puedes importar los datos SFTP' as siguiente_paso;