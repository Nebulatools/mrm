# 🔄 DIFERENCIA ENTRE BOTONES DE IMPORTACIÓN

## 📋 Resumen Rápido

| Aspecto | **Actualizar Información (Manual)** | **FORZAR IMPORTACIÓN REAL (SIN CACHÉ)** |
|---------|-------------------------------------|------------------------------------------|
| **Estado** | ✅ Habilitado | ❌ Deshabilitado por seguridad |
| **Endpoint** | `/api/import-sftp-real-data` | `/api/import-real-sftp-force` |
| **Usa Caché** | ✅ Sí (por defecto) | ❌ No, descarga directo |
| **Limpia Caché** | ✅ Sí (cuando trigger=manual) | ❌ N/A (no usa caché) |
| **Método de Descarga** | `sftpClient.downloadFile()` (caché) | `downloadFromSFTP()` (directo) |
| **Inserción** | `UPSERT` (actualiza existentes) | `DELETE` + `INSERT` (reemplaza) |
| **Velocidad** | 🚀 Rápido (usa caché) | 🐢 Lento (descarga todo) |
| **Seguridad** | ✅ Más seguro | ⚠️ Más riesgoso |
| **Cuándo Usar** | 📅 Importaciones regulares | 🔧 Troubleshooting/Debug |

---

## 🔵 Botón 1: "Actualizar Información (Manual)"

### ✅ Estado: HABILITADO

### 📍 Endpoint: `/api/import-sftp-real-data`

### 🔧 Cómo Funciona

```typescript
// PASO 1: Limpia caché solo si es trigger manual
if (manualTrigger) {
  console.log('🔄 Actualización manual: limpiando caché del cliente SFTP');
  sftpClient.clearCache();
}

// PASO 2: Usa sftpClient con caché
const files = await sftpClient.listFiles(); // Puede usar caché
const empleadosData = await sftpClient.downloadFile(empleadosFile.name); // Puede usar caché

// PASO 3: UPSERT (actualiza o inserta)
const { error } = await supabaseAdmin
  .from('empleados_sftp')
  .upsert(batch, { onConflict: 'numero_empleado' });
  // ☝️ Si el numero_empleado existe, actualiza
  // ☝️ Si no existe, inserta nuevo
```

### ✅ Ventajas

1. **Respeta el caché SFTP**: Si los archivos no han cambiado, usa versión cacheada (más rápido)
2. **UPSERT inteligente**: No borra registros existentes, solo actualiza
3. **Más seguro**: No elimina datos previos
4. **Más rápido**: Usa caché cuando está disponible
5. **Limpia caché cuando es necesario**: Si usas `?trigger=manual`, limpia el caché primero

### 📝 Flujo de Datos

```
Usuario presiona botón
       ↓
1. Limpia caché SFTP (si trigger=manual)
       ↓
2. Descarga archivos (puede usar caché)
       ↓
3. Transforma datos
       ↓
4. UPSERT en Supabase (actualiza o inserta)
       ↓
5. Actualiza sync_settings con next_run
       ↓
Retorna resultados
```

### 🎯 Cuándo Usar

- ✅ **Importación diaria/regular** de datos
- ✅ **Sincronización programada** (cron)
- ✅ **Actualizaciones incrementales**
- ✅ **Cuando sabes que los archivos no cambiaron mucho**
- ✅ **Producción normal**

### ⚠️ Limitaciones

- Si el caché SFTP está "stuck" con datos viejos, puede no ver cambios
- Si hay errores estructurales en caché, seguirá usándolos

---

## 🔴 Botón 2: "FORZAR IMPORTACIÓN REAL (SIN CACHÉ)"

### ❌ Estado: DESHABILITADO (por seguridad)

```typescript
// En el componente sftp-import-admin.tsx (línea ~84)
const forceImportEnabled = false; // Deshabilitado por seguridad
```

### 📍 Endpoint: `/api/import-real-sftp-force`

### 🔧 Cómo Funciona

