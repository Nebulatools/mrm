-- =============================================================================
-- SCRIPT 2: 2_poblar_tabla_incidencias.sql
-- OBJETIVO: SOLO poblar la tabla incidencias (muestra optimizada)
-- PRERREQUISITO: Ejecutar primero 1_crear_tabla_incidencias.sql
-- =============================================================================

-- BATCH INSERT optimizado para SQL Editor de Supabase
-- Insertando muestra representativa (50 registros) en un solo comando

INSERT INTO incidencias (emp, nombre, fecha, turno, horario, incidencia, entra, sale, ordinarias, numero, inci, status) VALUES
(18, '0', '2025-01-08', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(18, '0', '2025-04-02', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(18, '0', '2025-04-15', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-07', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-08', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-09', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-10', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-11', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-07-02', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-07-03', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-07-04', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-05-21', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-05-22', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-05-23', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-05-25', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-07-01', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-13', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-14', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-15', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-04-16', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-05-19', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(60, '0', '2025-05-20', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(61, '0', '2025-01-06', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(61, '0', '2025-03-30', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(61, '0', '2025-04-17', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(61, '0', '2025-05-02', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(61, '0', '2025-05-04', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(61, '0', '2025-05-16', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(61, '0', '2025-06-29', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-02-14', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-04-16', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-04-17', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-05-06', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-05-27', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-05-29', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-06-16', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-07-04', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(65, '0', '2025-07-06', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-01-30', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-02-05', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-02-06', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-02-13', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-02-14', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-05-26', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-06-11', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-04-22', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-04-23', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(83, '0', '2025-04-24', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(114, '0', '2025-02-17', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3),
(114, '0', '2025-02-24', 4, '0830_1700', 'Justif, No checó', NULL, NULL, 0, 1, 'VAC', 3);

-- =============================================================================
-- PARA IMPORTAR TODOS LOS DATOS DEL CSV (4,923 registros):
--
-- OPCIÓN 1: Usar el admin del proyecto
-- 1. Ve a http://localhost:3000/admin
-- 2. Carga el archivo incidencias1.csv directamente
-- 3. Usa "FORZAR IMPORTACIÓN REAL" para procesar todo el CSV
--
-- OPCIÓN 2: Conectar directamente a la base de datos
-- 1. Usa psql, DBeaver o pgAdmin
-- 2. Conecta con las credenciales de Supabase
-- 3. Ejecuta un script de importación masiva
--
-- OPCIÓN 3: Usar COPY desde CSV (más eficiente)
-- \COPY incidencias(emp,nombre,fecha,turno,horario,incidencia,entra,sale,ordinarias,numero,inci,status)
-- FROM 'incidencias1.csv' DELIMITER ',' CSV HEADER;
--
-- =============================================================================

-- Consulta de verificación
SELECT
    COUNT(*) as total_registros,
    COUNT(DISTINCT emp) as empleados_únicos,
    MIN(fecha) as fecha_más_antigua,
    MAX(fecha) as fecha_más_reciente,
    COUNT(DISTINCT inci) as tipos_incidencia
FROM incidencias;

-- ¡Tabla lista para usar! 🎯