-- 🚀 POPULATE DATABASE - Agregar 12 meses de datos para filtros
-- Ejecuta este script en tu Supabase para tener filtros completos
-- Solo agrega datos que faltan, no borra nada existente

-- ======================================
-- 1. AGREGAR EMPLEADOS ACTIVOS (63 nuevos)
-- ======================================

INSERT INTO "PLANTILLA" (emp_id, nombre, departamento, activo, fecha_ingreso, puesto, area, motivo_baja) VALUES
-- RH Department (12 más - total 15)
('RH006', 'Daniela Torres Vega', 'RH', true, '2023-05-10', 'Especialista Capacitación', 'Desarrollo', NULL),
('RH007', 'Miguel Santos Jiménez', 'RH', true, '2023-08-15', 'Analista Nómina', 'Administración', NULL),
('RH008', 'Carmen López Delgado', 'RH', true, '2024-01-20', 'Reclutadora Senior', 'Selección', NULL),
('RH009', 'Francisco Ruiz Ortiz', 'RH', true, '2024-03-05', 'Coordinador Bienestar', 'Bienestar', NULL),
('RH010', 'Isabel García Romero', 'RH', true, '2024-06-12', 'Analista Compensaciones', 'Administración', NULL),

-- Technology Department (20 más - total 25)
('TEC011', 'Alejandro Martín Peña', 'Tecnología', true, '2023-02-08', 'Tech Lead', 'Desarrollo', NULL),
('TEC012', 'Patricia Morales Cruz', 'Tecnología', true, '2023-04-18', 'DevOps Engineer', 'Infraestructura', NULL),
('TEC013', 'Ricardo Vega Sánchez', 'Tecnología', true, '2023-07-25', 'Full Stack Developer', 'Desarrollo', NULL),
('TEC014', 'Mónica Herrera Flores', 'Tecnología', true, '2023-09-12', 'UI/UX Designer', 'Diseño', NULL),
('TEC015', 'Javier Peña Vargas', 'Tecnología', true, '2023-11-30', 'Backend Developer', 'Desarrollo', NULL),
('TEC016', 'Sandra Castro Méndez', 'Tecnología', true, '2024-01-08', 'Frontend Developer', 'Desarrollo', NULL),
('TEC017', 'Fernando Díaz Romero', 'Tecnología', true, '2024-02-22', 'QA Engineer', 'Calidad', NULL),
('TEC018', 'Beatriz Moreno Ruiz', 'Tecnología', true, '2024-03-18', 'Scrum Master', 'Gestión', NULL),
('TEC019', 'Gabriel Jiménez Silva', 'Tecnología', true, '2024-04-25', 'Data Engineer', 'Datos', NULL),
('TEC020', 'Natalia Vásquez Torres', 'Tecnología', true, '2024-05-30', 'Mobile Developer', 'Desarrollo', NULL),

-- Sales Department (10 más - total 15)
('VEN006', 'Andrés Ramírez López', 'Ventas', true, '2023-01-12', 'Gerente Regional', 'Regional Norte', NULL),
('VEN007', 'Claudia Herrera Santos', 'Ventas', true, '2023-03-25', 'Ejecutiva Senior', 'Corporativas', NULL),
('VEN008', 'Raúl García Flores', 'Ventas', true, '2023-06-08', 'Rep. de Ventas', 'Territorio Centro', NULL),
('VEN009', 'Elena Martín Cruz', 'Ventas', true, '2023-08-15', 'Consultora Ventas', 'Consultivas', NULL),
('VEN010', 'Jorge Peña Delgado', 'Ventas', true, '2023-10-22', 'Ejecutivo Cuentas', 'Cuentas Clave', NULL),

-- Marketing Department (5 más - total 10)
('MKT006', 'Valeria Sánchez Torres', 'Marketing', true, '2023-02-14', 'Brand Manager', 'Branding', NULL),
('MKT007', 'Sebastián López García', 'Marketing', true, '2023-05-18', 'Social Media Manager', 'Redes Sociales', NULL),
('MKT008', 'Isabella Díaz Ruiz', 'Marketing', true, '2023-07-28', 'Content Creator', 'Contenido', NULL),
('MKT009', 'Leonardo Morales Castro', 'Marketing', true, '2023-09-12', 'SEO Specialist', 'Digital', NULL),
('MKT010', 'Amanda Vega Jiménez', 'Marketing', true, '2023-11-25', 'Email Marketing Specialist', 'Digital', NULL),

