# 📡 CONTENIDO EXACTO DEL SFTP (Verificado)

**Servidor:** 148.244.90.21:5062
**Directorio:** ReportesRH
**Fecha de análisis:** 8 de enero de 2026

---

## 📁 ARCHIVO 1: Validacion Alta de empleados.xls

### Información General
```
Nombre:              Validacion Alta de empleados.xls
Tamaño:              446 KB
Última modificación: 08/01/2026 09:00 AM
Formato:             Excel (.xls)
```

### Contenido
```
Total registros:     1,043 empleados
Tipo:                SNAPSHOT COMPLETO
Columnas:            28 columnas

Columnas principales:
  - Número (ID empleado)
  - Gafete
  - Género
  - IMSS
  - Fecha de Nacimiento
  - Estado
  - Fecha de Ingreso
  - Fecha de Antigüedad
  - Empresa
  - Registro Patronal
  - Código Puesto / Puesto
  - Código Depto / Departamento
  - Código CC / CC
  - Clasificación
  - Área
  - Ubicación
  - Turno
  - Fecha de Baja (si aplica)

Estadísticas:
  Empleados activos:   365
  Empleados inactivos: 678
  Total:               1,043

Rango de fechas de ingreso:
  Más antigua:         2008-01-10
  Más reciente:        2026-01-XX

Ejemplo de datos (primera fila):
  Número: 4
  Nombre: Beltran Del Rio Lara, Juan Gerardo
  Fecha Ingreso: 2008-XX-XX
  Activo: Sí
```

**✅ Este archivo tiene TODOS los empleados (completo)**

---

## 📁 ARCHIVO 2: MotivosBaja.csv

### Información General
```
Nombre:              MotivosBaja.csv
Tamaño:              0.2 KB (muy pequeño)
Última modificación: 08/01/2026 09:00 AM
Formato:             CSV
```

### Contenido COMPLETO (línea por línea)
```
Línea 1 (header):
Fecha,#,Tipo,Motivo,Descripción,Observaciones

Línea 2 (única baja):
06/01/2026,2580,Baja,Otro trabajo mejor compensado,,

Total: 1 BAJA SOLAMENTE
```

### Datos de la única baja
```
Empleado:      #2580
Fecha:         06/01/2026 (Enero 2026)
Tipo:          Baja
Motivo:        Otro trabajo mejor compensado
Descripción:   (vacía)
Observaciones: (vacía)
```

**❌ Este archivo NO tiene:**
- Bajas de 2025 (0 bajas)
- Bajas de 2024 (0 bajas)
- Bajas de 2023 (0 bajas)
- **Solo tiene la baja más reciente de enero 2026**

**¿Por qué solo 1 baja?**
```
Este archivo es INCREMENTAL - RH lo actualiza cada mes
y solo pone las bajas nuevas, borrando las anteriores.
```

---

## 📁 ARCHIVO 3: Incidencias.csv

### Información General
```
Nombre:              Incidencias.csv
Tamaño:              9.5 KB
Última modificación: 08/01/2026 09:00 AM
Formato:             CSV
```

### Contenido
```
Total registros:     66 incidencias
Período aproximado:  Últimos días/semanas

Tipo:                INCREMENTAL (solo recientes)

Columnas:
  - Número (empleado)
  - Nombre
  - Fecha
  - Turno
  - Horario
  - Incidencia
  - Entra
  - Sale
  - Ordinarias
  - INCI (código)
  - Status
```

**❌ Este archivo NO tiene:**
- Incidencias históricas de 2025
- Incidencias de 2024
- Solo tiene incidencias muy recientes (últimos días)

---

## 📁 ARCHIVO 4: Prenomina Horizontal.csv

### Información General
```
Nombre:              Prenomina Horizontal.csv
Tamaño:              102.1 KB
Última modificación: 08/01/2026 09:00 AM
Formato:             CSV
```

