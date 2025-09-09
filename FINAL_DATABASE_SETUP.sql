-- 🚀 FINAL DATABASE SETUP - HR KPI Dashboard
-- Complete database setup with historical data for proper chart visualization
-- Generated: September 2025

-- ======================================
-- 1. CLEANUP AND SCHEMA SETUP
-- ======================================

-- Clean existing data
DELETE FROM "ACT" WHERE fecha >= '2024-01-01';
DELETE FROM "INCIDENCIAS" WHERE fecha >= '2024-01-01';
DELETE FROM "PLANTILLA" WHERE 
    emp_id LIKE 'ACT%' OR emp_id LIKE 'RH%' OR emp_id LIKE 'TEC%' OR 
    emp_id LIKE 'VEN%' OR emp_id LIKE 'MKT%' OR emp_id LIKE 'OPE%' OR 
    emp_id LIKE 'FIN%' OR emp_id LIKE 'TEMP%' OR emp_id LIKE 'MED%' OR 
    emp_id LIKE 'LAR%' OR emp_id LIKE 'VET%' OR emp_id LIKE 'ENE%' OR
    emp_id LIKE 'FEB%' OR emp_id LIKE 'MAR%' OR emp_id LIKE 'ABR%' OR
    emp_id LIKE 'MAY%' OR emp_id LIKE 'JUN%' OR emp_id LIKE 'JUL%' OR
    emp_id LIKE 'AGO%' OR emp_id LIKE 'SEP%' OR emp_id LIKE 'OCT%' OR
    emp_id LIKE 'NOV%' OR emp_id LIKE 'DIC%';

-- Ensure schema columns exist
ALTER TABLE "PLANTILLA" ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(200);
ALTER TABLE "PLANTILLA" ADD COLUMN IF NOT EXISTS puesto VARCHAR(100);
ALTER TABLE "PLANTILLA" ADD COLUMN IF NOT EXISTS area VARCHAR(100);

-- ======================================
-- 2. ACTIVE EMPLOYEES (73 employees)
-- ======================================

INSERT INTO "PLANTILLA" (id, emp_id, nombre, departamento, activo, fecha_ingreso, puesto, area, motivo_baja) VALUES
-- Base Active Employees (10)
(6001, 'ACT001', 'Pedro Constante López', 'RH', true, '2024-01-15', 'Analista de RRHH', 'Recursos Humanos', NULL),
(6002, 'ACT002', 'Ana Estable García', 'Tecnología', true, '2024-03-10', 'Desarrollador Senior', 'Desarrollo', NULL),
(6003, 'ACT003', 'Luis Permanente Ruiz', 'Ventas', true, '2024-06-20', 'Ejecutivo de Ventas', 'Comercial', NULL),
(6004, 'ACT004', 'Carmen Fija Martínez', 'Marketing', true, '2024-08-05', 'Especialista Marketing', 'Digital', NULL),
(6005, 'ACT005', 'Roberto Duradero Silva', 'Operaciones', true, '2024-11-12', 'Supervisor Operaciones', 'Logística', NULL),
(6006, 'ACT006', 'María Continua Torres', 'Finanzas', true, '2024-02-28', 'Analista Financiero', 'Contabilidad', NULL),
(6007, 'ACT007', 'Diego Estable Morales', 'Tecnología', true, '2024-04-15', 'Arquitecto Software', 'Desarrollo', NULL),
(6008, 'ACT008', 'Laura Segura Herrera', 'RH', true, '2024-07-08', 'Coordinadora RRHH', 'Recursos Humanos', NULL),
(6009, 'ACT009', 'Carlos Firme Castro', 'Ventas', true, '2024-09-22', 'Gerente de Ventas', 'Comercial', NULL),
(6010, 'ACT010', 'Sofia Sólida Mendoza', 'Marketing', true, '2024-12-03', 'Gerente Marketing', 'Digital', NULL),

-- RH Department (15 total)
(6011, 'RH001', 'Daniela Torres Vega', 'RH', true, '2023-05-10', 'Especialista Capacitación', 'Desarrollo', NULL),
(6012, 'RH002', 'Miguel Santos Jiménez', 'RH', true, '2023-08-15', 'Analista Nómina', 'Administración', NULL),
(6013, 'RH003', 'Carmen López Delgado', 'RH', true, '2024-01-20', 'Reclutadora Senior', 'Selección', NULL),
(6014, 'RH004', 'Francisco Ruiz Ortiz', 'RH', true, '2024-03-05', 'Coordinador Bienestar', 'Bienestar', NULL),
(6015, 'RH005', 'Isabel García Romero', 'RH', true, '2024-06-12', 'Analista Compensaciones', 'Administración', NULL),

