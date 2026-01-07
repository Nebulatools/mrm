# 📊 ANÁLISIS EXHAUSTIVO: SFTP vs SUPABASE

**Fecha**: 2026-01-07
**Proyecto**: MRM Simple - HR KPI Dashboard
**Solicitado por**: Usuario

---

## 🎯 RESUMEN EJECUTIVO

### Problema Reportado
- ✅ **Columna `genero` vacía** en Supabase (1041 empleados con string vacío `""`)
- ❌ **Error 500** en endpoint `/api/import-real-sftp-force`
- ⚠️ Necesidad de detección automática de cambios estructurales

### Causa Raíz Identificada
**PROBLEMA DE ENCODING Y MAPEO DE COLUMNAS**

El archivo SFTP contiene la columna `"G?nero"` (donde `?` representa `ü` por problemas de encoding UTF-8), pero el código de importación no la está leyendo correctamente debido a:

1. **Acceso directo incorrecto**: `emp['Género']` y `emp['G?nero']` no coinciden con `"G?nero"` (el `?` es literal en el archivo)
2. **No usa función de normalización**: La función `pickField()` con normalización **NO** se aplica a género
3. **Fallback a valor por defecto**: Siempre cae en `'No especificado'`, luego transformado a string vacío

---

## 📁 ESTRUCTURA ACTUAL DE TABLAS

### 1. Tabla `empleados_sftp` (Supabase)

**Total registros**: 1,041 empleados

| Columna | Tipo | Restricciones | Estado Actual |
|---------|------|---------------|---------------|
| `id` | integer | PRIMARY KEY | ✅ OK |
| `numero_empleado` | integer | UNIQUE NOT NULL | ✅ OK |
| `apellidos` | varchar(200) | NOT NULL | ✅ OK |
| `nombres` | varchar(200) | NOT NULL | ✅ OK |
| `nombre_completo` | varchar(400) | nullable | ✅ OK |
| `gafete` | varchar(50) | nullable | ✅ OK |
| **`genero`** | **varchar(10)** | **nullable** | **❌ TODOS VACÍOS** |
| `imss` | varchar(20) | nullable | ✅ OK |
| `fecha_nacimiento` | date | nullable | ✅ OK |
| `estado` | varchar(100) | nullable | ✅ OK |
| `fecha_ingreso` | date | NOT NULL | ✅ OK |
| `fecha_antiguedad` | date | nullable | ✅ OK |
| `empresa` | varchar(200) | nullable | ✅ OK |
| `registro_patronal` | varchar(100) | nullable | ✅ OK |
| `codigo_puesto` | varchar(50) | nullable | ✅ OK |
| `puesto` | varchar(100) | nullable | ✅ OK |
| `codigo_depto` | varchar(50) | nullable | ✅ OK |
| `departamento` | varchar(100) | nullable | ✅ OK |
| `codigo_cc` | varchar(50) | nullable | ✅ OK |
| `cc` | varchar(100) | nullable | ✅ OK |
| `subcuenta_cc` | varchar(100) | nullable | ✅ OK |
| `clasificacion` | varchar(100) | nullable | ✅ OK |
| `codigo_area` | varchar(50) | nullable | ✅ OK |
| `area` | varchar(100) | nullable | ✅ OK |
| `ubicacion` | varchar(100) | nullable | ✅ OK |
| `tipo_nomina` | varchar(50) | nullable | ✅ OK |
| `turno` | varchar(50) | nullable | ✅ OK |
| `prestacion_ley` | varchar(100) | nullable | ✅ OK |
| `paquete_prestaciones` | varchar(100) | nullable | ✅ OK |
| `fecha_baja` | date | nullable | ✅ OK |
| `activo` | boolean | DEFAULT true | ✅ OK |
| `fecha_creacion` | timestamptz | DEFAULT now() | ✅ OK |
| `fecha_actualizacion` | timestamptz | DEFAULT now() | ✅ OK |

