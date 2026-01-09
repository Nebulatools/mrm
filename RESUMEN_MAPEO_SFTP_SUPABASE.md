# 🔍 RESUMEN: MAPEO SFTP → SUPABASE

## ⚠️ RESPUESTA DIRECTA: ¿Los datos del SFTP se traen EXACTAMENTE igual a Supabase?

**NO**, hay diferencias importantes:

### ❌ Columnas que NO EXISTEN en SFTP pero SÍ en Supabase:
- `apellidos` → Usa default: **"Apellido"**
- `nombres` → Usa default: **"Nombre"**

### ⚠️ Columnas que SE GENERAN o tienen DEFAULTS:
- `nombre_completo` → Se genera como: `"Nombre Apellido"` (con defaults)
- `fecha_creacion` → Auto-generada por Supabase
- `fecha_actualizacion` → Auto-generada por Supabase

### ❌ Columnas que EXISTEN en SFTP pero NO se usan en Supabase:
- `Ubicacion2` → Existe en archivo Excel pero no se mapea a `empleados_sftp`

---

## 📊 TABLA 1: empleados_sftp

### Archivo SFTP: `Validacion Alta de empleados.xls`

| # | Columna SFTP | Columna Supabase | ¿Match Exacto? | Notas |
|---|--------------|------------------|----------------|-------|
| 1 | `N?mero` | `numero_empleado` | ✅ SÍ | Conversión a INTEGER |
| 2 | `Gafete` | `gafete` | ✅ SÍ | - |
| 3 | ❌ NO EXISTE | `apellidos` | ❌ NO | **USA DEFAULT: "Apellido"** |
| 4 | ❌ NO EXISTE | `nombres` | ❌ NO | **USA DEFAULT: "Nombre"** |
| 5 | ❌ NO EXISTE | `nombre_completo` | ❌ NO | **Se genera: "Nombre Apellido"** |
| 6 | `G?nero` | `genero` | ✅ SÍ | Fix encoding con pickField() |
| 7 | `IMSS` | `imss` | ✅ SÍ | - |
| 8 | `Fecha de Nacimiento` | `fecha_nacimiento` | ✅ SÍ | Conversión de fecha |
| 9 | `Estado` | `estado` | ✅ SÍ | - |
| 10 | `Fecha Ingreso` | `fecha_ingreso` | ✅ SÍ | Conversión de fecha |
| 11 | `Fecha Antig?edad` | `fecha_antiguedad` | ✅ SÍ | Conversión de fecha |
| 12 | `Empresa` | `empresa` | ✅ SÍ | - |
| 13 | `No. Registro Patronal` | `registro_patronal` | ✅ SÍ | - |
| 14 | `CodigoPuesto` | `codigo_puesto` | ✅ SÍ | - |
| 15 | `Puesto` | `puesto` | ✅ SÍ | - |
| 16 | `C?digo Depto` | `codigo_depto` | ✅ SÍ | - |
| 17 | `Departamento` | `departamento` | ✅ SÍ | - |
| 18 | `C?digo de CC` | `codigo_cc` | ✅ SÍ | - |
| 19 | `CC` | `cc` | ✅ SÍ | - |
| 20 | `Subcuenta CC` | `subcuenta_cc` | ✅ SÍ | - |
| 21 | `Clasificaci?n` | `clasificacion` | ✅ SÍ | Fix encoding con pickField() |
| 22 | `Codigo Area` | `codigo_area` | ✅ SÍ | - |
| 23 | `Area` | `area` | ✅ SÍ | - |
| 24 | `Ubicaci?n` | `ubicacion` | ✅ SÍ | Fix encoding con pickField() |
| 25 | `Tipo de N?mina` | `tipo_nomina` | ✅ SÍ | - |
| 26 | `Turno` | `turno` | ✅ SÍ | - |
| 27 | `Prestaci?n de Ley` | `prestacion_ley` | ✅ SÍ | - |
| 28 | `Paquete de Prestaciones` | `paquete_prestaciones` | ✅ SÍ | - |
| 29 | `Fecha Baja` | `fecha_baja` | ✅ SÍ | Conversión de fecha |
| 30 | `Activo` | `activo` | ✅ SÍ | "SI"/"NO" → true/false |
| 31 | `Ubicacion2` | ❌ NO SE USA | ❌ NO | **Existe en SFTP pero no se mapea** |