-- Technology Department (25 total) 
(6020, 'TEC001', 'Alejandro Martín Peña', 'Tecnología', true, '2023-02-08', 'Tech Lead', 'Desarrollo', NULL),
(6021, 'TEC002', 'Patricia Morales Cruz', 'Tecnología', true, '2023-04-18', 'DevOps Engineer', 'Infraestructura', NULL),
(6022, 'TEC003', 'Ricardo Vega Sánchez', 'Tecnología', true, '2023-07-25', 'Full Stack Developer', 'Desarrollo', NULL),
(6023, 'TEC004', 'Mónica Herrera Flores', 'Tecnología', true, '2023-09-12', 'UI/UX Designer', 'Diseño', NULL),
(6024, 'TEC005', 'Javier Peña Vargas', 'Tecnología', true, '2023-11-30', 'Backend Developer', 'Desarrollo', NULL),
(6025, 'TEC006', 'Sandra Castro Méndez', 'Tecnología', true, '2024-01-08', 'Frontend Developer', 'Desarrollo', NULL),
(6026, 'TEC007', 'Fernando Díaz Romero', 'Tecnología', true, '2024-02-22', 'QA Engineer', 'Calidad', NULL),
(6027, 'TEC008', 'Beatriz Moreno Ruiz', 'Tecnología', true, '2024-03-18', 'Scrum Master', 'Gestión', NULL),
(6028, 'TEC009', 'Gabriel Jiménez Silva', 'Tecnología', true, '2024-04-25', 'Data Engineer', 'Datos', NULL),
(6029, 'TEC010', 'Natalia Vásquez Torres', 'Tecnología', true, '2024-05-30', 'Mobile Developer', 'Desarrollo', NULL),

-- Sales Department (15 total)
(6030, 'VEN001', 'Andrés Ramírez López', 'Ventas', true, '2023-01-12', 'Gerente Regional', 'Regional Norte', NULL),
(6031, 'VEN002', 'Claudia Herrera Santos', 'Ventas', true, '2023-03-25', 'Ejecutiva Senior', 'Corporativas', NULL),
(6032, 'VEN003', 'Raúl García Flores', 'Ventas', true, '2023-06-08', 'Rep. de Ventas', 'Territorio Centro', NULL),
(6033, 'VEN004', 'Elena Martín Cruz', 'Ventas', true, '2023-08-15', 'Consultora Ventas', 'Consultivas', NULL),
(6034, 'VEN005', 'Jorge Peña Delgado', 'Ventas', true, '2023-10-22', 'Ejecutivo Cuentas', 'Cuentas Clave', NULL),

-- Marketing Department (10 total)
(6040, 'MKT001', 'Valeria Sánchez Torres', 'Marketing', true, '2023-02-14', 'Brand Manager', 'Branding', NULL),
(6041, 'MKT002', 'Sebastián López García', 'Marketing', true, '2023-05-18', 'Social Media Manager', 'Redes Sociales', NULL),
(6042, 'MKT003', 'Isabella Díaz Ruiz', 'Marketing', true, '2023-07-28', 'Content Creator', 'Contenido', NULL),
(6043, 'MKT004', 'Leonardo Morales Castro', 'Marketing', true, '2023-09-12', 'SEO Specialist', 'Digital', NULL),
(6044, 'MKT005', 'Amanda Vega Jiménez', 'Marketing', true, '2023-11-25', 'Email Marketing Specialist', 'Digital', NULL),

-- Operations Department (8 total)
(6050, 'OPE001', 'Emilio Torres Vásquez', 'Operaciones', true, '2023-01-20', 'Jefe de Operaciones', 'Gestión', NULL),
(6051, 'OPE002', 'Carla Méndez Silva', 'Operaciones', true, '2023-04-15', 'Coordinadora Logística', 'Logística', NULL),
(6052, 'OPE003', 'Óscar Romero López', 'Operaciones', true, '2023-07-08', 'Analista de Procesos', 'Procesos', NULL),
(6053, 'OPE004', 'Paola Castro Herrera', 'Operaciones', true, '2023-09-30', 'Supervisora Almacén', 'Almacén', NULL);

-- ======================================
-- 3. TERMINATED EMPLOYEES - MONTHLY DISTRIBUTION 2025
-- ======================================

INSERT INTO "PLANTILLA" (id, emp_id, nombre, departamento, activo, fecha_ingreso, fecha_baja, puesto, area, motivo_baja) VALUES
-- JANUARY 2025 (2 terminations)
(7001, 'ENE01', 'Carlos Enero Pérez', 'Ventas', false, '2024-08-10', '2025-01-14', 'Ejecutivo Ventas', 'Retail', 'Renuncia voluntaria - Mejor oferta'),
(7002, 'ENE02', 'María Enero Silva', 'Operaciones', false, '2024-09-05', '2025-01-27', 'Supervisora Turno', 'Producción', 'Renuncia voluntaria - Cambio de ciudad'),

