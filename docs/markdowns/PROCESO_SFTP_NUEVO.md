0) Configuración base (una sola vez por dataset)
Español natural

Antes de automatizar, definimos “las reglas del juego” para ese archivo: dónde vive en el SFTP, cómo se llama, qué columnas esperamos, cuáles son obligatorias, y con qué campo(s) identificamos un registro para poder comparar “ayer vs hoy” y hacer updates.

Técnico (configurable, no hardcode)

Definir una configuración por dataset (en DB o YAML/JSON), por ejemplo:

dataset_id: empleados
source:
  sftp_host: ...
  sftp_port: 22
  sftp_path: /outgoing/
  filename_pattern: "Empleados.*(csv|xlsx)$"
  timezone: "UTC"   # o la del cliente, pero estandarizar a una
ingestion:
  retention_days: 7
  allowed_extensions: ["csv", "xlsx"]
  excel:
    sheet_name: null        # null = primera hoja
    header_row_index: 0     # 0 = primera fila
  csv:
    delimiter: null         # null = autodetect
    encoding: null          # null = autodetect (utf-8 fallback)
schema:
  canonical_columns:
    - employee_id
    - nombre
    - genero
    - fecha_ingreso
    - ...
  required_columns:
    - employee_id
    - genero
  column_aliases:
    genero: ["género", "Género", "GENERO", "Gender", "gender"]
  header_normalization:
    case_insensitive: true
    trim: true
    remove_accents: true
    collapse_spaces: true
keys:
  primary_key_columns: ["employee_id"]  # CRÍTICO para diff/update
diff:
  compare_mode: "yesterday_file"        # o "last_successful_run"
  detect_deletes: true                  # opcional
  hash_excluded_columns: ["updated_at"] # columnas volátiles que no deben disparar “cambio”
validation:
  fail_on_missing_required: true
  fail_on_schema_change: false          # true si quieres detener el pipeline ante cambios
alerts:
  notify_on_schema_change: true
  notify_on_large_delta_pct: 30

1) Disparador de ejecución (automático y manual)
Español natural

Debe existir un disparador que inicie el proceso automáticamente cada cierto tiempo (cron/scheduler), y también la posibilidad de ejecutarlo manualmente con un botón. Ambos deben correr exactamente el mismo flujo, solo cambia el “motivo” del disparo.

Técnico

Crear un job scheduler (cron, Kubernetes CronJob, Airflow, Lambda schedule, etc.) que llame al mismo endpoint/handler que el botón manual.

Estandarizar un “contrato” de ejecución:

{
  "dataset_id": "empleados",
  "trigger_type": "scheduled" | "manual",
  "requested_by": "system" | "user_id",
  "force_reprocess": false,
  "run_date": "2026-01-07"
}


Implementar lock de concurrencia para evitar dos corridas simultáneas del mismo dataset (ej. DB advisory lock / redis lock).

2) Crear contexto de corrida y bitácora “a prueba de balas”
Español natural

Cada vez que corre, el sistema debe generar un identificador único (run_id) y registrar: cuándo empezó, quién lo disparó, qué archivo procesó, qué encontró, y si terminó bien o falló. Eso es la “evidencia” para el cliente.

Técnico

Crear run_id = UUID.

Guardar un registro en tabla ingestion_runs (o equivalente) con estado RUNNING.

Campos sugeridos:

run_id, dataset_id, trigger_type, start_ts, status

source_files_found, source_files_processed

raw_path, normalized_path

schema_diff_summary, data_diff_summary

error_code, error_detail (si falla)

Todos los logs deben incluir run_id (correlation id).

3) Conectarse al SFTP del cliente y detectar archivos nuevos
Español natural

El proceso se conecta al SFTP del cliente, lista los archivos y detecta cuáles son nuevos (que no se hayan procesado antes). Si no hay nuevos, lo deja registrado y termina sin error.

Técnico

Conexión SFTP con credenciales seguras (secret manager).

LIST del directorio configurado.

Filtrar por filename_pattern y extensión.

Detectar “nuevo” mediante registro de archivos procesados (no solo por nombre):

Criterios robustos:

remote_path + remote_mtime + size y/o mejor: sha256 después de descargar.

Tablas sugeridas:

ingestion_file_registry(remote_file_id, remote_name, remote_mtime, size, sha256, processed_at, run_id)

Si force_reprocess=false y ya existe sha256 → skip.

4) Descargar y copiar a infraestructura interna (raw backup) + renombrar con fecha
Español natural