-- Operations Department (4 más - total 8)
('OPE005', 'Emilio Torres Vásquez', 'Operaciones', true, '2023-01-20', 'Jefe de Operaciones', 'Gestión', NULL),
('OPE006', 'Carla Méndez Silva', 'Operaciones', true, '2023-04-15', 'Coordinadora Logística', 'Logística', NULL),
('OPE007', 'Óscar Romero López', 'Operaciones', true, '2023-07-08', 'Analista de Procesos', 'Procesos', NULL),
('OPE008', 'Paola Castro Herrera', 'Operaciones', true, '2023-09-30', 'Supervisora Almacén', 'Almacén', NULL),

-- Finanzas Department (7 nuevos)
('FIN001', 'Carlos Finanzas López', 'Finanzas', true, '2023-03-15', 'Controller', 'Contabilidad', NULL),
('FIN002', 'María Finanzas García', 'Finanzas', true, '2023-06-20', 'Analista Senior', 'Análisis', NULL),
('FIN003', 'Luis Finanzas Martín', 'Finanzas', true, '2023-09-10', 'Tesorero', 'Tesorería', NULL),
('FIN004', 'Ana Finanzas Silva', 'Finanzas', true, '2024-01-12', 'Auditora', 'Auditoría', NULL),
('FIN005', 'Roberto Finanzas Cruz', 'Finanzas', true, '2024-04-18', 'Analista Jr', 'Contabilidad', NULL);

-- ======================================
-- 2. AGREGAR EMPLEADOS CON BAJAS 2025 (35 empleados)
-- ======================================

INSERT INTO "PLANTILLA" (emp_id, nombre, departamento, activo, fecha_ingreso, fecha_baja, puesto, area, motivo_baja) VALUES
-- ENERO 2025 (2 bajas)
('BAJA_ENE01', 'Carlos Enero Pérez', 'Ventas', false, '2024-08-10', '2025-01-14', 'Ejecutivo Ventas', 'Retail', 'Renuncia voluntaria - Mejor oferta'),
('BAJA_ENE02', 'María Enero Silva', 'Operaciones', false, '2024-09-05', '2025-01-27', 'Supervisora Turno', 'Producción', 'Renuncia voluntaria - Cambio de ciudad'),

-- FEBRERO 2025 (3 bajas)
('BAJA_FEB01', 'Luis Febrero Gómez', 'Tecnología', false, '2024-06-15', '2025-02-07', 'Developer Jr', 'Desarrollo', 'Despido - Bajo rendimiento'),
('BAJA_FEB02', 'Ana Febrero López', 'Marketing', false, '2024-10-20', '2025-02-17', 'Asistente Marketing', 'Digital', 'Renuncia voluntaria - Estudios'),
('BAJA_FEB03', 'Roberto Febrero Cruz', 'Finanzas', false, '2024-05-12', '2025-02-24', 'Analista Jr', 'Contabilidad', 'Renuncia voluntaria - Reubicación'),

-- MARZO 2025 (4 bajas)
('BAJA_MAR01', 'Carmen Marzo Torres', 'RH', false, '2024-07-08', '2025-03-04', 'Coordinadora', 'Bienestar', 'Renuncia voluntaria - Emprendimiento'),
('BAJA_MAR02', 'Diego Marzo Vargas', 'Operaciones', false, '2024-04-22', '2025-03-11', 'Operario', 'Almacén', 'Despido - Reestructuración'),
('BAJA_MAR03', 'Laura Marzo Herrera', 'Ventas', false, '2024-11-30', '2025-03-19', 'Ejecutiva Jr', 'Corporativas', 'Renuncia voluntaria - No adaptación'),
('BAJA_MAR04', 'Sergio Marzo Morales', 'Tecnología', false, '2024-03-15', '2025-03-27', 'QA Tester', 'Calidad', 'Renuncia voluntaria - Mejor oferta'),

-- ABRIL 2025 (2 bajas)
('BAJA_ABR01', 'Patricia Abril Jiménez', 'Marketing', false, '2024-12-10', '2025-04-09', 'Diseñadora', 'Creativo', 'Renuncia voluntaria - Freelance'),
('BAJA_ABR02', 'Raúl Abril Delgado', 'Finanzas', false, '2024-08-25', '2025-04-22', 'Contador Jr', 'Contabilidad', 'Renuncia voluntaria - Crecimiento'),