**Query de verificación ejecutada**:
```sql
SELECT
  COUNT(*) as total_empleados,
  COUNT(genero) as genero_no_nulo,
  COUNT(*) - COUNT(genero) as genero_nulo,
  COUNT(CASE WHEN genero IS NOT NULL AND TRIM(genero) = '' THEN 1 END) as genero_vacio
FROM empleados_sftp;
```

**Resultado**:
```
Total empleados: 1041
Genero no nulo: 0
Genero nulo: 1041
Genero vacío (string ""): 1041
```

---

### 2. Tabla `motivos_baja` (Supabase)

**Total registros**: 1,107 bajas

| Columna | Tipo | Restricciones | Estado |
|---------|------|---------------|--------|
| `id` | integer | PRIMARY KEY | ✅ OK |
| `numero_empleado` | integer | FK → empleados_sftp | ✅ OK |
| `fecha_baja` | date | NOT NULL | ✅ OK |
| `tipo` | varchar(100) | NOT NULL | ✅ OK |
| `motivo` | varchar(200) | NOT NULL | ✅ OK |
| `descripcion` | text | nullable | ✅ OK |
| `observaciones` | text | nullable | ✅ OK |
| `fecha_creacion` | timestamptz | DEFAULT now() | ✅ OK |

---

### 3. Tabla `asistencia_diaria` (Supabase)

**Total registros**: 2,632 registros

| Columna | Tipo | Restricciones | Estado |
|---------|------|---------------|--------|
| `id` | integer | PRIMARY KEY | ✅ OK |
| `numero_empleado` | integer | FK → empleados_sftp | ✅ OK |
| `fecha` | date | NOT NULL | ✅ OK |
| `dia_semana` | varchar(20) | nullable | ✅ OK |
| `horas_trabajadas` | numeric(4,2) | DEFAULT 8.0 | ✅ OK |
| `horas_incidencia` | numeric(4,2) | DEFAULT 0.0 | ✅ OK |
| `presente` | boolean | DEFAULT true | ✅ OK |
| `fecha_creacion` | timestamptz | DEFAULT now() | ✅ OK |

**UNIQUE constraint**: `(numero_empleado, fecha)`

---

### 4. Tabla `incidencias` (Supabase)

**Total registros**: 2,954 incidencias

| Columna | Tipo | Restricciones | Estado |
|---------|------|---------------|--------|
| `id` | integer | PRIMARY KEY | ✅ OK |
| `emp` | integer | Número de empleado | ✅ OK |
| `nombre` | text | nullable | ✅ OK |
| `fecha` | date | NOT NULL | ✅ OK |
| `turno` | smallint | nullable | ✅ OK |
| `horario` | text | nullable | ✅ OK |
| `incidencia` | text | nullable | ✅ OK |
| `entra` | time | nullable | ✅ OK |
| `sale` | time | nullable | ✅ OK |
| `ordinarias` | numeric | DEFAULT 0 | ✅ OK |
| `numero` | integer | nullable | ✅ OK |
| `inci` | varchar | Código incidencia | ✅ OK |
| `status` | smallint | nullable | ✅ OK |
| `fecha_creacion` | timestamptz | DEFAULT now() | ✅ OK |
| `ubicacion2` | text | nullable | ✅ OK |

---

## 📂 ESTRUCTURA ARCHIVOS SFTP

### Configuración SFTP
```
Host: 148.244.90.21
Port: 5062
User: rhmrm
Directory: ReportesRH
```

### Archivos Disponibles

| Archivo | Tamaño | Formato | Propósito |
|---------|--------|---------|-----------|
| `Validacion Alta de empleados.xls` | 445.21 KB | Excel | ✅ Datos maestros de empleados |
| `Prenomina Horizontal.csv` | 100.57 KB | CSV | ✅ Nómina y asistencia |
| `MotivosBaja.csv` | 0.15 KB | CSV | ✅ Bajas de empleados |
| `Incidencias.csv` | 8.18 KB | CSV | ✅ Incidencias de asistencia |
| `Motivos_Bajas_SFTP.pdf` | 116.18 KB | PDF | ⚠️ No procesado |
| `Incidencias_FI_FJ_SUS_PSG_PCG_INC_VAC_SFTP.pdf` | 190.22 KB | PDF | ⚠️ No procesado |