Cada archivo nuevo se descarga y se guarda una copia interna (para histórico). Se renombra agregando _YYYYMMDD_HHMMSS para que aunque el cliente lo repita con el mismo nombre, nosotros tengamos trazabilidad.

Técnico

Descargar a staging temporal.

Calcular sha256.

Guardar en storage interno “raw”:

Naming estándar:
{dataset_id}/{YYYY}/{MM}/{DD}/{originalNameWithoutExt}_{timestampUTC}_{sha256short}.{ext}

Ejemplo:
empleados/2026/01/07/Empleados_20260107_031500Z_ab12cd34.xlsx

Registrar en DB:

raw_storage_path, sha256, size, remote_mtime.

5) (Opcional) Marcar archivo en el SFTP del cliente como “procesado”
Español natural

Si el cliente lo permite, se mueve o renombra el archivo remoto para no procesarlo otra vez (por ejemplo a /processed). Si no se puede, al menos nosotros lo marcamos internamente como procesado por hash.

Técnico

Opciones:

MOVE /outgoing/file -> /processed/file

o RENAME file -> file.processed

Si no hay permisos: solo usar ingestion_file_registry.

6) Parsear CSV/Excel a un formato interno uniforme
Español natural

El sistema abre el archivo (CSV o Excel) y lo convierte a una estructura interna estándar (por ejemplo una tabla en memoria o staging) para poder validar y comparar.

Técnico

Si csv:

Autodetect delimiter (, ; \t) si no está fijo.

Autodetect encoding (utf-8/latin-1), con fallback.

Si xlsx:

Seleccionar sheet_name o primera hoja.

Leer encabezados en header_row_index.

Salida interna recomendada:

DataFrame / lista de dicts / staging table, pero conservar valores crudos para auditoría.

7) Normalizar encabezados y mapear columnas (solución al bug “género vs Género”)
Español natural

Antes de validar columnas, el sistema debe “normalizar” los nombres: quitar espacios raros, ignorar mayúsculas/minúsculas y (idealmente) quitar acentos. Luego, mapear nombres del cliente a nombres canónicos internos. Así, “Género”, “género” y “GENERO” se vuelven la misma columna lógica.

Técnico

Implementar función de normalización de headers:

normalize_header(h):
  h = trim(h)
  h = collapse_multiple_spaces(h)
  h = to_lower(h)
  h = remove_accents(h)   # género -> genero
  return h


Luego aplicar mapeo por alias:

canonical_map = {
  "genero": ["género","Género","GENERO","Gender","gender"],
  ...
}

for header in file_headers:
  nh = normalize_header(header)
  canonical = find_canonical(nh, canonical_map, normalize_header)
  if canonical:
     rename header -> canonical
  else:
     keep as "unknown__{nh}" or store in extras


Reglas:

Si falta una columna required → error o warning según config.

Si hay columnas desconocidas → log (no necesariamente fallar).

Guardar “diccionario” usado en esa corrida (para auditoría).

8) Validación de estructura (hoy vs archivo anterior)
Español natural

Una vez mapeadas columnas, el proceso compara la estructura de hoy contra la de ayer (o la última corrida exitosa): cantidad de columnas, columnas nuevas, columnas faltantes y posibles renombres. Todo eso queda en bitácora.

Técnico

Obtener “baseline schema”:

Preferible: última corrida exitosa de ese dataset (last_successful_run_id)

Alternativa: “archivo de ayer” si existe.

Comparar:

added = cols_today - cols_prev

removed = cols_prev - cols_today

common = intersection

Detección de “rename” (opcional pero útil):

Si hay 1 removida y 1 agregada muy similar (por normalized name o distancia tipo Levenshtein), sugerir rename.

O confiar en alias mapping para que rename no exista (ideal).

Persistir snapshot:

ingestion_schema_snapshots(run_id, columns_json, column_count, added, removed)

Decisión de control:

Si fail_on_schema_change=true y added/removed>0 → status=FAILED_SCHEMA

Si no → continuar pero alertar.

9) Validación básica de datos (calidad mínima antes del diff)
Español natural

Antes de comparar registros, se valida lo mínimo: que las llaves existan, que no haya filas completamente vacías, que las columnas obligatorias tengan valor, y que ciertos formatos básicos sean correctos (fechas/números).

Técnico

Validaciones típicas:

primary_key_columns no nulas y no vacías.

Duplicados de llave en el mismo archivo (debe loguearse; decidir si se rechaza o se “toma el último”).

Tipos:

fechas parseables

numéricos parseables

Normalizar nulos: "", "N/A", "NULL" → NULL

Manejo de errores por fila:

Guardar filas inválidas en “quarantine” con razón:

ingestion_row_errors(run_id, row_number, key_if_any, error_code, raw_row_json)

Estadísticas:

total_rows, valid_rows, invalid_rows.

10) Comparación de registros “hoy vs ayer” (nuevos, modificados, iguales, eliminados)
Español natural

Ahora sí: el sistema compara los registros. Debe decir:

cuántos son nuevos hoy,

cuántos ya existían,

y de los existentes, cuáles cambiaron en algún campo,

y opcionalmente cuáles desaparecieron (si el cliente borró registros).

Técnico

Requisito crítico: definir primary_key_columns. Sin llave, el diff es poco confiable.

Estrategia recomendada:

Construir row_hash por registro usando todas las columnas “comparables”:

comparable_cols = all_cols - primary_key_cols - hash_excluded_cols
row_hash = sha256(concat_normalized_values(comparable_cols))


Comparación:

Cargar baseline (ayer/último éxito) en memoria o desde staging.

Hacer join por primary_key:

Resultados:

new_keys = keys_today - keys_prev

missing_keys = keys_prev - keys_today (opcional deletes)

Para keys_common:

si hash_today != hash_prev → UPDATED

si igual → UNCHANGED

Para los UPDATED, guardar detalle por columna:

changed_fields = [col for col in comparable_cols if value_today != value_prev]

Persistir evidencia (en DB o archivo “diff”):

ingestion_row_diffs(run_id, key, diff_type, changed_fields_json, old_values_json, new_values_json)

Y un resumen:

new_count, updated_count, unchanged_count, deleted_count.

11) Limpieza/normalización de caracteres (paso opcional pero recomendable)
Español natural

Antes de insertar/actualizar, se puede limpiar ruido típico: caracteres raros, espacios invisibles, comillas mal cerradas, saltos de línea en texto, acentos mal codificados, etc. Esto reduce errores al cargar a la base y evita “datos visualmente iguales pero distintos”.

Técnico

Aplicar “cleaners” por tipo:

Texto:

trim, collapse_spaces

normalizar unicode (NFC/NFKC)

remover caracteres de control no imprimibles

Fechas:

parse a ISO YYYY-MM-DD

Números:

quitar separadores locales si aplica (1,234.56 vs 1.234,56) según config del cliente

Esto debe dejar rastros:

conteo de campos corregidos por columna

ejemplo de transformaciones (muestras limitadas) para auditoría

12) Carga a base de datos con staging + UPSERT (insert nuevos + update modificados)
Español natural

Los registros nuevos se insertan. Los registros existentes que cambiaron se actualizan. Los iguales no se tocan. Idealmente todo ocurre dentro de una transacción, y usando una tabla temporal/staging para que sea rápido y consistente.

Técnico

Patrón recomendado:

Load a staging table (por run_id):

stg_empleados(run_id, ...columnas..., row_hash, loaded_at)

Ejecutar UPSERT/MERGE a tabla final:

Ejemplos (conceptual):

PostgreSQL (conceptual):

INSERT INTO empleados (employee_id, nombre, genero, ..., row_hash)
SELECT employee_id, nombre, genero, ..., row_hash
FROM stg_empleados
WHERE run_id = :run_id
ON CONFLICT (employee_id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    genero = EXCLUDED.genero,
    ...,
    row_hash = EXCLUDED.row_hash
WHERE empleados.row_hash IS DISTINCT FROM EXCLUDED.row_hash;


SQL Server (conceptual MERGE + OUTPUT a auditoría):

MERGE empleados AS tgt
USING (SELECT * FROM stg_empleados WHERE run_id = @run_id) AS src
ON tgt.employee_id = src.employee_id
WHEN MATCHED AND tgt.row_hash <> src.row_hash THEN
  UPDATE SET ...
WHEN NOT MATCHED THEN
  INSERT (...) VALUES (...)
OUTPUT $action, inserted.employee_id, deleted.row_hash, inserted.row_hash INTO empleados_audit(...);


Recomendaciones:

Actualizar solo si cambió row_hash (evita updates inútiles).

Guardar updated_at, updated_by_run_id.

Opcional: tabla histórica (SCD Type 2) si quieren trazabilidad completa.

13) Cierre de corrida: bitácoras, evidencias y “resumen ejecutable”
Español natural