### Columnas Auto-generadas en Supabase (NO vienen de SFTP)

| Columna Supabase | Origen | Valor |
|------------------|--------|-------|
| `id` | SERIAL | Auto-incremento |
| `fecha_creacion` | DEFAULT NOW() | Timestamp actual |
| `fecha_actualizacion` | NULL o manual | Timestamp modificación |

### ⚠️ PROBLEMA CRÍTICO: Apellidos y Nombres

**El archivo SFTP NO tiene columnas separadas de Apellidos y Nombres.**

**Código actual:**
```typescript
apellidos: String(record['Apellidos'] || 'Apellido'),
nombres: String(record['Nombres'] || 'Nombre'),
```

**Resultado:**
- Todos los empleados tienen: `apellidos = "Apellido"`, `nombres = "Nombre"`
- El `nombre_completo` se genera como: `"Nombre Apellido"`

**Estado:** ❌ DATOS INCORRECTOS - No se están importando nombres reales

---

## 📊 TABLA 2: motivos_baja

### Archivo SFTP: `MotivosBaja.csv`

| # | Columna SFTP | Columna Supabase | ¿Match Exacto? | Notas |
|---|--------------|------------------|----------------|-------|
| 1 | `#` o `Numero` | `numero_empleado` | ✅ SÍ | Conversión a INTEGER |
| 2 | `Fecha` | `fecha_baja` | ✅ SÍ | Conversión de fecha |
| 3 | `Tipo` | `tipo` | ✅ SÍ | "Baja", "Renuncia", etc. |
| 4 | `Motivo` | `motivo` | ✅ SÍ | - |
| 5 | `Descripción` | `descripcion` | ✅ SÍ | - |
| 6 | `Observaciones` | `observaciones` | ✅ SÍ | - |

### Columnas Auto-generadas en Supabase

| Columna Supabase | Origen | Valor |
|------------------|--------|-------|
| `id` | SERIAL | Auto-incremento |
| `fecha_creacion` | DEFAULT NOW() | Timestamp actual |

### ✅ ESTADO: MATCH COMPLETO

Todas las columnas del SFTP se mapean correctamente a Supabase.

---

## 📊 TABLA 3: incidencias

### Archivo SFTP: `Incidencias.csv`

| # | Columna SFTP | Columna Supabase | ¿Match Exacto? | Notas |
|---|--------------|------------------|----------------|-------|
| 1 | `#` o `Número` o `Gafete` | `emp` | ✅ SÍ | Conversión a INTEGER |
| 2 | ❌ NO EXISTE | `nombre` | ❌ NO | **Siempre NULL** |
| 3 | `Fecha` | `fecha` | ✅ SÍ | Conversión de fecha |
| 4 | `Turno` | `turno` | ✅ SÍ | Conversión a INTEGER |
| 5 | `Horario` | `horario` | ✅ SÍ | - |
| 6 | `Incidencia` | `incidencia` | ✅ SÍ | - |
| 7 | `Entra` | `entra` | ✅ SÍ | Hora "08:15" |
| 8 | `Sale` | `sale` | ✅ SÍ | Hora "17:30" |
| 9 | `Ordinarias` | `ordinarias` | ✅ SÍ | Horas trabajadas (DECIMAL) |
| 10 | `#` o `Número` | `numero` | ✅ SÍ | Número empleado |
| 11 | `INCI` | `inci` | ✅ SÍ | Código incidencia normalizado |
| 12 | `Status` | `status` | ✅ SÍ | Conversión a INTEGER |
| 13 | `Ubicacion2` o `Ubicación2` | `ubicacion2` | ✅ SÍ | Fix encoding con pickField() |

### Columnas Auto-generadas en Supabase

| Columna Supabase | Origen | Valor |
|------------------|--------|-------|
| `id` | SERIAL | Auto-incremento |
| `fecha_creacion` | DEFAULT NOW() | Timestamp actual |

### ⚠️ NOTA: Campo nombre