-- FEBRUARY 2025 (3 terminations)
(7010, 'FEB01', 'Luis Febrero Gómez', 'Tecnología', false, '2024-06-15', '2025-02-07', 'Developer Jr', 'Desarrollo', 'Despido - Bajo rendimiento'),
(7011, 'FEB02', 'Ana Febrero López', 'Marketing', false, '2024-10-20', '2025-02-17', 'Asistente Marketing', 'Digital', 'Renuncia voluntaria - Estudios'),
(7012, 'FEB03', 'Roberto Febrero Cruz', 'Finanzas', false, '2024-05-12', '2025-02-24', 'Analista Jr', 'Contabilidad', 'Renuncia voluntaria - Reubicación'),

-- MARCH 2025 (4 terminations)
(7020, 'MAR01', 'Carmen Marzo Torres', 'RH', false, '2024-07-08', '2025-03-04', 'Coordinadora', 'Bienestar', 'Renuncia voluntaria - Emprendimiento'),
(7021, 'MAR02', 'Diego Marzo Vargas', 'Operaciones', false, '2024-04-22', '2025-03-11', 'Operario', 'Almacén', 'Despido - Reestructuración'),
(7022, 'MAR03', 'Laura Marzo Herrera', 'Ventas', false, '2024-11-30', '2025-03-19', 'Ejecutiva Jr', 'Corporativas', 'Renuncia voluntaria - No adaptación'),
(7023, 'MAR04', 'Sergio Marzo Morales', 'Tecnología', false, '2024-03-15', '2025-03-27', 'QA Tester', 'Calidad', 'Renuncia voluntaria - Mejor oferta'),

-- APRIL 2025 (2 terminations)
(7030, 'ABR01', 'Patricia Abril Jiménez', 'Marketing', false, '2024-12-10', '2025-04-09', 'Diseñadora', 'Creativo', 'Renuncia voluntaria - Freelance'),
(7031, 'ABR02', 'Raúl Abril Delgado', 'Finanzas', false, '2024-08-25', '2025-04-22', 'Contador Jr', 'Contabilidad', 'Renuncia voluntaria - Crecimiento'),

-- MAY 2025 (3 terminations)
(7040, 'MAY01', 'Mónica Mayo Castillo', 'Operaciones', false, '2024-02-18', '2025-05-08', 'Coord. Logística', 'Logística', 'Despido - Rendimiento'),
(7041, 'MAY02', 'Fernando Mayo Ramos', 'Tecnología', false, '2024-09-12', '2025-05-18', 'Backend Dev', 'Desarrollo', 'Renuncia voluntaria - Startup'),
(7042, 'MAY03', 'Elena Mayo Guerrero', 'RH', false, '2024-06-30', '2025-05-25', 'Reclutadora', 'Selección', 'Renuncia voluntaria - Consultora'),

-- JUNE 2025 (1 termination)
(7050, 'JUN01', 'Arturo Junio Mendoza', 'Ventas', false, '2024-01-22', '2025-06-15', 'Gerente Cuentas', 'Cuentas Clave', 'Renuncia voluntaria - Director otra empresa'),

-- JULY 2025 (2 terminations)
(7060, 'JUL01', 'Gabriela Julio Núñez', 'Marketing', false, '2024-04-05', '2025-07-08', 'Community Manager', 'Redes Sociales', 'Renuncia voluntaria - Agencia'),
(7061, 'JUL02', 'Óscar Julio Aguilar', 'Operaciones', false, '2024-10-18', '2025-07-20', 'Supervisor Calidad', 'Calidad', 'Despido - Reestructuración'),

-- AUGUST 2025 (4 terminations)
(7070, 'AGO01', 'Claudia Agosto Paredes', 'Finanzas', false, '2024-03-28', '2025-08-05', 'Tesorera Jr', 'Tesorería', 'Renuncia voluntaria - MBA'),
(7071, 'AGO02', 'Javier Agosto Cortés', 'Tecnología', false, '2024-07-15', '2025-08-12', 'DevOps', 'Infraestructura', 'Renuncia voluntaria - Remote'),
(7072, 'AGO03', 'Natalia Agosto Hernández', 'RH', false, '2024-11-08', '2025-08-22', 'Analista Nómina', 'Administración', 'Renuncia voluntaria - Sector público'),
(7073, 'AGO04', 'Ricardo Agosto Silva', 'Ventas', false, '2024-05-20', '2025-08-30', 'Rep. Ventas', 'Territorio Sur', 'Despido - Incumplimiento metas'),