Al terminar, el proceso debe dejar un resumen claro: qué archivo procesó, qué cambió, qué se insertó, qué se actualizó, qué errores hubo, y dónde ver la evidencia. Eso es lo que te defiende ante el cliente.

Técnico

Actualizar ingestion_runs a SUCCESS o FAILED con:

paths (raw/normalized/diff)

stats:

schema: added/removed/renamed_suspects

data: new/updated/unchanged/deleted

invalid_rows_count

Generar artefactos opcionales:

schema_diff.json

data_diff_summary.json

row_diffs_sample.csv (limitado, por privacidad y tamaño)

Logging estructurado (JSON) recomendado:

{
  "run_id": "...",
  "dataset_id": "empleados",
  "step": "DATA_DIFF",
  "new_count": 20,
  "updated_count": 5,
  "schema_added": ["col_nueva"],
  "status": "OK",
  "ts": "..."
}

14) Retención de histórico (7 días) y limpieza automática
Español natural

Para no llenar el storage, el sistema conserva el histórico solo X días (por ejemplo 7). Todo lo más viejo se elimina o se archiva.

Técnico

Job de housekeeping diario:

borrar raw/normalized/diff con created_at < now - retention_days

opcional: comprimir antes de mover a “cold storage”

En DB, retener ingestion_runs por más tiempo que los archivos (la evidencia “ligera” puede durar meses).

15) Alertas y “banderas rojas” (para enterarse antes que el cliente)
Español natural

Si cambia el esquema, si sube/baja demasiado el volumen, o si hay muchas filas inválidas, el sistema debe avisar a tu equipo (correo/Slack/etc.). Es mejor enterarse por el bot que por una llamada incómoda del cliente.

Técnico

Reglas típicas:

Si schema_added/removed > 0 → alerta

Si abs(today_count - yesterday_count) / yesterday_count > threshold → alerta

Si invalid_rows_count > 0 o > cierto porcentaje → alerta

Si faltan columnas required → falla dura + alerta

Pseudocódigo de alto nivel (para que el dev lo convierta a código real)
function run_ingestion(dataset_id, trigger_type, requested_by, force_reprocess=false):
  run_id = uuid()
  acquire_lock(dataset_id)

  create_run(run_id, dataset_id, trigger_type, requested_by, status="RUNNING")

  try:
    files = sftp_list(dataset_id.config.source)
    candidates = filter_by_pattern(files, config.filename_pattern)

    new_files = []
    for f in candidates:
      if force_reprocess:
        new_files.append(f)
      else:
        if not is_already_processed(f):   # by remote metadata and/or later by sha
          new_files.append(f)

    if new_files is empty:
      finish_run(run_id, status="SUCCESS_NOOP")
      release_lock()
      return

    for remote_file in new_files:
      local_tmp = sftp_download(remote_file)
      sha = sha256(local_tmp)
      if not force_reprocess and sha_exists_in_registry(sha):
        log(run_id, "SKIP_ALREADY_PROCESSED_BY_HASH", remote_file)
        continue

      raw_path = store_raw(local_tmp, dataset_id, sha)
      register_file(run_id, remote_file, sha, raw_path)

      data = parse_file(raw_path, config)
      data = normalize_headers_and_map(data, config.schema)

      prev_run = get_last_successful_run(dataset_id)
      prev_schema = get_schema(prev_run)
      schema_diff = compare_schema(prev_schema, data.columns)
      log_schema_diff(run_id, schema_diff)

      validate_minimum(data, config.validation)

      prev_data = load_prev_snapshot(prev_run)  # or yesterday file
      diff = diff_records(prev_data, data, config.keys, config.diff)
      persist_diffs(run_id, diff.summary, diff.details)

      cleaned = optional_cleaning(data, config)

      load_staging(run_id, cleaned)
      upsert_target_from_staging(run_id, dataset_id)

      # optional: mark remote as processed
      try_mark_remote_processed(remote_file)

    finish_run(run_id, status="SUCCESS")
  except Exception as e:
    finish_run(run_id, status="FAILED", error=e)
    raise
  finally:
    release_lock(dataset_id)

Notas importantes (para evitar futuros “Género vs género” y primos)

Nunca comparar columnas “tal cual vienen”. Siempre pasar por normalize_header + aliases.

Definir llave(s) del registro es obligatorio si quieres “update” confiable.

Guardar evidencia: no basta con “log de texto”; lo ideal es DB + artefactos (diff/snapshots).

Idempotencia: si corre dos veces el mismo archivo, no debe duplicar data (hash + upsert).