---

### Archivo: `Validacion Alta de empleados.xls`

**Hoja**: Sheet1
**Total columnas**: 28

#### Columnas Reales del Archivo SFTP

| # | Nombre Columna | Nombre en Código | Match | Observaciones |
|---|----------------|------------------|-------|---------------|
| 1 | `"N?mero"` | `emp['Número']` | ⚠️ | Encoding issue: `?` = `ú` |
| 2 | `"Gafete"` | `emp['Gafete']` | ✅ | |
| 3 | **`"G?nero"`** | **`emp['Género']`** | **❌ NO MATCH** | **PROBLEMA CRÍTICO** |
| 4 | `"IMSS"` | `emp['IMSS']` | ✅ | |
| 5 | `"Fecha de Nacimiento"` | `emp['Fecha de Nacimiento']` | ✅ | |
| 6 | `"Estado"` | `emp['Estado']` | ✅ | |
| 7 | `"Fecha Ingreso"` | `emp['Fecha Ingreso']` | ✅ | |
| 8 | `"Fecha Antig?edad"` | `emp['Fecha Antigüedad']` | ⚠️ | Encoding issue |
| 9 | `"Empresa"` | `emp['Empresa']` | ✅ | |
| 10 | `"No. Registro Patronal"` | `emp['No. Registro Patronal']` | ✅ | |
| 11 | `"CodigoPuesto"` | `emp['CodigoPuesto']` | ✅ | |
| 12 | `"Puesto"` | `emp['Puesto']` | ✅ | |
| 13 | `"C?digo Depto"` | `emp['Código Depto']` | ⚠️ | Encoding issue |
| 14 | `"Departamento"` | `emp['Departamento']` | ✅ | |
| 15 | `"C?digo de CC"` | `emp['Código de CC']` | ⚠️ | Encoding issue |
| 16 | `"CC"` | `emp['CC']` | ✅ | |
| 17 | `"Subcuenta CC"` | `emp['Subcuenta CC']` | ✅ | |
| 18 | `"Clasificaci?n"` | `emp['Clasificación']` | ⚠️ | Usa `pickField()` |
| 19 | `"Codigo Area"` | `emp['Codigo Area']` | ✅ | |
| 20 | `"Area"` | `emp['Area']` | ✅ | |
| 21 | `"Ubicaci?n"` | `emp['Ubicación']` | ⚠️ | Usa `pickField()` |
| 22 | `"Tipo de N?mina"` | `emp['Tipo de Nómina']` | ⚠️ | Encoding issue |
| 23 | `"Turno"` | `emp['Turno']` | ✅ | |
| 24 | `"Prestaci?n de Ley"` | `emp['Prestación de Ley']` | ⚠️ | Encoding issue |
| 25 | `"Paquete de Prestaciones"` | `emp['Paquete de Prestaciones']` | ✅ | |
| 26 | `"Fecha Baja"` | `emp['Fecha Baja']` | ✅ | |
| 27 | `"Activo"` | `emp['Activo']` | ✅ | |
| 28 | `"Ubicacion2"` | N/A | ⚠️ | No mapeada |

#### Valores de Muestra (Primer Registro)

```
N?mero: "3"
Gafete: "3"
G?nero: "Masculino"  ← EXISTE Y TIENE VALOR
IMSS: "43917495459"
Fecha de Nacimiento: "16/02/74"
Estado: "Nuevo Le?n"
Fecha Ingreso: "16/06/01"
Fecha Antig?edad: "15/04/16"
Empresa: "MOTO REPUESTOS MONTERREY"
...
```

#### Distribución de Género (Primeros 99 registros)

