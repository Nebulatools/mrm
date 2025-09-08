-- ======================================================================
-- SQL COMPLETO - HR KPI Dashboard Database Schema & Population
-- ======================================================================
-- Purpose: Complete database setup with table creation and sample data
-- Last Updated: 2024-12-24
-- Environment: Supabase PostgreSQL
-- ======================================================================

-- ======================================================================
-- 1. CREATE TABLES WITH PROPER SCHEMA
-- ======================================================================

-- Table: PLANTILLA (Employee Master Data)
CREATE TABLE IF NOT EXISTS "PLANTILLA" (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    departamento VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    fecha_ingreso DATE NOT NULL,
    fecha_baja DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: INCIDENCIAS (Incident Records)
CREATE TABLE IF NOT EXISTS "INCIDENCIAS" (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (emp_id) REFERENCES "PLANTILLA"(emp_id) ON DELETE CASCADE
);

-- Table: ACT (Daily Activity Records)
CREATE TABLE IF NOT EXISTS "ACT" (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    presente BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (emp_id) REFERENCES "PLANTILLA"(emp_id) ON DELETE CASCADE,
    UNIQUE(emp_id, fecha)
);

-- ======================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE OPTIMIZATION
-- ======================================================================

-- PLANTILLA indexes
CREATE INDEX IF NOT EXISTS idx_plantilla_emp_id ON "PLANTILLA"(emp_id);
CREATE INDEX IF NOT EXISTS idx_plantilla_departamento ON "PLANTILLA"(departamento);
CREATE INDEX IF NOT EXISTS idx_plantilla_activo ON "PLANTILLA"(activo);
CREATE INDEX IF NOT EXISTS idx_plantilla_fecha_ingreso ON "PLANTILLA"(fecha_ingreso);

-- INCIDENCIAS indexes
CREATE INDEX IF NOT EXISTS idx_incidencias_emp_id ON "INCIDENCIAS"(emp_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON "INCIDENCIAS"(fecha);
CREATE INDEX IF NOT EXISTS idx_incidencias_tipo ON "INCIDENCIAS"(tipo);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha_emp ON "INCIDENCIAS"(fecha, emp_id);

-- ACT indexes
CREATE INDEX IF NOT EXISTS idx_act_emp_id ON "ACT"(emp_id);
CREATE INDEX IF NOT EXISTS idx_act_fecha ON "ACT"(fecha);
CREATE INDEX IF NOT EXISTS idx_act_fecha_emp ON "ACT"(fecha, emp_id);
CREATE INDEX IF NOT EXISTS idx_act_presente ON "ACT"(presente);

-- ======================================================================
-- 3. COMPLETE SAMPLE DATA POPULATION
-- ======================================================================

-- Clear existing data for fresh population
TRUNCATE TABLE "ACT" CASCADE;
TRUNCATE TABLE "INCIDENCIAS" CASCADE;
TRUNCATE TABLE "PLANTILLA" CASCADE;
ALTER SEQUENCE plantilla_id_seq RESTART WITH 1;
ALTER SEQUENCE incidencias_id_seq RESTART WITH 1;
ALTER SEQUENCE act_id_seq RESTART WITH 1;

-- ======================================================================
-- 3.1 POPULATE PLANTILLA (Employee Master Data)
-- ======================================================================

INSERT INTO "PLANTILLA" (emp_id, nombre, departamento, activo, fecha_ingreso, fecha_baja) VALUES
-- Active Employees - Management
('EMP001', 'Juan Carlos Pérez', 'Gerencia', true, '2020-01-15', NULL),
('EMP002', 'María Elena García', 'Gerencia', true, '2020-02-20', NULL),
('EMP003', 'Carlos Alberto López', 'Gerencia', true, '2019-11-10', NULL),

-- Active Employees - Human Resources
('EMP004', 'Ana Sofía Martínez', 'RRHH', true, '2021-03-15', NULL),
('EMP005', 'Roberto Miguel Sánchez', 'RRHH', true, '2021-04-10', NULL),
('EMP006', 'Patricia Isabel Rodríguez', 'RRHH', true, '2020-08-25', NULL),
('EMP007', 'Diego Fernando Torres', 'RRHH', true, '2022-01-12', NULL),

-- Active Employees - Operations
('EMP008', 'Carmen Victoria Herrera', 'Operaciones', true, '2021-06-18', NULL),
('EMP009', 'Miguel Ángel Ramírez', 'Operaciones', true, '2021-07-22', NULL),
('EMP010', 'Laura Patricia Morales', 'Operaciones', true, '2020-12-08', NULL),
('EMP011', 'Fernando José Castro', 'Operaciones', true, '2022-02-14', NULL),
('EMP012', 'Alejandra María Vargas', 'Operaciones', true, '2021-09-30', NULL),
('EMP013', 'Andrés Felipe Jiménez', 'Operaciones', true, '2022-03-18', NULL),

-- Active Employees - Finance
('EMP014', 'Beatriz Elena Aguilar', 'Finanzas', true, '2021-05-20', NULL),
('EMP015', 'Ricardo Antonio Mendoza', 'Finanzas', true, '2020-10-15', NULL),
('EMP016', 'Gabriela Lucía Ruiz', 'Finanzas', true, '2022-01-25', NULL),

-- Active Employees - IT
('EMP017', 'Leonardo Gabriel Ortiz', 'TI', true, '2021-08-12', NULL),
('EMP018', 'Mónica Alejandra Silva', 'TI', true, '2021-11-08', NULL),
('EMP019', 'Javier Eduardo Romero', 'TI', true, '2022-04-05', NULL),
('EMP020', 'Valeria Cristina Paredes', 'TI', true, '2022-06-20', NULL),

-- Active Employees - Sales
('EMP021', 'Sergio Iván Delgado', 'Ventas', true, '2021-10-12', NULL),
('EMP022', 'Natalia Esperanza Cruz', 'Ventas', true, '2021-12-15', NULL),
('EMP023', 'Mauricio Alejandro Vega', 'Ventas', true, '2022-02-28', NULL),
('EMP024', 'Isabella María Guerrero', 'Ventas', true, '2022-05-10', NULL),
('EMP025', 'Tomás Francisco Peña', 'Ventas', true, '2022-07-18', NULL),

-- Inactive Employees (Terminated/Left)
('EMP026', 'Luis Alberto Medina', 'Operaciones', false, '2020-06-15', '2024-10-30'),
('EMP027', 'Sandra Patricia Herrera', 'RRHH', false, '2021-01-20', '2024-11-15'),
('EMP028', 'Raúl Enrique Moreno', 'Finanzas', false, '2020-09-08', '2024-09-28'),
('EMP029', 'Claudia Marcela Rojas', 'Ventas', false, '2021-07-12', '2024-12-05'),
('EMP030', 'Alberto José Castillo', 'TI', false, '2021-04-25', '2024-11-20');

-- ======================================================================
-- 3.2 POPULATE INCIDENCIAS (Incident Records)
-- ======================================================================

INSERT INTO "INCIDENCIAS" (emp_id, fecha, tipo, descripcion) VALUES
-- January 2024 Incidents
('EMP001', '2024-01-05', 'Retraso', 'Llegada tardía por tráfico'),
('EMP003', '2024-01-08', 'Ausencia', 'Cita médica programada'),
('EMP005', '2024-01-12', 'Salida Temprana', 'Emergencia familiar'),
('EMP008', '2024-01-15', 'Retraso', 'Problemas de transporte público'),
('EMP011', '2024-01-18', 'Ausencia', 'Incapacidad médica'),
('EMP014', '2024-01-22', 'Retraso', 'Cita médica temprana'),
('EMP017', '2024-01-25', 'Salida Temprana', 'Trámite personal urgente'),
('EMP020', '2024-01-28', 'Ausencia', 'Vacaciones programadas'),

-- February 2024 Incidents
('EMP002', '2024-02-02', 'Retraso', 'Problema vehicular'),
('EMP004', '2024-02-05', 'Ausencia', 'Enfermedad común'),
('EMP007', '2024-02-09', 'Retraso', 'Cita bancaria'),
('EMP009', '2024-02-12', 'Salida Temprana', 'Cita odontológica'),
('EMP012', '2024-02-16', 'Ausencia', 'Calamidad familiar'),
('EMP015', '2024-02-19', 'Retraso', 'Lluvia intensa'),
('EMP018', '2024-02-23', 'Ausencia', 'Capacitación externa'),
('EMP021', '2024-02-26', 'Salida Temprana', 'Reunión de padres'),

-- March 2024 Incidents
('EMP006', '2024-03-01', 'Retraso', 'Accidente de tránsito menor'),
('EMP010', '2024-03-05', 'Ausencia', 'Examen médico anual'),
('EMP013', '2024-03-08', 'Salida Temprana', 'Día Internacional de la Mujer'),
('EMP016', '2024-03-12', 'Retraso', 'Falla en el sistema de transporte'),
('EMP019', '2024-03-15', 'Ausencia', 'Licencia de maternidad inicio'),
('EMP022', '2024-03-18', 'Retraso', 'Cita con cliente externo'),
('EMP024', '2024-03-22', 'Salida Temprana', 'Renovación de documentos'),
('EMP025', '2024-03-25', 'Ausencia', 'Vacaciones Semana Santa'),

-- April 2024 Incidents
('EMP001', '2024-04-02', 'Retraso', 'Cita médica de control'),
('EMP008', '2024-04-05', 'Ausencia', 'Licencia de paternidad'),
('EMP011', '2024-04-09', 'Salida Temprana', 'Graduación familiar'),
('EMP014', '2024-04-12', 'Retraso', 'Problema con el vehículo'),
('EMP017', '2024-04-16', 'Ausencia', 'Conferencia tecnológica'),
('EMP023', '2024-04-19', 'Retraso', 'Reunión con proveedor'),
('EMP002', '2024-04-23', 'Salida Temprana', 'Cumpleaños hijo'),
('EMP005', '2024-04-26', 'Ausencia', 'Trámite legal'),

-- May 2024 Incidents
('EMP003', '2024-05-03', 'Retraso', 'Manifestación en la vía'),
('EMP007', '2024-05-07', 'Ausencia', 'Día del Trabajador diferido'),
('EMP009', '2024-05-10', 'Salida Temprana', 'Día de la Madre'),
('EMP012', '2024-05-14', 'Retraso', 'Cita con especialista'),
('EMP015', '2024-05-17', 'Ausencia', 'Capacitación financiera'),
('EMP018', '2024-05-21', 'Retraso', 'Actualización de sistemas'),
('EMP021', '2024-05-24', 'Salida Temprana', 'Visita comercial'),
('EMP025', '2024-05-28', 'Ausencia', 'Vacaciones programadas'),

-- June 2024 Incidents
('EMP004', '2024-06-04', 'Retraso', 'Lluvia torrencial'),
('EMP006', '2024-06-07', 'Ausencia', 'Examen de laboratorio'),
('EMP010', '2024-06-11', 'Salida Temprana', 'Entrega de notas escolares'),
('EMP013', '2024-06-14', 'Retraso', 'Falla eléctrica en casa'),
('EMP016', '2024-06-18', 'Ausencia', 'Seminario contable'),
('EMP019', '2024-06-21', 'Salida Temprana', 'Fin de licencia maternidad'),
('EMP022', '2024-06-25', 'Retraso', 'Visita a cliente importante'),
('EMP024', '2024-06-28', 'Ausencia', 'Vacaciones de mitad año'),

-- July-December 2024 Incidents (Extended sample)
('EMP001', '2024-07-02', 'Ausencia', 'Vacaciones anuales'),
('EMP008', '2024-07-15', 'Retraso', 'Cita con notario'),
('EMP011', '2024-08-05', 'Salida Temprana', 'Inicio clases hijo'),
('EMP014', '2024-08-20', 'Ausencia', 'Licencia por luto'),
('EMP017', '2024-09-10', 'Retraso', 'Mantenimiento vehículo'),
('EMP023', '2024-09-25', 'Salida Temprana', 'Reunión escolar'),
('EMP002', '2024-10-08', 'Ausencia', 'Día de la Raza'),
('EMP005', '2024-10-22', 'Retraso', 'Cita oftalmológica'),
('EMP007', '2024-11-05', 'Salida Temprana', 'Día de Todos los Santos'),
('EMP009', '2024-11-18', 'Ausencia', 'Incapacidad gripe'),
('EMP012', '2024-12-02', 'Retraso', 'Compras navideñas'),
('EMP015', '2024-12-16', 'Salida Temprana', 'Novena navideña');

-- ======================================================================
-- 3.3 POPULATE ACT (Daily Activity Records)
-- ======================================================================

-- Generate daily activity records for active employees for 2024
-- This creates a realistic attendance pattern for KPI calculation

DO $$
DECLARE
    emp_record RECORD;
    current_date_iter DATE;
    days_in_month INTEGER;
    random_absence_chance REAL;
BEGIN
    -- Loop through all active employees
    FOR emp_record IN SELECT emp_id FROM "PLANTILLA" WHERE activo = true LOOP
        -- Generate records for each month in 2024
        FOR month_iter IN 1..12 LOOP
            -- Get the number of days in the current month
            days_in_month := EXTRACT(days FROM DATE_TRUNC('month', MAKE_DATE(2024, month_iter, 1)) + INTERVAL '1 month - 1 day');
            
            -- Generate daily records for the month
            FOR day_iter IN 1..days_in_month LOOP
                current_date_iter := MAKE_DATE(2024, month_iter, day_iter);
                
                -- Skip weekends (Saturday = 6, Sunday = 0)
                IF EXTRACT(dow FROM current_date_iter) NOT IN (0, 6) THEN
                    -- Random absence chance (5% probability of absence)
                    random_absence_chance := RANDOM();
                    
                    INSERT INTO "ACT" (emp_id, fecha, presente)
                    VALUES (
                        emp_record.emp_id,
                        current_date_iter,
                        CASE WHEN random_absence_chance < 0.95 THEN true ELSE false END
                    )
                    ON CONFLICT (emp_id, fecha) DO NOTHING;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Add specific absence records for terminated employees before their termination date
INSERT INTO "ACT" (emp_id, fecha, presente) VALUES
-- EMP026 (terminated 2024-10-30) - last working days
('EMP026', '2024-10-28', true),
('EMP026', '2024-10-29', true),
('EMP026', '2024-10-25', false),

-- EMP027 (terminated 2024-11-15) - last working days  
('EMP027', '2024-11-14', true),
('EMP027', '2024-11-13', false),
('EMP027', '2024-11-12', true),

-- EMP028 (terminated 2024-09-28) - last working days
('EMP028', '2024-09-27', true),
('EMP028', '2024-09-26', true),
('EMP028', '2024-09-25', false),

-- EMP029 (terminated 2024-12-05) - last working days
('EMP029', '2024-12-04', true),
('EMP029', '2024-12-03', false),
('EMP029', '2024-12-02', true),

-- EMP030 (terminated 2024-11-20) - last working days
('EMP030', '2024-11-19', true),
('EMP030', '2024-11-18', false),
('EMP030', '2024-11-15', true)

ON CONFLICT (emp_id, fecha) DO NOTHING;

-- ======================================================================
-- 4. DISABLE ROW LEVEL SECURITY FOR API ACCESS
-- ======================================================================

ALTER TABLE "PLANTILLA" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "INCIDENCIAS" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ACT" DISABLE ROW LEVEL SECURITY;

-- ======================================================================
-- 5. GRANT PERMISSIONS FOR SUPABASE ANON ROLE
-- ======================================================================

-- Grant SELECT permissions to anon role for dashboard access
GRANT SELECT ON "PLANTILLA" TO anon;
GRANT SELECT ON "INCIDENCIAS" TO anon;
GRANT SELECT ON "ACT" TO anon;

-- Grant INSERT permissions for data ingestion
GRANT INSERT ON "PLANTILLA" TO anon;
GRANT INSERT ON "INCIDENCIAS" TO anon;
GRANT INSERT ON "ACT" TO anon;

-- Grant UPDATE permissions for data corrections
GRANT UPDATE ON "PLANTILLA" TO anon;
GRANT UPDATE ON "INCIDENCIAS" TO anon;
GRANT UPDATE ON "ACT" TO anon;

-- Grant sequence usage for inserts
GRANT USAGE, SELECT ON SEQUENCE plantilla_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE incidencias_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE act_id_seq TO anon;

-- ======================================================================
-- 6. CREATE USEFUL VIEWS FOR KPI CALCULATIONS
-- ======================================================================

-- View: Monthly Employee Summary
CREATE OR REPLACE VIEW monthly_employee_summary AS
SELECT 
    DATE_TRUNC('month', fecha)::DATE as month,
    COUNT(DISTINCT emp_id) as active_employees,
    COUNT(*) as total_working_days,
    COUNT(*) FILTER (WHERE presente = true) as present_days,
    COUNT(*) FILTER (WHERE presente = false) as absent_days,
    ROUND(COUNT(*) FILTER (WHERE presente = true)::DECIMAL / COUNT(*) * 100, 2) as attendance_rate
FROM "ACT" 
GROUP BY DATE_TRUNC('month', fecha)
ORDER BY month DESC;

-- View: Department Summary
CREATE OR REPLACE VIEW department_summary AS
SELECT 
    departamento,
    COUNT(*) as total_employees,
    COUNT(*) FILTER (WHERE activo = true) as active_employees,
    COUNT(*) FILTER (WHERE activo = false) as inactive_employees,
    ROUND(COUNT(*) FILTER (WHERE activo = false)::DECIMAL / COUNT(*) * 100, 2) as turnover_rate
FROM "PLANTILLA" 
GROUP BY departamento
ORDER BY active_employees DESC;

-- View: Incident Summary
CREATE OR REPLACE VIEW incident_summary AS
SELECT 
    DATE_TRUNC('month', fecha)::DATE as month,
    tipo,
    COUNT(*) as incident_count,
    COUNT(DISTINCT emp_id) as affected_employees
FROM "INCIDENCIAS" 
GROUP BY DATE_TRUNC('month', fecha), tipo
ORDER BY month DESC, incident_count DESC;

-- ======================================================================
-- 7. VERIFICATION QUERIES
-- ======================================================================

-- Verify data population
SELECT 'PLANTILLA' as table_name, COUNT(*) as record_count FROM "PLANTILLA"
UNION ALL
SELECT 'INCIDENCIAS' as table_name, COUNT(*) as record_count FROM "INCIDENCIAS"  
UNION ALL
SELECT 'ACT' as table_name, COUNT(*) as record_count FROM "ACT";

-- Display sample KPI calculations
SELECT 
    'Current Active Employees' as metric,
    COUNT(*) as value
FROM "PLANTILLA" 
WHERE activo = true;

-- Show recent activity summary
SELECT * FROM monthly_employee_summary LIMIT 6;

-- Show department breakdown  
SELECT * FROM department_summary;

-- ======================================================================
-- 8. MAINTENANCE AND CLEANUP PROCEDURES
-- ======================================================================

-- Function to refresh monthly summaries (for future use)
CREATE OR REPLACE FUNCTION refresh_monthly_summaries()
RETURNS void AS $$
BEGIN
    -- Could add materialized view refreshes here
    -- For now, views are automatically updated
    RAISE NOTICE 'Monthly summaries refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "ACT" WHERE fecha < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM "INCIDENCIAS" WHERE fecha < cutoff_date;
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- SCRIPT COMPLETION
-- ======================================================================

SELECT 'Database setup completed successfully!' as status,
       NOW() as completion_time;