-- MAYO 2025 (3 bajas)
('BAJA_MAY01', 'Mónica Mayo Castillo', 'Operaciones', false, '2024-02-18', '2025-05-08', 'Coord. Logística', 'Logística', 'Despido - Rendimiento'),
('BAJA_MAY02', 'Fernando Mayo Ramos', 'Tecnología', false, '2024-09-12', '2025-05-18', 'Backend Dev', 'Desarrollo', 'Renuncia voluntaria - Startup'),
('BAJA_MAY03', 'Elena Mayo Guerrero', 'RH', false, '2024-06-30', '2025-05-25', 'Reclutadora', 'Selección', 'Renuncia voluntaria - Consultora'),

-- JUNIO 2025 (1 baja)
('BAJA_JUN01', 'Arturo Junio Mendoza', 'Ventas', false, '2024-01-22', '2025-06-15', 'Gerente Cuentas', 'Cuentas Clave', 'Renuncia voluntaria - Director otra empresa'),

-- JULIO 2025 (2 bajas)
('BAJA_JUL01', 'Gabriela Julio Núñez', 'Marketing', false, '2024-04-05', '2025-07-08', 'Community Manager', 'Redes Sociales', 'Renuncia voluntaria - Agencia'),
('BAJA_JUL02', 'Óscar Julio Aguilar', 'Operaciones', false, '2024-10-18', '2025-07-20', 'Supervisor Calidad', 'Calidad', 'Despido - Reestructuración'),

-- AGOSTO 2025 (4 bajas)
('BAJA_AGO01', 'Claudia Agosto Paredes', 'Finanzas', false, '2024-03-28', '2025-08-05', 'Tesorera Jr', 'Tesorería', 'Renuncia voluntaria - MBA'),
('BAJA_AGO02', 'Javier Agosto Cortés', 'Tecnología', false, '2024-07-15', '2025-08-12', 'DevOps', 'Infraestructura', 'Renuncia voluntaria - Remote'),
('BAJA_AGO03', 'Natalia Agosto Hernández', 'RH', false, '2024-11-08', '2025-08-22', 'Analista Nómina', 'Administración', 'Renuncia voluntaria - Sector público'),
('BAJA_AGO04', 'Ricardo Agosto Silva', 'Ventas', false, '2024-05-20', '2025-08-30', 'Rep. Ventas', 'Territorio Sur', 'Despido - Incumplimiento metas'),

-- OCTUBRE 2025 (2 bajas futuras)
('BAJA_OCT01', 'Andrea Octubre Rojas', 'Marketing', false, '2024-02-10', '2025-10-10', 'Analista Marketing', 'Análisis', 'Renuncia voluntaria - Consultoría'),
('BAJA_OCT02', 'Daniel Octubre Espinoza', 'Operaciones', false, '2024-08-15', '2025-10-25', 'Coord. Distribución', 'Distribución', 'Renuncia voluntaria - Emprendimiento'),

-- NOVIEMBRE 2025 (3 bajas futuras)
('BAJA_NOV01', 'Sandra Noviembre Ponce', 'Tecnología', false, '2024-04-12', '2025-11-08', 'Full Stack Dev', 'Desarrollo', 'Renuncia voluntaria - Tech Lead'),
('BAJA_NOV02', 'Tomás Noviembre Ibáñez', 'Finanzas', false, '2024-09-25', '2025-11-18', 'Auditor Jr', 'Auditoría', 'Renuncia voluntaria - Firma auditora'),
('BAJA_NOV03', 'Carla Noviembre Muñoz', 'RH', false, '2024-06-08', '2025-11-28', 'Especialista Capacitación', 'Desarrollo', 'Renuncia voluntaria - Universidad'),

-- DICIEMBRE 2025 (1 baja futura)
('BAJA_DIC01', 'Esteban Diciembre Fuentes', 'Operaciones', false, '2024-03-05', '2025-12-15', 'Analista Procesos', 'Procesos', 'Renuncia voluntaria - Fin de año');

-- ======================================
-- 3. ACTIVIDAD MENSUAL (ACT) - 12 MESES
-- ======================================