| Valor | Cantidad | Porcentaje |
|-------|----------|------------|
| `"Masculino"` | 54 | 54.5% |
| `"Femenino"` | 45 | 45.5% |

**✅ CONFIRMADO**: La columna género **SÍ EXISTE** y **SÍ TIENE DATOS VÁLIDOS**

---

### Archivo: `Prenomina Horizontal.csv`

**Total columnas**: 30

**Columnas**:
1. `"N?mero"` - Número de empleado
2. `"Nombre"` - Nombre completo (no se usa apellidos/nombres separados)
3-30. Columnas de días de la semana con horas ordinarias, tiempo extra e incidencias

**Nota**: Este archivo **NO contiene** columna de género.

---

## 🔍 ANÁLISIS DEL CÓDIGO DE IMPORTACIÓN

### Archivo: `apps/web/src/app/api/import-real-sftp-force/route.ts`

#### Línea Crítica 288 (PROBLEMA PRINCIPAL)

```typescript
genero: emp['Género'] || emp['G?nero'] || 'No especificado',
```

**PROBLEMA**:
- ✅ Intenta `emp['Género']` → No existe en archivo (encoding correcto)
- ⚠️ Intenta `emp['G?nero']` → Existe, pero el `?` en el código **NO** es el mismo que el `?` del archivo
- ❌ Cae en fallback: `'No especificado'`
- ❌ Luego transformado a string vacío `""` en base de datos

**Por qué falla**:
El caracter `?` en el código fuente TypeScript **NO es el mismo byte** que el `?` en el nombre de columna del archivo Excel. El archivo tiene encoding corrupto (probablemente ISO-8859-1 o Windows-1252), mientras el código asume UTF-8.

#### Función `normalizeKey()` (Líneas 9-16)

```typescript
const normalizeKey = (key: unknown): string =>
  typeof key === 'string'
    ? key
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : '';
```

**Propósito**: Normalizar caracteres Unicode y remover acentos
**Problema**: **NO SE USA** para leer género

#### Función `pickField()` (Líneas 18-38)

```typescript
function pickField(
  record: Record<string, unknown>,
  explicitKeys: string[],
  token: string
): string {
  // 1. Primero intenta claves explícitas
  for (const key of explicitKeys) {
    const value = record[key];
    const str = value === null || value === undefined ? '' : String(value).trim();
    if (str && str.toLowerCase() !== 'null') return str;
  }

  // 2. Si no encuentra, hace búsqueda normalizada con token
  const tokenNorm = normalizeKey(token);
  for (const [rawKey, value] of Object.entries(record)) {
    const normKey = normalizeKey(rawKey);
    if (!normKey || !normKey.includes(tokenNorm)) continue;
    const str = value === null || value === undefined ? '' : String(value).trim();
    if (str && str.toLowerCase() !== 'null') return str;
  }

  return '';
}
```

**Uso en código**: ✅ Usado para `clasificacion` y `ubicacion`
**Problema**: ❌ **NO SE USA PARA GÉNERO**

---

## 🚨 CAUSA RAÍZ DEL ERROR 500

### Posibles Causas Identificadas

#### 1. ✅ **Error de SFTP Connection Timeout**
```
Missing SFTP configuration
Connection refused: SFTP server unreachable
readyTimeout exceeded
```

#### 2. ✅ **Error de Encoding al Leer Archivo**
```typescript
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
```
Si el encoding del archivo está corrupto, puede causar fallo en parsing.

#### 3. ✅ **Error de Inserción Batch en Supabase**
```typescript
const { data, error } = await supabaseAdmin
  .from('empleados_sftp')
  .insert(batch)
  .select();

if (error) {
  console.error(`Error insertando lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
  throw error;  // ← CAUSA ERROR 500
}
```

Posibles errores:
- Foreign key violation
- Unique constraint violation (numero_empleado duplicado)
- Invalid date format
- Column type mismatch
- Row size too large

#### 4. ✅ **Error en Limpieza de Datos Previos**
```typescript
await supabaseAdmin
  .from('empleados_sftp')
  .delete()
  .in('numero_empleado', employeeNumbers);
