-- Agregar empleados dados de baja para probar el dashboard
-- Ejecutar en Supabase SQL Editor

-- La vista 'plantilla' se basa en empleados_sftp y motivos_baja
-- Para crear bajas, necesitamos insertar en la tabla motivos_baja

-- Insertar motivos de baja (esto automáticamente hará que aparezcan como activo = false en la vista)
INSERT INTO motivos_baja (numero_empleado, motivo, fecha_baja, created_at) VALUES
-- Bajas en Enero 2025
(4, 'Renuncia voluntaria', '2025-01-15', NOW()),
(16, 'Renuncia voluntaria', '2025-01-20', NOW()),
(17, 'Mejor oportunidad laboral', '2025-01-25', NOW()),

-- Bajas en Febrero 2025  
(18, 'Terminación del contrato', '2025-02-15', NOW()),
(21, 'Fin del proyecto', '2025-02-28', NOW()),

-- Bajas en Agosto 2025
(24, 'Reestructuración organizacional', '2025-08-15', NOW()),
(25, 'Reducción de personal', '2025-08-20', NOW()),

-- Bajas tempranas (Septiembre 2025)
(33, 'No superó periodo de prueba', '2025-09-01', NOW()),
(60, 'Desempeño insatisfactorio', '2025-09-05', NOW()),

-- Algunas bajas más recientes
(61, 'Renuncia por motivos personales', '2025-09-08', NOW());

-- Verificar que las bajas aparecen correctamente en la vista plantilla
SELECT 
  emp_id, 
  nombre, 
  activo, 
  fecha_ingreso, 
  fecha_baja, 
  motivo_baja,
  EXTRACT(YEAR FROM fecha_baja) as año_baja,
  EXTRACT(MONTH FROM fecha_baja) as mes_baja
FROM plantilla 
WHERE activo = false 
ORDER BY fecha_baja DESC;

-- Verificar totales por mes
SELECT 
  EXTRACT(YEAR FROM fecha_baja) as año,
  EXTRACT(MONTH FROM fecha_baja) as mes,
  COUNT(*) as total_bajas
FROM plantilla 
WHERE activo = false 
GROUP BY EXTRACT(YEAR FROM fecha_baja), EXTRACT(MONTH FROM fecha_baja)
ORDER BY año DESC, mes DESC;