```typescript
// PASO 1: Descarga DIRECTA desde SFTP (sin caché)
async function downloadFromSFTP(filename: string) {
  const sftp = new SftpClient();
  await sftp.connect({ host, port, username, password });
  const fileContent = await sftp.get(filePath); // ← DIRECTO, sin caché
  await sftp.end();

  // Parsea Excel/CSV directamente desde buffer
  const workbook = XLSX.read(fileContent, { type: 'buffer' });
  // ...
}

// PASO 2: DELETE + INSERT (reemplaza todo)
// 2a. Elimina registros existentes
const employeeNumbers = empleadosReales.map(emp => emp.numero_empleado);
await supabaseAdmin
  .from('empleados_sftp')
  .delete()
  .in('numero_empleado', employeeNumbers);

// 2b. Inserta registros nuevos
await supabaseAdmin
  .from('empleados_sftp')
  .insert(batch)
  .select();
```

### ✅ Ventajas

1. **Descarga fresca garantizada**: Siempre obtiene la versión más reciente del SFTP
2. **Ignora caché completamente**: No puede estar "stuck" con datos viejos
3. **Limpieza completa**: Borra y reemplaza todo (fresh start)
4. **Debug útil**: Perfecto para troubleshooting de problemas de caché

### ⚠️ Desventajas

1. **MUY LENTO**: Descarga todo desde SFTP cada vez (sin caché)
2. **Más riesgoso**: Elimina registros antes de insertar (si falla, pierdes datos)
3. **Consume más recursos**: Conexión SFTP directa cada vez
4. **Puede causar errores**: Si SFTP está lento/caído, falla más fácil
5. **Deshabilitado por defecto**: Requiere cambiar código para usar

### 📝 Flujo de Datos

```
Usuario presiona botón (si está habilitado)
       ↓
1. Conecta DIRECTAMENTE a SFTP
       ↓
2. Descarga archivos desde SFTP (sin caché)
       ↓
3. Parsea Excel/CSV desde buffer
       ↓
4. DELETE registros existentes por numero_empleado
       ↓
5. INSERT registros nuevos en lotes
       ↓
6. Actualiza sync_settings
       ↓
Retorna resultados
```

### 🎯 Cuándo Usar

- 🔧 **Troubleshooting**: Sospechas que el caché está corrupto
- 🐛 **Debug**: Necesitas ver datos frescos del SFTP
- 🔄 **Reset completo**: Quieres empezar desde cero
- ⚠️ **Emergencias**: Datos en Supabase están muy desincronizados
- 🧪 **Testing**: Validar que el SFTP tiene datos correctos

### ⚠️ Cuándo NO Usar

- ❌ **Uso regular/diario**: Demasiado lento
- ❌ **Producción normal**: Muy riesgoso (borra datos)
- ❌ **Sincronización automática**: Puede fallar si SFTP está lento

---

## 🤔 ¿Cuál Deberías Usar?

### 📅 Uso Normal (99% del tiempo)

```
✅ USA: "Actualizar Información (Manual)"
```

**Razón**: Es más rápido, más seguro, y suficiente para actualizaciones regulares.

### 🔧 Troubleshooting (1% del tiempo)

```
⚠️ USA: "FORZAR IMPORTACIÓN REAL" (si lo habilitas)
```

**Razón**: Solo cuando necesites descartar caché y obtener datos frescos garantizados.

---

## 🚀 Configuración para Habilitar "Forzar Importación"

Si necesitas usar el botón forzado, cambia:

**Archivo**: `apps/web/src/components/sftp-import-admin.tsx`

```typescript
// LÍNEA ~84 - ANTES
const forceImportEnabled = false;

// LÍNEA ~84 - DESPUÉS (solo para debug)
const forceImportEnabled = true;
```

⚠️ **ADVERTENCIA**: Solo habilita esto temporalmente para troubleshooting, luego desactiva.

---

## 🔍 Comparación de Arquitectura

### Actualizar Información (Manual)

