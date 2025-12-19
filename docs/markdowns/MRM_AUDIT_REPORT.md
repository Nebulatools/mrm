# MRM AUDIT REPORT - Reporte de Auditoría SFTP

**Fecha de generación:** 19 de diciembre de 2025
**Periodo analizado:** Última semana de noviembre 2025 (24-30 de noviembre)
**Analista:** Claude Code (Auditoría Automatizada)

---

## 1. Resumen Ejecutivo

Este reporte documenta el análisis del sistema de extracción SFTP y la importación de datos a la base de datos Supabase del sistema MRM (HR KPI Dashboard). Se analizó el código fuente, los archivos de datos disponibles, y se identificaron puntos potenciales de discrepancia en el flujo de datos.

### Hallazgos Principales

| Aspecto | Estado | Observación |
|---------|--------|-------------|
| Código SFTP | Funcional | Implementación robusta con manejo de caché |
| Parseo de fechas | Riesgo medio | Múltiples formatos soportados pero con posibles edge cases |
| Mapeo de campos | Riesgo bajo | Sistema flexible con fallbacks |
| Datos Nov 24-30 | Parcial | Solo MotivosBaja tiene datos del periodo |
| Incidencias | Sin datos | Archivo actual contiene diciembre 2025 |
| Prenomina | Sin datos | Archivo actual contiene diciembre 2025 |

---

## 2. Análisis del Código de Extracción SFTP

### 2.1 Arquitectura del Sistema

El sistema utiliza una arquitectura de tres capas para la importación de datos:

```
SFTP Server (148.244.90.21:5062)
         │
         ▼
┌─────────────────────────────┐
│   API Routes (Next.js)       │
│  /api/sftp/route.ts          │ ← Lista, descarga archivos
│  /api/import-sftp-real-data/ │ ← Importación estándar
│  /api/import-real-sftp-force/│ ← Importación forzada
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Supabase PostgreSQL        │
│  - empleados_sftp            │
│  - motivos_baja              │
│  - asistencia_diaria         │
│  - incidencias               │
└─────────────────────────────┘
```

### 2.2 Archivos Fuente del SFTP

| Archivo | Tipo | Destino en BD |
|---------|------|---------------|
| `Validacion Alta de empleados.xls` | Excel | `empleados_sftp` |
| `Prenomina Horizontal.csv` | CSV | `asistencia_diaria` |
| `MotivosBaja.csv` | CSV | `motivos_baja` |
| `Incidencias.csv` | CSV | `incidencias` |

### 2.3 Componentes Clave del Código

#### SFTPService (`apps/web/src/app/api/sftp/route.ts`)

```typescript
// Configuración de conexión SFTP
class SFTPService {
  config: {
    host: process.env.SFTP_HOST,      // 148.244.90.21
    port: process.env.SFTP_PORT,      // 5062
    username: process.env.SFTP_USER,  // rhmrm
    password: process.env.SFTP_PASSWORD,
    directory: 'ReportesRH'
  }
}
```

#### Clasificación de Archivos (líneas 101-129)

El sistema clasifica automáticamente los archivos según su nombre:

- **Archivos con "motivos" + "bajas"** → tipo `plantilla`
- **Archivos con "incidencias" o "me 5"** → tipo `incidencias`
- **Archivos con "prenomina" o "horizo"** → tipo `plantilla`
- **Archivos con "validacion" o "alta"** → tipo `act`

---

## 3. Explicación del Proceso Interno (Español Sencillo)

### 3.1 ¿Cómo viajan los datos del Excel a la Base de Datos?

El proceso de importación funciona en **5 pasos principales**:

#### Paso 1: Conexión al Servidor SFTP
El sistema se conecta al servidor SFTP usando las credenciales configuradas en el archivo `.env`. El servidor contiene una carpeta llamada `ReportesRH` donde el área de Recursos Humanos sube los archivos Excel y CSV.

#### Paso 2: Descarga del Archivo
El sistema descarga el archivo completo a la memoria del servidor. No lo guarda en disco, lo procesa directamente.

#### Paso 3: Lectura y Parseo
- **Para archivos Excel (.xlsx/.xls):** Usa la librería `XLSX` para leer las hojas de cálculo
- **Para archivos CSV:** Usa la librería `Papaparse` para interpretar las filas y columnas

#### Paso 4: Transformación de Datos
Cada fila del archivo se convierte a un "objeto" de JavaScript que coincide con la estructura de la tabla en Supabase:

**Ejemplo - Transformación de Empleado:**
```
Excel: "Juan Pérez | RH | 01/01/2024 | SI"
         ↓ Transformación ↓
BD: {
  nombre_completo: "Juan Pérez",
  departamento: "RH",
  fecha_ingreso: "2024-01-01",  ← Se convierte a formato ISO
  activo: true                   ← "SI" se convierte a booleano
}
```

