-- ============================================================================
-- SQL Views for ML Service (Supabase REST API Compatible)
-- ============================================================================
-- Instrucciones:
-- 1. Abre tu Supabase Dashboard: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt
-- 2. Ve a SQL Editor
-- 3. Copia y pega este archivo completo
-- 4. Ejecuta (Run)
-- 5. ¡Listo! Las vistas estarán disponibles para el ML service
-- ============================================================================

-- Drop existing views (si existen)
DROP VIEW IF EXISTS ml_rotation_features CASCADE;
DROP VIEW IF EXISTS ml_absenteeism_features CASCADE;
DROP VIEW IF EXISTS ml_attrition_features CASCADE;
DROP VIEW IF EXISTS ml_forecast_features CASCADE;
DROP VIEW IF EXISTS ml_lifecycle_features CASCADE;
DROP VIEW IF EXISTS ml_patterns_features CASCADE;
DROP VIEW IF EXISTS ml_productivity_features CASCADE;

-- ============================================================================
-- VIEW 1: ml_rotation_features
-- Used by: rotation.py, segment_risk.py, interventions.py
-- ============================================================================
CREATE OR REPLACE VIEW ml_rotation_features AS
WITH base AS (
    SELECT
        e.numero_empleado AS employee_id,
        e.activo,
        e.genero,
        e.area,
        e.departamento,
        e.puesto,
        e.clasificacion,
        e.ubicacion,
        e.tipo_nomina,
        e.turno,
        e.empresa,
        e.fecha_ingreso,
        e.fecha_antiguedad,
        e.fecha_baja
    FROM empleados_sftp e
),
incidencia_windows AS (
    SELECT
        emp AS employee_id,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
                         AND inci IN ('FI','SUSP','PSIN','ENFE','ACCI')) AS neg_30d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
                         AND inci IN ('FI','SUSP','PSIN','ENFE','ACCI')) AS neg_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '365 days'
                         AND inci IN ('FI','SUSP','PSIN','ENFE','ACCI')) AS neg_365d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
                         AND inci IN ('VAC','PCON','MAT3','MAT1','PATER','JUST')) AS permisos_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '365 days'
                         AND inci IN ('VAC','PCON','MAT3','MAT1','PATER','JUST')) AS permisos_365d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days') AS total_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '365 days') AS total_365d
    FROM incidencias
    WHERE fecha >= CURRENT_DATE - INTERVAL '365 days'
    GROUP BY emp
),
motivos AS (
    SELECT DISTINCT ON (numero_empleado)
        numero_empleado AS employee_id,
        tipo AS motivo_tipo,
        motivo AS motivo_detalle,
        fecha_baja
    FROM motivos_baja
    WHERE fecha_baja >= CURRENT_DATE - INTERVAL '730 days'
    ORDER BY numero_empleado, fecha_baja DESC
)
SELECT
    b.employee_id,
    b.activo,
    b.genero,
    b.area,
    b.departamento,
    b.puesto,
    b.clasificacion,
    b.ubicacion,
    b.tipo_nomina,
    b.turno,
    b.empresa,
    b.fecha_ingreso,
    b.fecha_antiguedad,
    b.fecha_baja,
    COALESCE(i.neg_30d, 0) AS neg_30d,
    COALESCE(i.neg_90d, 0) AS neg_90d,
    COALESCE(i.neg_365d, 0) AS neg_365d,
    COALESCE(i.permisos_90d, 0) AS permisos_90d,
    COALESCE(i.permisos_365d, 0) AS permisos_365d,
    COALESCE(i.total_90d, 0) AS total_90d,
    COALESCE(i.total_365d, 0) AS total_365d,
    m.motivo_tipo,
    m.motivo_detalle,
    m.fecha_baja AS ultima_fecha_baja,
    CASE WHEN m.employee_id IS NOT NULL THEN 1 ELSE 0 END AS target_rotacion
FROM base b
LEFT JOIN incidencia_windows i ON i.employee_id = b.employee_id
LEFT JOIN motivos m ON m.employee_id = b.employee_id
WHERE b.fecha_ingreso IS NOT NULL;

