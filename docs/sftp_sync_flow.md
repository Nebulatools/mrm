# Flujo de sincronización SFTP

Este documento describe el nuevo flujo automático de sincronización de datos desde el servidor SFTP hacia Supabase, así como las salvaguardas que mantienen los parches manuales.

## Tablas involucradas

- `empleados_sftp`: catálogo base de empleados. Se refresca por número de empleado sin eliminar registros externos.
- `motivos_baja`: histórico de bajas. Se conservan los registros provenientes de los parches `parches/motivos_baja_inserts.sql` y únicamente se reemplazan los movimientos presentes en el archivo del SFTP.
- `asistencia_diaria`: poblada por la ruta forzada (`import-real-sftp-force`) a partir de **Prenomina Horizontal**.
- `sync_settings`: tabla singleton (`singleton boolean primary key`) que persiste la programación automática (`frequency`, `day_of_week`, `run_time`, `last_run`, `next_run`).

## Flujo de importación

### Endpoints

| Endpoint | Uso | Comportamiento |
|----------|-----|----------------|
| `POST /api/import-sftp-real-data` | Ruta principal (usada desde la UI y para automatización) | Obtiene archivos desde el wrapper SFTP, reemplaza selectivamente empleados y bajas, respeta parches y actualiza `sync_settings` con la última ejecución. |
| `POST /api/import-real-sftp-force` | Debug/forzado (sin caché) | Descarga directo de SFTP, procesa nómina y asistencia, aplica la misma lógica de reemplazo selectivo y actualiza la programación. |
| `GET /api/sftp?action=…` | Listado, prueba de conexión y previsualización | Protegido, sólo accesible para el administrador. |
| `GET/PUT /api/sftp/settings` | Lectura y actualización de la programación automática | Guarda la configuración en `sync_settings`. |

### Salvaguardas

- **No se vacían tablas completas**. Antes de insertar se eliminan únicamente los registros que comparten clave natural con los nuevos datos:
  - `empleados_sftp`: se borran sólo los números de empleado presentes en el archivo.
  - `motivos_baja`: se detectan las combinaciones `numero_empleado + fecha_baja + motivo` y se eliminan sus `id` antes de insertar. Los registros añadidos manualmente en los parches se conservan.
- El endpoint devuelve estadísticas (`empleados`, `bajas`, `asistencia`, `incidencias`) y metadatos de programación (`last_run`, `next_run`).

## Programación automática

### Configuración

En la página **Admin → Programación automática** se puede elegir:

- Frecuencia: `Manual`, `Diario` o `Semanal`.
- Día de la semana (cuando es semanal).
- Horario (24 h).

Cada actualización guarda los valores en `sync_settings` y recalcula el siguiente disparo (`next_run`). Cuando la frecuencia es `Manual`, `next_run` queda en `NULL`.

### Cron externo

Para ejecutar el flujo sin intervención se expuso un mecanismo basado en un secreto:

1. Define `CRON_SYNC_SECRET` en las variables de entorno del despliegue.
2. Crea una tarea externa (por ejemplo, [Vercel Cron](https://vercel.com/docs/cron-jobs)) que invoque:

   ```http
   POST https://<tu-dominio>/api/import-sftp-real-data
   Authorization: Bearer <CRON_SYNC_SECRET>
   ```

   El endpoint únicamente ejecutará la importación si la frecuencia no es `manual` y la fecha `next_run` ya venció. En caso contrario responderá `skipped: true`.

> Todos los endpoints siguen verificando que el usuario autenticado sea `admin@mrm.com` (o tenga `role = 'admin'`). El `CRON_SYNC_SECRET` permite automatizar sin sesión de usuario.

## Resumen operativo

1. El administrador configura la frecuencia deseada desde la UI.
2. Cuando se ejecuta la importación (manual, forzada o automática) se respetan los parches y se actualiza `last_run`/`next_run`.
3. El panel muestra en todo momento la última corrida y la siguiente ventana programada.

Con este flujo se elimina la limpieza completa de tablas, se preservan los datos parcheados y se habilita un esquema controlado de sincronización recurrente.