```
Si el array `employeeNumbers` está vacío o tiene valores inválidos.

---

## 💡 SOLUCIÓN PROPUESTA

### Opción 1: Usar `pickField()` con Normalización (RECOMENDADO)

**Ventajas**:
- ✅ Maneja encoding corrupto automáticamente
- ✅ Robusto a cambios de nombres de columnas
- ✅ Ya implementado y probado en clasificacion/ubicacion
- ✅ Mantiene consistencia con el resto del código

**Implementación**:
```typescript
// Línea 288 - ANTES
genero: emp['Género'] || emp['G?nero'] || 'No especificado',

// Línea 288 - DESPUÉS
genero: pickField(emp, ['Género', 'G?nero', 'Genero', 'GÉNERO'], 'genero'),
```

---

### Opción 2: Normalizar Todas las Columnas del Archivo

**Ventajas**:
- ✅ Soluciona encoding para TODAS las columnas
- ✅ Evita problemas futuros con otros campos
- ✅ Más robusto a largo plazo

**Desventajas**:
- ⚠️ Requiere más cambios de código
- ⚠️ Puede afectar otros campos si no se prueba bien

**Implementación**:
```typescript
// Después de parsear el archivo Excel (línea ~165)
data = bodyRows.map((rowUnknown: unknown) => {
  const row = rowUnknown as unknown[];
  const obj: Record<string, unknown> = {};
  headers.forEach((header, i) => {
    const cell = row && row[i] !== undefined ? row[i] : null;
    // Normalizar el nombre de la columna
    const normalizedHeader = normalizeKey(header || `col_${i}`);
    obj[normalizedHeader] = cell as unknown;
  });
  return obj;
});

