# 🔍 LA VERDAD COMPLETA - Por Qué Faltan Datos

## TU PREGUNTA (Muy Válida):

> "Si traemos información de SFTP + ponemos los patches, deberíamos tener todo, ¿no?"

## MI RESPUESTA:

**NO** - Y aquí está por qué:

---

## 📊 ANÁLISIS DE LAS 4 FUENTES

### FUENTE 1: SFTP - Archivo "Validacion Alta de empleados.xls"

```
Contenido: 1,043 empleados
Tipo: SNAPSHOT COMPLETO (todos los empleados al día de hoy)
Fechas: Empleados con fecha_ingreso desde 2008 hasta 2026
Cubre: ✅ TODO (es un snapshot actual completo)
```

**✅ Este archivo SÍ tiene toda la información de empleados**

---

### FUENTE 2: SFTP - Archivo "MotivosBaja.csv"

```
Contenido: 1 baja
Registro:
  - Empleado #2580
  - Fecha: 06/01/2026
  - Motivo: "Otro trabajo mejor compensado"

Tipo: INCREMENTAL (solo la baja MÁS RECIENTE)
Cubre: ❌ Solo enero 2026
```

**❌ Este archivo NO tiene bajas históricas - Solo la última baja**

**Esto significa:**
- El SFTP NO guarda histórico de bajas
- Solo tiene la baja más reciente del mes actual
- Bajas de meses pasados **NO ESTÁN en el archivo**

---

### FUENTE 3: SFTP - Archivo "Incidencias.csv"

```
Contenido: 0-10 incidencias (muy pocas)
Tipo: INCREMENTAL (solo incidencias recientes)
Cubre: ❌ Solo últimos días
```

**❌ Este archivo NO tiene incidencias históricas**

**Esto significa:**
- Solo tiene incidencias de los últimos días
- Incidencias de meses pasados **NO ESTÁN**

---

### FUENTE 4: SFTP - Archivo "Prenomina Horizontal.csv"

```
Contenido: 366 registros
Semana: 01-07 Enero 2026
Tipo: SEMANAL (solo la semana actual)
Cubre: ✅ Semana actual completa
```

**✅ Tiene la semana completa actual**

---

## 📁 PATCHES LOCALES

### PATCH 1: motivos_baja_inserts.sql

```
Registros: 421 bajas
Período: 2023-2024
  2023: 181 bajas
  2024: 240 bajas
  2025: 0 bajas ❌
  2026: 0 bajas ❌

Primera fecha: 2023-01-02
Última fecha: 2024-12-31
```

**⚠️ NO cubre 2025**

---

### PATCH 2: incidencias_patch_insert.sql

```
Registros: 2,644 incidencias
Período: 2025 (julio-diciembre SOLAMENTE)
  2025-07: 775 incidencias
  2025-08: 814 incidencias
  2025-09: 645 incidencias
  2025-10: 331 incidencias
  2025-11: 39 incidencias
  2025-12: 40 incidencias

Primera fecha: 2025-07-01
Última fecha: 2025-12-31
```

**⚠️ NO cubre enero-junio 2025**

---

## 🎯 ENTONCES, ¿QUÉ PASA CON 2025?

### Cobertura por Año:

**2023:**
```
Empleados: ✅ (snapshot incluye histórico)
Bajas: ✅ (patch: 181 bajas)
Incidencias: ❌ (no hay patch ni SFTP)
Asistencia: ❌ (no hay patch ni SFTP)
```

**2024:**
```
Empleados: ✅ (snapshot incluye histórico)
Bajas: ✅ (patch: 240 bajas)
Incidencias: ❌ (no hay patch ni SFTP)
Asistencia: ❌ (no hay patch ni SFTP)
```

**2025:**
```
Empleados: ✅ (snapshot incluye histórico)
Bajas: ❌ NO (ni en SFTP ni en patches)
Incidencias:
  - Ene-Jun: ❌ NO (ni en SFTP ni en patches)
  - Jul-Dic: ✅ (patch: 2,644 incidencias)
Asistencia: ❌ NO (ni en SFTP ni en patches)
```

**2026:**
```
Empleados: ✅ (SFTP: 1,043)
Bajas: ✅ (SFTP: 1 baja)
Incidencias: ❌ (SFTP vacío)
Prenomina: ✅ (SFTP: 366 registros)
Asistencia: ❌ (no hay)
```

---

## 💡 AHORA ENTIENDES EL PROBLEMA

### SFTP + Patches NO cubren TODO

**Lo que SÍ cubre:**
```
✅ Empleados: Completo (snapshot actual)
✅ Bajas 2023-2024: Completo (patches)
✅ Incidencias jul-dic 2025: Completo (patch)
✅ Prenomina enero 2026: Completo (SFTP)
```