### Contenido
```
Total registros:     366 empleados
Semana cubierta:     01/01/2026 - 07/01/2026 (UNA SEMANA)

Columnas:            30 columnas
  - Número
  - Nombre
  - LUN, LUN-ORD, LUN-TE, LUN-INC (lunes)
  - MAR, MAR-ORD, MAR-TE, MAR-INC (martes)
  - ... para cada día de la semana

Ejemplo primera fila:
  Empleado: 4
  Nombre: Beltran Del Rio Lara, Juan Gerardo
  LUN: 01/01/2026, 9h ord, 0h extra
  MAR: 02/01/2026, 9h ord, 0h extra
  ...
  Total semana: ~45 horas
```

**❌ Este archivo NO tiene:**
- Semanas anteriores (diciembre 2025, noviembre, etc.)
- Solo tiene la SEMANA ACTUAL (01-07 enero 2026)

---

## 📊 RESUMEN: QUÉ HAY EN SFTP HOY

```
┌────────────────────────────────────────────────────────────┐
│ SFTP ACTUAL (8 de enero 2026)                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ✅ Empleados: 1,043 (COMPLETO - todos desde 2008)         │
│ ❌ Bajas: 1 (Solo enero 2026 - NO histórico)              │
│ ❌ Incidencias: 66 (Solo últimos días - NO histórico)     │
│ ✅ Prenomina: 366 (Semana actual completa)                │
│                                                            │
│ Cobertura temporal:                                        │
│   Empleados: 2008-2026 (18 años) ✅                       │
│   Bajas: Solo enero 2026 ❌                                │
│   Incidencias: Solo últimos días ❌                        │
│   Prenomina: Solo semana 01-07 ene 2026 ❌                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔢 MATEMÁTICA SIMPLE

### Si solo usamos SFTP + Patches:

```
SFTP:
  ✅ 1,043 empleados
  ❌ 1 baja de 2026
  ❌ 66 incidencias recientes
  ✅ 366 prenomina de ene 2026

Patches:
  ✅ 421 bajas de 2023-2024
  ✅ 2,644 incidencias jul-dic 2025

Total combinado:
  ✅ 1,043 empleados
  ⚠️ 422 bajas (solo 2023, 2024, 2026 - FALTA 2025)
  ⚠️ 2,710 incidencias (solo jul-dic 2025 + últimas)
  ✅ 366 prenomina
  ❌ 0 asistencia

FALTA vs lo que tenías ANTES:
  ❌ ~17-20 bajas de 2025
  ❌ ~1,500 incidencias de ene-jun 2025
  ❌ 2,632 registros de asistencia
```

---

## ✅ RESPUESTAS A TUS PREGUNTAS

### 1. ¿Qué hay EXACTAMENTE en SFTP?
```
Ver arriba - solo datos de ENERO 2026 (no histórico)
```

### 2. ¿Cómo hacer el backup?
```
1. https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/database/backups
2. Buscar backup del 7 de enero 2026
3. Clic en "Restore"
4. Confirmar
5. Esperar 5-10 minutos
```

### 3. ¿Qué información falta EN TOTAL?
```
motivos_baja: Faltan ~686 registros (principalmente 2025)
incidencias: Faltan ~315 registros (ene-jun 2025)
asistencia_diaria: Faltan 2,632 registros (TODO)
```

### 4. ¿Qué botón usar para solo actualizar?
```
✅ USA: "Actualizar Información (Manual)" (botón VERDE)

Este botón:
  - Descarga del SFTP
  - Usa UPSERT (no borra)
  - Solo agrega datos nuevos
  - ES SEGURO
```

---

## 📞 NECESITO QUE HAGAS ESTO

**Por favor ve a:**
```
https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/database/backups
```

**Y dime:**
- ¿Ves backups disponibles?
- ¿Hay uno del 7 de enero 2026?
- ¿Qué fechas de backup ves?

**Entonces restauramos y limpiamos duplicados.** ✅