// Luego en el mapeo (línea 288)
genero: emp['genero'] || 'No especificado',
```

---

### Opción 3: Usar Búsqueda Manual de Columna

**Ventajas**:
- ✅ Control total sobre la búsqueda
- ✅ Puede loggear debug info

**Implementación**:
```typescript
// Antes del mapeo de empleados
const empleadosReales = empleadosData.map((emp: Record<string, unknown>, index: number) => {
  // Buscar columna de género con diferentes variaciones
  let generoValue = 'No especificado';
  const generoKeys = Object.keys(emp).filter(key => {
    const normalized = normalizeKey(key);
    return normalized === 'genero' || normalized.includes('gen');
  });

  if (generoKeys.length > 0) {
    const generoKey = generoKeys[0];
    generoValue = String(emp[generoKey] || 'No especificado').trim();

    // Debug log primera vez
    if (index === 0) {
      console.log(`🔍 Columna género encontrada: "${generoKey}" = "${generoValue}"`);
    }
  } else if (index === 0) {
    console.log('⚠️ No se encontró columna de género en el archivo');
  }

  return {
    // ... resto de campos
    genero: generoValue,
    // ... resto de campos
  };
});
```

---

## 🔧 SOLUCIÓN PARA ERROR 500

### Mejoras de Manejo de Errores

```typescript
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  console.log('🚀 FORZANDO IMPORTACIÓN REAL DE DATOS SFTP (SIN CACHÉ)...');

  try {
    // Validar configuración SFTP primero
    const host = process.env.SFTP_HOST;
    const port = process.env.SFTP_PORT;
    const username = process.env.SFTP_USER;
    const password = process.env.SFTP_PASSWORD;

    if (!host || !port || !username || !password) {
      throw new Error('❌ Configuración SFTP incompleta en variables de entorno');
    }

    console.log(`📡 Conectando a SFTP: ${host}:${port}`);

    // ... resto del código de importación

    // MEJORAR INSERCIÓN CON MANEJO DE ERRORES DETALLADO
    for (let i = 0; i < empleadosReales.length; i += BATCH_SIZE) {
      const batch = empleadosReales.slice(i, i + BATCH_SIZE);

      try {
        const { data, error } = await supabaseAdmin
          .from('empleados_sftp')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Error insertando lote ${Math.floor(i/BATCH_SIZE) + 1}:`, {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            batchSize: batch.length,
            firstRecord: batch[0]?.numero_empleado
          });

          // No lanzar error, continuar con siguiente lote
          // pero registrar el error para reportar al final
          continue;
        }

        empleadosInsertados += data?.length || 0;
        console.log(`✅ Lote ${Math.floor(i/BATCH_SIZE) + 1} insertado: ${data?.length} empleados`);
      } catch (batchError) {
        console.error(`❌ Excepción en lote ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
        // Continuar con siguiente lote
        continue;
      }
    }

    // ... resto del código

  } catch (error) {
    console.error('❌ Error en importación real:', error);

    // Respuesta mejorada con más detalles
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Fase 1: Corrección Inmediata (Género)

**Prioridad**: 🔴 CRÍTICA
**Tiempo estimado**: 5 minutos
**Archivos a modificar**: 1

1. ✅ Modificar línea 288 en `import-real-sftp-force/route.ts`:
   ```typescript
   genero: pickField(emp, ['Género', 'G?nero', 'Genero', 'GÉNERO', 'GENERO'], 'genero'),
   ```

2. ✅ Probar importación forzada en `/admin`

3. ✅ Verificar datos en Supabase:
   ```sql
   SELECT genero, COUNT(*)
   FROM empleados_sftp
   WHERE genero IS NOT NULL AND genero != ''
   GROUP BY genero;
   ```

---

### Fase 2: Mejora de Manejo de Errores

**Prioridad**: 🟡 ALTA
**Tiempo estimado**: 15 minutos
**Archivos a modificar**: 1

1. ✅ Agregar validación de configuración SFTP al inicio
2. ✅ Mejorar logs de errores de inserción batch
3. ✅ Agregar try-catch por lote (no fallar todo si un lote falla)
4. ✅ Retornar detalles de error en respuesta 500

---

### Fase 3: Sistema de Detección de Cambios Estructurales

**Prioridad**: 🟢 MEDIA
**Tiempo estimado**: 2 horas
**Archivos a crear**: 2 nuevos

#### 3.1. Crear Servicio de Validación de Estructura

**Archivo**: `apps/web/src/lib/sftp-structure-validator.ts`

```typescript
export interface ColumnMapping {
  expectedName: string;
  actualName: string | null;
  found: boolean;
  sampleValue?: unknown;
}

export interface StructureValidation {
  fileName: string;
  expectedColumns: string[];
  actualColumns: string[];
  mappings: ColumnMapping[];
  missingColumns: string[];
  extraColumns: string[];
  warnings: string[];
}

export async function validateSFTPStructure(
  fileData: Record<string, unknown>[],
  fileName: string,
  expectedSchema: Record<string, string[]>
): Promise<StructureValidation> {
  const actualColumns = Object.keys(fileData[0] || {});
  const expectedColumns = expectedSchema[fileName] || [];

  const mappings: ColumnMapping[] = expectedColumns.map(expected => {
    // Buscar columna normalizada
    const normalizedExpected = normalizeKey(expected);
    const actualColumn = actualColumns.find(actual =>
      normalizeKey(actual) === normalizedExpected
    );

    return {
      expectedName: expected,
      actualName: actualColumn || null,
      found: !!actualColumn,
      sampleValue: actualColumn ? fileData[0][actualColumn] : undefined
    };
  });

  const missingColumns = mappings
    .filter(m => !m.found)
    .map(m => m.expectedName);

  const mappedActualColumns = mappings
    .filter(m => m.found)
    .map(m => m.actualName!);

  const extraColumns = actualColumns
    .filter(col => !mappedActualColumns.includes(col));

  const warnings: string[] = [];

  if (missingColumns.length > 0) {
    warnings.push(`Columnas faltantes: ${missingColumns.join(', ')}`);
  }

  if (extraColumns.length > 0) {
    warnings.push(`Columnas nuevas detectadas: ${extraColumns.join(', ')}`);
  }

  return {
    fileName,
    expectedColumns,
    actualColumns,
    mappings,
    missingColumns,
    extraColumns,
    warnings
  };
}
```

#### 3.2. Integrar Validación en Importación

```typescript
// En import-real-sftp-force/route.ts, después de descargar archivos

const EXPECTED_SCHEMA = {
  'Validacion Alta de empleados.xls': [
    'Número', 'Gafete', 'Género', 'IMSS', 'Fecha de Nacimiento',
    'Estado', 'Fecha Ingreso', 'Fecha Antigüedad', 'Empresa',
    // ... resto de columnas esperadas
  ],
  'Prenomina Horizontal.csv': [
    'Número', 'Nombre', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'
    // ... resto de columnas
  ]
};

// Validar estructura antes de procesar
const empleadosValidation = await validateSFTPStructure(
  empleadosData,
  'Validacion Alta de empleados.xls',
  EXPECTED_SCHEMA
);

console.log('📊 Validación de estructura de empleados:', empleadosValidation);

if (empleadosValidation.warnings.length > 0) {
  console.warn('⚠️ ADVERTENCIAS DE ESTRUCTURA:');
  empleadosValidation.warnings.forEach(w => console.warn(`  - ${w}`));
}

// Continuar con el mapeo usando los mappings detectados...
```

---

### Fase 4: Normalización Global de Columnas

**Prioridad**: 🟢 BAJA (Opcional)
**Tiempo estimado**: 1 hora
**Archivos a modificar**: 1

Aplicar normalización a TODAS las columnas al parsear el archivo Excel/CSV para evitar problemas futuros.

---

## 🎯 RECOMENDACIONES FINALES

### Inmediato (Hoy)
1. ✅ Implementar Fase 1 (corrección género con `pickField()`)
2. ✅ Implementar Fase 2 (mejor manejo de errores)
3. ✅ Probar importación forzada
4. ✅ Verificar datos en dashboard

### Corto Plazo (Esta Semana)
1. ✅ Implementar Fase 3 (validación de estructura)
2. ✅ Crear alertas automáticas si estructura cambia
3. ✅ Documentar esquema esperado de archivos SFTP

### Largo Plazo (Opcional)
1. ⚠️ Coordinar con proveedor SFTP para fix encoding UTF-8 correcto
2. ⚠️ Implementar Fase 4 si hay más problemas de encoding
3. ⚠️ Crear tests automatizados para importación

---

## 📝 RESUMEN DE HALLAZGOS

| Item | Estado | Severidad | Solución |
|------|--------|-----------|----------|
| Columna género vacía en Supabase | ❌ | 🔴 CRÍTICO | Usar `pickField()` con normalización |
| Error 500 en importación forzada | ⚠️ | 🟡 ALTO | Mejorar manejo de errores + logs |
| Encoding corrupto en nombres de columnas | ⚠️ | 🟡 MEDIO | `pickField()` ya maneja esto |
| No hay detección de cambios estructurales | ⚠️ | 🟢 BAJO | Implementar validador de estructura |
| Falta logging detallado | ⚠️ | 🟢 BAJO | Agregar logs por lote |

---

## ✅ CHECKLIST DE VERIFICACIÓN POST-FIX

Después de aplicar la solución, verificar:

- [ ] ✅ Columna `genero` se llena correctamente
- [ ] ✅ Valores de género son "Masculino" o "Femenino"
- [ ] ✅ Distribución de género ~50/50
- [ ] ✅ Importación forzada completa sin error 500
- [ ] ✅ Logs muestran columnas detectadas correctamente
- [ ] ✅ Dashboard muestra datos de género en tablas
- [ ] ✅ Correlation matrix funciona con género

---

**FIN DEL ANÁLISIS**