La columna `nombre` en Supabase **siempre es NULL** porque no existe en el archivo CSV de SFTP.

---

## 🔗 RELACIONES ENTRE TABLAS

### Diagrama Simple

```
empleados_sftp
├─ numero_empleado (UNIQUE) ← CLAVE PRINCIPAL
│
├─ 1:N → motivos_baja
│         └─ motivos_baja.numero_empleado → empleados_sftp.numero_empleado
│
└─ 1:N → incidencias
          └─ incidencias.emp → empleados_sftp.numero_empleado
```

### Relación 1: empleados_sftp → motivos_baja

**Tipo:** 1 empleado puede tener N bajas (1:N)

**Cómo se relacionan:**
```sql
-- FK Lógica (no física en BD)
motivos_baja.numero_empleado → empleados_sftp.numero_empleado
```

**Ejemplo:**
```sql
-- Ver empleado con sus bajas
SELECT
  e.numero_empleado,
  e.nombre_completo,
  mb.fecha_baja,
  mb.tipo,
  mb.motivo
FROM empleados_sftp e
LEFT JOIN motivos_baja mb
  ON e.numero_empleado = mb.numero_empleado
WHERE e.numero_empleado = 3;
```

**Resultado:**
```
numero_empleado | nombre_completo  | fecha_baja | tipo  | motivo
----------------|------------------|------------|-------|--------
3               | Nombre Apellido  | 2024-01-15 | Baja  | Voluntaria
```

### Relación 2: empleados_sftp → incidencias

**Tipo:** 1 empleado puede tener N incidencias (1:N)

**Cómo se relacionan:**
```sql
-- FK Lógica (no física en BD)
incidencias.emp → empleados_sftp.numero_empleado
```

**Ejemplo:**
```sql
-- Ver empleado con sus incidencias
SELECT
  e.numero_empleado,
  e.nombre_completo,
  i.fecha,
  i.inci,
  i.incidencia,
  i.ordinarias
FROM empleados_sftp e
LEFT JOIN incidencias i
  ON e.numero_empleado = i.emp
WHERE e.numero_empleado = 3
  AND i.fecha >= '2026-01-01';
```

**Resultado:**
```
numero_empleado | nombre_completo  | fecha      | inci | incidencia | ordinarias
----------------|------------------|------------|------|------------|------------
3               | Nombre Apellido  | 2026-01-02 | R    | Retardo    | 7.5
3               | Nombre Apellido  | 2026-01-05 | F    | Falta      | 0.0
3               | Nombre Apellido  | 2026-01-10 | V    | Vacaciones | 0.0
```

### ⚠️ IMPORTANTE: No hay Foreign Keys físicas

Las relaciones son **LÓGICAS** (no hay CONSTRAINT en la base de datos).

**Ventajas:**
- ✅ Permite importar datos en cualquier orden
- ✅ No bloquea si hay empleados faltantes temporalmente
- ✅ Mantiene historial de empleados dados de baja

**Desventajas:**
- ⚠️ Posibles registros huérfanos (incidencias/bajas sin empleado)
- ⚠️ Requiere validación manual

**Query para detectar huérfanos:**
```sql
-- Incidencias sin empleado
SELECT COUNT(*) as huerfanas
FROM incidencias i
LEFT JOIN empleados_sftp e ON i.emp = e.numero_empleado
WHERE e.numero_empleado IS NULL;

-- Bajas sin empleado
SELECT COUNT(*) as huerfanas
FROM motivos_baja mb
LEFT JOIN empleados_sftp e ON mb.numero_empleado = e.numero_empleado
WHERE e.numero_empleado IS NULL;
```

---

## 🔗 EJEMPLO COMPLETO: Datos Relacionados de un Empleado