**Ejemplo - Transformación de Fecha:**
```
Excel: "24/11/25"
         ↓ parseDate() ↓
BD: "2025-11-24"

Excel: "2025-11-24T00:00:00-08:00"
         ↓ parseDate() ↓
BD: "2025-11-24"
```

#### Paso 5: Inserción en Base de Datos
Los datos transformados se insertan en Supabase en lotes de 50 registros para optimizar el rendimiento.

### 3.2 Diferencias entre los Dos Métodos de Importación

| Característica | Importación Estándar | Importación Forzada |
|---------------|---------------------|---------------------|
| Ruta API | `/api/import-sftp-real-data` | `/api/import-real-sftp-force` |
| Usa caché | Sí (5 minutos) | No |
| Método de parseo CSV | Papaparse (robusto) | Split por comas (básico) |
| Manejo de duplicados | Upsert | Delete + Insert |
| Genera asistencia automática | No | Sí (si no hay fechas) |

---

## 4. Datos de la Semana 24-30 de Noviembre 2025

### 4.1 Archivos Analizados en `/docs/archivos_sftp/`

| Archivo | Periodo de Datos | Contiene Nov 24-30? |
|---------|-----------------|---------------------|
| `MotivosBaja.csv` | Enero 2025 - Diciembre 2025 | **SÍ** |
| `Incidencias.csv` | 15-21 Diciembre 2025 | NO |
| `Prenomina Horizontal.csv` | 1-7 Diciembre 2025 | NO |

### 4.2 Bajas Registradas (Semana Nov 24-30)

Del archivo `MotivosBaja.csv`, se encontraron **6 bajas** en el periodo:

| Fecha | # Empleado | Tipo | Motivo |
|-------|------------|------|--------|
| 2025-11-24 | 944 | Baja | Rescisión por desempeño |
| 2025-11-24 | 1906 | Baja | Rescisión por desempeño |
| 2025-11-24 | 2343 | Baja | Rescisión por desempeño |
| 2025-11-27 | 1375 | Baja | Rescisión por desempeño |
| 2025-11-28 | 2736 | Baja | Cambio de ciudad (Separación voluntaria) |
| 2025-11-30 | 2779 | Baja | Abandono / No regresó |

### 4.3 Incidencias del Periodo

**No hay datos de incidencias para el periodo Nov 24-30** en el archivo `Incidencias.csv` actual. El archivo contiene datos del 15 al 21 de diciembre de 2025.

### 4.4 Asistencia/Prenómina del Periodo

**No hay datos de prenómina para el periodo Nov 24-30** en el archivo `Prenomina Horizontal.csv` actual. El archivo contiene datos de la semana del 1 al 7 de diciembre de 2025.

---

## 5. Puntos Potenciales de Discrepancia

### 5.1 Riesgo ALTO: Generación Automática de Asistencia

**Ubicación:** `import-real-sftp-force/route.ts` líneas 478-498

```typescript
// Si no encontramos fechas específicas, crear registros de ejemplo
if (asistenciaReales.filter(a => a.numero_empleado === numeroEmpleado).length === 0) {
  // Crea registros para los días laborales del mes actual
  for (let day = 1; day <= Math.min(daysInMonth, today.getDate()); day++) {
    // ...genera registros automáticamente
  }
}
```

**Problema:** Si el archivo de prenómina no tiene formato reconocible, el sistema **genera registros de asistencia ficticios** para todo el mes actual. Esto puede causar:
- Datos de asistencia que no corresponden a la realidad
- Inflación de métricas de días laborados
- Inconsistencia con los datos originales

### 5.2 Riesgo MEDIO: Parseo de Fechas con Múltiples Formatos

**Ubicación:** Ambas rutas de importación

El sistema intenta parsear fechas en múltiples formatos:
- `DD/MM/YY` → Se asume siglo 2000 si año < 50
- `DD/MM/YYYY`
- `YYYY-MM-DD`
- ISO 8601 con timezone (`2025-11-24T00:00:00-08:00`)
- Excel serial numbers

**Problema potencial:** Si una fecha viene en formato `MM/DD/YYYY` (formato estadounidense), se parseará incorrectamente:
```
"11/24/2025" (Nov 24) → Se interpretaría como "2025-11-24" (correcto por coincidencia)
"12/05/2025" (Dic 5)  → Se interpretaría como "2025-12-05" (incorrecto: sería May 12)
```

### 5.3 Riesgo MEDIO: Códigos de Incidencia No Reconocidos