-- ============================================================================
-- VIEW 2: ml_absenteeism_features
-- Used by: absenteeism.py, interventions.py
-- ============================================================================
CREATE OR REPLACE VIEW ml_absenteeism_features AS
WITH params AS (
    SELECT
        date_trunc('month', CURRENT_DATE - INTERVAL '12 months')::date AS start_month,
        date_trunc('month', CURRENT_DATE)::date AS end_month
),
month_grid AS (
    SELECT generate_series(start_month, end_month, INTERVAL '1 month')::date AS month_start
    FROM params
),
employee_month AS (
    SELECT
        e.numero_empleado,
        e.area,
        e.departamento,
        e.turno,
        e.clasificacion,
        e.tipo_nomina,
        e.empresa,
        e.fecha_ingreso,
        e.fecha_antiguedad,
        e.fecha_baja,
        mg.month_start,
        (mg.month_start + INTERVAL '1 month' - INTERVAL '1 day')::date AS month_end
    FROM empleados_sftp e
    CROSS JOIN month_grid mg
    WHERE e.fecha_ingreso <= (mg.month_start + INTERVAL '1 month' - INTERVAL '1 day')
      AND (e.fecha_baja IS NULL OR e.fecha_baja >= mg.month_start)
),
history AS (
    SELECT
        em.numero_empleado,
        em.month_start,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '28 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_prev_28d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '56 days' AND em.month_start - INTERVAL '29 days'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_prev_56d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '365 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_prev_365d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '90 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])
        ) AS permisos_prev_90d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start - INTERVAL '365 days' AND em.month_start - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])
        ) AS permisos_prev_365d
    FROM employee_month em
    LEFT JOIN incidencias i ON i.emp = em.numero_empleado
    GROUP BY em.numero_empleado, em.month_start
),
future AS (
    SELECT
        em.numero_empleado,
        em.month_start,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN em.month_start AND em.month_start + INTERVAL '30 days'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_next_30d
    FROM employee_month em
    LEFT JOIN incidencias i ON i.emp = em.numero_empleado
    GROUP BY em.numero_empleado, em.month_start
)
SELECT
    em.numero_empleado AS employee_id,
    em.area,
    em.departamento,
    em.turno,
    em.clasificacion,
    em.tipo_nomina,
    em.empresa,
    em.month_start,
    DATE_PART('day', em.month_start::timestamp - em.fecha_ingreso::timestamp) AS tenure_days,
    DATE_PART('day', em.month_start::timestamp - COALESCE(em.fecha_antiguedad, em.fecha_ingreso)::timestamp) AS antiguedad_days,
    COALESCE(history.neg_prev_28d, 0) AS neg_prev_28d,
    COALESCE(history.neg_prev_56d, 0) AS neg_prev_56d,
    COALESCE(history.neg_prev_365d, 0) AS neg_prev_365d,
    COALESCE(history.permisos_prev_90d, 0) AS permisos_prev_90d,
    COALESCE(history.permisos_prev_365d, 0) AS permisos_prev_365d,
    COALESCE(future.neg_next_30d, 0) AS neg_next_30d,
    CASE WHEN COALESCE(future.neg_next_30d, 0) >= 2 THEN 1 ELSE 0 END AS target_ausentismo
FROM employee_month em
JOIN history ON history.numero_empleado = em.numero_empleado AND history.month_start = em.month_start
JOIN future ON future.numero_empleado = em.numero_empleado AND future.month_start = em.month_start
WHERE em.month_start >= (SELECT start_month FROM params)
  AND em.month_start < (SELECT end_month FROM params);

-- ============================================================================
-- VIEW 3: ml_attrition_features
-- Used by: attrition_causes.py
-- ============================================================================
CREATE OR REPLACE VIEW ml_attrition_features AS
WITH bajas AS (
    SELECT
        mb.numero_empleado,
        mb.fecha_baja,
        mb.tipo,
        mb.motivo,
        mb.descripcion
    FROM motivos_baja mb
    WHERE mb.fecha_baja >= CURRENT_DATE - INTERVAL '24 months'
),
empleado_snap AS (
    SELECT
        e.numero_empleado,
        e.area,
        e.departamento,
        e.turno,
        e.clasificacion,
        e.tipo_nomina,
        e.empresa,
        e.ubicacion,
        e.fecha_ingreso,
        e.fecha_antiguedad
    FROM empleados_sftp e
),
incidencias_hist AS (
    SELECT
        i.emp AS numero_empleado,
        mb.fecha_baja,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '90 days' AND mb.fecha_baja - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_90d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '180 days' AND mb.fecha_baja - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])
        ) AS neg_180d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '365 days' AND mb.fecha_baja - INTERVAL '1 day'
              AND i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])
        ) AS permisos_365d,
        COUNT(*) FILTER (
            WHERE i.fecha BETWEEN mb.fecha_baja - INTERVAL '365 days' AND mb.fecha_baja - INTERVAL '1 day'
        ) AS total_365d
    FROM motivos_baja mb
    LEFT JOIN incidencias i ON i.emp = mb.numero_empleado
    WHERE mb.fecha_baja >= CURRENT_DATE - INTERVAL '24 months'
    GROUP BY i.emp, mb.fecha_baja
)
SELECT
    b.numero_empleado,
    b.fecha_baja,
    b.tipo,
    b.motivo,
    e.area,
    e.departamento,
    e.turno,
    e.clasificacion,
    e.tipo_nomina,
    e.empresa,
    e.ubicacion,
    DATE_PART('day', b.fecha_baja::timestamp - e.fecha_ingreso::timestamp) AS tenure_days,
    DATE_PART('day', b.fecha_baja::timestamp - COALESCE(e.fecha_antiguedad, e.fecha_ingreso)::timestamp) AS antiguedad_days,
    COALESCE(ih.neg_90d, 0) AS neg_90d,
    COALESCE(ih.neg_180d, 0) AS neg_180d,
    COALESCE(ih.permisos_365d, 0) AS permisos_365d,
    COALESCE(ih.total_365d, 0) AS total_365d
