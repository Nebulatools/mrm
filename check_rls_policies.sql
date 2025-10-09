-- Check what RLS policies exist for empleados_sftp
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('empleados_sftp', 'motivos_baja', 'asistencia_diaria', 'user_profiles')
ORDER BY tablename, policyname;

-- Check user_profiles to see empresa values
SELECT id, email, empresa, role
FROM user_profiles
ORDER BY email;

-- Check distinct empresa values in empleados_sftp
SELECT DISTINCT empresa, COUNT(*) as count
FROM empleados_sftp
GROUP BY empresa
ORDER BY empresa;

-- Check if monterrey user can see any employees (this will fail if RLS blocks)
-- We'll need to run this as the monterrey user