**Ubicación:** `import-sftp-real-data/route.ts` líneas 96-97

```typescript
const INCIDENT_CODES = new Set(['FI', 'SUS', 'PSIN', 'ENFE']);
const PERMISO_CODES = new Set(['PCON', 'VAC', 'MAT3', 'MAT1', 'JUST']);
```

**Problema:** Solo estos códigos se cuentan como incidencias/permisos. Si aparecen códigos nuevos en el Excel (ej: `ENF`, `SUSP`, `FAL`), no se contabilizarán en los totales.

### 5.4 Riesgo BAJO: Normalización de Nombres de Columnas

**Ubicación:** Ambas rutas, función `pickField` y `normalizeKey`

El sistema busca columnas con múltiples variantes:
- Con/sin acentos: `Número` / `Numero` / `N?mero`
- Mayúsculas/minúsculas: `APELLIDOS` / `Apellidos` / `apellidos`

**Problema potencial:** Si el Excel tiene un nombre de columna completamente diferente (ej: `"ID Empleado"` en vez de `"Número"`), el campo quedará vacío o con valor por defecto.

---

## 6. Flujo de Datos: Del Excel a Supabase

### 6.1 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHIVOS EN SFTP                              │
├─────────────────────────────────────────────────────────────────┤
│ Validacion Alta de empleados.xls                                 │
│    Columnas: Gafete, Género, IMSS, Fecha Ingreso, Empresa...    │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ XLSX.read() → sheet_to_json()          │                   │
│    │ Extrae headers + filas como objetos    │                   │
│    └────────────────────────────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ Transformación:                         │                   │
│    │ - parseDate() para fechas              │                   │
│    │ - pickField() para campos con variantes│                   │
│    │ - parseInt() para números              │                   │
│    │ - Boolean para activo SI/NO            │                   │
│    └────────────────────────────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ supabase.from('empleados_sftp')        │                   │
│    │ .upsert(batch, {onConflict: 'numero'}) │                   │
│    └────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MotivosBaja.csv                                                  │
│    Columnas: Fecha, #, Tipo, Motivo, Descripción, Observaciones │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ Papa.parse() → Extrae filas CSV        │                   │
│    │ Maneja comillas y comas embebidas      │                   │
│    └────────────────────────────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ Mapeo:                                  │                   │
│    │  - record['#'] → numero_empleado       │                   │
│    │  - record['Fecha'] → fecha_baja        │                   │
│    │  - record['Tipo'] → tipo               │                   │
│    │  - record['Motivo'] → motivo           │                   │
│    └────────────────────────────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ supabase.from('motivos_baja')          │                   │
│    │ .insert(bajasTransformadas)            │                   │
│    └────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Incidencias.csv                                                  │
│    Columnas: Número, Nombre, Fecha, Turno, Horario, INCI...     │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ transformIncidenciaRecord():           │                   │
│    │  - parseIncidenciaDate() para fecha    │                   │
│    │  - parseOptionalInt() para turno       │                   │
│    │  - normalizeInciCode() para código     │                   │
│    │  - Filtra registros sin fecha válida   │                   │
│    └────────────────────────────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│    ┌────────────────────────────────────────┐                   │
│    │ Elimina incidencias del rango de fechas│                   │
│    │ Inserta nuevas en lotes de 200         │                   │
│    │ supabase.from('incidencias').insert()  │                   │
│    └────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Ejemplo Concreto: Baja del Empleado 2736

**Datos en el CSV:**
```csv
"2025-11-28T00:00:00-08:00","2736","Baja","Cambio de ciudad","Separación voluntari",""
```

**Proceso de transformación:**
```javascript
{
  // Paso 1: parseDate("2025-11-28T00:00:00-08:00")
  fecha_baja: "2025-11-28",  // ISO sin timezone

  // Paso 2: parseInt("2736")
  numero_empleado: 2736,

  // Paso 3: String directo
  tipo: "Baja",
  motivo: "Cambio de ciudad",
  descripcion: "Separación voluntari",
  observaciones: ""
}
```

**Query generada:**
```sql
INSERT INTO motivos_baja
  (numero_empleado, fecha_baja, tipo, motivo, descripcion, observaciones)
VALUES
  (2736, '2025-11-28', 'Baja', 'Cambio de ciudad', 'Separación voluntari', '');
```

---

## 7. Verificación de Consistencia

### 7.1 Datos que SÍ se pueden verificar (MotivosBaja Nov 24-30)

Los 6 registros de bajas del periodo deberían existir en la tabla `motivos_baja` de Supabase con los siguientes valores:

