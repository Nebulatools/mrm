-- ============================================
-- ACTUALIZAR POLÍTICAS RLS (Permitir anon)
-- ============================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer empleados" ON empleados_sftp;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer asistencia" ON asistencia_diaria;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer motivos de baja" ON motivos_baja;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer incidencias" ON incidencias;

-- Crear nuevas políticas (permitir anon + authenticated)
CREATE POLICY "Permitir lectura pública empleados"
ON empleados_sftp FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir lectura pública asistencia"
ON asistencia_diaria FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir lectura pública motivos de baja"
ON motivos_baja FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir lectura pública incidencias"
ON incidencias FOR SELECT TO anon, authenticated USING (true);