FROM bajas b
LEFT JOIN empleado_snap e ON e.numero_empleado = b.numero_empleado
LEFT JOIN incidencias_hist ih ON ih.numero_empleado = b.numero_empleado AND ih.fecha_baja = b.fecha_baja;

-- ============================================================================
-- VIEW 4: ml_forecast_features
-- Used by: forecast_absence.py
-- ============================================================================
CREATE OR REPLACE VIEW ml_forecast_features AS
WITH date_bounds AS (
    SELECT
        (SELECT COALESCE(MIN(fecha), CURRENT_DATE - INTERVAL '365 days') FROM incidencias) AS start_date,
        CURRENT_DATE::date AS end_date
),
calendar AS (
    SELECT generate_series(
        (SELECT GREATEST(start_date::date, CURRENT_DATE - INTERVAL '400 days') FROM date_bounds),
        (SELECT end_date FROM date_bounds),
        INTERVAL '1 day'
    )::date AS day
),
daily_incidencias AS (
    SELECT
        i.fecha::date AS day,
        COUNT(*) FILTER (WHERE i.inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])) AS ausentismo,
        COUNT(*) FILTER (WHERE i.inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])) AS permisos
    FROM incidencias i
    WHERE i.fecha >= CURRENT_DATE - INTERVAL '400 days'
    GROUP BY i.fecha::date
),
daily_headcount AS (
    SELECT
        c.day,
        COUNT(*) AS headcount
    FROM calendar c
    JOIN empleados_sftp e
      ON e.fecha_ingreso <= c.day
     AND (e.fecha_baja IS NULL OR e.fecha_baja >= c.day)
    GROUP BY c.day
)
SELECT
    c.day,
    COALESCE(di.ausentismo, 0) AS ausentismo,
    COALESCE(di.permisos, 0) AS permisos,
    COALESCE(dh.headcount, 0) AS headcount
FROM calendar c
LEFT JOIN daily_incidencias di ON di.day = c.day
LEFT JOIN daily_headcount dh ON dh.day = c.day
ORDER BY c.day;

-- ============================================================================
-- VIEW 5: ml_lifecycle_features
-- Used by: lifecycle.py
-- ============================================================================
CREATE OR REPLACE VIEW ml_lifecycle_features AS
WITH bajas AS (
    SELECT DISTINCT ON (numero_empleado)
        numero_empleado,
        fecha_baja,
        tipo,
        motivo
    FROM motivos_baja
    WHERE fecha_baja IS NOT NULL
    ORDER BY numero_empleado, fecha_baja DESC
)
SELECT
    e.numero_empleado AS employee_id,
    e.area,
    e.departamento,
    e.empresa,
    e.clasificacion,
    e.tipo_nomina,
    e.turno,
    e.fecha_ingreso,
    e.fecha_baja,
    COALESCE(b.tipo, 'Activo') AS motivo_tipo,
    COALESCE(b.motivo, 'Sin registro') AS motivo_detalle,
    CASE WHEN e.fecha_baja IS NULL THEN 0 ELSE 1 END AS event_observed
FROM empleados_sftp e
LEFT JOIN bajas b ON b.numero_empleado = e.numero_empleado
WHERE e.fecha_ingreso IS NOT NULL;

