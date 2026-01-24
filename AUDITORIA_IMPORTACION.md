# 🔍 AUDITORÍA COMPLETA: Comportamiento de "Actualizar Información (Manual)"

**Fecha:** Enero 23, 2026
**Archivo analizado:** `apps/web/src/app/api/import-sftp-real-data/route.ts`
**Endpoint:** `/api/import-sftp-real-data?trigger=manual`

---

## ⚠️ RESUMEN EJECUTIVO - RESPUESTA DIRECTA

**¿Preserva datos existentes?**

| Tabla | Comportamiento | Preserva Historial | Riesgo ubicacion2 |
|-------|----------------|--------------------|--------------------|
| `empleados_sftp` | **UPSERT completo** | ❌ NO - Sobreescribe TODO | 🔴 **ALTO** |
| `motivos_baja` | DELETE duplicados + INSERT | ⚠️ Parcial | 🟢 Bajo |
| `incidencias` | DELETE por rango de fechas + INSERT | ⚠️ Solo período actual | 🟢 Bajo |
| `prenomina_horizontal` | DELETE por semana + INSERT | ⚠️ Solo semana actual | 🟢 Bajo |

---

## 📋 ANÁLISIS DETALLADO POR TABLA

### 1. 🚨 empleados_sftp - **SOBREESCRIBE TODO EL REGISTRO**

**Código (línea 450):**
```typescript
.upsert(batch, { onConflict: 'numero_empleado' });
```

**Comportamiento:**
1. Lee archivo SFTP "Validacion Alta de empleados.xls"
2. Para cada empleado en el archivo:
   - Si `numero_empleado` NO existe → INSERT (nuevo empleado)
   - Si `numero_empleado` SÍ existe → **UPDATE COMPLETO** (reemplaza TODAS las columnas)

**¿Qué pasa con ubicacion2?**

❌ **PROBLEMA CRÍTICO:**
- Archivo SFTP tiene 63.92% "Desconocido" en ubicacion2
- Acabamos de corregir esos datos con el archivo local (0% "Desconocido")
- Al ejecutar "Actualizar Información (Manual)":
  - Lee archivo SFTP con "Desconocido"
  - UPSERT **SOBREESCRIBE** ubicacion2 con "Desconocido"
  - **PERDEMOS** los 675 empleados que corregimos

**Ejemplo concreto:**

| Estado | numero_empleado | cc | ubicacion2 |
|--------|----------------|-----|------------|
| **Supabase AHORA** (después de UPDATE) | 3 | CAD | CAD ✅ |
| **Archivo SFTP** (source) | 3 | CAD | Desconocido ❌ |
| **Después de importar** | 3 | CAD | **Desconocido** ❌❌❌ |

**Conclusión:**
🔴 **SÍ VA A AFECTAR** - Va a sobreescribir ubicacion2 con valores incorrectos del SFTP

---

### 2. ⚠️ motivos_baja - **Lógica Inteligente de Deduplicación**

**Código (líneas 512-544):**
```typescript
// 1. Obtener registros existentes para los empleados del archivo
const existingRows = await supabaseAdmin
  .from('motivos_baja')
  .select('id, numero_empleado, fecha_baja, motivo')
  .in('numero_empleado', uniqueEmployeeNumbers);

// 2. Identificar duplicados exactos (mismo empleado + fecha + motivo)
const incomingKeys = new Set(
  bajasTransformadas.map(
    (baja) => `${baja.numero_empleado}|${baja.fecha_baja}|${baja.motivo}`
  )
);

// 3. Eliminar solo los duplicados exactos
idsToDelete = existingRows
  .filter((row) => incomingKeys.has(`${row.numero_empleado}|${row.fecha_baja}|${row.motivo}`))
  .map((row) => row.id);

await supabaseAdmin.from('motivos_baja').delete().in('id', idsToDelete);

// 4. Insertar nuevos registros
await supabaseAdmin.from('motivos_baja').insert(bajasTransformadas);
```

