# 🔍 COMPARACIÓN: ¿Qué Archivos Procesa Cada Botón?

## 📂 Tus Archivos en SFTP (según screenshot)

| Archivo | Tamaño | Modificado | Tabla Destino |
|---------|--------|------------|---------------|
| **Prenomina Horizontal.csv** | 100.6 KB | 1/7/2026 | → `asistencia_diaria` |
| **Validacion Alta de empleados.xls** | 445.2 KB | 1/7/2026 | → `empleados_sftp` |
| **MotivosBaja.csv** | 0.2 KB | 1/7/2026 | → `motivos_baja` |
| **Incidencias.csv** | 8.2 KB | 1/7/2026 | → `incidencias` |

---

## ⚠️ DESCUBRIMIENTO IMPORTANTE

**NINGUNO de los dos botones importa las 4 tablas completamente.**

Cada botón procesa diferentes archivos:

---

## 🔵 Botón 1: "Actualizar Información (Manual)"

### ✅ Archivos que SÍ procesa:

1. ✅ **Validacion Alta de empleados.xls** → `empleados_sftp`
   - Código: líneas 193-270
   - Usa: `sftpClient.downloadFile()` (con caché)
   - Inserción: `UPSERT` (actualiza o inserta)

2. ✅ **MotivosBaja.csv** → `motivos_baja`
   - Código: líneas 273-355
   - Usa: `sftpClient.downloadFile()` (con caché)
   - Inserción: `DELETE` duplicados + `INSERT` nuevos

3. ✅ **Incidencias.csv** → `incidencias`
   - Código: líneas 357-422
   - Usa: `sftpClient.downloadFile()` (con caché)
   - Inserción: `DELETE` por rango de fechas + `INSERT`

### ❌ Archivos que NO procesa:

❌ **Prenomina Horizontal.csv** → NO SE USA

**Resultado**: Importa **3 de 4 tablas** (falta `asistencia_diaria`)

---

## 🔴 Botón 2: "Forzar Importación Real (SIN CACHÉ)"

### ✅ Archivos que SÍ procesa:

1. ✅ **Validacion Alta de empleados.xls** → `empleados_sftp`
   - Código: línea 191
   - Usa: `downloadFromSFTP()` (descarga directa, sin caché)
   - Inserción: `DELETE` por numero_empleado + `INSERT` en lotes

2. ✅ **Prenomina Horizontal.csv** → `asistencia_diaria`
   - Código: línea 197
   - Usa: `downloadFromSFTP()` (descarga directa, sin caché)
   - **IMPORTANTE**: NO usa el archivo como está, sino que **GENERA** registros de asistencia sintéticos basados en los números de empleado
   - Código: líneas 439-521
   - Crea registros de asistencia para días laborales del mes actual

3. ✅ **MotivosBaja.csv** → `motivos_baja`
   - Código: línea 203
   - Usa: `downloadFromSFTP()` (descarga directa, sin caché)
   - Inserción: `DELETE` duplicados + `INSERT` nuevos

### ❌ Archivos que NO procesa:

❌ **Incidencias.csv** → NO SE USA

**Código (línea 524-527)**:
```typescript
// ========================================
// PASO 5.6: IMPORTAR INCIDENCIAS DESDE PDF (DESACTIVADO)
// ========================================
// A petición: por ahora omitimos parseo/import desde PDFs.
let incidenciasInsertadas = 0;
```

**Resultado**: Importa **3 de 4 tablas** (falta `incidencias`)

---

## 📊 TABLA COMPARATIVA

| Archivo SFTP | Tabla Supabase | Actualizar Info | Forzar Import | Observaciones |
|--------------|----------------|-----------------|---------------|---------------|
| **Validacion Alta de empleados.xls** | `empleados_sftp` | ✅ Con caché | ✅ Sin caché | Ambos lo procesan |
| **MotivosBaja.csv** | `motivos_baja` | ✅ Con caché | ✅ Sin caché | Ambos lo procesan |
| **Prenomina Horizontal.csv** | `asistencia_diaria` | ❌ NO | ⚠️ Sí (sintético) | Forzar genera datos sintéticos |
| **Incidencias.csv** | `incidencias` | ✅ Con caché | ❌ NO | Solo Actualizar lo procesa |

---

## 🎯 RESPUESTAS A TUS PREGUNTAS

### 1. ¿Me recomiendas picarle "Forzar Importación Real"?

**DEPENDE** de qué necesites:

**✅ Usa "Forzar Importación" SI**:
- Necesitas datos frescos de género SIN CACHÉ (para validar el fix)
- Quieres generar `asistencia_diaria` sintética
- No te importa que `incidencias` NO se importe

**❌ NO uses "Forzar Importación" SI**:
- Necesitas importar `incidencias` desde Incidencias.csv
- Ya tienes datos de asistencia reales y no quieres sintéticos

---

### 2. ¿Esos archivos ya los tenemos mapeados con las 4 tablas de Supabase?