-- ============================================================================
-- VIEW 6: ml_patterns_features
-- Used by: patterns.py
-- ============================================================================
CREATE OR REPLACE VIEW ml_patterns_features AS
WITH empleados AS (
    SELECT
        e.numero_empleado AS employee_id,
        e.area,
        e.departamento,
        e.turno,
        e.clasificacion,
        e.tipo_nomina,
        e.empresa,
        e.fecha_ingreso,
        e.fecha_antiguedad
    FROM empleados_sftp e
    WHERE e.activo = TRUE
),
incidencias_resumen AS (
    SELECT
        emp AS employee_id,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
                          AND inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI']))::decimal / 90.0 AS neg_rate_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'
                          AND inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI']))::decimal / 180.0 AS neg_rate_180d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
                          AND inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST']))::decimal / 90.0 AS permiso_rate_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'
                          AND inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST']))::decimal / 180.0 AS permiso_rate_180d
    FROM incidencias
    WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'
    GROUP BY emp
),
asistencia AS (
    SELECT
        numero_empleado AS employee_id,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days' AND presente) AS dias_presentes_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days' AND horas_incidencia > 0) AS dias_incidencia_90d
    FROM asistencia_diaria
    WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY numero_empleado
)
SELECT
    e.employee_id,
    e.area,
    e.departamento,
    e.turno,
    e.clasificacion,
    e.tipo_nomina,
    e.empresa,
    COALESCE(i.neg_rate_90d, 0) AS neg_rate_90d,
    COALESCE(i.neg_rate_180d, 0) AS neg_rate_180d,
    COALESCE(i.permiso_rate_90d, 0) AS permiso_rate_90d,
    COALESCE(i.permiso_rate_180d, 0) AS permiso_rate_180d,
    COALESCE(a.dias_presentes_90d, 0) AS dias_presentes_90d,
    COALESCE(a.dias_incidencia_90d, 0) AS dias_incidencia_90d,
    DATE_PART('day', CURRENT_DATE::timestamp - e.fecha_ingreso::timestamp) AS tenure_days
FROM empleados e
LEFT JOIN incidencias_resumen i ON i.employee_id = e.employee_id
LEFT JOIN asistencia a ON a.employee_id = e.employee_id;

-- ============================================================================
-- VIEW 7: ml_productivity_features
-- Used by: productivity.py
-- ============================================================================
CREATE OR REPLACE VIEW ml_productivity_features AS
WITH asistencia AS (
    SELECT
        ad.numero_empleado,
        date_trunc('month', ad.fecha)::date AS month_start,
        SUM(ad.horas_incidencia) AS horas_incidencia,
        SUM(ad.horas_trabajadas) AS horas_trabajadas,
        COUNT(*) FILTER (WHERE ad.presente = false OR ad.horas_incidencia > 0) AS dias_con_incidencia
    FROM asistencia_diaria ad
    WHERE ad.fecha >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY ad.numero_empleado, date_trunc('month', ad.fecha)
),
incidencias_resumen AS (
    SELECT
        emp AS numero_empleado,
        date_trunc('month', fecha)::date AS month_start,
        COUNT(*) FILTER (WHERE inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI'])) AS incidencias_negativas,
        COUNT(*) FILTER (WHERE inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST'])) AS permisos
    FROM incidencias
    WHERE fecha >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY emp, date_trunc('month', fecha)
)
SELECT
    a.numero_empleado AS employee_id,
    e.area,
    e.departamento,
    e.empresa,
    e.clasificacion,
    e.tipo_nomina,
    e.turno,
    a.month_start,
    a.horas_incidencia,
    a.horas_trabajadas,
    a.dias_con_incidencia,
    COALESCE(i.incidencias_negativas, 0) AS incidencias_negativas,
    COALESCE(i.permisos, 0) AS permisos
FROM asistencia a
JOIN empleados_sftp e ON e.numero_empleado = a.numero_empleado
LEFT JOIN incidencias_resumen i
  ON i.numero_empleado = a.numero_empleado
 AND i.month_start = a.month_start;

-- ============================================================================
-- Grant permissions (important for REST API access!)
-- ============================================================================
GRANT SELECT ON ml_rotation_features TO anon, authenticated;
GRANT SELECT ON ml_absenteeism_features TO anon, authenticated;
GRANT SELECT ON ml_attrition_features TO anon, authenticated;
GRANT SELECT ON ml_forecast_features TO anon, authenticated;
GRANT SELECT ON ml_lifecycle_features TO anon, authenticated;
GRANT SELECT ON ml_patterns_features TO anon, authenticated;
GRANT SELECT ON ml_productivity_features TO anon, authenticated;

-- ============================================================================
-- Verification queries
-- ============================================================================
-- Run these to verify the views were created successfully:
-- SELECT COUNT(*) FROM ml_rotation_features;
-- SELECT COUNT(*) FROM ml_absenteeism_features;
-- SELECT COUNT(*) FROM ml_attrition_features;
-- SELECT COUNT(*) FROM ml_forecast_features;
-- SELECT COUNT(*) FROM ml_lifecycle_features;
-- SELECT COUNT(*) FROM ml_patterns_features;
-- SELECT COUNT(*) FROM ml_productivity_features;
