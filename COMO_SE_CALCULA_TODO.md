# 📊 CÓMO SE CALCULA CADA MÉTRICA DEL DASHBOARD - GUÍA EJECUTIVA COMPLETA

**Última actualización**: 22 de Enero, 2026
**Proyecto**: Dashboard MRM - Métricas de Recursos Humanos
**Audiencia**: Ejecutivos, Gerentes, Analistas de RH
**Propósito**: Explicación detallada sin código técnico

---

## 📖 TABLA DE CONTENIDOS

1. [Las 4 Tablas de la Base de Datos](#-las-4-tablas-de-la-base-de-datos)
2. [Las 10 Fórmulas Maestras](#-fórmulas-maestras---los-10-cálculos-principales)
3. [Tab 1: Resumen - Vista General](#-tab-1-resumen---vista-general-comparativa)
4. [Tab 2: Incidencias - Análisis de Asistencia](#%EF%B8%8F-tab-2-incidencias---an%C3%A1lisis-de-asistencia)
5. [Tab 3: Retención - Análisis de Bajas](#-tab-3-retenci%C3%B3n---an%C3%A1lisis-de-rotaci%C3%B3n)
6. [Tab 4: Tendencias - Correlaciones y Patrones](#-tab-4-tendencias---correlaciones-y-patrones)
7. [Sistema de Filtros](#-sistema-de-filtros---c%C3%B3mo-funcionan)

---

## 🗄️ LAS 4 TABLAS DE LA BASE DE DATOS

Todo el dashboard funciona con **4 tablas principales** en PostgreSQL (Supabase):

---

## ⚠️ IMPORTANTE: ARQUITECTURA DE BAJAS (Actualizado Enero 2026)

**DECISIÓN ARQUITECTURAL CRÍTICA:**

Después de investigación exhaustiva (ver análisis completo en `/tabs/DISCREPANCIA_ROTACION.md`), se detectó una **desincronización entre tablas**:

- `motivos_baja`: **236 bajas en 2025** ✅ (coincide 100% con CSV SFTP)
- `empleados_sftp.fecha_baja`: **232 bajas en 2025** ❌ (4 registros menos)

**SOLUCIÓN IMPLEMENTADA:**

1. **`motivos_baja` es la FUENTE DE VERDAD** para todas las bajas
2. **Sincronización automática**: Durante el load, `getEmpleadosSFTP()` sincroniza automáticamente `fecha_baja` desde `motivos_baja`
3. **Flujo de datos**:
   ```
   motivos_baja (fuente primaria de bajas)
        ↓
   getEmpleadosSFTP() sincroniza automáticamente
        ↓
   PlantillaRecord[] con fecha_baja correcta
        ↓
   Todos los cálculos de rotación usan el array sincronizado
   ```

**GARANTÍAS:**
- ✅ **Coincidencia 100%** con archivo SFTP original
- ✅ **Datos completos** de motivos (tipo, descripción, observaciones)
- ✅ **Arquitectura mantenida** (single load, arrays en memoria)
- ✅ **Sincronización automática** en cada carga

**IMPACTO EN CÁLCULOS:**
- **Antes**: 232 bajas (incompleto) → Rotación subestimada
- **Ahora**: 236 bajas (completo) → Rotación correcta

---

### 1. 📋 TABLA `empleados_sftp` - "La Tabla Maestra"

**¿Qué tiene?**
Toda la información de empleados activos e inactivos (plantilla completa).

**Campos críticos**:
```
• numero_empleado - Identificador único (ej: 12345)
• nombres, apellidos, nombre_completo
• fecha_ingreso - Fecha de contratación
• fecha_baja - Fecha de terminación (NULL si sigue activo)
• activo - TRUE/FALSE según estado actual
• empresa - Negocio al que pertenece
• departamento - Departamento asignado
• area - Área de trabajo
• puesto - Puesto que ocupa
• clasificacion - CONFIANZA o SINDICALIZADO
• ubicacion - Planta/sucursal
• genero - M/F
• fecha_nacimiento - Para calcular edad
```

**Datos reales** (Enero 2026):
- **1,051 registros totales** (todo el histórico desde 2001)
- **Activos actuales**: Se calculan dinámicamente por fecha

**Uso**: Esta es la tabla central para TODOS los cálculos de personal.

---

### 2. ⚠️ TABLA `motivos_baja` - "Registro de Terminaciones"

**¿Qué tiene?**
Detalles de cada terminación laboral con motivo específico.

**Campos críticos**:
```
• numero_empleado - FK a empleados_sftp
• fecha_baja - Fecha exacta de terminación
• tipo - Clasificación principal del motivo
• motivo - Motivo normalizado legible
• descripcion - Detalles adicionales
• observaciones - Notas complementarias
```

**Datos reales** (Enero 2026):
- **676 registros** de bajas históricas

**Top 5 motivos reales**:
1. Baja Voluntaria - 421 casos (62.3%)
2. Otra razón - 67 casos (9.9%)
3. Abandono / No regresó - 46 casos (6.8%)
4. Término del contrato - 36 casos (5.3%)
5. Regreso a la escuela - 15 casos (2.2%)

**Clasificación de motivos**:
- **Involuntarios** (isMotivoClave = true): Rescisión por desempeño, Rescisión por disciplina, Término del contrato
- **Voluntarios** (isMotivoClave = false): Todos los demás

**Uso**: Análisis de rotación voluntaria vs involuntaria, heatmaps de motivos.

---

### 3. ⚠️ TABLA `incidencias` - "Registro de Asistencia y Problemas"

**¿Qué tiene?**
Registro histórico de TODAS las incidencias: faltas, permisos, vacaciones, ausencias.

**Campos críticos**:
```
• emp - Número de empleado (FK a empleados_sftp.numero_empleado)
• fecha - Fecha de la incidencia
• inci - Código de tipo (VAC, FI, ENFE, PSIN, etc.)
• incidencia - Descripción textual
• turno - Turno asignado
• horario - Horario (formato: 0830_1700)
• entra - Hora de entrada registrada
• sale - Hora de salida registrada
• ordinarias - Horas ordinarias trabajadas
• ubicacion2 - Ubicación calculada
```

**Datos reales** (Enero 2026):
- **8,880 registros totales** históricos
- **405 empleados únicos** con al menos 1 incidencia

**Los 10 Tipos de Incidencias** (frecuencia histórica):

| Código | Tipo | Categoría | Registros |
|--------|------|-----------|-----------|
| VAC | Vacaciones | BUENO ✅ | 2,443 (27.5%) |
| FI | Falta Injustificada | MALO ❌ | 639 (7.2%) |
| ENFE | Enfermedad | MALO ❌ | 541 (6.1%) |
| PSIN | Permiso Sin Goce | MALO ❌ | 438 (4.9%) |
| MAT3 | Maternidad (3 meses) | BUENO ✅ | 426 (4.8%) |
| PCON | Permiso Con Goce | BUENO ✅ | 274 (3.1%) |
| SUSP | Suspensión | MALO ❌ | 84 (0.9%) |
| FEST | Festividad | NEUTRO ⚪ | 54 (0.6%) |
| ACCI | Accidente | MALO ❌ | 20 (0.2%) |
| PATER | Paternidad | BUENO ✅ | 4 (0.05%) |

**Clasificación**:
- **BUENAS** (permisos autorizados): VAC, PCON, MAT3, PATER, MAT1, JUST
- **MALAS** (problemas reales): FI, SUSP, PSIN, ENFE, ACCI
- **NEUTRAS**: FEST

**Uso**: Análisis de ausentismo, cálculo de días laborados, incidencias promedio por empleado.

---

### 4. 📊 TABLA `prenomina_horizontal` - "Nómina Semanal"

**¿Qué tiene?**
Registro semanal de horas trabajadas y extras por empleado.

**Campos críticos**:
```
• numero_empleado - FK a empleados_sftp
• semana_inicio, semana_fin - Rango de la semana
• lun_fecha, mar_fecha, ... dom_fecha - Fechas específicas
• lun_horas_ord, mar_horas_ord, ... - Horas ordinarias por día
• lun_horas_te, mar_horas_te, ... - Horas extras por día
• lun_incidencia, mar_incidencia, ... - Código de incidencia por día
• total_horas_ord - Suma automática semanal (columna generada)
• total_horas_te - Suma automática de extras (columna generada)
• total_horas_semana - Total general (máx 168 horas)
```

**Datos reales** (Enero 2026):
- **374 registros** de prenómina semanal

**Uso**: Cálculo de horas ordinarias/extras, análisis de carga laboral, días laborados.

---

## 🔗 RELACIONES ENTRE TABLAS

```
empleados_sftp (TABLA CENTRAL)
       ↓
       ├─→ motivos_baja.numero_empleado = empleados_sftp.numero_empleado
       ├─→ incidencias.emp = empleados_sftp.numero_empleado
       └─→ prenomina_horizontal.numero_empleado = empleados_sftp.numero_empleado
```

La tabla `empleados_sftp` es el **centro del modelo**. Todas las demás tablas se relacionan con ella a través del número de empleado.

---

## 🧮 FÓRMULAS MAESTRAS - LOS 10 CÁLCULOS PRINCIPALES

Estos son los **10 cálculos base** del dashboard. TODO el resto son variaciones o visualizaciones de estos.

---

### 1️⃣ **ACTIVOS** 👥

**Definición**: Cuántos empleados trabajan AHORA MISMO (o en una fecha específica).

**Tabla origen**: `empleados_sftp`

**Fórmula matemática**:
```
Activos = CUENTA(empleados donde activo = TRUE en la fecha seleccionada)
```

**Algoritmo paso a paso**:
1. Ve a la tabla `empleados_sftp`
2. Por cada registro, verifica:
   - `fecha_ingreso` <= fecha_seleccionada
   - `fecha_baja` es NULL O `fecha_baja` > fecha_seleccionada
3. Cuenta cuántos registros cumplen ambas condiciones
4. Ese número es "Activos"

**Ejemplo real** (31 Octubre 2025):
```
Fecha analizada: 31 de octubre de 2025
Filtro aplicado:
  - fecha_ingreso <= 2025-10-31
  - (fecha_baja IS NULL OR fecha_baja > 2025-10-31)

Resultado: 372 empleados activos ✅
```

**Ejemplo con filtros adicionales** (Área = Empaque):
```
Fecha: 31 octubre 2025
Filtros:
  - fecha_ingreso <= 2025-10-31
  - (fecha_baja IS NULL OR fecha_baja > 2025-10-31)
  - area = 'Empaque'

Resultado: 47 empleados activos en Empaque
```

---

### 2️⃣ **DÍAS** 📅

**Definición**: Cuántos días diferentes tienen actividad registrada en incidencias.

**Tabla origen**: `incidencias`

**Fórmula matemática**:
```
Días = CUENTA_ÚNICOS(fecha en incidencias del período)
```

**Algoritmo paso a paso**:
1. Ve a la tabla `incidencias`
2. Filtra registros del período seleccionado (ej: 1-30 septiembre)
3. Extrae todas las fechas (`fecha`)
4. Elimina duplicados (cuenta solo fechas únicas)
5. Ese número es "Días"

**Ejemplo real** (Septiembre 2025):
```
Período: 1-30 septiembre 2025
Total registros: 12 incidencias
Fechas únicas encontradas: 2 días diferentes

Resultado: 2 días con actividad ✅
```

**⚠️ NOTA IMPORTANTE**: Este número puede ser bajo si solo se registran incidencias (ausencias/permisos) y no la asistencia diaria completa. Para días laborales totales del mes, usa "Días Laborados" (fórmula #10).

---

### 3️⃣ **ACTIVOS PROMEDIO** (Activos Prom) 📊

**Definición**: Promedio de empleados que trabajaron durante el período.

**Tabla origen**: `empleados_sftp`

**Fórmula matemática**:
```
Activos Promedio = (Empleados al Inicio + Empleados al Fin) ÷ 2
```

**¿Por qué promedio y no solo "activos"?**
Porque durante el mes entran y salen personas. El promedio es más justo para calcular rotación.

**Algoritmo paso a paso**:

**PASO 1: Activos al INICIO del mes**
1. Toma fecha_inicio (ej: 1 de septiembre)
2. Cuenta empleados donde:
   - `fecha_ingreso` <= 1 de septiembre
   - `fecha_baja` es NULL O `fecha_baja` > 1 de septiembre

**PASO 2: Activos al FINAL del mes**
1. Toma fecha_fin (ej: 30 de septiembre)
2. Cuenta empleados donde:
   - `fecha_ingreso` <= 30 de septiembre
   - `fecha_baja` es NULL O `fecha_baja` > 30 de septiembre

**PASO 3: Calcula el promedio**
```
Activos Promedio = (Activos Inicio + Activos Fin) ÷ 2
```

**Ejemplo real** (Septiembre 2025):
```
Empleados al 1 de septiembre: 370 activos
Empleados al 30 de septiembre: 374 activos

Cálculo: (370 + 374) ÷ 2 = 744 ÷ 2 = 372 empleados promedio ✅
```

**Ejemplo con cambios significativos** (Diciembre 2024):
```
Empleados al 1 de diciembre: 350 activos
Empleados al 31 de diciembre: 370 activos
(Hubo 25 ingresos y 5 bajas)

Cálculo: (350 + 370) ÷ 2 = 720 ÷ 2 = 360 empleados promedio
```

---

### 4️⃣ **BAJAS** ↘️

**Definición**: Cuántos empleados han terminado su relación laboral.

**Tabla origen**: `empleados_sftp`

**Fórmula matemática**:
```
TOTAL HISTÓRICO:
  Bajas Totales = CUENTA(empleados donde fecha_baja NO es NULL)

PERÍODO ESPECÍFICO:
  Bajas del Período = CUENTA(empleados donde fecha_baja está entre inicio y fin del período)
```

**Algoritmo paso a paso**:

**Para total histórico:**
1. Ve a `empleados_sftp`
2. Cuenta registros con `fecha_baja` != NULL
3. Ese número es "Bajas Totales"

**Para un período (ej: septiembre):**
1. Ve a `empleados_sftp`
2. Filtra: `fecha_baja` entre 1-sep y 30-sep
3. Cuenta cuántos hay
4. Ese número es "Bajas del Mes"

**Ejemplo real** (Total histórico):
```
Total registros en empleados_sftp: 1,051
Filtro: fecha_baja IS NOT NULL

Resultado: 676 bajas históricas desde 2001 ✅
```

**Ejemplo real** (Septiembre 2025):
```
Período: 1-30 septiembre 2025
Filtro: fecha_baja BETWEEN '2025-09-01' AND '2025-09-30'

Resultado: 8 bajas en septiembre ✅
```

**Desglose por tipo** (usando tabla `motivos_baja`):
```
Total bajas septiembre: 8
  - Voluntarias: 5 (62.5%)
  - Involuntarias: 3 (37.5%)
```

---

### 5️⃣ **ROTACIÓN MENSUAL** 🔄

**Definición**: Porcentaje de la plantilla que se fue en el mes.

**Tablas origen**: `empleados_sftp` (para bajas y activos promedio)

**Fórmula matemática**:
```
Rotación Mensual = (Bajas del Mes ÷ Activos Promedio del Mes) × 100
```

**¿Por qué se usa activos promedio y no activos finales?**
Porque el promedio refleja mejor la plantilla durante todo el mes.

**Algoritmo paso a paso**:

**PASO 1: Obtén bajas del mes**
- Ya calculadas en fórmula #4 (ej: 8 bajas)

**PASO 2: Obtén activos promedio del mes**
- Ya calculados en fórmula #3 (ej: 372 empleados)

**PASO 3: Aplica la fórmula**
```
Rotación = (Bajas ÷ Activos Prom) × 100
```

**Ejemplo real** (Septiembre 2025):
```
Bajas en septiembre: 8 personas
Activos promedio: 372 empleados

Cálculo: (8 ÷ 372) × 100 = 0.0215 × 100 = 2.15% ✅

Interpretación: De cada 100 empleados, 2 se fueron en el mes.
```

**Semáforo de interpretación**:
- 🟢 **< 3%**: EXCELENTE - Rotación muy baja
- 🟡 **3-5%**: BUENO - Rotación normal
- 🟠 **5-8%**: ALERTA - Rotación elevada
- 🔴 **> 8%**: CRÍTICO - Rotación muy alta

**Desglose voluntaria vs involuntaria**:
```
Rotación Total: 2.15%
  - Voluntaria: 1.34% (5 bajas ÷ 372)
  - Involuntaria: 0.81% (3 bajas ÷ 372)
```

---

### 6️⃣ **ROTACIÓN ACUMULADA 12 MESES MÓVILES** 📊

**Definición**: Promedio de rotación de los últimos 12 meses completos.

**Tabla origen**: `empleados_sftp`

**Fórmula matemática**:
```
Rotación 12M = (Bajas en 12 meses ÷ Activos Promedio de 12 meses) × 100
```

**¿Qué es "móvil"?**
Es una ventana de 12 meses que se va moviendo:
- Enero 2025: cuenta Feb 2024 → Ene 2025 (12 meses)
- Febrero 2025: cuenta Mar 2024 → Feb 2025 (12 meses)
- Y así sucesivamente...

**Algoritmo paso a paso**:

**PASO 1: Define tu ventana de 12 meses**
```
Fecha actual: 30 septiembre 2025
Fecha fin: 30 de septiembre 2025
Fecha inicio: 1 de octubre 2024 (12 meses atrás)
```

**PASO 2: Cuenta bajas en esos 12 meses**
1. Ve a `empleados_sftp`
2. Filtra: `fecha_baja` BETWEEN '2024-10-01' AND '2025-09-30'
3. Cuenta cuántos hay

**PASO 3: Calcula activos promedio de 12 meses**
1. Activos al inicio (1 octubre 2024): Cuenta empleados activos ese día
2. Activos al final (30 septiembre 2025): Cuenta empleados activos ese día
3. Promedio = (Activos inicio + Activos final) ÷ 2

**PASO 4: Aplica la fórmula**
```
Rotación 12M = (Bajas 12M ÷ Promedio Activos) × 100
```

**Ejemplo real** (Septiembre 2025):
```
Período: Oct 2024 - Sep 2025 (12 meses)

Bajas en 12 meses: 96 personas
Activos al 1-oct-2024: 365 empleados
Activos al 30-sep-2025: 372 empleados
Activos promedio: (365 + 372) ÷ 2 = 368.5 empleados

Cálculo: (96 ÷ 368.5) × 100 = 26.05% ✅

Interpretación: En los últimos 12 meses, el 26% de la plantilla se renovó.
```

**¿Por qué es útil?**
Elimina estacionalidad (picos de rotación en ciertos meses) y da una visión de tendencia a largo plazo.

---

### 7️⃣ **ROTACIÓN YTD** (Year To Date) 📅

**Definición**: Rotación acumulada desde el 1 de enero del año actual hasta hoy.

**Tabla origen**: `empleados_sftp`

**Fórmula matemática**:
```
Rotación YTD = (Bajas desde Enero ÷ Activos Promedio del Año) × 100
```

**¿Qué es "YTD"?**
"Year To Date" = Desde el inicio del año hasta la fecha actual.
Si estamos en octubre, cuenta desde 1-ene hasta 31-oct.

**Algoritmo paso a paso**:

**PASO 1: Define tu período**
```
Fecha actual: 31 octubre 2025
Fecha inicio: 1 de enero 2025
Fecha fin: 31 de octubre 2025
```

**PASO 2: Cuenta bajas en ese período**
1. Ve a `empleados_sftp`
2. Filtra: `fecha_baja` BETWEEN '2025-01-01' AND '2025-10-31'
3. Cuenta cuántos hay

**PASO 3: Calcula activos promedio**
1. Activos al 1-ene-2025: X empleados
2. Activos al 31-oct-2025: Y empleados
3. Promedio = (X + Y) ÷ 2

**PASO 4: Aplica la fórmula**
```
Rotación YTD = (Bajas YTD ÷ Promedio Activos) × 100
```

**Ejemplo real** (Octubre 2025):
```
Período: 1-ene-2025 a 31-oct-2025 (10 meses)

Bajas ene-oct 2025: 80 personas
Activos al 1-ene-2025: 365 empleados
Activos al 31-oct-2025: 372 empleados
Activos promedio: (365 + 372) ÷ 2 = 368.5 empleados

Cálculo: (80 ÷ 368.5) × 100 = 21.71% ✅

Interpretación: En lo que va del año 2025, el 21.7% de la plantilla se ha renovado.
```

**Proyección anual**:
```
Si llevamos 10 meses con 21.71% de rotación:
Proyección a 12 meses: 21.71 × (12 ÷ 10) = 26.05%
```

---

### 8️⃣ **INCIDENCIAS** ⚠️

**Definición**: Cuántas veces hubo problemas de asistencia (faltas, suspensiones, etc.).

**Tabla origen**: `incidencias`

**Fórmula matemática**:
```
TOTAL:
  Incidencias Totales = CUENTA(registros en incidencias del período)

SOLO MALAS:
  Incidencias Malas = CUENTA(registros donde inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI'))
```

**Algoritmo paso a paso**:

**Para TOTAL (incluyendo buenas y malas):**
1. Ve a tabla `incidencias`
2. Filtra por período (ej: septiembre 2025)
3. Cuenta TODOS los registros
4. Ese número es "Incidencias Totales"

**Para SOLO MALAS (excluir permisos autorizados):**
1. Ve a tabla `incidencias`
2. Filtra por período
3. Filtra solo códigos MALOS:
   - FI (Falta Injustificada)
   - SUSP (Suspensión)
   - PSIN (Permiso Sin Goce)
   - ENFE (Enfermedad)
   - ACCI (Accidente)
4. Cuenta cuántos hay
5. Ese número es "Incidencias Malas"

**Ejemplo real** (Septiembre 2025):
```
Período: 1-30 septiembre 2025

Total incidencias: 12 registros
  - MAT3 (Maternidad): 9 registros ✅ BUENO
  - VAC (Vacaciones): 3 registros ✅ BUENO

Incidencias MALAS: 0 registros ✅ ¡EXCELENTE!

Resultado: 0 incidencias problemáticas en todo el mes 🎉
```

**Ejemplo histórico** (Todo el tiempo):
```
Total: 8,880 incidencias históricas
  - BUENAS: 3,147 (35.4%) - VAC + PCON + MAT3 + PATER
  - MALAS: 1,722 (19.4%) - FI + SUSP + PSIN + ENFE + ACCI
  - NEUTRAS: 54 (0.6%) - FEST
```

**IMPORTANTE**: Cuando el dashboard dice "Incidencias", usualmente se refiere SOLO a las malas. Los permisos buenos se muestran por separado como "Permisos".

---

### 9️⃣ **INCIDENCIAS PROMEDIO POR EMPLEADO** (Inc prom x empleado) 👤

**Definición**: Cuántas incidencias tiene cada empleado en promedio.

**Tablas origen**: `incidencias` (para total) + `empleados_sftp` (para activos promedio)

**Fórmula matemática**:
```
Inc Prom x Empleado = Total Incidencias ÷ Activos Promedio
```

**Algoritmo paso a paso**:

**PASO 1: Obtén total de incidencias del período**
- Ya calculadas en fórmula #8 (ej: 12 incidencias)

**PASO 2: Obtén activos promedio del período**
- Ya calculados en fórmula #3 (ej: 372 empleados)

**PASO 3: Divide**
```
Inc Prom = Incidencias ÷ Activos Prom
```

**Ejemplo real** (Septiembre 2025):
```
Incidencias totales: 12
Activos promedio: 372 empleados

Cálculo: 12 ÷ 372 = 0.032 incidencias por empleado ✅

Interpretación: En promedio, cada empleado tuvo 0.032 incidencias en septiembre.
O sea: Solo 3 de cada 100 empleados tuvieron alguna incidencia.
```

**Semáforo de interpretación**:
- 🟢 **< 0.3**: EXCELENTE - Casi nadie falta
- 🟡 **0.3-0.6**: BUENO - Pocas incidencias
- 🟠 **0.6-1.0**: ALERTA - Incidencias moderadas
- 🔴 **> 1.0**: CRÍTICO - Cada empleado tiene >1 incidencia al mes

**Ejemplo con incidencias altas** (Enero 2025):
```
Incidencias malas: 150
Activos promedio: 370

Cálculo: 150 ÷ 370 = 0.41 incidencias por empleado ⚠️

Interpretación: En promedio, 41 de cada 100 empleados tuvieron al menos 1 incidencia.
```

---

### 🔟 **DÍAS LABORADOS** 📆

**Definición**: Estimación de días trabajados totales en el período.

**Tablas origen**: `empleados_sftp` (activos) + cálculo de días laborables

**Fórmula matemática**:
```
Días Laborados = Activos Promedio × Días Laborables del Período
```

**¿Cómo se calculan días laborables?**
Se cuentan solo de lunes a sábado (6 días a la semana).

**Algoritmo paso a paso**:

**PASO 1: Cuenta días laborables del período**
1. Toma fecha inicio y fecha fin (ej: 1-30 sept)
2. Recorre cada día del período
3. Si el día es lunes (1), martes (2), ... sábado (6) → cuenta++
4. Si el día es domingo (0) → NO lo cuentes
5. Total = días laborables

**PASO 2: Multiplica por activos promedio**
```
Días Laborados = Activos Prom × Días Laborables
```

**Ejemplo real** (Septiembre 2025):
```
Período: 1-30 septiembre 2025 (30 días naturales)

Días laborables (lun-sáb): 26 días
Activos promedio: 372 empleados

Cálculo: 372 × 26 = 9,672 días laborados ✅

Interpretación: Entre todos los empleados, se trabajaron 9,672 días en septiembre.
```

**Fórmula alternativa simplificada** (menos precisa):
```
Si trabajas 6 días a la semana:
Días Laborados ≈ (Activos ÷ 7) × 6 × Días del Mes ÷ 30
```

**Uso**: Este número se usa para calcular % de incidencias:
```
% Incidencias = (Incidencias ÷ Días Laborados) × 100
```

Ejemplo:
```
Incidencias: 12
Días laborados: 9,672

% Incidencias = (12 ÷ 9,672) × 100 = 0.12% ✅
```

---

## 📊 TAB 1: RESUMEN - VISTA GENERAL COMPARATIVA

Este tab te permite **comparar** diferentes áreas, departamentos y períodos.

### 🔢 LAS 6 TARJETAS PRINCIPALES (KPI Cards)

#### 1. **Empleados Activos** 👥

**Qué muestra**: Cantidad de empleados activos al final del período seleccionado.

**Cálculo**:
- Usa fórmula #1 (ACTIVOS)
- Evalúa al último día del período

**Comparación vs mes anterior**:
```
Variación = Activos_Actual - Activos_Anterior
% Variación = (Variación ÷ Activos_Anterior) × 100
```

**Ejemplo real** (Septiembre 2025):
```
Activos al 30-sep-2025: 372 empleados
Activos al 31-ago-2025: 370 empleados

Variación: 372 - 370 = +2 empleados
% Variación: (2 ÷ 370) × 100 = +0.54% 🟢

Tarjeta muestra: "372" con chip "+2 (+0.54%)"
```

---

#### 2. **Rotación Mensual** 📉

**Qué muestra**: Porcentaje de rotación del mes actual.

**Cálculo**:
- Usa fórmula #5 (ROTACIÓN MENSUAL)

**Comparación vs mes anterior**:
```
Variación = Rotación_Actual - Rotación_Anterior
```

**Ejemplo real** (Septiembre 2025):
```
Rotación septiembre: 2.15%
Rotación agosto: 2.65%

Variación: 2.15 - 2.65 = -0.50 puntos porcentuales 🟢 MEJORÓ

Tarjeta muestra: "2.15%" con chip "-0.50pp"
```

**Semáforo**:
- 🟢 Verde: < 3% (excelente)
- 🟡 Amarillo: 3-5% (normal)
- 🔴 Rojo: > 5% (alto)

---

#### 3. **Rotación YTD** 📅

**Qué muestra**: Rotación acumulada desde enero hasta el mes actual.

**Cálculo**:
- Usa fórmula #7 (ROTACIÓN YTD)

**Ejemplo real** (Octubre 2025):
```
Período: 1-ene a 31-oct (10 meses)
Bajas: 80 personas
Activos prom: 368.5

Rotación YTD: (80 ÷ 368.5) × 100 = 21.71%

Tarjeta muestra: "21.71%"
```

---

#### 4. **Incidencias** ⚠️

**Qué muestra**: Total de incidencias MALAS del mes.

**Cálculo**:
- Usa fórmula #8 (INCIDENCIAS)
- Filtra solo códigos malos: FI, SUSP, PSIN, ENFE, ACCI

**Comparación vs mes anterior**:
```
Variación = Incidencias_Actual - Incidencias_Anterior
% Variación = (Variación ÷ Incidencias_Anterior) × 100
```

**Ejemplo real** (Septiembre 2025):
```
Incidencias malas septiembre: 0
Incidencias malas agosto: 5

Variación: 0 - 5 = -5 incidencias (-100%) 🟢 EXCELENTE

Tarjeta muestra: "0" con chip "-5 (-100%)"
```

---

#### 5. **Permisos** 📝

**Qué muestra**: Total de permisos AUTORIZADOS del mes (secundario de Incidencias).

**Cálculo**:
```
Permisos = CUENTA(incidencias donde inci IN ('VAC', 'PCON', 'MAT3', 'PATER', 'MAT1', 'JUST'))
```

**Ejemplo real** (Septiembre 2025):
```
Total permisos: 12
  - MAT3: 9 registros
  - VAC: 3 registros

Tarjeta muestra: "12 permisos"
```

---

#### 6. **Días** 📅

**Qué muestra**: Días con actividad registrada en incidencias.

**Cálculo**:
- Usa fórmula #2 (DÍAS)

**Ejemplo real** (Septiembre 2025):
```
Registros de incidencias: 12
Fechas únicas: 2 días

Tarjeta muestra: "2 días"
```

---

### 📊 LAS 4 GRÁFICAS PRINCIPALES

#### Gráfica 1: **Barras de Antigüedad** 📊

**Tipo**: Barras horizontales apiladas

**Qué muestra**: Distribución de empleados por rangos de antigüedad.

**Cálculo detallado**:

**PASO 1: Por cada empleado activo**
```
Antigüedad (meses) = (Fecha_Actual - fecha_ingreso) ÷ 30.44
```

**PASO 2: Clasifica en rangos**
```
Rango 1: < 1 año (0-11 meses)
Rango 2: 1-3 años (12-35 meses)
Rango 3: 3-5 años (36-59 meses)
Rango 4: 5-10 años (60-119 meses)
Rango 5: > 10 años (120+ meses)
```

**PASO 3: Cuenta empleados en cada rango**

**PASO 4: Dibuja barras proporcionales**

**Ejemplo visual real** (Octubre 2025):
```
< 1 año:    ████████ 120 empleados (32.3%) - ROJO
1-3 años:   ██████ 90 empleados (24.2%) - NARANJA
3-5 años:   ████ 60 empleados (16.1%) - AMARILLO
5-10 años:  ███ 45 empleados (12.1%) - VERDE
> 10 años:  ██ 57 empleados (15.3%) - AZUL

Total: 372 empleados activos
```

**Interpretación**:
- Alta proporción en < 1 año → Posible problema de rotación temprana
- Distribución equilibrada → Buena estabilidad
- Muchos > 10 años → Experiencia acumulada

---

#### Gráfica 2: **Líneas de Rotación Voluntaria vs Involuntaria** 📈

**Tipo**: Líneas duales (2 series)

**Qué muestra**: Tendencia mensual de rotación voluntaria vs involuntaria.

**Cálculo detallado**:

**Por cada mes del año (enero a diciembre):**

**PASO 1: Cuenta bajas voluntarias**
```sql
Bajas_Vol_Mes = CUENTA(
  motivos_baja
  WHERE MONTH(fecha_baja) = mes
    AND isMotivoClave(motivo) = FALSE
)
```

**PASO 2: Cuenta bajas involuntarias**
```sql
Bajas_Inv_Mes = CUENTA(
  motivos_baja
  WHERE MONTH(fecha_baja) = mes
    AND isMotivoClave(motivo) = TRUE
)
```

**PASO 3: Calcula rotación de cada tipo**
```
Rot_Vol = (Bajas_Vol_Mes ÷ Activos_Prom_Mes) × 100
Rot_Inv = (Bajas_Inv_Mes ÷ Activos_Prom_Mes) × 100
```

**PASO 4: Dibuja 2 líneas**
- 🟢 Verde: Rotación voluntaria
- 🔴 Roja: Rotación involuntaria

**Ejemplo real** (Septiembre 2025):
```
Bajas voluntarias: 5 personas
Bajas involuntarias: 3 personas
Activos promedio: 372

Rotación voluntaria: (5 ÷ 372) × 100 = 1.34%
Rotación involuntaria: (3 ÷ 372) × 100 = 0.81%
```

**Datos para gráfica de todo 2025** (ejemplo):
```
Mes    | Vol   | Inv
Ene    | 2.1%  | 1.1%
Feb    | 1.8%  | 1.0%
Mar    | 2.3%  | 1.2%
...
Sep    | 1.3%  | 0.8%
```

---

#### Gráfica 3: **Líneas de Rotación Acumulada 12 Meses** 📊

**Tipo**: Líneas comparativas (año actual vs año anterior)

**Qué muestra**: Compara rotación móvil 12M de este año vs mismo período año pasado.

**Cálculo detallado**:

**Por cada mes (enero a diciembre):**

**PASO 1: Línea AZUL (Año anterior - 2024)**
Para enero 2024:
```
Período: Feb 2023 - Ene 2024 (12 meses)
Bajas 12M: Cuenta bajas en ese período
Activos prom: (Activos feb-2023 + Activos ene-2024) ÷ 2
Rotación 12M = (Bajas 12M ÷ Activos prom) × 100
```

**PASO 2: Línea ROJA (Año actual - 2025)**
Para enero 2025:
```
Período: Feb 2024 - Ene 2025 (12 meses)
Bajas 12M: Cuenta bajas en ese período
Activos prom: (Activos feb-2024 + Activos ene-2025) ÷ 2
Rotación 12M = (Bajas 12M ÷ Activos prom) × 100
```

**PASO 3: Repite para todos los meses**

**Ejemplo visual real**:
```
       Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep
2024:  25%  26%  24%  23%  25%  27%  26%  28%  27%  (azul)
2025:  24%  23%  22%  21%  20%  22%  23%  24%  26%  (rojo)

Tendencia 2025: MEJORANDO (línea roja por debajo de azul) ✅
```

**Interpretación**:
- Línea roja < azul → Rotación está mejorando vs año pasado
- Línea roja > azul → Rotación está empeorando
- Diferencia grande → Cambio significativo en retención

---

#### Gráfica 4: **Líneas de Rotación YTD** 📈

**Tipo**: Línea acumulativa

**Qué muestra**: Rotación acumulada desde enero hasta cada mes.

**Cálculo detallado**:

**Por cada mes del año:**

**Para Enero:**
```
Período: 1-ene a 31-ene (solo enero)
Bajas: Cuenta bajas de enero
Activos prom: (Activos 1-ene + Activos 31-ene) ÷ 2
Rotación YTD Ene = (Bajas ÷ Activos prom) × 100
```

**Para Febrero:**
```
Período: 1-ene a 28-feb (enero + febrero)
Bajas: Cuenta bajas de ene + feb
Activos prom: (Activos 1-ene + Activos 28-feb) ÷ 2
Rotación YTD Feb = (Bajas ÷ Activos prom) × 100
```

**Para Septiembre:**
```
Período: 1-ene a 30-sep (9 meses)
Bajas: Cuenta bajas de ene a sep
Activos prom: (Activos 1-ene + Activos 30-sep) ÷ 2
Rotación YTD Sep = (Bajas ÷ Activos prom) × 100
```

**Ejemplo real** (2025):
```
Mes    | Bajas | Act.Prom | Rot YTD
Ene    | 5     | 370      | 1.35%
Feb    | 13    | 371      | 3.50%
Mar    | 22    | 369      | 5.96%
Abr    | 30    | 368      | 8.15%
May    | 38    | 367      | 10.35%
Jun    | 48    | 368      | 13.04%
Jul    | 58    | 369      | 15.72%
Ago    | 68    | 368      | 18.48%
Sep    | 80    | 368.5    | 21.71% ✅
```

**Característica clave**: Esta línea SIEMPRE SUBE (es acumulativa), nunca baja.

---

### 📋 TABLA DE AUSENTISMO

**Qué muestra**: Desglose de incidencias por área/departamento.

**Cálculo detallado**:

**PASO 1: Obtén todas las incidencias del período**
```sql
SELECT * FROM incidencias WHERE fecha BETWEEN inicio AND fin
```

**PASO 2: Por cada incidencia, busca su área**
```sql
JOIN empleados_sftp ON incidencias.emp = empleados_sftp.numero_empleado
```

**PASO 3: Agrupa por área**
```sql
GROUP BY empleados_sftp.area
```

**PASO 4: Cuenta por categoría**
```
Por cada área:
  Total = CUENTA(todas las incidencias)
  Permisos = CUENTA(inci IN ('VAC', 'PCON', 'MAT3', 'PATER'))
  Faltas = CUENTA(inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI'))
  Otros = CUENTA(inci = 'FEST')
```

**Ejemplo real** (Septiembre 2025):
```
Área      | Total | Permisos | Faltas | Otros
Empaque   | 9     | 9        | 0      | 0
Surtido   | 3     | 3        | 0      | 0
Calidad   | 0     | 0        | 0      | 0
Supermoto | 0     | 0        | 0      | 0
Recibo    | 0     | 0        | 0      | 0

TOTAL     | 12    | 12       | 0      | 0
```

**Interpretación**:
- Empaque tiene más incidencias (pero son permisos autorizados) ✅
- Cero faltas en todas las áreas 🎉

---

## ⚠️ TAB 2: INCIDENCIAS - ANÁLISIS DE ASISTENCIA

Este tab analiza problemas de asistencia y ausentismo.

### 🔢 LAS 4 TARJETAS PRINCIPALES

#### 1. **# de Activos** 👥

**Qué muestra**: Empleados activos en el período.

**Cálculo**: Fórmula #1 (ACTIVOS)

**Ejemplo**: 372 empleados

---

#### 2. **Empleados con Incidencias** ⚠️

**Qué muestra**: Cuántos empleados diferentes han tenido al menos 1 incidencia.

**Cálculo detallado**:
```sql
SELECT COUNT(DISTINCT emp)
FROM incidencias
WHERE fecha BETWEEN inicio AND fin
```

**Ejemplo real** (Septiembre 2025):
```
Total incidencias: 12 registros
Empleados únicos: 2 personas diferentes

- 1 empleada con MAT3 (9 registros)
- 1 empleado con VAC (3 registros)

Tarjeta muestra: "2 empleados"
```

**Ejemplo histórico** (Todo el tiempo):
```
Total: 8,880 incidencias
Empleados únicos: 405 personas (de 1,051 totales = 38.5%)

Por tipo:
- VAC: 264 empleados (25.1%)
- FI: 155 empleados (14.8%)
- PSIN: 107 empleados (10.2%)
```

---

#### 3. **Total Incidencias** 📊

**Qué muestra**: Incidencias MALAS del período.

**Cálculo**: Fórmula #8 filtrando solo malas

**Ejemplo real** (Septiembre 2025):
```
Filtro: inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI')

Resultado: 0 incidencias malas ✅

Tarjeta muestra: "0"
```

---

#### 4. **Total Permisos** ✅

**Qué muestra**: Permisos AUTORIZADOS del período.

**Cálculo**:
```
Permisos = CUENTA(inci IN ('VAC', 'PCON', 'MAT3', 'PATER', 'MAT1', 'JUST'))
```

**Ejemplo real** (Septiembre 2025):
```
Total: 12 permisos
  - MAT3: 9 (75%)
  - VAC: 3 (25%)

Tarjeta muestra: "12 permisos"
```

---

### 📊 LAS 4 GRÁFICAS DE INCIDENCIAS

#### Gráfica 1: **Tendencia Mensual (Líneas Duales)** 📈

**Tipo**: 2 líneas (incidencias vs permisos)

**Qué muestra**: Evolución mes a mes de problemas vs permisos.

**Cálculo detallado**:

**Por cada mes del año:**

**PASO 1: Cuenta incidencias malas**
```
Incid_Malas_Mes = CUENTA(
  incidencias
  WHERE MONTH(fecha) = mes
    AND inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI')
)
```

**PASO 2: Cuenta permisos buenos**
```
Permisos_Mes = CUENTA(
  incidencias
  WHERE MONTH(fecha) = mes
    AND inci IN ('VAC', 'PCON', 'MAT3', 'PATER')
)
```

**PASO 3: Dibuja 2 líneas**
- 🔴 Roja: Incidencias malas
- 🟢 Verde: Permisos autorizados

**Ejemplo visual** (2025):
```
       Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep
Incid: 145  138  142  150  148  155  160  152  0   (rojo)
Perm:  125  122  120  118  122  125  128  130  12  (verde)
```

**Interpretación**:
- Septiembre tuvo CERO incidencias malas (línea roja en 0) ✅
- Solo hubo permisos autorizados (verde) 🎉

---

#### Gráfica 2: **Histograma de Frecuencia** 📊

**Tipo**: Barras verticales

**Qué muestra**: Distribución de empleados según cuántas incidencias tienen.

**Cálculo detallado**:

**PASO 1: Por cada empleado, cuenta sus incidencias**
```sql
SELECT emp, COUNT(*) as cantidad_incidencias
FROM incidencias
WHERE fecha BETWEEN inicio AND fin
  AND inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI')
GROUP BY emp
```

**PASO 2: Agrupa empleados en rangos**
```
Rango 1: 0 incidencias
Rango 2: 1 incidencia
Rango 3: 2-3 incidencias
Rango 4: 4-5 incidencias
Rango 5: 6+ incidencias
```

**PASO 3: Cuenta empleados en cada rango**

**Ejemplo real** (Septiembre 2025):
```
0 incidencias:   ████████████ 372 empleados (100%) ✅
1 incidencia:    0
2-3 incidencias: 0
4-5 incidencias: 0
6+ incidencias:  0

¡TODOS los empleados tuvieron cero incidencias malas! 🎉
```

**Ejemplo histórico** (Todo el tiempo):
```
0 incidencias:   ████████████ 646 empleados (61.5%)
1 incidencia:    ████ 85 empleados (8.1%)
2-3 incidencias: ██ 40 empleados (3.8%)
4-5 incidencias: █ 20 empleados (1.9%)
6+ incidencias:  █ 10 empleados (0.95%)
```

---

#### Gráfica 3: **Tabla por Tipo de Incidencia** 📋

**Qué muestra**: Desglose detallado de cada tipo con empleados únicos.

**Cálculo detallado**:

**Por cada tipo de incidencia:**

**PASO 1: Cuenta registros totales**
```sql
SELECT inci, COUNT(*) as total_registros
FROM incidencias
WHERE fecha BETWEEN inicio AND fin
GROUP BY inci
ORDER BY total_registros DESC
```

**PASO 2: Cuenta empleados únicos**
```sql
SELECT inci, COUNT(DISTINCT emp) as empleados_unicos
FROM incidencias
WHERE fecha BETWEEN inicio AND fin
GROUP BY inci
```

**PASO 3: Calcula porcentaje**
```
% = (Registros del tipo ÷ Total registros) × 100
```

**Ejemplo real** (Septiembre 2025):
```
Tipo  | Registros | Empleados | % Total | Categoría
MAT3  | 9         | 1         | 75%     | BUENO ✅
VAC   | 3         | 1         | 25%     | BUENO ✅
FI    | 0         | 0         | 0%      | MALO
SUSP  | 0         | 0         | 0%      | MALO
PSIN  | 0         | 0         | 0%      | MALO
ENFE  | 0         | 0         | 0%      | MALO

TOTAL | 12        | 2         | 100%
```

**Ejemplo histórico** (Todo el tiempo):
```
Tipo  | Registros | Empleados | %
VAC   | 2,443     | 264       | 27.5%
FI    | 639       | 155       | 7.2%
ENFE  | 541       | 37        | 6.1%
PSIN  | 438       | 107       | 4.9%
MAT3  | 426       | 6         | 4.8%
```

---

#### Gráfica 4: **Gráfica de Pastel (Proporción)** 🥧

**Tipo**: Círculo dividido en sectores

**Qué muestra**: Proporción visual de incidencias vs permisos.

**Cálculo detallado**:

**PASO 1: Cuenta incidencias malas**
```
Malas = CUENTA(inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI'))
```

**PASO 2: Cuenta permisos buenos**
```
Buenos = CUENTA(inci IN ('VAC', 'PCON', 'MAT3', 'PATER'))
```

**PASO 3: Calcula porcentajes**
```
Total = Malas + Buenos
% Malas = (Malas ÷ Total) × 100
% Buenos = (Buenos ÷ Total) × 100
```

**PASO 4: Dibuja círculo dividido**

**Ejemplo real** (Septiembre 2025):
```
Total: 12 registros

Incidencias malas: 0 → 0%
Permisos buenos: 12 → 100%

Círculo: 🟢 100% verde (todo permisos, cero problemas) ✅
```

**Ejemplo histórico** (Todo el tiempo):
```
Total: 8,880 registros

Incidencias malas: 1,722 → 19.4% 🔴
Permisos buenos: 3,147 → 35.4% 🟢
Neutros (FEST): 54 → 0.6% ⚪
Otros: resto

Círculo dividido:
- 🟢 Verde: 35% (permisos)
- 🔴 Rojo: 19% (problemas)
- ⚪ Blanco: 46% (otros + vacaciones históricas)
```

---

### 📋 TABLA COMPLETA DE INCIDENCIAS

**Qué muestra**: Listado detallado de TODAS las incidencias con información del empleado.

**Cálculo detallado**:

**PASO 1: Obtén incidencias del período**
```sql
SELECT * FROM incidencias
WHERE fecha BETWEEN inicio AND fin
```

**PASO 2: Relaciona con empleado**
```sql
SELECT
  i.fecha,
  i.inci,
  i.incidencia,
  e.numero_empleado,
  e.nombre_completo,
  e.empresa,
  e.departamento,
  e.area,
  e.puesto,
  e.clasificacion
FROM incidencias i
INNER JOIN empleados_sftp e ON i.emp = e.numero_empleado
WHERE i.fecha BETWEEN inicio AND fin
ORDER BY i.fecha DESC
```

**Columnas de la tabla**:
1. Fecha de la incidencia
2. Código (FI, VAC, MAT3, etc.)
3. Descripción completa
4. Número de empleado
5. Nombre completo
6. Empresa/Negocio
7. Departamento
8. Área
9. Puesto
10. Clasificación
11. Turno (opcional)
12. Horario (opcional)

**Ejemplo real** (Septiembre 2025):
```
Fecha       | Código | #Emp  | Nombre          | Área    | Puesto
2025-09-05  | MAT3   | 10234 | María González  | Empaque | Operadora
2025-09-06  | MAT3   | 10234 | María González  | Empaque | Operadora
...
2025-09-12  | VAC    | 10456 | Juan Pérez      | Surtido | Almacenista
2025-09-13  | VAC    | 10456 | Juan Pérez      | Surtido | Almacenista
...

Total: 12 registros (todos permisos autorizados) ✅
```

**Funciones de la tabla**:
- ✅ Ordenar por cualquier columna
- ✅ Filtrar por tipo de incidencia
- ✅ Buscar por nombre de empleado
- ✅ Exportar a Excel/CSV

---

## 🔄 TAB 3: RETENCIÓN - ANÁLISIS DE ROTACIÓN

Este tab analiza por qué la gente se va y cómo retenerla.

### 🔢 LAS 5 TARJETAS PRINCIPALES

#### 1. **Activos Promedio** 👥

**Qué muestra**: Promedio de empleados del período.

**Cálculo**: Fórmula #3 (ACTIVOS PROMEDIO)

**Ejemplo**: 372 empleados

---

#### 2. **Bajas** ↘️

**Principal**: Total de bajas en el período
**Secundario**: Cuántas fueron voluntarias

**Cálculo del secundario**:
```
Bajas_Vol = CUENTA(
  motivos_baja
  WHERE fecha_baja BETWEEN inicio AND fin
    AND isMotivoClave(motivo) = FALSE
)
```

**Ejemplo real** (Septiembre 2025):
```
Total bajas: 8 personas
  - Voluntarias: 5 (62.5%)
  - Involuntarias: 3 (37.5%)

Tarjeta muestra: "8" con chip "5 voluntarias"
```

---

#### 3. **Rotación Mensual** 📉

**Principal**: % de rotación total
**Secundario**: % de rotación voluntaria

**Cálculo del secundario**:
```
Rot_Vol = (Bajas_Vol ÷ Activos_Prom) × 100
```

**Ejemplo real** (Septiembre 2025):
```
Rotación total: 2.15%
  - Voluntaria: 1.34% (5 bajas ÷ 372)
  - Involuntaria: 0.81% (3 bajas ÷ 372)

Tarjeta muestra: "2.15%" con chip "1.34% vol"
```

---

#### 4. **Rotación 12 Meses Móviles** 📊

**Qué muestra**: Rotación de los últimos 12 meses.

**Cálculo**: Fórmula #6 (ROTACIÓN 12M)

**Ejemplo**: 26.05%

---

#### 5. **Rotación YTD** 📅

**Qué muestra**: Rotación acumulada del año.

**Cálculo**: Fórmula #7 (ROTACIÓN YTD)

**Ejemplo**: 21.71%

---

### 📊 LAS 3 GRÁFICAS ESPECIALIZADAS

#### Gráfica 1: **Rotación Acumulada 12M (Líneas Comparativas)** 📈

**Qué muestra**: Compara rotación móvil este año vs año pasado.

**Cálculo**: (Ya explicado en Tab 1, Gráfica 3)

**Ejemplo visual**:
```
       Ene  Feb  Mar  Abr  May  Jun
2024:  25%  26%  24%  23%  25%  27%  (azul)
2025:  24%  23%  22%  21%  20%  22%  (rojo)

Tendencia: 🟢 MEJORANDO (roja por debajo de azul)
```

---

#### Gráfica 2: **Rotación Mensual con 2 Escalas (Triple Línea)** 📊

**Tipo**: 3 líneas con 2 ejes Y diferentes

**Qué muestra**: Relación entre rotación %, bajas absolutas y activos.

**Cálculo detallado**:

**Por cada mes:**

**PASO 1: Calcula rotación (eje Y izquierdo)**
```
Rotación_Mes = (Bajas_Mes ÷ Activos_Prom_Mes) × 100
```

**PASO 2: Cuenta bajas (eje Y derecho)**
```
Bajas_Mes = CUENTA(empleados con fecha_baja en el mes)
```

**PASO 3: Cuenta activos (eje Y derecho)**
```
Activos_Mes = Activos promedio del mes
```

**PASO 4: Dibuja 3 líneas**
- 🔴 Roja: % Rotación (eje izq, escala 0-10%)
- 🟠 Naranja: # Bajas (eje der, escala 0-30 personas)
- 🟢 Verde: # Activos (eje der, escala 350-380 personas)

**Ejemplo visual** (2025):
```
       Ene  Feb  Mar  Abr  May  Jun
Rot %: 3.2% 2.8% 4.1% 3.5% 2.9% 3.3%  (eje izq, rojo)
Bajas: 12   10   15   13   11   12    (eje der, naranja)
Activ: 375  357  366  371  379  364   (eje der, verde)
```

**Interpretación**:
- Si bajas suben pero rotación baja → La plantilla está creciendo
- Si bajas bajan pero rotación sube → La plantilla está encogiendo
- Si ambas suben → Problema de retención

---

#### Gráfica 3: **Barras de Rotación por Temporalidad** 📊

**Tipo**: Barras apiladas horizontales

**Qué muestra**: Cuánto tiempo trabajaron las personas antes de irse.

**Cálculo detallado**:

**Por cada baja histórica:**

**PASO 1: Calcula meses trabajados**
```
Meses_Trabajados = (fecha_baja - fecha_ingreso) ÷ 30.44
```

**PASO 2: Clasifica en rangos**
```
Rango 1: < 3 meses (0-89 días) - ROTACIÓN TEMPRANA 🔴
Rango 2: 3-6 meses (90-179 días) - ROTACIÓN MEDIA 🟠
Rango 3: 6-12 meses (180-364 días) - ROTACIÓN NORMAL 🟡
Rango 4: > 12 meses (365+ días) - ROTACIÓN TARDÍA 🟢
```

**PASO 3: Cuenta bajas en cada rango**

**PASO 4: Calcula porcentajes**
```
% = (Bajas del rango ÷ Total bajas) × 100
```

**PASO 5: Dibuja barras apiladas**

**Ejemplo real** (Histórico completo):
```
< 3 meses:    [🔴🔴🔴🔴🔴🔴🔴🔴] 120 bajas (17.8%) ⚠️ PROBLEMA
3-6 meses:    [🟠🟠🟠🟠] 60 bajas (8.9%)
6-12 meses:   [🟡🟡🟡] 45 bajas (6.7%)
> 12 meses:   [🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 451 bajas (66.7%) ✅

Total: 676 bajas históricas
```

**Interpretación**:
- 🔴 Alto % en < 3 meses → Problema de onboarding/selección
- 🟢 Alto % en > 12 meses → Rotación normal y saludable
- 🟠🟡 Distribución equilibrada → Sistema estable

**Ejemplo con problema de rotación temprana**:
```
< 3 meses:    [🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴] 250 bajas (40%) 🚨 CRÍTICO
3-6 meses:    [🟠🟠🟠] 80 bajas (13%)
6-12 meses:   [🟡🟡] 50 bajas (8%)
> 12 meses:   [🟢🟢🟢🟢🟢🟢] 220 bajas (37%)

Diagnóstico: 40% se va antes de los 3 meses → Revisar proceso de selección e inducción
```

---

### 📋 LAS 2 TABLAS COMPARATIVAS

#### Tabla 1: **Rotación Acumulada Mes a Mes** 📊

**Qué muestra**: Comparación de rotación 12M móviles entre años.

**Cálculo detallado**:

**Por cada mes (enero a diciembre):**

**PASO 1: Calcula rotación 12M para año actual**
```
Rot_12M_2025 = (Bajas últimos 12M desde el mes ÷ Activos Prom 12M) × 100
```

**PASO 2: Calcula rotación 12M para año anterior**
```
Rot_12M_2024 = (Bajas últimos 12M desde el mes 2024 ÷ Activos Prom 12M) × 100
```

**PASO 3: Calcula variación**
```
Variación = Rot_2025 - Rot_2024
```

**PASO 4: Aplica colores**
- 🟢 Verde si Variación < 0 (mejoró)
- 🔴 Rojo si Variación > 0 (empeoró)

**Ejemplo visual** (2025 vs 2024):
```
Mes    | 2024  | 2025  | Var    | Estado
Ene    | 25.0% | 24.0% | -1.0%  | 🟢 Mejoró
Feb    | 26.0% | 23.0% | -3.0%  | 🟢 Mejoró
Mar    | 24.0% | 22.0% | -2.0%  | 🟢 Mejoró
Abr    | 23.0% | 21.0% | -2.0%  | 🟢 Mejoró
May    | 25.0% | 20.0% | -5.0%  | 🟢 Mejoró ✅
Jun    | 27.0% | 22.0% | -5.0%  | 🟢 Mejoró
Jul    | 26.0% | 23.0% | -3.0%  | 🟢 Mejoró
Ago    | 28.0% | 24.0% | -4.0%  | 🟢 Mejoró
Sep    | 27.0% | 26.0% | -1.0%  | 🟢 Mejoró
```

**Interpretación**:
- Todas las variaciones en verde → Mejora sostenida ✅
- Variación más grande en mayo (-5.0%) → Mes con mayor mejora

---

#### Tabla 2: **Rotación Mensual Mes a Mes** 📊

**Qué muestra**: Comparación de rotación mensual entre años.

**Cálculo detallado**:

**Por cada mes:**

**PASO 1: Calcula rotación mensual año actual**
```
Rot_Mes_2025 = (Bajas del mes 2025 ÷ Activos Prom mes 2025) × 100
```

**PASO 2: Calcula rotación mensual año anterior**
```
Rot_Mes_2024 = (Bajas del mes 2024 ÷ Activos Prom mes 2024) × 100
```

**PASO 3: Calcula variación**
```
Variación = Rot_2025 - Rot_2024
```

**Ejemplo visual** (2025 vs 2024):
```
Mes    | 2024  | 2025  | Var    | Estado
Ene    | 3.5%  | 3.2%  | -0.3%  | 🟢 Mejoró
Feb    | 3.0%  | 2.8%  | -0.2%  | 🟢 Mejoró
Mar    | 4.5%  | 4.1%  | -0.4%  | 🟢 Mejoró
Abr    | 3.8%  | 3.5%  | -0.3%  | 🟢 Mejoró
May    | 3.2%  | 2.9%  | -0.3%  | 🟢 Mejoró
Jun    | 4.0%  | 3.3%  | -0.7%  | 🟢 Mejoró ✅
Jul    | 3.5%  | 3.1%  | -0.4%  | 🟢 Mejoró
Ago    | 3.2%  | 2.8%  | -0.4%  | 🟢 Mejoró
Sep    | 2.7%  | 2.2%  | -0.5%  | 🟢 Mejoró
```

**Diferencia vs Tabla 1**:
- Tabla 1 (Acumulada 12M): Muestra tendencias de largo plazo
- Tabla 2 (Mensual): Muestra variaciones mes a mes específicas

---

### 🔥 MAPA DE CALOR DE MOTIVOS (Heatmap)

**Qué muestra**: Intensidad de cada motivo de baja por mes del año.

**Cálculo detallado**:

**PASO 1: Obtén todos los motivos**
```sql
SELECT DISTINCT motivo FROM motivos_baja
ORDER BY motivo
```

**PASO 2: Por cada combinación (motivo × mes), cuenta bajas**
```sql
SELECT
  motivo,
  MONTH(fecha_baja) as mes,
  COUNT(*) as cantidad
FROM motivos_baja
WHERE YEAR(fecha_baja) = año_seleccionado
GROUP BY motivo, MONTH(fecha_baja)
```

**PASO 3: Crea matriz de conteo**
```
              Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic
Renuncia      5   3   4   2   6   3   7   5   1   4   3   2
Abandono      2   4   3   1   2   4   3   2   0   1   2   1
Término       1   1   2   3   2   1   0   2   1   3   2   1
Otro trabajo  0   1   0   1   1   0   2   1   0   1   0   1
...
```

**PASO 4: Encuentra el máximo**
```
Max_Valor = 7 (Renuncia en julio)
```

**PASO 5: Asigna intensidades de color**
```
Escala de colores (ej: blanco → naranja → rojo):
- 0 bajas:     ⬜ Blanco
- 1-2 bajas:   🟨 Amarillo claro
- 3-4 bajas:   🟧 Naranja claro
- 5-6 bajas:   🟠 Naranja
- 7+ bajas:    🔴 Rojo
```

**PASO 6: Dibuja matriz coloreada**

**Ejemplo visual real** (2025):
```
Motivo                | E | F | M | A | M | J | J | A | S | O | N | D
Baja Voluntaria       | 🟠| 🟧| 🟠| 🟨| 🟧| 🟠| 🔴| 🟠| 🟨| 🟧| 🟧| 🟨
Abandono              | 🟨| 🟧| 🟨| 🟨| ⬜| 🟧| 🟧| 🟨| ⬜| 🟨| 🟨| 🟨
Término contrato      | ⬜| ⬜| 🟨| 🟨| 🟧| 🟨| ⬜| 🟧| 🟨| 🟧| 🟨| ⬜
Otro trabajo mejor    | ⬜| 🟨| ⬜| 🟨| 🟨| ⬜| 🟨| 🟨| ⬜| 🟨| ⬜| 🟨
Regreso escuela       | 🟨| ⬜| ⬜| ⬜| 🟨| 🟨| ⬜| 🟨| ⬜| ⬜| ⬜| ⬜

Leyenda:
⬜ = 0 bajas
🟨 = 1-2 bajas
🟧 = 3-4 bajas
🟠 = 5-6 bajas
🔴 = 7+ bajas
```

**Interpretación**:
- Julio tiene el cuadro más rojo → Mes con más bajas voluntarias
- "Abandono" es constante todo el año → Problema estructural
- "Regreso escuela" solo picos en may-ago → Patrón estacional (fin de ciclo)
- Columnas vacías (E, M, A, O, D) → Meses sin ese tipo de baja

**Uso práctico**:
1. Identifica patrones estacionales (ej: renuncias en julio pre-vacaciones)
2. Detecta motivos recurrentes (cuadros naranjas/rojos todo el año)
3. Planea intervenciones (ej: bonos de retención en meses críticos)

---

### 📊 TABLA DE MOTIVOS (Top Causas)

**Qué muestra**: Ranking de motivos de baja con frecuencia.

**Cálculo detallado**:

**PASO 1: Agrupa y cuenta por motivo**
```sql
SELECT
  motivo,
  COUNT(*) as cantidad,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM motivos_baja) as porcentaje
FROM motivos_baja
GROUP BY motivo
ORDER BY cantidad DESC
LIMIT 15
```

**PASO 2: Calcula porcentaje acumulado**
```
% Acumulado = SUMA(% de este motivo + todos los anteriores)
```

**Ejemplo real** (Histórico completo):
```
#  | Motivo                        | Cantidad | %     | % Acum
1  | Baja Voluntaria               | 421      | 62.3% | 62.3%
2  | Otra razón                    | 67       | 9.9%  | 72.2%
3  | Abandono / No regresó         | 46       | 6.8%  | 79.0%
4  | Término del contrato          | 36       | 5.3%  | 84.3%
5  | Regreso a la escuela          | 15       | 2.2%  | 86.5%
6  | Rescisión por desempeño       | 12       | 1.8%  | 88.3%
7  | Otro trabajo mejor compensado | 8        | 1.2%  | 89.5%
8  | Trabajo muy difícil           | 8        | 1.2%  | 90.7%
9  | Cambio de domicilio           | 4        | 0.6%  | 91.3%
10 | No le gustó el tipo trabajo   | 4        | 0.6%  | 91.9%
...

Total: 676 bajas históricas
```

**Análisis Pareto (Regla 80/20)**:
```
Los primeros 4 motivos (6% del total de motivos únicos) representan:
84.3% de TODAS las bajas ✅ Enfócate en estos
```

**Interpretación**:
- "Baja Voluntaria" es genérico → Necesitas más detalles en entrevistas de salida
- "Abandono" 6.8% → Problema de engagement o condiciones laborales
- "Término contrato" 5.3% → Oportunidad de conversión a planta

**Acciones sugeridas**:
1. Top 1-3: Enfócate aquí (mayor impacto)
2. Motivos < 2%: No priorices recursos aquí
3. Motivos evitables (abandono, otro trabajo) → Planes de retención

---

## 📈 TAB 4: TENDENCIAS - CORRELACIONES Y PATRONES

Este tab usa **análisis estadístico** para encontrar relaciones entre métricas.

### 🔥 MATRIZ DE CORRELACIÓN (Heatmap Estadístico)

**Qué es una correlación**:
Mide qué tan relacionadas están 2 variables en una escala de -1 a +1:
- **+1** = Correlación perfecta positiva (siempre suben juntas)
- **0** = Sin correlación (son independientes)
- **-1** = Correlación perfecta negativa (una sube, otra baja)

**Qué muestra**: Relaciones entre 5 métricas clave.

**Métricas analizadas**:
1. Activos (promedio mensual)
2. Bajas (cantidad mensual)
3. Rotación (% mensual)
4. Incidencias (cantidad mensual)
5. % Incidencias (incidencias/días laborados)

**Cálculo detallado**:

**PASO 1: Obtén datos mes a mes (12 meses)**
```
Por cada mes (ene a dic):
  - Activos_Prom = Fórmula #3
  - Bajas = Fórmula #4
  - Rotación = Fórmula #5
  - Incidencias = Fórmula #8
  - % Inc = (Incidencias ÷ Días Laborados) × 100
```

**Ejemplo de dataset** (2025):
```
Mes | Activos | Bajas | Rotación | Incid | %Inc
Ene | 370     | 12    | 3.2%     | 145   | 4.5%
Feb | 357     | 10    | 2.8%     | 138   | 4.2%
Mar | 366     | 15    | 4.1%     | 142   | 4.0%
Abr | 371     | 13    | 3.5%     | 150   | 4.3%
May | 379     | 11    | 2.9%     | 148   | 3.9%
Jun | 364     | 12    | 3.3%     | 155   | 4.5%
Jul | 369     | 13    | 3.5%     | 160   | 4.6%
Ago | 368     | 11    | 3.0%     | 152   | 4.3%
Sep | 372     | 8     | 2.2%     | 0     | 0.0%
```

**PASO 2: Calcula correlación de Pearson**

Fórmula (simplificada para ejecutivos):
```
Por cada par de variables (ej: Bajas vs Incidencias):

1. Calcula promedio de cada variable:
   Prom_Bajas = (12 + 10 + 15 + ... + 8) ÷ 9 = 11.67
   Prom_Incid = (145 + 138 + ... + 0) ÷ 9 = 132.22

2. Calcula desviaciones:
   Por cada mes: (Valor - Promedio)

3. Multiplica desviaciones correspondientes:
   (Bajas_Ene - Prom_Bajas) × (Incid_Ene - Prom_Incid)

4. Suma todos los productos y divide por raíz de varianzas

5. Resultado: número entre -1 y +1
```

**No te preocupes por la fórmula matemática completa.** Lo importante es interpretar el resultado.

**PASO 3: Colorea la matriz**
```
Escala de colores:
🔴 Rojo oscuro:    0.8 a 1.0   (muy relacionadas +)
🟠 Naranja:        0.5 a 0.8   (relacionadas +)
🟡 Amarillo:       0.2 a 0.5   (algo relacionadas +)
⬜ Blanco:        -0.2 a 0.2   (sin relación)
🔵 Azul claro:    -0.5 a -0.2  (algo relacionadas -)
🟦 Azul oscuro:   -0.8 a -0.5  (relacionadas -)
🟪 Morado:        -1.0 a -0.8  (muy relacionadas -)
```

**Ejemplo de matriz real**:
```
                | Activos | Bajas | Rotación | Incid | %Inc
Activos         | 1.00🔴 | -0.15⬜| -0.25⬜  | 0.10⬜| -0.05⬜
Bajas           | -0.15⬜| 1.00🔴 | 0.95🔴  | 0.45🟡| 0.30⬜
Rotación        | -0.25⬜| 0.95🔴 | 1.00🔴  | 0.50🟡| 0.35🟡
Incidencias     | 0.10⬜ | 0.45🟡 | 0.50🟡  | 1.00🔴| 0.85🔴
%Incidencias    | -0.05⬜| 0.30⬜ | 0.35🟡  | 0.85🔴| 1.00🔴
```

**Interpretación de cada celda**:

**Diagonal (siempre 1.00 🔴)**:
- Cada variable consigo misma = correlación perfecta

**Bajas ↔ Rotación: 0.95 🔴**
- MUY ALTA correlación (obvio, rotación se calcula con bajas)
- Interpretación: Cuando hay más bajas, la rotación sube proporcionalmente

**Incidencias ↔ %Inc: 0.85 🔴**
- MUY ALTA correlación (también obvio, %Inc se deriva de Incidencias)
- Interpretación: A más incidencias, mayor %

**Bajas ↔ Incidencias: 0.45 🟡**
- MODERADA correlación positiva ✅ DATO IMPORTANTE
- Interpretación: Cuando hay más incidencias, tiende a haber más bajas
- Posible causa: Empleados con problemas de asistencia eventualmente se van

**Rotación ↔ Incidencias: 0.50 🟡**
- MODERADA correlación positiva ✅ DATO IMPORTANTE
- Interpretación: Meses con alta rotación también tienen más incidencias
- Posible causa: Ambiente laboral complicado afecta ambas métricas

**Activos ↔ Rotación: -0.25 ⬜**
- BAJA correlación negativa
- Interpretación: Ligeramente, cuando hay más activos, la rotación baja (diluye el efecto)
- No es significativa estadísticamente

**Activos ↔ Incidencias: 0.10 ⬜**
- SIN correlación
- Interpretación: El número de empleados NO predice las incidencias
- Las incidencias dependen de otros factores (clima laboral, estacionalidad)

**Insights accionables**:
```
1. Relación Incidencias → Bajas (0.45):
   ✅ ACCIÓN: Empleados con >3 incidencias en 6 meses → Intervención temprana

2. Relación Rotación → Incidencias (0.50):
   ✅ ACCIÓN: Meses con >4% rotación → Reforzar supervisión de asistencia

3. Sin relación Activos → Incidencias (0.10):
   ✅ INSIGHT: Contratar más gente NO reduce incidencias per se
   La calidad del ambiente laboral importa más que el tamaño
```

---

## 🔍 SISTEMA DE FILTROS - CÓMO FUNCIONAN

Los filtros permiten **enfocarte** en subconjuntos específicos de datos.

### LOS 8 FILTROS DISPONIBLES

#### 1. **Filtro de Año** 📅

**Qué hace**: Muestra solo datos de un año específico.

**Cómo se aplica**:
```sql
-- Ejemplo: Filtrar año 2025
WHERE YEAR(fecha_ingreso) <= 2025
  AND (fecha_baja IS NULL OR YEAR(fecha_baja) >= 2025)
```

**Impacto**:
- Empleados: Solo cuenta los que estuvieron activos en algún momento de 2025
- Incidencias: Solo registros con `fecha` en 2025
- Bajas: Solo `fecha_baja` en 2025

---

#### 2. **Filtro de Mes** 📆

**Qué hace**: Muestra solo datos de un mes específico.

**Cómo se aplica**:
```sql
-- Ejemplo: Filtrar septiembre (mes 9)
WHERE MONTH(fecha) = 9 AND YEAR(fecha) = 2025
```

**Combinación con año**:
```
Año: 2025 + Mes: Septiembre = Solo septiembre 2025
```

---

#### 3. **Filtro de Negocio/Empresa** 🏢

**Qué hace**: Muestra solo datos de una empresa.

**Cómo se aplica**:
```sql
WHERE empresa = 'MOTO REPUESTOS MONTERREY'
```

**Ejemplo de uso**:
```
Si tienes 3 empresas:
- MOTO REPUESTOS MONTERREY (300 empleados)
- EMPRESA B (50 empleados)
- EMPRESA C (22 empleados)

Filtro: "MOTO REPUESTOS MONTERREY"
→ Ahora todos los KPIs se calculan SOLO con esos 300
```

---

#### 4. **Filtro de Área** 🏭

**Qué hace**: Muestra solo datos de un área.

**Cómo se aplica**:
```sql
WHERE area = 'Empaque'
```

**Ejemplo real** (Empaque):
```
Total empleados: 372
Filtro: Área = 'Empaque'
→ Empleados filtrados: 47 (12.6%)

Todos los KPIs ahora usan solo estos 47:
- Rotación mensual: (Bajas de Empaque ÷ 47) × 100
- Incidencias: Solo de empleados de Empaque
```

---

#### 5. **Filtro de Departamento** 📊

**Qué hace**: Muestra solo datos de un departamento.

**Cómo se aplica**:
```sql
WHERE departamento = 'Operaciones'
```

---

#### 6. **Filtro de Puesto** 💼

**Qué hace**: Muestra solo datos de un puesto.

**Cómo se aplica**:
```sql
WHERE puesto = 'Almacenista'
```

**Ejemplo de uso**:
```
Puesto: "Almacenista"
→ Empleados: 35 almacenistas
→ Rotación: Solo mide rotación de almacenistas
→ Incidencias: Solo incidencias de almacenistas

Útil para: Identificar si un puesto específico tiene problemas
```

---

#### 7. **Filtro de Clasificación** 🏷️

**Qué hace**: Muestra solo CONFIANZA o SINDICALIZADO.

**Cómo se aplica**:
```sql
WHERE clasificacion = 'SINDICALIZADO'
```

**Ejemplo de comparación**:
```
Clasificación: CONFIANZA
- Activos: 180
- Rotación mensual: 1.5%

Clasificación: SINDICALIZADO
- Activos: 192
- Rotación mensual: 2.8%

Insight: Sindicalizado tiene casi el doble de rotación
```

---

#### 8. **Filtro de Ubicación** 📍

**Qué hace**: Muestra solo datos de una planta/sucursal.

**Cómo se aplica**:
```sql
WHERE ubicacion = 'Monterrey'
```

---

### COMBINACIÓN DE FILTROS (Ejemplo Completo)

**Escenario**: Analizar rotación de almacenistas sindicalizados de Empaque en Monterrey durante septiembre 2025.

**Filtros aplicados**:
```
Año: 2025
Mes: Septiembre
Empresa: MOTO REPUESTOS MONTERREY
Área: Empaque
Puesto: Almacenista
Clasificación: SINDICALIZADO
Ubicación: Monterrey
```

**Consulta SQL equivalente**:
```sql
SELECT * FROM empleados_sftp
WHERE YEAR(fecha_ingreso) <= 2025
  AND (fecha_baja IS NULL OR YEAR(fecha_baja) >= 2025)
  AND empresa = 'MOTO REPUESTOS MONTERREY'
  AND area = 'Empaque'
  AND puesto = 'Almacenista'
  AND clasificacion = 'SINDICALIZADO'
  AND ubicacion = 'Monterrey'
```

**Resultado**:
```
Total general: 372 empleados
Después de filtros: 8 empleados ✅

Ahora TODOS los KPIs se calculan SOLO con estos 8:
- Activos: 8
- Rotación: (Bajas de estos 8 ÷ 8) × 100
- Incidencias: Solo de estos 8 empleados
```

**Ventaja**: Puedes hacer análisis hiperespecíficos sin cambiar la estructura de datos.

---

## 📊 RESUMEN FINAL - FLUJO DE DATOS COMPLETO

### PASO A PASO: ¿Qué pasa cuando abres el dashboard?

**PASO 1: Conexión a Base de Datos** (0.5 segundos)
```
Dashboard → Supabase PostgreSQL
Carga tablas:
  ✅ empleados_sftp (1,051 registros)
  ✅ motivos_baja (676 registros)
  ✅ incidencias (8,880 registros)
  ✅ prenomina_horizontal (374 registros)
```

**PASO 2: Aplica Filtros Predeterminados** (0.1 segundos)
```
Filtros por defecto:
  - Año: 2025
  - Mes: Actual (ej: octubre)
  - Resto: "Todos" (sin filtrar)
```

**PASO 3: Calcula los 10 KPIs Base** (1 segundo)
```
Ejecuta fórmulas #1 a #10:
1. Activos → 372
2. Días → 2
3. Activos Prom → 372
4. Bajas → 8
5. Rotación Mensual → 2.15%
6. Rotación 12M → 26.05%
7. Rotación YTD → 21.71%
8. Incidencias → 0
9. Inc Prom x Emp → 0.032
10. Días Laborados → 9,672

Compara con mes anterior para variaciones (%)
```

**PASO 4: Genera Datos para Gráficas** (1-2 segundos)
```
Por cada gráfica:
  1. Agrupa datos (por mes, área, tipo, etc.)
  2. Cuenta/suma/promedia según fórmula
  3. Prepara formato JSON para Recharts
  4. Calcula escalas de ejes
  5. Asigna colores según valores
```

**PASO 5: Renderiza UI** (0.5 segundos)
```
Componentes renderizados:
  ✅ 6 tarjetas KPI (números + chips de variación)
  ✅ 4 gráficas (barras, líneas, pastel)
  ✅ 2 tablas (ausentismo, motivos)
  ✅ Filtros interactivos
  ✅ Tabs de navegación

Total tiempo de carga: ~3.5 segundos
```

**PASO 6: Espera Interacción del Usuario**
```
Si usuario:
  - Cambia filtro → Vuelve a PASO 2 (recalcula todo)
  - Cambia tab → Carga componentes de ese tab
  - Refresca → Vuelve a PASO 1 (reconecta DB)
  - Cambia período → Ajusta fechas y recalcula
```

---

## ✅ VALIDACIONES Y CALIDAD DE DATOS

### ¿Cómo se asegura que los datos sean correctos?

#### 1. **Validaciones de Fechas**
```
Reglas:
✅ fecha_ingreso <= fecha_baja (si existe baja)
✅ fecha_baja <= HOY (no puede ser futura)
✅ fecha_ingreso >= 2001-01-01 (inicio operaciones)
✅ fecha_nacimiento <= fecha_ingreso - 16 años (edad mínima legal)
```

#### 2. **Validaciones de Estados**
```
Reglas:
✅ Si activo = TRUE → fecha_baja DEBE ser NULL
✅ Si activo = FALSE → fecha_baja DEBE tener valor
✅ Empleado no puede estar activo Y con fecha_baja reciente
```

#### 3. **Validaciones de Relaciones**
```
Reglas:
✅ motivos_baja.numero_empleado EXISTE en empleados_sftp
✅ incidencias.emp EXISTE en empleados_sftp
✅ prenomina.numero_empleado EXISTE en empleados_sftp
✅ No duplicados en numero_empleado (clave única)
```

#### 4. **Validaciones de Incidencias**
```
Reglas:
✅ inci debe ser uno de los 10 códigos válidos
✅ fecha no puede ser futura
✅ emp debe corresponder a un empleado real
✅ ordinarias + extras <= 24 horas por día
```

#### 5. **Validaciones de Cálculos**
```
Reglas:
✅ Activos Promedio >= 0
✅ Rotación >= 0% (no puede ser negativa)
✅ Incidencias >= 0
✅ Días Laborados >= 0 y <= Días del período × Activos
```

---

### ¿Qué pasa si hay datos malos?

**Sistema de 4 niveles de respuesta**:

**Nivel 1: ⚠️ Advertencia en consola** (para desarrolladores)
```
Ejemplo: "Empleado #12345 tiene fecha_baja < fecha_ingreso"
Acción: Registra en logs, continúa con cálculo
```

**Nivel 2: 🔧 Corrección automática** (datos menores)
```
Ejemplo: Campo NULL donde se espera 0
Acción: Reemplaza NULL → 0, registra corrección
```

**Nivel 3: 📝 Marca con asterisco** (datos dudosos)
```
Ejemplo: Rotación >100% (posible error de datos)
Acción: Muestra el KPI con "*" y tooltip explicativo
```

**Nivel 4: 🚨 Error crítico** (no puede calcular)
```
Ejemplo: Tabla empleados_sftp vacía
Acción: Muestra mensaje "No hay datos disponibles"
```

---

## 🎓 CONCLUSIÓN - TU GUÍA DE REFERENCIA COMPLETA

Ahora tienes la **guía más completa** de cómo funciona el dashboard MRM.

### 📚 LOS 4 PILARES DEL SISTEMA

**1. LAS TABLAS** (tu fuente de verdad)
```
empleados_sftp (1,051) → Plantilla completa
motivos_baja (676) → Causas de terminación
incidencias (8,880) → Asistencia y problemas
prenomina_horizontal (374) → Horas trabajadas
```

**2. LAS FÓRMULAS** (tus cálculos base)
```
10 fórmulas maestras:
  #1 Activos
  #2 Días
  #3 Activos Promedio ⭐ CLAVE para rotación
  #4 Bajas
  #5 Rotación Mensual ⭐ KPI principal
  #6 Rotación 12M
  #7 Rotación YTD
  #8 Incidencias
  #9 Inc Prom x Empleado
  #10 Días Laborados
```

**3. LAS VISUALIZACIONES** (tu análisis visual)
```
Tab 1 (Resumen): 4 gráficas comparativas + tabla ausentismo
Tab 2 (Incidencias): 4 gráficas de tendencias + tabla completa
Tab 3 (Retención): 3 gráficas avanzadas + 2 tablas + heatmap + motivos
Tab 4 (Tendencias): Matriz de correlación estadística
```

**4. LOS FILTROS** (tu lupa de análisis)
```
8 filtros combinables:
  - Temporales: Año, Mes
  - Organizacionales: Empresa, Depto, Área, Puesto
  - Demográficos: Clasificación, Ubicación
```

---

### 🎯 PARA RECORDAR (Lo Más Importante)

**Rotación se calcula con ACTIVOS PROMEDIO, no activos finales**
```
✅ CORRECTO: (Bajas ÷ Activos Promedio) × 100
❌ INCORRECTO: (Bajas ÷ Activos Finales) × 100

Razón: El promedio refleja mejor la plantilla durante todo el mes
```

**Incidencias MALAS ≠ Incidencias TOTALES**
```
MALAS: FI + SUSP + PSIN + ENFE + ACCI (problemas reales)
BUENAS: VAC + PCON + MAT3 + PATER (permisos autorizados)
TOTALES: MALAS + BUENAS + FEST

Cuando el dashboard dice "Incidencias", se refiere a MALAS
```

**Rotación 12M Móviles ≠ Rotación YTD**
```
12M Móviles: Últimos 12 meses desde hoy (ventana móvil)
YTD: Desde 1-ene hasta hoy (ventana fija)

Usa 12M para tendencias de largo plazo
Usa YTD para metas anuales
```

**Las relaciones entre tablas**:
```
empleados_sftp.numero_empleado = motivos_baja.numero_empleado
empleados_sftp.numero_empleado = incidencias.emp
empleados_sftp.numero_empleado = prenomina.numero_empleado

empleados_sftp es la TABLA CENTRAL de todo
```

---

### 📞 ¿DUDAS SOBRE ALGÚN CÁLCULO?

Ahora sabes **exactamente** de dónde sale cada número. Sin magia, solo:
✅ Matemáticas simples
✅ Bases de datos relacionales
✅ Fórmulas estándar de RH

**¿Ves un número en el dashboard que no entiendes?**
Búscalo en este documento. Está explicado paso a paso.

---

**Autor**: Sistema MRM Dashboard
**Versión**: 2.0 - Guía Ejecutiva Completa
**Fecha**: 22 de Enero, 2026
**Páginas**: Documento completo con máxima granularidad