**Comportamiento:**
1. Identifica bajas que ya existen (mismo empleado + fecha + motivo)
2. Elimina **solo los duplicados exactos**
3. Inserta todos los registros del archivo

**¿Preserva historial?**
⚠️ **PARCIALMENTE:**
- ✅ NO elimina bajas antiguas que no están en el archivo actual
- ✅ Preserva registros históricos
- ⚠️ Si una baja existe con los mismos datos, la reemplaza (para actualizaciones)

**Ejemplo:**
```
BD tiene: Empleado #100 | 2024-05-15 | "Renuncia"
Archivo tiene: Empleado #100 | 2024-05-15 | "Renuncia"
→ Elimina el registro viejo, inserta el nuevo (mismo resultado)

BD tiene: Empleado #200 | 2023-01-10 | "Abandono"
Archivo NO lo tiene
→ ✅ LO PRESERVA (no lo toca)
```

**Conclusión:**
🟢 **Preserva historial** - Solo actualiza duplicados exactos

---

### 3. ⚠️ incidencias - **DELETE por Rango de Fechas**

**Código (líneas 592-601):**
```typescript
// 1. Detectar rango de fechas en el archivo
const periodStart = fechas[0].toISOString().split('T')[0];
const periodEnd = fechas[fechas.length - 1].toISOString().split('T')[0];

// 2. Eliminar incidencias existentes en ese rango
await supabaseAdmin
  .from('incidencias')
  .delete()
  .gte('fecha', periodStart)
  .lte('fecha', periodEnd);

// 3. Insertar nuevas incidencias
await supabaseAdmin.from('incidencias').insert(batch);
```

**Comportamiento:**
1. Identifica rango de fechas en el archivo (ej: 2026-01-19 a 2026-01-25)
2. **ELIMINA todas las incidencias** en ese rango de fechas
3. Inserta las nuevas del archivo

**¿Preserva historial?**
⚠️ **SOLO FUERA DEL PERÍODO:**
- ✅ Incidencias de meses/años anteriores NO se tocan
- ❌ Incidencias dentro del rango del archivo se eliminan y reemplazan

**Ejemplo:**
```
BD tiene incidencias de: 2025-12-01 a 2026-01-31
Archivo tiene incidencias de: 2026-01-19 a 2026-01-25
→ Elimina: 2026-01-19 a 2026-01-25
→ ✅ Preserva: 2025-12-01 a 2026-01-18 Y 2026-01-26 a 2026-01-31
```

**Conclusión:**
🟡 **Preserva historial antiguo** - Solo actualiza período actual

---

### 4. ⚠️ prenomina_horizontal - **DELETE por Semana**

**Código (líneas 662-670):**
```typescript
// 1. Identificar semanas únicas en el archivo
const semanasUnicas = [...new Set(prenominaTransformadas.map(p => p.semana_inicio))];

// 2. Eliminar registros existentes de esas semanas
for (const semana of semanasUnicas) {
  await supabaseAdmin
    .from('prenomina_horizontal')
    .delete()
    .eq('semana_inicio', semana);
}

// 3. Insertar nuevos registros
await supabaseAdmin.from('prenomina_horizontal').insert(batch);
```

**Comportamiento:**
1. Identifica qué semanas contiene el archivo (ej: 2026-01-01)
2. **ELIMINA todos los registros** de esas semanas específicas
3. Inserta los nuevos del archivo

**¿Preserva historial?**
⚠️ **SOLO OTRAS SEMANAS:**
- ✅ Prenominas de semanas pasadas NO se tocan
- ❌ Prenomina de la semana actual se elimina y reemplaza

**Ejemplo:**
```
BD tiene prenomina de: Semana 2025-12-25, 2026-01-01, 2026-01-08
Archivo tiene prenomina de: 2026-01-01
→ Elimina: Semana 2026-01-01 completa
→ ✅ Preserva: Semanas 2025-12-25 y 2026-01-08
```

