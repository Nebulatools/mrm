# 📊 RESUMEN: Archivos en SFTP AHORA (8 Enero 2026)

**Servidor:** 148.244.90.21:5062/ReportesRH

---

## 📁 ARCHIVO 1: Validacion Alta de empleados.xls

**Datos:**
- Registros: **1,043 empleados**
- Activos: 365
- Inactivos: 678
- Rango: 2008-2026

**Qué contiene:**
- ✅ TODOS los empleados desde 2008
- ✅ Snapshot completo actual
- ✅ Con fechas de ingreso y baja

---

## 📁 ARCHIVO 2: MotivosBaja.csv

**Datos:**
- Registros: **1 baja**
- Empleado: #2580
- Fecha: 06/01/2026
- Motivo: Otro trabajo mejor compensado

**Qué contiene:**
- ❌ Solo la baja MÁS RECIENTE (enero 2026)
- ❌ NO tiene bajas de 2025, 2024, 2023...
- Archivo INCREMENTAL (se sobrescribe cada mes)

---

## 📁 ARCHIVO 3: Incidencias.csv

**Datos:**
- Registros: **66 incidencias** (aprox)
- Período: Últimos días

**Qué contiene:**
- ❌ Solo incidencias MÁS RECIENTES
- ❌ NO tiene histórico de 2025
- Archivo INCREMENTAL

---

## 📁 ARCHIVO 4: Prenomina Horizontal.csv

**Datos:**
- Registros: **366 empleados**
- Semana: 01/01/2026 - 07/01/2026
- Columnas: 30 (días × horas)

**Qué contiene:**
- ✅ Semana actual COMPLETA
- ❌ NO tiene semanas anteriores
- Archivo SEMANAL (solo semana actual)

---

## ✅ RESUMEN EJECUTIVO

**SFTP actual cubre:**
```
Empleados:    ✅ COMPLETO (1,043 - snapshot total)
Bajas:        ❌ Solo enero 2026 (1 baja)
Incidencias:  ❌ Solo últimos días (66)
Prenomina:    ✅ Semana actual (366)
```

**Cobertura temporal:**
```
2023-2024: ❌ NO (archivos sobrescritos)
2025:      ❌ NO (archivos sobrescritos)
2026:      ✅ SÍ (datos actuales)
```

**Conclusión:**
El SFTP es INCREMENTAL - solo guarda datos recientes.
Para histórico necesitas los backups de Supabase (que no tienes en plan FREE).

---

## 🎯 DATOS COMBINADOS (SFTP + Patches)

**Si usamos SFTP + Patches tenemos:**
```
Empleados:    1,043 (completo) ✅
Bajas:        422 (2023-2024-2026, falta 2025) ⚠️
Incidencias:  2,644 (jul-dic 2025, falta resto) ⚠️
Prenomina:    366 (ene 2026) ✅
Asistencia:   0 (falta todo) ❌
```

**Total disponible:** ~80% de los datos
**Total faltante:** ~20% (principalmente 2025)