```
┌─────────────────────────────────────────────────────────┐
│ CLIENTE (Admin UI)                                      │
│ "Actualizar Información (Manual)"                       │
└───────────────────────┬─────────────────────────────────┘
                        ↓ POST ?trigger=manual
┌─────────────────────────────────────────────────────────┐
│ ENDPOINT: /api/import-sftp-real-data                    │
│                                                         │
│ 1. sftpClient.clearCache() (si manual)                 │
│ 2. sftpClient.listFiles() ← puede usar caché          │
│ 3. sftpClient.downloadFile() ← puede usar caché       │
│                                                         │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ SFTP CLIENT (Wrapper con caché)                         │
│                                                         │
│ - Chequea caché primero                                │
│ - Si no existe/expiró, descarga del SFTP               │
│ - Guarda en caché para próxima vez                     │
│                                                         │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ SUPABASE                                                │
│                                                         │
│ UPSERT INTO empleados_sftp                             │
│   ON CONFLICT (numero_empleado)                        │
│   DO UPDATE SET ...                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Forzar Importación Real

```
┌─────────────────────────────────────────────────────────┐
│ CLIENTE (Admin UI)                                      │
│ "FORZAR IMPORTACIÓN REAL" (deshabilitado)              │
└───────────────────────┬─────────────────────────────────┘
                        ↓ POST
┌─────────────────────────────────────────────────────────┐
│ ENDPOINT: /api/import-real-sftp-force                   │
│                                                         │
│ 1. downloadFromSFTP() ← descarga DIRECTA              │
│    - new SftpClient()                                   │
│    - connect()                                          │
│    - get(filePath) ← sin caché                         │
│    - end()                                              │
│                                                         │
└───────────────────────┬─────────────────────────────────┘
                        ↓ (SIEMPRE descarga fresco)
┌─────────────────────────────────────────────────────────┐
│ SFTP SERVIDOR (directo)                                 │
│                                                         │
│ - Lee archivo directamente                              │
│ - Retorna buffer                                        │
│ - NO hay caché                                          │
│                                                         │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ SUPABASE                                                │
│                                                         │
│ 1. DELETE FROM empleados_sftp                          │
│    WHERE numero_empleado IN (...)                       │
│                                                         │
│ 2. INSERT INTO empleados_sftp                          │
│    VALUES (...)                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Tabla de Decisión

| Situación | Usa |
|-----------|-----|
| Importación diaria normal | ✅ Actualizar Información |
| Cron job automatizado | ✅ Actualizar Información |
| Datos se ven desactualizados | ✅ Actualizar Información (limpia caché) |
| Sospechas corrupción de caché | ⚠️ Forzar Importación |
| Columna género está vacía | ⚠️ Forzar Importación (después del fix) |
| Testing cambios en estructura SFTP | ⚠️ Forzar Importación |
| Producción está funcionando bien | ✅ Actualizar Información |
| SFTP está lento/inestable | ✅ Actualizar Información (usa caché) |

---

## 🎯 RECOMENDACIÓN FINAL

### Para tu caso específico (problema de género):

1. **✅ HABILITA** temporalmente "Forzar Importación Real":
   ```typescript
   const forceImportEnabled = true;
   ```

2. **🔄 EJECUTA** "Forzar Importación Real" UNA VEZ para:
   - Descartar caché corrupto
   - Obtener datos frescos del SFTP
   - Validar que el fix de género funciona

3. **🔍 VERIFICA** en Supabase:
   ```sql
   SELECT genero, COUNT(*)
   FROM empleados_sftp
   GROUP BY genero;
   ```

   Deberías ver:
   ```
   genero     | count
   -----------+-------
   Masculino  | ~570
   Femenino   | ~471
   ```

4. **❌ DESHABILITA** "Forzar Importación Real":
   ```typescript
   const forceImportEnabled = false;
   ```

5. **✅ USA** "Actualizar Información (Manual)" para importaciones futuras

---

**FIN DE LA GUÍA**