**Lo que NO cubre:**
```
❌ Bajas de 2025: NO está en ningún lado
❌ Incidencias ene-jun 2025: NO está en ningún lado
❌ Asistencia completa: NO está en ningún lado
```

---

## 🔍 ¿DE DÓNDE VENÍAN ESOS DATOS ANTES?

### ANTES del TRUNCATE, Supabase tenía:

**motivos_baja: 1,108 registros**
```
= 421 (patches 2023-2024)
+ ~687 (datos de 2025 que NO están en patches ni SFTP) ← PERDIDOS
```

**incidencias: 2,959 registros**
```
= 2,644 (patch jul-dic 2025)
+ ~315 (datos de ene-jun 2025 que NO están en patches ni SFTP) ← PERDIDOS
```

**asistencia_diaria: 2,632 registros**
```
= 0 (no hay patch)
+ 2,632 (generados/importados previamente) ← PERDIDOS
```

### ¿De dónde venían?

**Opción A:** Importaciones previas desde archivos SFTP históricos
- En el pasado, alguien importó archivos de 2025
- Esos archivos YA NO están en el servidor SFTP
- Solo quedan los actuales (2026)

**Opción B:** Generación automática
- Se generaron con scripts
- Se perdieron al hacer TRUNCATE

**Opción C:** Carga manual
- Se cargaron desde Excel u otra fuente
- Se perdieron al hacer TRUNCATE

---

## 🎯 POR QUÉ LOS ARCHIVOS SFTP SON "INCREMENTALES"

### Explicación:

**Los archivos SFTP se SOBRESCRIBEN cada vez:**

```
SFTP NO es un repositorio Git:
  - NO guarda versiones históricas
  - Solo tiene el archivo MÁS RECIENTE
  - Se sobrescribe cada vez que RH lo actualiza

Ejemplo con MotivosBaja.csv:
  Semana 1: Tiene bajas de esa semana
  Semana 2: Se SOBRESCRIBE con bajas de la semana 2
  Semana 3: Se SOBRESCRIBE con bajas de la semana 3
  └─ Solo queda la versión de la semana 3
```

**Por eso:**
- MotivosBaja.csv de hoy solo tiene 1 baja (enero 2026)
- NO tiene bajas de 2025, 2024, 2023...
- Esas bajas se perdieron cuando el archivo se sobrescribió

---

## ✅ ENTONCES, SFTP + PATCHES **NO SON SUFICIENTES**

### Ecuación:

```
SFTP actual (2026) + Patches (2023-2024 + jul-dic 2025)
≠
TODOS los datos necesarios

Falta: Bajas 2025 + Incidencias ene-jun 2025 + Asistencia completa
```

---

## 🆘 ÚNICA SOLUCIÓN: BACKUP DE SUPABASE

### Supabase ES tu repositorio histórico

```
SFTP → (importación) → Supabase → (acumula) → Histórico completo
```

**Supabase actúa como warehouse:**
- ✅ Acumula datos de TODAS las importaciones previas
- ✅ Guarda backups diarios
- ✅ Puede restaurarse

**Los datos de 2025 que faltan:**
- ✅ Están en el backup de Supabase de AYER
- ❌ NO están en SFTP actual
- ❌ NO están completos en patches

---

## 🎯 QUÉ HACER AHORA

### OPCIÓN 1: Restaurar desde Backup ⭐ RECOMENDADO

```
1. Ve a: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/database/backups

2. Busca backup del 7 de enero 2026 (ayer)

3. Restaura SOLO estas tablas:
   - motivos_baja (recupera bajas de 2025)
   - incidencias (recupera ene-jun 2025)
   - asistencia_diaria (recupera todo)

4. Después limpiamos duplicados

5. ✅ Sistema completo al 100%
```

---

### OPCIÓN 2: Aceptar que 2025 está Incompleto

```
Mantener lo que tenemos ahora:
  ✅ 2023-2024: Completo (patches)
  ⚠️ 2025: Parcial (solo jul-dic incidencias)
  ✅ 2026: Completo (SFTP actual)

Consecuencia:
  ❌ Dashboard de 2025 estará vacío/incompleto
```

---

## 📋 RESUMEN SIMPLE

### ¿Por qué falta información?

**Porque:**
1. **SFTP es incremental** - solo tiene datos recientes (2026)
2. **Patches son parciales** - solo tienen 2023-2024 (bajas) y jul-dic 2025 (incidencias)
3. **Datos de 2025** (bajas, incidencias ene-jun) solo estaban en Supabase
4. **Al hacer TRUNCATE** se borraron esos datos únicos
5. **NO se pueden recuperar** de SFTP ni patches

### ¿Qué se necesita?

**Restaurar desde backup de Supabase** (única fuente que tiene TODO)

---

**¿Tienes acceso a los backups de Supabase para que revisemos juntos?** 🔍