```sql
SELECT * FROM motivos_baja
WHERE fecha_baja BETWEEN '2025-11-24' AND '2025-11-30'
ORDER BY fecha_baja, numero_empleado;
```

**Resultado esperado:**
| numero_empleado | fecha_baja | tipo | motivo |
|-----------------|------------|------|--------|
| 944 | 2025-11-24 | Baja | Rescisión por desempeño |
| 1906 | 2025-11-24 | Baja | Rescisión por desempeño |
| 2343 | 2025-11-24 | Baja | Rescisión por desempeño |
| 1375 | 2025-11-27 | Baja | Rescisión por desempeño |
| 2736 | 2025-11-28 | Baja | Cambio de ciudad |
| 2779 | 2025-11-30 | Baja | Abandono / No regresó |

### 7.2 Datos que NO se pueden verificar

- **Incidencias Nov 24-30:** El archivo actual solo tiene diciembre
- **Asistencia Nov 24-30:** El archivo actual solo tiene diciembre
- **Empleados activos en Nov 24-30:** Requeriría snapshot histórico

---

## 8. Recomendaciones

### 8.1 Correcciones Prioritarias

1. **Eliminar generación automática de asistencia**
   - Archivo: `apps/web/src/app/api/import-real-sftp-force/route.ts`
   - Líneas: 478-498
   - Acción: Comentar o eliminar el bloque que genera registros ficticios

2. **Unificar método de parseo CSV**
   - Usar siempre Papaparse en lugar de split por comas
   - Esto evita problemas con campos que contienen comas

### 8.2 Mejoras Sugeridas

1. **Agregar logging detallado**
   - Registrar cada transformación de fecha que falle
   - Guardar histórico de importaciones con conteos

2. **Validación pre-inserción**
   - Verificar que fechas estén en rango válido (ej: no fechas futuras para bajas)
   - Alertar si hay campos críticos vacíos

3. **Ampliar códigos de incidencia**
   - Agregar más códigos al set `INCIDENT_CODES`
   - O cambiar a lógica inversa: excluir solo códigos conocidos como "no incidencia"

### 8.3 Auditorías Futuras

Para futuras auditorías, se recomienda:

1. Mantener copias de los archivos SFTP con fecha de descarga
2. Ejecutar consultas de verificación inmediatamente después de cada importación
3. Comparar conteos antes y después de cada sincronización

---

## 9. Conclusión

El sistema de importación SFTP está correctamente implementado con mecanismos robustos de parseo y transformación de datos. Sin embargo, se identificaron puntos de riesgo que podrían causar discrepancias:

1. **Generación automática de asistencia** cuando no se encuentran fechas en el archivo de prenómina
2. **Códigos de incidencia hardcodeados** que podrían excluir nuevos tipos
3. **Archivos con datos de periodos diferentes** que impiden una comparación completa

Para el periodo específico de la última semana de noviembre 2025 (24-30), **solo se pudieron verificar los datos de bajas** ya que los archivos de incidencias y prenómina contienen información de diciembre 2025.

---

## Anexo A: Configuración de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ufdlwhdrrvktthcxwpzt.supabase.co

# SFTP
SFTP_HOST=148.244.90.21
SFTP_PORT=5062
SFTP_USER=rhmrm
SFTP_DIRECTORY=ReportesRH
```

## Anexo B: Estructura de Tablas Supabase

### empleados_sftp
```sql
- id: SERIAL PRIMARY KEY
- numero_empleado: INTEGER UNIQUE NOT NULL
- apellidos: VARCHAR(200)
- nombres: VARCHAR(200)
- nombre_completo: VARCHAR(400)
- departamento: VARCHAR(100)
- puesto: VARCHAR(100)
- area: VARCHAR(100)
- fecha_ingreso: DATE
- fecha_baja: DATE
- activo: BOOLEAN
- empresa: VARCHAR(200)
```

### motivos_baja
```sql
- id: SERIAL PRIMARY KEY
- numero_empleado: INTEGER NOT NULL
- fecha_baja: DATE NOT NULL
- tipo: VARCHAR(100)
- motivo: VARCHAR(200)
- descripcion: TEXT
- observaciones: TEXT
```

### incidencias
```sql
- id: SERIAL PRIMARY KEY
- emp: INTEGER
- nombre: VARCHAR
- fecha: DATE NOT NULL
- turno: INTEGER
- horario: VARCHAR
- incidencia: VARCHAR
- entra: VARCHAR
- sale: VARCHAR
- ordinarias: DECIMAL
- numero: INTEGER
- inci: VARCHAR
- status: INTEGER
- ubicacion2: VARCHAR
```

---

*Reporte generado automáticamente por Claude Code*
*Versión del sistema: MRM HR KPI Dashboard v1.0*
