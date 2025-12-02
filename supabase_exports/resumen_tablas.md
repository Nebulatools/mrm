# Resumen de tablas exportadas (Supabase `ufdlwhdrrvktthcxwpzt`)

Tablas exportadas (CSV) y parches de información aplicados. Datos calculados de los archivos en `supabase_exports/` (descarga 2025-12-01).

## asistencia_diaria
- Filas: 2,597 — fechas `2025-10-16 .. 2025-10-22`; `fecha_creacion` `2025-11-01`.
- Campos: `id, numero_empleado, fecha, dia_semana, horas_trabajadas, horas_incidencia, presente, fecha_creacion`.
- Observación: todos `presente=true`, `horas_incidencia=0` (dataset de prueba). Sin parches de información conocidos.

## empleados_sftp
- Filas: 1,028 — `fecha_ingreso` `2001-06-16 .. 2025-11-27`; `fecha_baja` `2016-04-15 .. 2025-11-28`.
- Campos: 33 columnas maestras (identificación, puesto, centro de costos, fechas, estado activo).
- Observación: `activo=true` 369 / `false` 659. Sin parches de información conocidos.

## incidencias
- Filas: 7,337 — `fecha` `2025-01-01 .. 2025-12-31`; `fecha_creacion` `2025-10-07 .. 2025-11-28`.
- Campos: `id, emp, nombre, fecha, turno, horario, incidencia, entra, sale, ordinarias, numero, inci, status, fecha_creacion`.
- Parche de información: `parches/incidencias_patch_insert.sql` elimina incidencias desde `2025-07-01` y reinyecta julio–diciembre 2025 para cubrir huecos de prenómina. Los datos exportados ya incluyen ese parche.

## motivos_baja
- Filas: 1,253 — `fecha_baja` `2023-01-02 .. 2025-11-28`; `fecha_creacion` `2025-11-01 .. 2025-11-28`.
- Campos: `id, numero_empleado, fecha_baja, tipo, motivo, descripcion, observaciones, fecha_creacion`.
- Parche de información: `parches/motivos_baja_inserts.sql` agrega bajas históricas de inicios de 2023 que no venían del SFTP. Los datos exportados ya incluyen ese parche (inicio del rango en 2023-01-02).

## user_profiles
- Filas: 4 — `created_at/updated_at` `2025-10-09`.
- Campos: `id, email, empresa, role, created_at, updated_at`.
- Observación: seed de 4 perfiles; sin parches de información adicionales.