-- Generar registros de actividad para todos los empleados activos
-- Noviembre 2024 (30 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2024-11-01'::date, 
        '2024-11-30'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Diciembre 2024 (31 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2024-12-01'::date, 
        '2024-12-31'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Enero 2025 (31 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-01-01'::date, 
        '2025-01-31'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Febrero 2025 (28 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-02-01'::date, 
        '2025-02-28'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Marzo 2025 (31 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-03-01'::date, 
        '2025-03-31'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Abril 2025 (30 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-04-01'::date, 
        '2025-04-30'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Mayo 2025 (31 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-05-01'::date, 
        '2025-05-31'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Junio 2025 (30 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-06-01'::date, 
        '2025-06-30'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Julio 2025 (31 días)  
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-07-01'::date, 
        '2025-07-31'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Octubre 2025 (31 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-10-01'::date, 
        '2025-10-31'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Noviembre 2025 (30 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-11-01'::date, 
        '2025-11-30'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- Diciembre 2025 (31 días)
WITH active_employees AS (
    SELECT emp_id FROM "PLANTILLA" WHERE activo = true
), 
dates AS (
    SELECT generate_series(
        '2025-12-01'::date, 
        '2025-12-31'::date, 
        '1 day'::interval
    )::date as fecha
)
INSERT INTO "ACT" (emp_id, fecha, presente)
SELECT 
    ae.emp_id,
    d.fecha,
    CASE WHEN random() < 0.93 THEN true ELSE false END
FROM active_employees ae
CROSS JOIN dates d;

-- ======================================
-- 4. INCIDENCIAS ADICIONALES
-- ======================================

INSERT INTO "INCIDENCIAS" (emp_id, fecha, tipo, descripcion) VALUES
-- Incidencias distribuidas a lo largo del año
('RH001', '2024-11-15', 'Tardanza', 'Llegada tarde por tráfico'),
('TEC013', '2024-12-08', 'Falta injustificada', 'Ausencia sin previo aviso'),
('VEN007', '2025-01-22', 'Incidente seguridad', 'Uso inadecuado del sistema'),
('MKT006', '2025-02-14', 'Tardanza', 'Retraso por cita médica no programada'),
('OPE005', '2025-03-18', 'Conflicto interpersonal', 'Discusión con compañero de trabajo'),
('FIN001', '2025-04-10', 'Tardanza', 'Problema de transporte'),
('TEC015', '2025-05-22', 'Falta justificada', 'Licencia médica'),
('VEN008', '2025-06-05', 'Incidente seguridad', 'Acceso no autorizado'),
('MKT008', '2025-07-18', 'Tardanza', 'Cita personal'),
('RH007', '2025-08-12', 'Conflicto interpersonal', 'Diferencias con supervisor'),
('OPE007', '2025-09-25', 'Falta injustificada', 'No se presentó sin avisar'),
('FIN003', '2025-10-15', 'Tardanza', 'Tráfico intenso'),
('TEC017', '2025-11-08', 'Incidente seguridad', 'Pérdida de credenciales'),
('VEN009', '2025-12-20', 'Tardanza', 'Reunión familiar imprevista');

-- ======================================
-- 5. VERIFICACIÓN FINAL
-- ======================================

-- Contar registros por tabla
SELECT 'Total Empleados Activos' as descripcion, COUNT(*) as cantidad FROM "PLANTILLA" WHERE activo = true
UNION ALL
SELECT 'Total Empleados con Bajas', COUNT(*) FROM "PLANTILLA" WHERE activo = false
UNION ALL
SELECT 'Total Registros ACT', COUNT(*) FROM "ACT"
UNION ALL
SELECT 'Total Incidencias', COUNT(*) FROM "INCIDENCIAS";

-- Verificar distribución mensual de datos ACT
SELECT 
    EXTRACT(YEAR FROM fecha) as año,
    EXTRACT(MONTH FROM fecha) as mes,
    COUNT(DISTINCT fecha) as dias_con_datos,
    COUNT(*) as total_registros
FROM "ACT" 
WHERE fecha >= '2024-11-01'
GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
ORDER BY año, mes;

-- Verificar bajas por mes 2025
SELECT 
    EXTRACT(MONTH FROM fecha_baja) as mes,
    COUNT(*) as bajas
FROM "PLANTILLA" 
WHERE fecha_baja IS NOT NULL 
    AND fecha_baja >= '2025-01-01' 
    AND fecha_baja < '2026-01-01'
GROUP BY EXTRACT(MONTH FROM fecha_baja)
ORDER BY mes;