**Conclusión:**
🟡 **Preserva historial de otras semanas** - Solo actualiza semana actual

---

## 🎯 CONCLUSIÓN GENERAL

### ¿Qué se preserva y qué se sobreescribe?

| Tabla | Preserva | Sobreescribe | Riesgo ubicacion2 |
|-------|----------|--------------|-------------------|
| **empleados_sftp** | ❌ NADA | ✅ TODO el registro | 🔴 **CRÍTICO** |
| **motivos_baja** | ✅ Registros únicos no duplicados | Duplicados exactos | 🟢 Bajo |
| **incidencias** | ✅ Fechas fuera del período | Período del archivo | 🟢 Bajo |
| **prenomina_horizontal** | ✅ Semanas pasadas | Semana actual | 🟢 Bajo |

### ⚠️ **RESPUESTA DIRECTA A TU PREGUNTA:**

**"¿El botón solo agrega registros nuevos y preserva lo existente?"**

**Para empleados_sftp:** ❌ **NO**
- UPSERT **REEMPLAZA TODO EL REGISTRO** si el empleado ya existe
- **VA A SOBREESCRIBIR** ubicacion2 con valores del SFTP ("Desconocido")
- **PERDERÁS** los 675 empleados que acabamos de corregir

**Para las demás tablas:** ⚠️ **Parcialmente**
- Preservan datos históricos (fechas/semanas pasadas)
- Actualizan solo el período actual del archivo

---

## 💡 RECOMENDACIONES

### Opción 1: **Modificar código para preservar ubicacion2** (RECOMENDADO)

Cambiar UPSERT para que **NO sobreescriba** ubicacion2 si ya tiene un valor válido:

```typescript
// En lugar de upsert que sobreescribe todo:
.upsert(batch, { onConflict: 'numero_empleado' });

// Usar lógica condicional:
for (const empleado of batch) {
  const { data: existing } = await supabaseAdmin
    .from('empleados_sftp')
    .select('ubicacion2')
    .eq('numero_empleado', empleado.numero_empleado)
    .single();

  // Si ya tiene ubicacion2 válida, NO sobreescribirla
  if (existing?.ubicacion2 && existing.ubicacion2 !== 'Desconocido') {
    delete empleado.ubicacion2; // No actualizar este campo
  }

  await supabaseAdmin
    .from('empleados_sftp')
    .upsert(empleado, { onConflict: 'numero_empleado' });
}
```

**Ventajas:**
- ✅ Protege datos corregidos permanentemente
- ✅ Permite importaciones futuras sin riesgo
- ✅ Automático, sin intervención manual

### Opción 2: **Actualizar archivo SFTP con datos correctos**

Subir el archivo local (`Validacion Alta de empleados (42).xlsb`) al servidor SFTP reemplazando el actual.

**Ventajas:**
- ✅ Source of truth correcto desde el origen
- ✅ No requiere cambios de código

**Desventajas:**
- ❌ Requiere acceso y permisos al servidor SFTP
- ❌ Puede afectar otros sistemas que usen ese archivo

### Opción 3: **No usar "Actualizar Información (Manual)" para empleados**

Importar manualmente solo cuando sea necesario y ejecutar el script de corrección después.

**Ventajas:**
- ✅ No requiere cambios de código

**Desventajas:**
- ❌ Proceso manual tedioso
- ❌ Propenso a errores humanos

---

## 🎯 RECOMENDACIÓN FINAL

**Implementar Opción 1** inmediatamente porque:
1. 🔴 Sin este cambio, la próxima importación DESTRUIRÁ los 675 empleados corregidos
2. ✅ Es la solución más robusta y automática
3. ✅ Previene pérdida de datos accidental
4. ✅ Permite seguir usando "Actualizar Información (Manual)" sin miedo

**Urgencia:** ALTA - Antes de la próxima importación manual o automática
