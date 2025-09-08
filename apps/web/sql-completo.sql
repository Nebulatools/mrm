-- SQL COMPLETO para renombrar tablas a mayúscula
-- Crear tablas nuevas con mayúscula
CREATE TABLE "PLANTILLA" (LIKE plantilla INCLUDING ALL);
CREATE TABLE "INCIDENCIAS" (LIKE incidencias INCLUDING ALL);  
CREATE TABLE "ACT" (LIKE actividad_diaria INCLUDING ALL);

-- Copiar TODOS los datos
INSERT INTO "PLANTILLA" SELECT * FROM plantilla;
INSERT INTO "INCIDENCIAS" SELECT * FROM incidencias;
INSERT INTO "ACT" SELECT * FROM actividad_diaria;

-- Eliminar tablas viejas con CASCADE
DROP TABLE plantilla CASCADE;
DROP TABLE incidencias CASCADE;
DROP TABLE actividad_diaria CASCADE;

-- Deshabilitar RLS en las nuevas tablas
ALTER TABLE "PLANTILLA" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "INCIDENCIAS" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ACT" DISABLE ROW LEVEL SECURITY;