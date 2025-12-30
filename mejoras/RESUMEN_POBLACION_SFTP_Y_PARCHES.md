# Resumen de población de datos (SFTP + Parches)

Fecha de ejecución: **2025-12-24**

Este documento deja constancia de **qué tablas se poblaron**, **con qué fuentes**, y **qué rangos de fechas** quedaron cargados en la BD (Supabase), separando claramente lo que viene del **SFTP** y lo que se agregó con **parches SQL**.

---

## 1) Conexiones verificadas

### Supabase (vía MCP)
- Proyecto: `https://ufdlwhdrrvktthcxwpzt.supabase.co`
- Verificación clave: **el usuario admin NO se borró**
  - `public.user_profiles` mantiene `admin@mrm.com` con `role=admin`.

### SFTP
- Host/puerto: `148.244.90.21:5062`
- Usuario: `rhmrm`
- Directorio: `ReportesRH`
- Archivos encontrados y usados:
  - `Validacion Alta de empleados.xls`
  - `Prenomina Horizontal.csv`
  - `MotivosBaja.csv`
  - `Incidencias.csv`

> Nota: este resumen no incluye credenciales (password) por seguridad.

---

## 2) Operación realizada (qué se hizo exactamente)

### 2.1 Tablas truncadas (se vaciaron) antes de cargar
Se truncaron **solo** estas tablas de datos:
- `public.empleados_sftp`
- `public.asistencia_diaria`
- `public.motivos_baja`
- `public.incidencias`

Se verificó que **NO se tocó**:
- `public.user_profiles` (admin preservado)
- `auth.users` (no se hizo operación sobre auth)

### 2.2 Población desde SFTP

La carga desde SFTP se hizo leyendo los archivos listados arriba y transformándolos a las tablas destino.

**Resultados (solo SFTP, antes de aplicar parches):**
- `public.empleados_sftp`: **1037** registros
- `public.asistencia_diaria`: **2632** registros
- `public.motivos_baja`: **234** registros
- `public.incidencias`: **258** registros

**Rangos de fechas detectados en los archivos SFTP:**
- `Prenomina Horizontal.csv` → (se usa para `asistencia_diaria`)
  - Fechas de asistencia: **2025-12-01 → 2025-12-07**
- `MotivosBaja.csv` → (se usa para `motivos_baja`)
  - `fecha_baja`: **2025-01-06 → 2025-12-19**
- `Incidencias.csv` → (se usa para `incidencias`)
  - `fecha`: **2025-12-22 → 2025-12-28**
- `Validacion Alta de empleados.xls` → (se usa para `empleados_sftp`)
  - `fecha_ingreso` (no nulos en el archivo): **2001-06-16 → 2025-12-19**
  - `fecha_baja` (no nulos en el archivo): **2016-04-15 → 2025-12-19**

> Importante: en `empleados_sftp.fecha_ingreso` se asignó un **fallback `2000-01-01`** cuando el valor no pudo parsearse o venía vacío en el XLS; por eso el mínimo en la BD puede verse como `2000-01-01`.

---

## 3) Parches SQL aplicados (qué agregaron)

Después de cargar desde SFTP, se aplicaron estos archivos locales:
- `parches/incidencias_patch_insert.sql`
- `parches/motivos_baja_inserts.sql`

### 3.1 Parche: `incidencias_patch_insert.sql`
- Tabla afectada: `public.incidencias`
- Filas insertadas por el parche: **2644**
- Rango de fechas dentro del parche: **2025-07-01 → 2025-12-31**
- Objetivo: completar incidencias **julio–diciembre 2025** (según encabezado del archivo).

### 3.2 Parche: `motivos_baja_inserts.sql`
- Tabla afectada: `public.motivos_baja`
- Filas insertadas por el parche: **421**
- Rango de fechas dentro del parche: **2023-01-02 → 2024-12-31**
- Objetivo: cargar histórico adicional de bajas/motivos (2023–2024).

---

## 4) Estado final en Supabase (conteos + rangos actuales en BD)

**Conteos finales:**
- `public.empleados_sftp`: **1037**
- `public.asistencia_diaria`: **2632**
- `public.motivos_baja`: **655** (234 SFTP + 421 parche)
- `public.incidencias`: **2902** (258 SFTP + 2644 parche)
- `public.user_profiles`: **1** (admin preservado)

**Rangos actuales en BD:**
- `public.asistencia_diaria.fecha`: **2025-12-01 → 2025-12-07**
- `public.motivos_baja.fecha_baja`: **2023-01-02 → 2025-12-19**
- `public.incidencias.fecha`: **2025-07-01 → 2025-12-31**
- `public.empleados_sftp.fecha_ingreso`: **2000-01-01 → 2025-12-19** (ver nota de fallback arriba)
- `public.empleados_sftp.fecha_baja`: **2016-04-15 → 2025-12-19**

---

## 5) Cómo se puede repetir esta carga (referencias)

Se dejaron scripts auxiliares para repetir el proceso:
- Importación SFTP → Supabase: `scripts/import-sftp-to-supabase.js`
- Aplicación de parches SQL (INSERTs) → Supabase: `scripts/apply-sql-patches-via-supabase.js`

Y la operación de truncado que se usó fue:
- `TRUNCATE public.asistencia_diaria, public.motivos_baja, public.incidencias, public.empleados_sftp RESTART IDENTITY CASCADE;`
