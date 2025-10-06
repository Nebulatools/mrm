-- ============================================
-- POLÍTICAS RLS PARA TABLAS EXISTENTES
-- ============================================

-- Habilitar RLS
ALTER TABLE empleados_sftp ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivos_baja ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;

-- empleados_sftp
CREATE POLICY "Permitir lectura pública empleados"
ON empleados_sftp FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Solo service role puede modificar empleados"
ON empleados_sftp FOR ALL TO service_role USING (true) WITH CHECK (true);

-- asistencia_diaria
CREATE POLICY "Permitir lectura pública asistencia"
ON asistencia_diaria FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Solo service role puede modificar asistencia"
ON asistencia_diaria FOR ALL TO service_role USING (true) WITH CHECK (true);

-- motivos_baja
CREATE POLICY "Permitir lectura pública motivos de baja"
ON motivos_baja FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Solo service role puede modificar motivos de baja"
ON motivos_baja FOR ALL TO service_role USING (true) WITH CHECK (true);

-- incidencias
CREATE POLICY "Permitir lectura pública incidencias"
ON incidencias FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Solo service role puede modificar incidencias"
ON incidencias FOR ALL TO service_role USING (true) WITH CHECK (true);