**⚠️ NO COMPLETAMENTE**

**Mapeo actual**:
- ✅ `empleados_sftp` ← Validacion Alta de empleados.xls (ambos botones)
- ✅ `motivos_baja` ← MotivosBaja.csv (ambos botones)
- ⚠️ `asistencia_diaria` ← Prenomina Horizontal.csv (solo "Forzar", y genera datos sintéticos)
- ⚠️ `incidencias` ← Incidencias.csv (solo "Actualizar Info")

**Para importar las 4 tablas necesitas**:
1. Usar "Actualizar Información" para empleados, bajas e incidencias
2. Luego usar "Forzar Importación" para asistencia (si quieres sintética)

**O mejor aún**: Necesitas que se agregue el procesamiento faltante a uno de los botones.

---

### 3. ¿Estás seguro que ese botón es el correcto?

**Para el problema de género específicamente**: ✅ **SÍ**, "Forzar Importación Real" es correcto porque:
- Ya tiene el fix aplicado (usa `pickField()`)
- Descarga directo del SFTP sin caché
- Te garantiza datos frescos de género

**Pero con la advertencia de que**:
- ❌ NO importará tu archivo `Incidencias.csv`
- ⚠️ Generará datos sintéticos de asistencia (no los reales de Prenomina)

---

### 4. ¿Con esto ya voy a tener exactamente lo que viene en las tablas de SFTP?

**❌ NO, no exactamente**

**Lo que SÍ tendrás con "Forzar Importación"**:
- ✅ Empleados frescos del SFTP (con género correcto)
- ✅ Bajas frescas del SFTP
- ⚠️ Asistencia **SINTÉTICA** (generada automáticamente, no los datos reales)

**Lo que NO tendrás con "Forzar Importación"**:
- ❌ Incidencias del archivo Incidencias.csv

**Lo que SÍ tendrías con "Actualizar Información"**:
- ✅ Empleados del SFTP (con género correcto, ya apliqué el fix)
- ✅ Bajas del SFTP
- ✅ Incidencias del SFTP

**Lo que NO tendrías con "Actualizar Información"**:
- ❌ Asistencia del archivo Prenomina Horizontal.csv

---

## 💡 RECOMENDACIÓN FINAL

### Para SOLUCIONAR EL PROBLEMA DE GÉNERO (tu objetivo principal):

**Opción A: Usa "Actualizar Información (Manual)"** ✅ RECOMENDADO

**Por qué**:
- ✅ Ya tiene el fix de género aplicado
- ✅ Importa empleados, bajas e incidencias
- ✅ Más rápido (usa caché)
- ✅ Más seguro (UPSERT)
- ❌ No importa asistencia, pero puedes vivir sin ella por ahora

**Pasos**:
1. Ve a `/admin`
2. Presiona "Actualizar Información (Manual)"
3. Espera resultados
4. Verifica género en Supabase

---

**Opción B: Usa "Forzar Importación Real"** ⚠️ SOLO SI NECESITAS

**Por qué**:
- ✅ Datos frescos garantizados (sin caché)
- ✅ Genera asistencia sintética
- ❌ No importa incidencias
- ⚠️ Más lento
- ⚠️ Más riesgoso (DELETE + INSERT)

**Pasos**:
1. Habilita el botón: `forceImportEnabled = true`
2. Ve a `/admin`
3. Presiona "FORZAR IMPORTACIÓN REAL"
4. Espera resultados (puede tardar 1-2 min)
5. Verifica género en Supabase

---

## 🔧 SOLUCIÓN IDEAL A LARGO PLAZO

**Para importar TODAS las 4 tablas correctamente**, necesitas:

1. **Agregar procesamiento de Incidencias.csv a "Forzar Importación"**
2. **Agregar procesamiento de Prenomina Horizontal.csv a "Actualizar Información"**

O mejor aún:

3. **Crear un solo endpoint que procese los 4 archivos correctamente**

¿Quieres que te ayude a implementar esto?

---

## 📝 RESUMEN VISUAL

```
TUS ARCHIVOS SFTP          ACTUALIZAR INFO    FORZAR IMPORT
├─ Validacion Alta...xls   ✅ Sí (caché)      ✅ Sí (directo)
├─ MotivosBaja.csv         ✅ Sí (caché)      ✅ Sí (directo)
├─ Prenomina Horiz...csv   ❌ NO              ⚠️ Sí (sintético)
└─ Incidencias.csv         ✅ Sí (caché)      ❌ NO

RESULTADO:
Actualizar Info    → 3/4 tablas (falta asistencia)
Forzar Import      → 3/4 tablas (falta incidencias)
```

---

**¿Qué quieres hacer?**
1. ✅ Solo arreglar género → Usa "Actualizar Información"
2. ⚠️ Arreglar género + ver datos sin caché → Usa "Forzar Importación" (pero perderás incidencias)
3. 🔧 Arreglar para importar las 4 tablas → Déjame ayudarte a modificar el código