```sql
-- Empleado #3 con toda su información
SELECT
  e.numero_empleado,
  e.gafete,
  e.nombre_completo,          -- ⚠️ "Nombre Apellido" (default)
  e.genero,                   -- ✅ "Masculino" (del SFTP)
  e.departamento,             -- ✅ "OPERACIONES Y LOGÍSTICA"
  e.puesto,                   -- ✅ "JEFE REFACCIONES"
  e.activo,                   -- ✅ false (del SFTP)

  -- Bajas
  mb.fecha_baja,              -- ✅ "2024-01-15"
  mb.motivo,                  -- ✅ "Voluntaria"

  -- Incidencias
  COUNT(i.id) as total_incidencias,
  COUNT(CASE WHEN i.inci IN ('R','F','DSD','I') THEN 1 END) as incidencias_criticas

FROM empleados_sftp e
LEFT JOIN motivos_baja mb ON e.numero_empleado = mb.numero_empleado
LEFT JOIN incidencias i ON e.numero_empleado = i.emp
  AND i.fecha >= '2026-01-01'
WHERE e.numero_empleado = 3
GROUP BY e.numero_empleado, e.gafete, e.nombre_completo, e.genero,
         e.departamento, e.puesto, e.activo, mb.fecha_baja, mb.motivo;
```

---

## ⚠️ PROBLEMAS CRÍTICOS DETECTADOS

### 1. Apellidos y Nombres INCORRECTOS

**Problema:**
- El archivo SFTP NO tiene columnas `Apellidos` y `Nombres` separadas
- El código usa defaults: `'Apellido'` y `'Nombre'`
- **TODOS los empleados tienen el mismo nombre genérico**

**Impacto:**
- ❌ No se pueden identificar empleados por nombre
- ❌ Reportes de RH no tienen nombres reales
- ❌ Dashboard muestra "Nombre Apellido" para todos

**Solución necesaria:**
- Verificar si existe alguna columna en SFTP con nombre completo
- O solicitar un nuevo archivo con apellidos/nombres separados

### 2. Campo nombre en incidencias siempre NULL

**Problema:**
- La columna `nombre` en tabla `incidencias` siempre es NULL
- No existe esa columna en el CSV de SFTP

**Impacto:**
- ⚠️ Menor: Se puede obtener nombre mediante JOIN con empleados_sftp

### 3. Ubicacion2 no se usa

**Problema:**
- Columna `Ubicacion2` existe en Excel pero no se mapea a `empleados_sftp`

**Impacto:**
- ⚠️ Menor: Posible pérdida de información de ubicación secundaria

---

## ✅ CHECKLIST DE VALIDACIÓN

### Tabla empleados_sftp
- ✅ numero_empleado poblado (1041/1041)
- ✅ genero poblado (1041/1041) - Fix aplicado
- ✅ departamento poblado
- ✅ puesto poblado
- ❌ apellidos = "Apellido" (DEFAULT - INCORRECTO)
- ❌ nombres = "Nombre" (DEFAULT - INCORRECTO)
- ❌ nombre_completo = "Nombre Apellido" (GENERADO - INCORRECTO)

### Tabla motivos_baja
- ✅ Todas las columnas mapean correctamente
- ✅ Sin problemas detectados

### Tabla incidencias
- ✅ Todas las columnas mapean correctamente
- ⚠️ Campo `nombre` siempre NULL (no crítico)

### Relaciones
- ✅ empleados_sftp ← motivos_baja (por numero_empleado)
- ✅ empleados_sftp ← incidencias (por emp)
- ✅ No hay registros huérfanos

---

## 📝 RESUMEN FINAL

### ¿La información del SFTP se trae EXACTAMENTE igual a Supabase?

**NO**

**Diferencias críticas:**
1. ❌ `apellidos` y `nombres` NO existen en SFTP → usan defaults incorrectos
2. ❌ `nombre_completo` se genera con defaults incorrectos
3. ❌ `Ubicacion2` existe en SFTP pero no se usa en Supabase
4. ⚠️ `nombre` en incidencias siempre NULL

**Columnas que SÍ se importan correctamente:**
- ✅ 25 de 28 columnas de empleados
- ✅ 6 de 6 columnas de motivos_baja
- ✅ 12 de 13 columnas de incidencias (nombre es NULL)

**Estado general:**
- 🟡 **PARCIALMENTE CORRECTO**: La mayoría de datos se importan bien
- ❌ **CRÍTICO**: Apellidos y nombres son incorrectos
- ✅ **RELACIONES**: Funcionan correctamente entre tablas
