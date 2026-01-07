-- Consultas para verificar que las fechas se importaron correctamente

-- 1. Verificar fechas de nacimiento (NO deben estar en el futuro)
SELECT
  'Fechas de Nacimiento' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN fecha_nacimiento > CURRENT_DATE THEN 1 END) as futuras_MALAS,
  COUNT(CASE WHEN fecha_nacimiento BETWEEN '1940-01-01' AND CURRENT_DATE THEN 1 END) as razonables_BUENAS,
  MIN(fecha_nacimiento) as mas_antigua,
  MAX(fecha_nacimiento) as mas_reciente
FROM empleados_sftp;

-- 2. Verificar fechas de ingreso (deben ser coherentes)
SELECT
  'Fechas de Ingreso' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN fecha_ingreso > CURRENT_DATE THEN 1 END) as futuras_MALAS,
  COUNT(CASE WHEN fecha_ingreso BETWEEN '2000-01-01' AND CURRENT_DATE THEN 1 END) as razonables_BUENAS,
  MIN(fecha_ingreso) as mas_antigua,
  MAX(fecha_ingreso) as mas_reciente
FROM empleados_sftp;

-- 3. Ver ejemplos específicos de empleados recién actualizados
SELECT
  numero_empleado,
  nombre_completo,
  fecha_ingreso,
  fecha_nacimiento,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) as edad_actual,
  EXTRACT(YEAR FROM AGE(fecha_ingreso, fecha_nacimiento)) as edad_al_ingresar,
  activo,
  fecha_creacion
FROM empleados_sftp
WHERE fecha_creacion >= CURRENT_DATE
ORDER BY numero_empleado
LIMIT 20;