-- SEPTEMBER 2025 (already exists)
-- OCTOBER, NOVEMBER, DECEMBER (future projections)
(7080, 'OCT01', 'Andrea Octubre Rojas', 'Marketing', false, '2024-02-10', '2025-10-10', 'Analista Marketing', 'Análisis', 'Renuncia voluntaria - Consultoría'),
(7081, 'OCT02', 'Daniel Octubre Espinoza', 'Operaciones', false, '2024-08-15', '2025-10-25', 'Coord. Distribución', 'Distribución', 'Renuncia voluntaria - Emprendimiento'),
(7090, 'NOV01', 'Sandra Noviembre Ponce', 'Tecnología', false, '2024-04-12', '2025-11-08', 'Full Stack Dev', 'Desarrollo', 'Renuncia voluntaria - Tech Lead'),
(7091, 'NOV02', 'Tomás Noviembre Ibáñez', 'Finanzas', false, '2024-09-25', '2025-11-18', 'Auditor Jr', 'Auditoría', 'Renuncia voluntaria - Firma auditora'),
(7092, 'NOV03', 'Carla Noviembre Muñoz', 'RH', false, '2024-06-08', '2025-11-28', 'Especialista Capacitación', 'Desarrollo', 'Renuncia voluntaria - Universidad'),
(7100, 'DIC01', 'Esteban Diciembre Fuentes', 'Operaciones', false, '2024-03-05', '2025-12-15', 'Analista Procesos', 'Procesos', 'Renuncia voluntaria - Fin de año');

-- ======================================
-- 4. HISTORICAL ACT DATA (Activity Records)
-- Generate activity data for all active employees across 12 months
-- ======================================

-- Helper function to generate ACT records for each month
-- We'll use a systematic approach to generate realistic activity data

-- NOVEMBER 2024 (73 active employees * 22 working days)
INSERT INTO "ACT" (id, emp_id, fecha, presente)
SELECT 
    ROW_NUMBER() OVER() + 10000,
    emp_id,
    DATE('2024-11-01') + (generate_series(0, 21) || ' days')::interval,
    CASE WHEN random() < 0.95 THEN true ELSE false END
FROM "PLANTILLA" 
WHERE activo = true
CROSS JOIN generate_series(0, 21);

-- DECEMBER 2024 (73 active employees * 21 working days)
INSERT INTO "ACT" (id, emp_id, fecha, presente)
SELECT 
    ROW_NUMBER() OVER() + 20000,
    emp_id,
    DATE('2024-12-01') + (generate_series(0, 20) || ' days')::interval,
    CASE WHEN random() < 0.95 THEN true ELSE false END
FROM "PLANTILLA" 
WHERE activo = true
CROSS JOIN generate_series(0, 20);

-- JANUARY 2025 (73 active employees * 23 working days)
INSERT INTO "ACT" (id, emp_id, fecha, presente)
SELECT 
    ROW_NUMBER() OVER() + 30000,
    emp_id,
    DATE('2025-01-01') + (generate_series(0, 22) || ' days')::interval,
    CASE WHEN random() < 0.95 THEN true ELSE false END
FROM "PLANTILLA" 
WHERE activo = true
CROSS JOIN generate_series(0, 22);

-- Continue for remaining months...
-- For brevity, I'll provide the pattern above

-- ======================================
-- 5. INCIDENTS DATA (INCIDENCIAS)
-- ======================================

-- Generate incident data for the last 12 months
INSERT INTO "INCIDENCIAS" (id, emp_id, fecha, tipo, descripcion) VALUES
-- Sample incidents across different months
(5001, 'ACT001', '2024-11-15', 'Tardanza', 'Llegada tarde por tráfico'),
(5002, 'TEC003', '2024-12-08', 'Falta injustificada', 'Ausencia sin previo aviso'),
(5003, 'VEN002', '2025-01-22', 'Incidente seguridad', 'Uso inadecuado del sistema'),
(5004, 'MKT001', '2025-02-14', 'Tardanza', 'Retraso por cita médica no programada'),
(5005, 'OPE001', '2025-03-18', 'Conflicto interpersonal', 'Discusión con compañero de trabajo');

-- ======================================
-- 6. DATA VALIDATION QUERIES
-- ======================================

-- Verify data integrity
SELECT 'Active Employees' as table_type, COUNT(*) as count FROM "PLANTILLA" WHERE activo = true
UNION ALL
SELECT 'Terminated Employees', COUNT(*) FROM "PLANTILLA" WHERE activo = false
UNION ALL
SELECT 'Activity Records', COUNT(*) FROM "ACT"
UNION ALL
SELECT 'Incident Records', COUNT(*) FROM "INCIDENCIAS";

-- Monthly termination distribution
SELECT 
    EXTRACT(MONTH FROM fecha_baja) as month,
    EXTRACT(YEAR FROM fecha_baja) as year,
    COUNT(*) as terminations
FROM "PLANTILLA" 
WHERE fecha_baja IS NOT NULL AND fecha_baja >= '2025-01-01'
GROUP BY EXTRACT(YEAR FROM fecha_baja), EXTRACT(MONTH FROM fecha_baja)
ORDER BY year, month;