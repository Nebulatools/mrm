# 📊 TABLA VISUAL COMPLETA - Qué Hay en Cada Fuente

## 🎯 FUENTES DE DATOS

| Fuente | Descripción | Qué contiene |
|--------|-------------|--------------|
| **SFTP Actual** | Servidor 148.244.90.21:5062 | Archivos ACTUALES (enero 2026) |
| **Patches** | Carpeta `/parches/` | Datos HISTÓRICOS (2023-2024 + partial 2025) |
| **Supabase ANTES** | Backup del 7 enero | TODOS los datos completos |
| **Supabase AHORA** | Estado actual | SFTP + Patches (incompleto) |

---

## 📋 COMPARACIÓN POR TABLA Y AÑO

### TABLA 1: empleados_sftp

| Año | SFTP | Patches | Supabase ANTES | Supabase AHORA | Estado |
|-----|------|---------|----------------|----------------|--------|
| **2008-2026** | ✅ 1,043 | N/A | ✅ 1,041 | ✅ 1,043 | ✅ COMPLETO |

**Conclusión:** ✅ Esta tabla está PERFECTA - tiene todo.

---

### TABLA 2: motivos_baja (Bajas)

| Año | SFTP | Patches | Supabase ANTES | Supabase AHORA | Estado |
|-----|------|---------|----------------|----------------|--------|
| **2023** | ❌ 0 | ✅ 181 | ✅ 181 | ✅ 181 | ✅ OK |
| **2024** | ❌ 0 | ✅ 240 | ✅ 240 | ✅ 240 | ✅ OK |
| **2025** | ❌ 0 | ❌ 0 | ✅ ~17 | ❌ 0 | ❌ **PERDIDAS** |
| **2026** | ✅ 1 | ❌ 0 | ❌ 0 | ✅ 1 | ✅ OK |
| **TOTAL** | 1 | 421 | 1,108 | 422 | ⚠️ Faltan 686 |

**Conclusión:** ❌ Faltan TODAS las bajas de 2025 (~17-20 bajas)

---

### TABLA 3: incidencias

| Período | SFTP | Patches | Supabase ANTES | Supabase AHORA | Estado |
|---------|------|---------|----------------|----------------|--------|
| **2023** | ❌ 0 | ❌ 0 | ✅ ~200 | ❌ 0 | ❌ **PERDIDAS** |
| **2024** | ❌ 0 | ❌ 0 | ✅ ~400 | ❌ 0 | ❌ **PERDIDAS** |
| **2025 Ene** | ❌ 0 | ❌ 0 | ✅ ~100 | ❌ 0 | ❌ **PERDIDAS** |
| **2025 Feb** | ❌ 0 | ❌ 0 | ✅ ~100 | ❌ 0 | ❌ **PERDIDAS** |
| **2025 Mar** | ❌ 0 | ❌ 0 | ✅ ~50 | ❌ 0 | ❌ **PERDIDAS** |
| **2025 Abr** | ❌ 0 | ❌ 0 | ✅ ~30 | ❌ 0 | ❌ **PERDIDAS** |
| **2025 May** | ❌ 0 | ❌ 0 | ✅ ~15 | ❌ 0 | ❌ **PERDIDAS** |
| **2025 Jun** | ❌ 0 | ❌ 0 | ✅ ~20 | ❌ 0 | ❌ **PERDIDAS** |
| **2025 Jul** | ❌ 0 | ✅ 775 | ✅ 775 | ✅ 775 | ✅ OK |
| **2025 Ago** | ❌ 0 | ✅ 814 | ✅ 814 | ✅ 814 | ✅ OK |
| **2025 Sep** | ❌ 0 | ✅ 645 | ✅ 645 | ✅ 645 | ✅ OK |
| **2025 Oct** | ❌ 0 | ✅ 331 | ✅ 331 | ✅ 331 | ✅ OK |
| **2025 Nov** | ❌ 0 | ✅ 39 | ✅ 39 | ✅ 39 | ✅ OK |
| **2025 Dic** | ❌ 0 | ✅ 40 | ✅ 40 | ✅ 40 | ✅ OK |
| **2026 Ene** | ⚠️ 66 | ❌ 0 | ❌ 0 | ⚠️ 0 | ⚠️ Por importar |
| **TOTAL** | 66 | 2,644 | 2,959 | 2,644 | ⚠️ Faltan 315 |

**Conclusión:** ❌ Faltan incidencias de 2023, 2024 y ene-jun 2025

---

### TABLA 4: prenomina_horizontal

| Semana | SFTP | Patches | Supabase ANTES | Supabase AHORA | Estado |
|--------|------|---------|----------------|----------------|--------|
| **01-07 Ene 2026** | ✅ 366 | ❌ 0 | ✅ 366 | ✅ 366 | ✅ OK |
| **Anteriores** | ❌ 0 | ❌ 0 | ❌ 0 | ❌ 0 | ⚠️ N/A |

**Conclusión:** ✅ Esta tabla está bien (solo tiene la semana actual)

---

### TABLA 5: asistencia_diaria

| Período | SFTP | Patches | Supabase ANTES | Supabase AHORA | Estado |
|---------|------|---------|----------------|----------------|--------|
| **2023-2026** | ❌ 0 | ❌ 0 | ✅ 2,632 | ❌ 0 | ❌ **TODO PERDIDO** |

**Conclusión:** ❌ Esta tabla está completamente vacía

---

## 🎯 RESUMEN VISUAL

```
╔═══════════════════════════════════════════════════════════╗
║                    COBERTURA DE DATOS                     ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  2023:  Empleados ✅  Bajas ✅  Incidencias ❌            ║
║  2024:  Empleados ✅  Bajas ✅  Incidencias ❌            ║
║  2025:  Empleados ✅  Bajas ❌  Incidencias ⚠️  (parcial) ║
║  2026:  Empleados ✅  Bajas ✅  Incidencias ⚠️  Prenomina ✅║
║                                                           ║
║  ✅ = Completo                                           ║
║  ⚠️ = Parcial                                            ║
║  ❌ = Falta                                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 💡 RESPUESTA A TU CONFUSIÓN

### "¿SFTP + Patches deberían tener todo, no?"

**NO, porque:**

1. **SFTP** es incremental (solo datos actuales):
   - MotivosBaja.csv: Solo 1 baja de 2026
   - Incidencias.csv: Solo 66 de últimos días
   - **NO guarda histórico**

2. **Patches** son parciales (solo algunos períodos):
   - Bajas: Solo 2023-2024
   - Incidencias: Solo jul-dic 2025
   - **NO cubren todo 2025**

3. **Datos completos** solo están en:
   - ✅ Supabase (backup del 7 enero)

---

## ✅ SOLUCIÓN

**Restaura backup de Supabase del 7 de enero 2026**

Entonces tendrás:
- ✅ Bajas de 2025
- ✅ Incidencias completas de 2025
- ✅ Asistencia completa
- ✅ Dashboard funcional 100%

---

**Guía completa:** `analisis-sftp-actual/GUIA_BACKUP_SUPABASE.md` 📖
