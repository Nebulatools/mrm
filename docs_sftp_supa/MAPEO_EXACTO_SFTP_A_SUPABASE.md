# 🗺️ MAPEO EXACTO: SFTP → SUPABASE

**Fecha**: 2026-01-07
**Proyecto**: MRM Simple

---

## 📋 ÍNDICE

1. [Validacion Alta de empleados.xls → empleados_sftp](#1-validacion-alta-de-empleadosxls--empleados_sftp)
2. [MotivosBaja.csv → motivos_baja](#2-motivobajacsv--motivos_baja)
3. [Prenomina Horizontal.csv → asistencia_diaria](#3-prenomina-horizontalcsv--asistencia_diaria)
4. [Incidencias.csv → incidencias](#4-incidenciascsv--incidencias)

---

## 1. Validacion Alta de empleados.xls → `empleados_sftp`

### 📄 Archivo SFTP: `Validacion Alta de empleados.xls`
- **Tamaño**: 445.2 KB
- **Formato**: Excel (.xls)
- **Hoja**: Sheet1
- **Total columnas**: 28

### 🎯 Tabla Destino: `empleados_sftp`
- **Total columnas en Supabase**: 32
- **Total registros actuales**: 1,041

---

### 🔗 MAPEO COLUMNA POR COLUMNA

| # | Columna SFTP | Columna Supabase | Tipo Supabase | Transformación | Notas |
|---|--------------|------------------|---------------|----------------|-------|
| 1 | `N?mero` | `numero_empleado` | `integer` | `parseInt()` | ⚠️ Encoding: `?` = `ú` |
| 2 | `Gafete` | `gafete` | `varchar(50)` | `String()` | |
| 3 | **`G?nero`** | **`genero`** | **`varchar(10)`** | **`pickField()`** | **✅ FIX APLICADO** |
| 4 | `IMSS` | `imss` | `varchar(20)` | `String()` | |
| 5 | `Fecha de Nacimiento` | `fecha_nacimiento` | `date` | `parseDate()` | Formatos: DD/MM/YY |
| 6 | `Estado` | `estado` | `varchar(100)` | `String()` | |
| 7 | `Fecha Ingreso` | `fecha_ingreso` | `date` | `parseDate()` | Required, default '2024-01-01' |
| 8 | `Fecha Antig?edad` | `fecha_antiguedad` | `date` | `parseDate()` | ⚠️ Encoding: `?` = `ü` |
| 9 | `Empresa` | `empresa` | `varchar(200)` | `String()` | |
| 10 | `No. Registro Patronal` | `registro_patronal` | `varchar(100)` | `String()` | |
| 11 | `CodigoPuesto` | `codigo_puesto` | `varchar(50)` | `String()` | |
| 12 | `Puesto` | `puesto` | `varchar(100)` | `String()` | |
| 13 | `C?digo Depto` | `codigo_depto` | `varchar(50)` | `String()` | ⚠️ Encoding |
| 14 | `Departamento` | `departamento` | `varchar(100)` | `String()` | |
| 15 | `C?digo de CC` | `codigo_cc` | `varchar(50)` | `String()` | ⚠️ Encoding |
| 16 | `CC` | `cc` | `varchar(100)` | `String()` | Centro de Costo |
| 17 | `Subcuenta CC` | `subcuenta_cc` | `varchar(100)` | `String()` | |
| 18 | `Clasificaci?n` | `clasificacion` | `varchar(100)` | `pickField()` | ⚠️ Usa normalización |
| 19 | `Codigo Area` | `codigo_area` | `varchar(50)` | `String()` | |
| 20 | `Area` | `area` | `varchar(100)` | `String()` | |
| 21 | `Ubicaci?n` | `ubicacion` | `varchar(100)` | `pickField()` | ⚠️ Usa normalización |
| 22 | `Tipo de N?mina` | `tipo_nomina` | `varchar(50)` | `String()` | ⚠️ Encoding |
| 23 | `Turno` | `turno` | `varchar(50)` | `String()` | |
| 24 | `Prestaci?n de Ley` | `prestacion_ley` | `varchar(100)` | `String()` | ⚠️ Encoding |
| 25 | `Paquete de Prestaciones` | `paquete_prestaciones` | `varchar(100)` | `String()` | |
| 26 | `Fecha Baja` | `fecha_baja` | `date` | `parseDate()` | Nullable |
| 27 | `Activo` | `activo` | `boolean` | `=== 'SI'` | Default: true |
| 28 | `Ubicacion2` | ❌ NO MAPEADO | - | - | Columna extra no usada |

### 📝 Columnas ADICIONALES en Supabase (Generadas)

| Columna Supabase | Origen | Generación |
|------------------|--------|------------|
| `id` | AUTO | `SERIAL PRIMARY KEY` |
| `apellidos` | ❌ FALTA EN SFTP | Busca en Prenomina.csv |
| `nombres` | ❌ FALTA EN SFTP | Busca en Prenomina.csv |
| `nombre_completo` | GENERADO | `"${nombres} ${apellidos}"` |
| `fecha_creacion` | GENERADO | `NOW()` |
| `fecha_actualizacion` | GENERADO | `NOW()` |

### ⚠️ PROBLEMA DETECTADO

**Faltante Crítico**: El archivo `Validacion Alta de empleados.xls` **NO contiene** columnas de `Apellidos` y `Nombres`.

El código intenta obtenerlos de `Prenomina Horizontal.csv`:

```typescript
// En import-real-sftp-force/route.ts, líneas 214-233
const nominaMap = new Map();
nominaData.forEach((nomina: Record<string, unknown>) => {
  const numero = String(nomina['Número']).trim();
  nominaMap.set(numero, nomina);
});

// Luego busca en el mapa
const nominaInfo = nominaMap.get(numero);
const apellidos = nominaInfo?.['Apellidos'] || 'Sin Apellidos';
const nombres = nominaInfo?.['Nombres'] || 'Sin Nombres';
```

---

## 2. MotivosBaja.csv → `motivos_baja`

### 📄 Archivo SFTP: `MotivosBaja.csv`
- **Tamaño**: 0.2 KB
- **Formato**: CSV
- **Total columnas**: ~7

### 🎯 Tabla Destino: `motivos_baja`
- **Total columnas en Supabase**: 8
- **Total registros actuales**: 1,107

---

### 🔗 MAPEO COLUMNA POR COLUMNA

| # | Columna CSV | Columna Supabase | Tipo Supabase | Transformación | Notas |
|---|-------------|------------------|---------------|----------------|-------|
| 1 | `#` o `Número` | `numero_empleado` | `integer` | `parseInt()` | FK a empleados_sftp |
| 2 | `Fecha` | `fecha_baja` | `date` | `parseDate()` | Required |
| 3 | `Tipo` | `tipo` | `varchar(100)` | `String()` | Ej: "Baja", "Renuncia" |
| 4 | `Motivo` | `motivo` | `varchar(200)` | `String()` | Required |
| 5 | `Descripción` | `descripcion` | `text` | `String()` | Nullable |
| 6 | `Observaciones` | `observaciones` | `text` | `String()` | Nullable |

### 📝 Columnas ADICIONALES en Supabase (Generadas)

| Columna Supabase | Origen | Generación |
|------------------|--------|------------|
| `id` | AUTO | `SERIAL PRIMARY KEY` |
| `fecha_creacion` | GENERADO | `NOW()` |

---

## 3. Prenomina Horizontal.csv → `asistencia_diaria`

### 📄 Archivo SFTP: `Prenomina Horizontal.csv`
- **Tamaño**: 100.6 KB
- **Formato**: CSV
- **Total columnas**: 30

### 🎯 Tabla Destino: `asistencia_diaria`
- **Total columnas en Supabase**: 8
- **Total registros actuales**: 2,632

---

### 🔗 MAPEO COLUMNA POR COLUMNA

| # | Columna CSV | Columna Supabase | Tipo Supabase | Transformación | Notas |
|---|-------------|------------------|---------------|----------------|-------|
| 1 | `N?mero` | `numero_empleado` | `integer` | `parseInt()` | FK a empleados_sftp |
| 2 | `Nombre` | ❌ NO MAPEADO | - | - | Solo para referencia |
| 3-8 | `LUN`, `LUN-ORD`, `LUN-TE`, `LUN-INC` | ⚠️ SINTÉTICO | - | - | Ver nota abajo |
| 9-14 | `MAR`, `MAR-ORD`, `MAR-TE`, `MAR-INC` | ⚠️ SINTÉTICO | - | - | |
| 15-20 | `MIE`, `MIE-ORD`, `MIE-TE`, `MIE-INC` | ⚠️ SINTÉTICO | - | - | |
| 21-26 | `JUE`, `JUE-ORD`, `JUE-TE`, `JUE-INC` | ⚠️ SINTÉTICO | - | - | |
| 27-32 | `VIE`, `VIE-ORD`, `VIE-TE`, `VIE-INC` | ⚠️ SINTÉTICO | - | - | |
| 33-38 | `SAB`, `SAB-ORD`, `SAB-TE`, `SAB-INC` | ⚠️ SINTÉTICO | - | - | |

### ⚠️ IMPORTANTE: DATOS SINTÉTICOS

El código **NO usa las columnas reales del CSV**. En su lugar, **GENERA** datos sintéticos:

```typescript
// En import-real-sftp-force/route.ts, líneas 478-497
// Si no encuentra fechas específicas, crea registros de ejemplo para el mes actual
const today = new Date();
const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

// Crear registros para los días laborales del mes (lunes a sábado)
for (let day = 1; day <= Math.min(daysInMonth, today.getDate()); day++) {
  const fecha = new Date(today.getFullYear(), today.getMonth(), day);
  const dayOfWeek = fecha.getDay(); // 0=domingo, 6=sábado

  if (dayOfWeek >= 1 && dayOfWeek <= 6) { // Lunes a sábado
    asistenciaReales.push({
      numero_empleado: numeroEmpleado,
      fecha: fecha.toISOString().split('T')[0],
      horas_trabajadas: 8.0,  // ← FIJO
      presente: true,          // ← FIJO
      fecha_creacion: new Date().toISOString()
    });
  }
}
```

### 📝 Columnas en Supabase

| Columna Supabase | Valor Generado | Origen |
|------------------|----------------|--------|
| `id` | AUTO | `SERIAL PRIMARY KEY` |
| `numero_empleado` | Del CSV | `Número` |
| `fecha` | **GENERADO** | Días laborales del mes actual |
| `dia_semana` | ❌ NULL | No se genera |
| `horas_trabajadas` | **8.0** (fijo) | Hardcoded |
| `horas_incidencia` | **0.0** (default) | Default DB |
| `presente` | **true** (fijo) | Hardcoded |
| `fecha_creacion` | GENERADO | `NOW()` |

### 🚨 PROBLEMA: NO SE USAN DATOS REALES

El código **ignora completamente** las columnas de horas reales (`LUN-ORD`, `MAR-ORD`, etc.) y genera datos genéricos.

---

## 4. Incidencias.csv → `incidencias`

### 📄 Archivo SFTP: `Incidencias.csv`
- **Tamaño**: 8.2 KB
- **Formato**: CSV
- **Total columnas**: ~14

### 🎯 Tabla Destino: `incidencias`
- **Total columnas en Supabase**: 15
- **Total registros actuales**: 2,954

---

### 🔗 MAPEO COLUMNA POR COLUMNA

| # | Columna CSV | Columna Supabase | Tipo Supabase | Transformación | Notas |
|---|-------------|------------------|---------------|----------------|-------|
| 1 | `emp` | `emp` | `integer` | `parseInt()` | Número de empleado |
| 2 | `nombre` | `nombre` | `text` | `String()` | Nullable |
| 3 | `fecha` | `fecha` | `date` | `parseDate()` | Required |
| 4 | `turno` | `turno` | `smallint` | `parseInt()` | Nullable |
| 5 | `horario` | `horario` | `text` | `String()` | Ej: "0830_1700" |
| 6 | `incidencia` | `incidencia` | `text` | `String()` | Descripción |
| 7 | `entra` | `entra` | `time` | `parseTime()` | Hora de entrada |
| 8 | `sale` | `sale` | `time` | `parseTime()` | Hora de salida |
| 9 | `ordinarias` | `ordinarias` | `numeric` | `parseFloat()` | Horas ordinarias |
| 10 | `numero` | `numero` | `integer` | `parseInt()` | ID adicional |
| 11 | `inci` | `inci` | `varchar` | `String()` | Código: FI, FJ, VAC, etc. |
| 12 | `status` | `status` | `smallint` | `parseInt()` | Status numérico |
| 13 | `ubicacion2` | `ubicacion2` | `text` | `String()` | Ubicación calculada |

### 📝 Columnas ADICIONALES en Supabase (Generadas)

| Columna Supabase | Origen | Generación |
|------------------|--------|------------|
| `id` | AUTO | `SERIAL PRIMARY KEY` |
| `fecha_creacion` | GENERADO | `NOW()` |

### 🎯 Códigos de Incidencia Reconocidos

**Incidencias** (INCIDENT_CODES):
- `FI` - Falta Injustificada
- `SUSP` - Suspensión
- `PSIN` - Permiso Sin Goce
- `ENFE` - Enfermedad

**Permisos** (PERMISO_CODES):
- `PCON` - Permiso Con Goce
- `VAC` - Vacaciones
- `MAT3` - Maternidad 3 meses
- `MAT1` - Maternidad 1 mes
- `JUST` - Justificación

---

## 📊 RESUMEN VISUAL DE MAPEO

```
ARCHIVO SFTP                           TABLA SUPABASE              PROCESADO POR
├─ Validacion Alta de empleados.xls  → empleados_sftp (28→32)     [Ambos]
│  ├─ N?mero                          → numero_empleado
│  ├─ Gafete                          → gafete
│  ├─ G?nero ✅ FIX                   → genero
│  ├─ IMSS                            → imss
│  ├─ Fecha de Nacimiento             → fecha_nacimiento
│  ├─ ... (23 columnas más)
│  └─ ❌ Apellidos/Nombres FALTANTES → obtenidos de Prenomina.csv
│
├─ MotivosBaja.csv                    → motivos_baja (6→8)         [Ambos]
│  ├─ #                               → numero_empleado
│  ├─ Fecha                           → fecha_baja
│  ├─ Tipo                            → tipo
│  ├─ Motivo                          → motivo
│  ├─ Descripción                     → descripcion
│  └─ Observaciones                   → observaciones
│
├─ Prenomina Horizontal.csv           → asistencia_diaria (30→8)  [Solo Forzar]
│  ├─ N?mero                          → numero_empleado
│  ├─ Nombre                          → (no mapeado)
│  ├─ LUN, MAR, MIE... ⚠️             → ❌ NO USADAS
│  └─ ⚠️ DATOS SINTÉTICOS             → fecha, horas_trabajadas=8.0
│
└─ Incidencias.csv                    → incidencias (13→15)       [Solo Actualizar]
   ├─ emp                             → emp
   ├─ nombre                          → nombre
   ├─ fecha                           → fecha
   ├─ turno                           → turno
   ├─ horario                         → horario
   ├─ incidencia                      → incidencia
   ├─ entra                           → entra
   ├─ sale                            → sale
   ├─ ordinarias                      → ordinarias
   ├─ numero                          → numero
   ├─ inci                            → inci
   ├─ status                          → status
   └─ ubicacion2                      → ubicacion2
```

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. ❌ Apellidos y Nombres Faltantes

**Problema**: `Validacion Alta de empleados.xls` NO contiene columnas de apellidos/nombres.

**Solución Actual**: Se buscan en `Prenomina Horizontal.csv`, pero:
- ⚠️ Si el número de empleado no coincide, usa "Sin Apellidos" / "Sin Nombres"
- ⚠️ Depende de que el archivo Prenomina tenga esas columnas

### 2. ⚠️ Asistencia Sintética

**Problema**: Los datos reales de horas trabajadas en `Prenomina Horizontal.csv` se ignoran.

**Solución Actual**: Se generan registros sintéticos con:
- `horas_trabajadas = 8.0` (fijo)
- `presente = true` (fijo)
- Solo días laborales del mes actual

### 3. ❌ Ningún Botón Importa las 4 Tablas

**Problema**: Para tener las 4 tablas completas necesitas usar ambos botones.

**Solución Actual**: Ninguna - requiere modificación de código.

---

## 🎯 TABLA RESUMEN: ¿Qué Importa Cada Botón?

| Archivo → Tabla | Actualizar Info | Forzar Import | ¿Datos Reales? |
|-----------------|-----------------|---------------|----------------|
| Validacion Alta → empleados_sftp | ✅ Sí | ✅ Sí | ✅ Sí |
| MotivosBaja → motivos_baja | ✅ Sí | ✅ Sí | ✅ Sí |
| Prenomina → asistencia_diaria | ❌ NO | ⚠️ Sí | ❌ Sintéticos |
| Incidencias → incidencias | ✅ Sí | ❌ NO | ✅ Sí |

---

## 💡 RECOMENDACIONES

### Para Problema de Género (Inmediato)

✅ **Usa "Actualizar Información (Manual)"**
- Ya tiene el fix de género
- Importa empleados reales
- Importa bajas e incidencias reales
- Solo le falta asistencia (que de todos modos sería sintética)

### Para Tener las 4 Tablas Completas (A Futuro)

🔧 **Necesitas Modificar el Código**:

**Opción A**: Agregar procesamiento de Incidencias.csv a "Forzar Importación"

**Opción B**: Agregar procesamiento REAL de Prenomina Horizontal.csv a "Actualizar Información"

**Opción C**: Crear un tercer botón que importe las 4 tablas correctamente

---

**FIN DEL MAPEO**
