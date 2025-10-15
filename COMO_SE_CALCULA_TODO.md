# 🧮 CÓMO SE CALCULA CADA MÉTRICA DEL DASHBOARD

**Fecha**: 14 de Octubre, 2025
**Proyecto**: Dashboard MRM - Explicación de Cálculos
**Versión**: 1.0 - Sin Código Técnico

---

## 🗄️ LAS 3 TABLAS DE LA BASE DE DATOS

Todo el dashboard funciona con **3 tablas principales** en la base de datos (PostgreSQL en Supabase):

### 1. 📋 TABLA `empleados_sftp` - "La Maestra"

**¿Qué tiene?**
Esta tabla tiene TODA la información de tus empleados, tanto los que trabajan ahora como los que ya se fueron.

**Columnas importantes**:
- `numero_empleado` - El número único de cada persona (ej: 12345)
- `nombres` - Su nombre (ej: "Juan")
- `apellidos` - Sus apellidos (ej: "Pérez García")
- `nombre_completo` - Nombre completo armado
- `departamento` - A qué departamento pertenece (ej: "Operaciones")
- `puesto` - Su puesto (ej: "Almacenista")
- `area` - Su área (ej: "Empaque")
- `clasificacion` - Si es CONFIANZA o SINDICALIZADO
- `empresa` - Para qué empresa trabaja (ej: "MOTO REPUESTOS MONTERREY")
- `fecha_ingreso` - Cuándo entró a trabajar (ej: "2023-05-15")
- `fecha_baja` - Cuándo se fue (si ya se fue) - Si sigue trabajando, esto está vacío (NULL)
- `activo` - TRUE o FALSE - Dice si trabaja ahora o ya se fue
- `motivo_baja` - Por qué se fue (si se fue)

**Datos reales que tienes**:
- **996 registros totales**
- **372 empleados activos** (activo = TRUE)
- **624 empleados inactivos** (activo = FALSE, ya se fueron)

---

### 2. ⚠️ TABLA `motivos_baja` - "Las Salidas Detalladas"

**¿Qué tiene?**
Detalles de por qué se fue cada persona que dejó la empresa.

**Columnas importantes**:
- `numero_empleado` - El número del empleado (ej: 12345)
- `fecha_baja` - En qué fecha se fue (ej: "2025-09-15")
- `tipo` - Tipo de baja (ej: "Voluntaria", "Involuntaria")
- `motivo` - El motivo específico (ej: "Renuncia", "Término de contrato")
- `descripcion` - Detalles adicionales del motivo

**Datos reales que tienes**:
- **602 registros** (602 personas se han ido desde que empezó la empresa)

**Top 5 motivos en tu empresa**:
1. "Otra razón" - 67 personas (11.13%)
2. "Abandono / No regresó" - 46 personas (7.64%)
3. "Término del contrato" - 36 personas (5.98%)
4. "Rescisión por desempeño" - 12 personas (1.99%)
5. "Otro trabajo mejor compensado" - 8 personas (1.33%)

---

### 3. ⚠️ TABLA `incidencias` - "Registro de Asistencia y Problemas"

**¿Qué tiene?**
Registro histórico de TODAS las incidencias: faltas, permisos, vacaciones, enfermedades, etc.

**Columnas importantes**:
- `id` - ID único del registro
- `emp` - Número de empleado (se relaciona con `numero_empleado` de empleados_sftp)
- `fecha` - Qué día ocurrió la incidencia (ej: "2025-09-15")
- `inci` - Tipo de incidencia (código corto: VAC, FI, ENFE, etc.)
- `incidencia` - Descripción detallada (ej: "Justif, No checó")
- `turno` - Turno del empleado (ej: 4)
- `horario` - Horario asignado (ej: "0830_1700")
- `entra` - Hora de entrada (puede estar vacío)
- `sale` - Hora de salida (puede estar vacío)
- `ordinarias` - Horas ordinarias trabajadas
- `numero` - Número de incidencia
- `status` - Estado del registro
- `fecha_creacion` - Cuándo se creó el registro

**Datos reales que tienes (Octubre 2025)**:
- **4,923 registros totales** (históricamente desde que empezó el sistema)
- **10 tipos diferentes** de incidencias
- **405 empleados únicos** han tenido al menos 1 incidencia

**Los 10 Tipos de Incidencias** (de mayor a menor frecuencia):

1. **VAC (Vacaciones)** 🏖️ - BUENO
   - 2,443 registros (49.6%)
   - 264 empleados diferentes
   - Es el tipo más común (¡y es bueno!)

2. **FI (Falta Injustificada)** ❌ - MALO
   - 639 registros (13.0%)
   - 155 empleados diferentes
   - **Problema**: No vino y no avisó

3. **ENFE (Enfermedad)** 🏥 - MALO
   - 541 registros (11.0%)
   - 37 empleados diferentes
   - Faltó por enfermedad

4. **PSIN (Permiso Sin Goce)** 📝 - MALO
   - 438 registros (8.9%)
   - 107 empleados diferentes
   - Permiso sin sueldo

5. **MAT3 (Maternidad)** 👶 - BUENO
   - 426 registros (8.7%)
   - 6 empleadas diferentes
   - Incapacidad por maternidad (3 meses)

6. **PCON (Permiso Con Goce)** ✅ - BUENO
   - 274 registros (5.6%)
   - 100 empleados diferentes
   - Permiso pagado (cumpleaños, trámites)

7. **SUSP (Suspensión)** ⏸️ - MALO
   - 84 registros (1.7%)
   - 40 empleados diferentes
   - Suspendido por mala conducta

8. **FEST (Festividad/Festivo)** 🎉 - NEUTRO
   - 54 registros (1.1%)
   - 49 empleados diferentes
   - Día festivo

9. **ACCI (Accidente)** 🚑 - MALO
   - 20 registros (0.4%)
   - 2 empleados diferentes
   - Accidente laboral

10. **PATER (Paternidad)** 👨‍👶 - BUENO
    - 4 registros (0.1%)
    - 1 empleado
    - Licencia de paternidad

**¿Cómo se relaciona con empleados_sftp?**
El campo `emp` de la tabla `incidencias` se relaciona con `numero_empleado` de `empleados_sftp`. Así el sistema puede saber:
- A qué empresa pertenece
- En qué área trabaja
- Qué puesto tiene
- Si está activo o no

**Ejemplo real (Septiembre 2025)**:
- **Total registros**: 12 incidencias
- **MAT3**: 9 registros (1 empleada)
- **VAC**: 3 registros (1 empleado)
- **Incidencias malas**: 0 ✅ (¡Ninguna falta o problema!)
- **Solo permisos**: 100% fueron permisos buenos

---

## 🧮 FÓRMULAS MAESTRAS - Los 9 Cálculos Principales

Estas son las **9 métricas clave** que el dashboard calcula. TODO el resto son variaciones de estas.

---

### 1️⃣ **ACTIVOS** 👥

**¿Qué es?**
Cuántos empleados trabajan AHORA MISMO.

**¿De dónde sale?**
**TABLA**: `empleados_sftp`
**FILTRO**: `activo = TRUE`

**Cómo se calcula**:
1. Ve a la tabla `empleados_sftp`
2. Cuenta cuántos registros tienen `activo = TRUE`
3. Ese número es "Activos"

**Ejemplo con tus datos reales (Octubre 2025)**:
- Total en tabla: 996 empleados
- Filtro: `activo = TRUE`
- **Resultado: 372 empleados activos** ✅

**Código en palabras**:
```
CUENTA(empleados donde activo es TRUE)
```

---

### 2️⃣ **DÍAS** 📅

**¿Qué es?**
Cuántos días diferentes tiene registrados en la asistencia.

**¿De dónde sale?**
**TABLA**: `incidencias`
**CUENTA**: Días únicos en el período

**Cómo se calcula**:
1. Ve a la tabla `incidencias`
2. Filtra solo los registros del mes que quieres ver (ej: septiembre 2025)
3. Cuenta cuántas fechas DIFERENTES hay (sin repetir)
4. Ese número es "Días"

**Ejemplo real (Septiembre 2025)**:
- Registros del 1 al 30 de septiembre
- Solo hay 2 días con incidencias registradas
- **Resultado: 2 días** con actividad registrada

**¿Por qué solo 2 días?**
Porque solo hubo 12 incidencias en septiembre (9 MAT3 y 3 VAC), repartidas en solo 2 fechas diferentes.

**Código en palabras**:
```
CUENTA_ÚNICOS(fechas de incidencias en el mes)
```

**NOTA IMPORTANTE**: Este número puede ser bajo si solo se registran las incidencias (faltas y permisos) y no la asistencia diaria completa. Si quieres saber días laborales totales, se calcula de otra forma (se explica en "Días Laborados" más abajo).

---

### 3️⃣ **ACTIVOS PROMEDIO** (Activos Prom) 📊

**¿Qué es?**
El promedio de empleados que trabajaron durante el mes.

**¿Por qué promedio y no solo "activos"?**
Porque durante el mes entra y sale gente. El promedio es más justo.

**¿De dónde sale?**
**TABLA**: `empleados_sftp`
**CÁLCULO**: Promedio entre inicio y fin del mes

**Cómo se calcula**:

**PASO 1: Activos al INICIO del mes**
1. Toma la fecha de inicio del mes (ej: 1 de septiembre)
2. Cuenta cuántos empleados:
   - Ya habían entrado para esa fecha (`fecha_ingreso <= 1 septiembre`)
   - Y NO se habían ido todavía (`fecha_baja` está vacío O `fecha_baja > 1 septiembre`)

**PASO 2: Activos al FINAL del mes**
1. Toma la fecha de fin del mes (ej: 30 de septiembre)
2. Cuenta cuántos empleados:
   - Ya habían entrado para esa fecha (`fecha_ingreso <= 30 septiembre`)
   - Y NO se habían ido todavía (`fecha_baja` está vacío O `fecha_baja > 30 septiembre`)

**PASO 3: Saca el promedio**
```
Activos Promedio = (Activos Inicio + Activos Final) / 2
```

**Ejemplo real (Septiembre 2025)**:
- Activos al 1 de septiembre: 370 empleados
- Activos al 30 de septiembre: 374 empleados
- **Promedio**: (370 + 374) / 2 = **372 empleados** ✅

**Código en palabras**:
```
Inicio = CUENTA(empleados que entraron antes del 1 del mes Y no se habían ido)
Final = CUENTA(empleados que entraron antes del 30 del mes Y no se habían ido)
Activos Prom = (Inicio + Final) / 2
```

---

### 4️⃣ **BAJAS** ↘️

**¿Qué es?**
Cuántos empleados se han ido de la empresa (TOTAL HISTÓRICO).

**¿De dónde sale?**
**TABLA**: `empleados_sftp`
**FILTRO**: `fecha_baja` NO está vacía

**Cómo se calcula**:
1. Ve a la tabla `empleados_sftp`
2. Cuenta cuántos registros tienen `fecha_baja` con una fecha (no vacía)
3. Ese número es "Bajas totales"

**Ejemplo con tus datos reales**:
- Total en tabla: 996 empleados
- Filtro: `fecha_baja` NO es NULL
- **Resultado: 624 bajas históricas** ✅

**IMPORTANTE**: Este es el total HISTÓRICO. Si quieres ver cuántos se fueron EN SEPTIEMBRE solamente, entonces:

**Bajas del Período (ej: Septiembre)**:
1. Ve a la tabla `empleados_sftp`
2. Filtra: `fecha_baja` entre el 1 y 30 de septiembre
3. Cuenta cuántos hay

**Ejemplo real (Septiembre 2025)**:
- Filtro: `fecha_baja` entre 1-sep y 30-sep
- **Resultado: 8 bajas en septiembre** ✅

**Código en palabras**:
```
TOTAL:
  CUENTA(empleados donde fecha_baja NO es vacío)

PERÍODO:
  CUENTA(empleados donde fecha_baja está entre inicio y fin del mes)
```

---

### 5️⃣ **ROTACIÓN MENSUAL** 🔄

**¿Qué es?**
El porcentaje de empleados que se fueron en el mes.

**¿De dónde sale?**
**TABLAS**: `empleados_sftp` (para bajas y activos)
**FÓRMULA**: (Bajas del mes / Activos Promedio) × 100

**Cómo se calcula**:

**PASO 1: Obtén las bajas del mes**
- Ya calculadas arriba (ej: 8 bajas en septiembre)

**PASO 2: Obtén los activos promedio del mes**
- Ya calculados arriba (ej: 372 activos promedio)

**PASO 3: Aplica la fórmula**
```
Rotación Mensual = (Bajas del Mes / Activos Promedio) × 100
```

**Ejemplo real (Septiembre 2025)**:
- Bajas en septiembre: 8 personas
- Activos promedio: 372 empleados
- **Rotación**: (8 / 372) × 100 = **2.15%** ✅ ¡EXCELENTE!

**¿Qué significa 2.15%?**
De cada 100 empleados, solo 2 se fueron en el mes. ¡Muy bueno!

**Código en palabras**:
```
Bajas_Mes = CUENTA(empleados con fecha_baja en el mes)
Activos_Prom = (Activos_Inicio + Activos_Final) / 2
Rotación = (Bajas_Mes / Activos_Prom) × 100
```

---

### 6️⃣ **ROTACIÓN ACUMULADA 12 MESES MÓVILES** 📊

**¿Qué es?**
El promedio de rotación de los últimos 12 meses completos.

**¿Qué es "móvil"?**
Es una ventana de 12 meses que se va moviendo. Por ejemplo:
- En enero 2025, cuentas de febrero 2024 a enero 2025
- En febrero 2025, cuentas de marzo 2024 a febrero 2025
- Y así...

**¿De dónde sale?**
**TABLA**: `empleados_sftp`
**FÓRMULA**: (Bajas en 12 meses / Activos Promedio de 12 meses) × 100

**Cómo se calcula**:

**PASO 1: Define tu ventana de 12 meses**
Ejemplo: Septiembre 2025
- Fecha fin: 30 de septiembre 2025
- Fecha inicio: 1 de octubre 2024 (12 meses atrás)

**PASO 2: Cuenta las bajas en esos 12 meses**
1. Ve a `empleados_sftp`
2. Filtra: `fecha_baja` entre octubre 2024 y septiembre 2025
3. Cuenta cuántos hay

**PASO 3: Calcula el promedio de activos de esos 12 meses**
1. Activos al inicio (1 octubre 2024): Cuenta empleados activos ese día
2. Activos al final (30 septiembre 2025): Cuenta empleados activos ese día
3. Promedio = (Activos inicio + Activos final) / 2

**PASO 4: Aplica la fórmula**
```
Rotación 12 Meses = (Bajas en 12 meses / Promedio Activos) × 100
```

**Ejemplo (números de ejemplo)**:
- Bajas oct 2024 - sep 2025: 96 personas
- Activos promedio 12 meses: 370 empleados
- **Rotación 12 meses**: (96 / 370) × 100 = **25.95%**

**Código en palabras**:
```
Inicio_12m = Fecha_Actual menos 11 meses (primer día del mes)
Fin_12m = Fecha_Actual (último día del mes)

Bajas_12m = CUENTA(empleados con fecha_baja entre Inicio_12m y Fin_12m)

Activos_Inicio_12m = CUENTA(empleados activos al Inicio_12m)
Activos_Fin_12m = CUENTA(empleados activos al Fin_12m)
Promedio_12m = (Activos_Inicio_12m + Activos_Fin_12m) / 2

Rotación_12m = (Bajas_12m / Promedio_12m) × 100
```

---

### 7️⃣ **ROTACIÓN YTD** (Year To Date) 📅

**¿Qué es?**
La rotación desde el 1 de enero del año actual hasta hoy.

**¿Qué es "YTD"?**
"Year To Date" = "Del año hasta la fecha". Si estamos en octubre, cuenta desde enero hasta octubre.

**¿De dónde sale?**
**TABLA**: `empleados_sftp`
**FÓRMULA**: (Bajas desde enero / Activos Promedio del año) × 100

**Cómo se calcula**:

**PASO 1: Define tu período**
Ejemplo: Octubre 2025
- Fecha inicio: 1 de enero 2025
- Fecha fin: 31 de octubre 2025 (hoy)

**PASO 2: Cuenta las bajas en ese período**
1. Ve a `empleados_sftp`
2. Filtra: `fecha_baja` entre 1 enero 2025 y 31 octubre 2025
3. Cuenta cuántos hay

**PASO 3: Calcula el promedio de activos**
1. Activos al 1 de enero: X empleados
2. Activos al 31 de octubre: Y empleados
3. Promedio = (X + Y) / 2

**PASO 4: Aplica la fórmula**
```
Rotación YTD = (Bajas en el año / Promedio Activos) × 100
```

**Ejemplo (números de ejemplo)**:
- Bajas enero - octubre 2025: 80 personas
- Activos promedio: 368 empleados
- **Rotación YTD**: (80 / 368) × 100 = **21.74%**

**Código en palabras**:
```
Inicio_Año = 1 de enero del año actual
Fin_Actual = Último día del mes actual

Bajas_YTD = CUENTA(empleados con fecha_baja entre Inicio_Año y Fin_Actual)

Activos_Inicio_Año = CUENTA(empleados activos al Inicio_Año)
Activos_Fin = CUENTA(empleados activos al Fin_Actual)
Promedio = (Activos_Inicio_Año + Activos_Fin) / 2

Rotación_YTD = (Bajas_YTD / Promedio) × 100
```

---

### 8️⃣ **INCIDENCIAS** ⚠️

**¿Qué es?**
Cuántas veces alguien faltó, llegó tarde o tuvo un problema de asistencia (incluyendo permisos y vacaciones).

**¿De dónde sale?**
**TABLA**: `incidencias`
**FILTRO**: Por mes y tipo de incidencia

**Cómo se calcula**:

1. Ve a la tabla `incidencias`
2. Filtra solo el mes que quieres ver (ej: septiembre 2025)
3. Cuenta TODOS los registros del período
4. Ese número es "Incidencias Totales"

**Si quieres separar buenas de malas**:

**Incidencias "MALAS"** (problemas reales):
- FI (Falta Injustificada) ❌
- SUSP (Suspensión) ⏸️
- PSIN (Permiso Sin Goce) 📝
- ENFE (Enfermedad) 🏥
- ACCI (Accidente) 🚑

**Incidencias "BUENAS"** (permisos justificados):
- VAC (Vacaciones) 🏖️
- PCON (Permiso Con Goce) ✅
- MAT3 (Maternidad) 👶
- PATER (Paternidad) 👨‍👶

**Incidencias "NEUTRAS"**:
- FEST (Festividad) 🎉

**Ejemplo real (Septiembre 2025)**:
- Tabla: `incidencias`
- Filtro: Fecha en septiembre 2025
- **Total registros**: 12 incidencias
  - MAT3: 9 registros (bueno) ✅
  - VAC: 3 registros (bueno) ✅
  - **Incidencias malas**: 0 ¡Ninguna! 🎉

**Ejemplo histórico (Todo el tiempo)**:
- Total: 4,923 incidencias
- Buenas: 3,147 (64%) - VAC + PCON + MAT3 + PATER
- Malas: 1,722 (35%) - FI + SUSP + PSIN + ENFE + ACCI
- Neutras: 54 (1%) - FEST

**NOTA IMPORTANTE**: Cuando el dashboard dice "Incidencias", usualmente se refiere SOLO a las malas (FI, SUSP, PSIN, ENFE, ACCI). Los permisos buenos se cuentan aparte.

**Código en palabras**:
```
TOTAL:
  CUENTA(registros de incidencias en el mes)

MALAS:
  CUENTA(registros donde inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI'))

BUENAS:
  CUENTA(registros donde inci IN ('VAC', 'PCON', 'MAT3', 'PATER'))
```

---

### 9️⃣ **INCIDENCIAS PROMEDIO POR EMPLEADO** (Inc prom x empleado) 👤

**¿Qué es?**
Cuántas incidencias tiene cada empleado en promedio.

**¿De dónde sale?**
**FÓRMULA**: Total Incidencias / Activos Promedio

**Cómo se calcula**:

**PASO 1: Obtén el total de incidencias del mes**
- Ya calculadas arriba (ej: 12 incidencias)

**PASO 2: Obtén los activos promedio del mes**
- Ya calculados arriba (ej: 372 empleados)

**PASO 3: Divide**
```
Inc prom x empleado = Incidencias / Activos Promedio
```

**Ejemplo real (Septiembre 2025)**:
- Incidencias: 12
- Activos promedio: 372 empleados
- **Resultado**: 12 / 372 = **0.032 incidencias por empleado** ✅

**¿Qué significa 0.032?**
Que en promedio, cada empleado tuvo 0.032 incidencias. O sea, casi nadie tuvo incidencias. ¡Excelente!

**Meta ideal**: Menos de 0.4 incidencias por empleado.

**Código en palabras**:
```
Incidencias_Totales = CUENTA(incidencias del mes)
Activos_Prom = (Activos_Inicio + Activos_Final) / 2
Inc_Prom = Incidencias_Totales / Activos_Prom
```

---

## 📊 CÁLCULOS POR TAB - DESGLOSE COMPLETO

Ahora vamos tab por tab explicando QUÉ se muestra y CÓMO se calcula.

---

## 📊 TAB 1: RESUMEN - Vista General Comparativa

Este tab te deja **comparar** diferentes partes de tu empresa (áreas, departamentos, empresas).

### 🔢 Las 6 Tarjetas (KPI Cards)

#### 1. **Empleados Activos** 👥
- **Fórmula**: ACTIVOS (explicada arriba)
- **Origen**: Tabla `empleados_sftp`, campo `activo = TRUE`
- **Comparación**: vs mes anterior
- **Ejemplo**: 372 activos, +2 vs mes anterior (+0.54%) 🟢

#### 2. **Rotación Mensual** 📉
- **Fórmula**: ROTACIÓN MENSUAL (explicada arriba)
- **Origen**: Tabla `empleados_sftp`, bajas del mes / activos promedio
- **Meta ideal**: Menos de 5%
- **Ejemplo**: 2.15%, -0.50% vs mes anterior 🟢

#### 3. **Rotación Año Completo (YTD)** 📅
- **Fórmula**: ROTACIÓN YTD (explicada arriba)
- **Origen**: Tabla `empleados_sftp`, bajas desde enero / activos promedio
- **Ejemplo**: 21.74%

#### 4. **Incidencias** ⚠️
- **Fórmula**: INCIDENCIAS (explicada arriba)
- **Origen**: Tabla `incidencias`
- **Filtro**: Solo incidencias "malas" (FI, SUSP, PSIN, ENFE, ACCI)
- **Comparación**: vs mes anterior
- **Ejemplo real (Septiembre 2025)**: 0 incidencias malas ✅

#### 5. **Permisos (Secundario de Incidencias)** 📝
- **Fórmula**: Cuenta incidencias "buenas" (VAC, PCON, MAT3, PATER)
- **Origen**: Tabla `incidencias`, campo `inci`
- **Filtro**: `inci IN ('VAC', 'PCON', 'MAT3', 'PATER')`
- **Ejemplo real (Septiembre 2025)**: 12 permisos (9 MAT3 + 3 VAC)

#### 6. **Días** 📅
- **Fórmula**: DÍAS (explicada arriba)
- **Origen**: Tabla `incidencias`, cuenta fechas únicas
- **Ejemplo real (Septiembre 2025)**: 2 días con incidencias registradas

### 📊 Las 4 Gráficas

#### Gráfica 1: **Barras de Antigüedad**
**¿Qué muestra?** Cuántos empleados tienes por rango de antigüedad.

**Cómo se calcula**:
1. Para cada empleado activo, calcula cuánto tiempo lleva trabajando:
   ```
   Antigüedad = Fecha_Hoy - fecha_ingreso
   ```
2. Clasifícalo en rangos:
   - **Menos de 1 año**: 0-11 meses
   - **1-3 años**: 12-35 meses
   - **3-5 años**: 36-59 meses
   - **5-10 años**: 60-119 meses
   - **Más de 10 años**: 120+ meses
3. Cuenta cuántos empleados hay en cada rango
4. Muestra barras por cada rango

**Origen**: Tabla `empleados_sftp`, campos `fecha_ingreso` y `activo = TRUE`

**Ejemplo visual**:
```
Menos de 1 año:    ████████ 120 empleados (rojo)
1-3 años:          ██████ 90 empleados (naranja)
3-5 años:          ████ 60 empleados (amarillo)
5-10 años:         ███ 45 empleados (verde)
Más de 10 años:    ██ 57 empleados (azul)
```

#### Gráfica 2: **Líneas de Rotación Voluntaria vs Involuntaria**
**¿Qué muestra?** Mes a mes, cuántas personas renunciaron (voluntaria) vs cuántas corriste (involuntaria).

**Cómo se calcula**:
1. Por cada mes del año (enero a diciembre):
2. Ve a tabla `motivos_baja`
3. Cuenta bajas donde `tipo = 'Voluntaria'` (renuncias)
4. Cuenta bajas donde `tipo = 'Involuntaria'` (despidos/términos)
5. Calcula rotación:
   ```
   Rotación Vol = (Bajas Vol / Activos Prom mes) × 100
   Rotación Inv = (Bajas Inv / Activos Prom mes) × 100
   ```
6. Dibuja 2 líneas: verde (vol) y roja (inv)

**Origen**:
- Tabla `motivos_baja`, campo `tipo`
- Tabla `empleados_sftp` para activos promedio

**Ejemplo** (Septiembre):
- Voluntarias: 5 renuncias → 1.34%
- Involuntarias: 3 términos → 0.81%

#### Gráfica 3: **Líneas de Rotación Acumulada 12 Meses**
**¿Qué muestra?** Compara la rotación acumulada de este año vs el año pasado.

**Cómo se calcula**:
1. Por cada mes (enero a diciembre):
2. **Línea Azul (Año pasado - 2024)**:
   - Para enero: rotación de feb 2023 a ene 2024 (12 meses)
   - Para febrero: rotación de mar 2023 a feb 2024 (12 meses)
   - Y así...
3. **Línea Roja (Este año - 2025)**:
   - Para enero: rotación de feb 2024 a ene 2025 (12 meses)
   - Para febrero: rotación de mar 2024 a feb 2025 (12 meses)
   - Y así...
4. Usa la fórmula de ROTACIÓN 12 MESES para cada punto

**Origen**: Tabla `empleados_sftp`, campos `fecha_baja` y `activo`

**Ejemplo visual**:
```
       Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep
2024:  25%  26%  24%  23%  25%  27%  26%  28%  27%  (azul)
2025:  24%  23%  22%  21%  20%  22%  23%  24%  26%  (rojo)
```

#### Gráfica 4: **Líneas de Rotación YTD**
**¿Qué muestra?** La rotación acumulada desde enero hasta cada mes.

**Cómo se calcula**:
1. Por cada mes (enero a diciembre):
2. Calcula rotación desde el 1 de enero hasta el último día de ese mes
3. Usa la fórmula de ROTACIÓN YTD para cada punto

**Origen**: Tabla `empleados_sftp`, campos `fecha_baja` y `activo`

**Ejemplo visual**:
```
Enero:    Bajas ene / Activos prom = 5 / 370 = 1.35%
Febrero:  Bajas ene-feb / Activos prom = 13 / 371 = 3.50%
Marzo:    Bajas ene-mar / Activos prom = 22 / 369 = 5.96%
...
Septiembre: Bajas ene-sep / Activos prom = 80 / 368 = 21.74%
```

### 📋 Tabla de Ausentismo
**¿Qué muestra?** Detalles de incidencias por área/departamento.

**Cómo se calcula**:
1. Ve a tabla `incidencias`
2. Por cada incidencia, busca el empleado en `empleados_sftp` usando el campo `emp`
3. Agrupa las incidencias por área (o departamento, según la vista)
4. Por cada área, cuenta:
   - **Total**: Todas las incidencias
   - **Permisos** (buenos): VAC, PCON, MAT3, PATER
   - **Faltas** (malas): FI, SUSP, PSIN, ENFE, ACCI
   - **Otros**: FEST
5. Muestra en una tabla

**Origen**:
- Tabla `incidencias` - Para los registros de incidencias
- Tabla `empleados_sftp` - Para relacionar con área/departamento usando `emp = numero_empleado`

**Cómo se relacionan**:
```
incidencias.emp = empleados_sftp.numero_empleado
```

Esto permite saber de qué área/departamento/puesto es cada incidencia.

**Ejemplo con datos históricos**:
```
Área      | Total | Permisos | Faltas | Otros
Empaque   | 650   | 420      | 220    | 10
Surtido   | 580   | 380      | 190    | 10
Calidad   | 320   | 250      | 65     | 5
Supermoto | 510   | 340      | 165    | 5
Recibo    | 440   | 300      | 135    | 5
```

**Ejemplo real (Septiembre 2025)**:
```
Área      | Total | Permisos | Faltas | Otros
Empaque   | 9     | 9        | 0      | 0
Surtido   | 3     | 3        | 0      | 0
Otros     | 0     | 0        | 0      | 0
```

---

## 👥 TAB 2: PERSONAL - Quién es Quién

Este tab muestra información demográfica de tus empleados.

### 🔢 Las 5 Tarjetas

#### 1. **Ingresos Nuevos (Este Mes)** 🆕
**¿Qué es?** Cuánta gente nueva entró ESTE MES.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra: `fecha_ingreso` entre el 1 y el 30/31 del mes actual
3. Cuenta cuántos hay

**Origen**: Tabla `empleados_sftp`, campo `fecha_ingreso`

**Ejemplo** (Octubre 2025):
```
Filtro: fecha_ingreso entre 1-oct y 31-oct
Resultado: 12 empleados nuevos
```

#### 2. **Bajas Totales** ↘️
**¿Qué es?** Cuánta gente se ha ido HISTÓRICAMENTE.

**Cómo se calcula**:
- Usa la fórmula de BAJAS (explicada arriba)
- Cuenta TODOS los empleados con `fecha_baja` no vacía

**Origen**: Tabla `empleados_sftp`, campo `fecha_baja`

**Ejemplo**: 624 bajas históricas

#### 3. **Ingresos Totales** ↗️
**¿Qué es?** Cuánta gente ha entrado HISTÓRICAMENTE.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Cuenta TODOS los registros (cada registro es un empleado que entró alguna vez)

**Origen**: Tabla `empleados_sftp`

**Ejemplo**: 996 empleados han entrado desde 2001

#### 4. **Antigüedad Promedio** 📅
**¿Qué es?** Cuánto tiempo llevan trabajando tus empleados en promedio.

**Cómo se calcula**:
1. Por cada empleado activo:
   ```
   Antigüedad = Fecha_Hoy - fecha_ingreso (en meses)
   ```
2. Suma todas las antigüedades
3. Divide entre el número de empleados activos
   ```
   Antigüedad Promedio = Suma(Antigüedades) / Cantidad_Activos
   ```

**Origen**: Tabla `empleados_sftp`, campos `fecha_ingreso` y `activo = TRUE`

**Ejemplo**:
```
Empleado 1: 36 meses (3 años)
Empleado 2: 12 meses (1 año)
Empleado 3: 48 meses (4 años)
...
Total 372 empleados
Suma: 8,928 meses
Promedio: 8,928 / 372 = 24 meses (2 años)
```

#### 5. **Empleados Nuevos (< 3 meses)** 🐣
**¿Qué es?** Cuántos empleados son MUY nuevos.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Por cada empleado activo, calcula:
   ```
   Antigüedad = Fecha_Hoy - fecha_ingreso (en meses)
   ```
3. Cuenta cuántos tienen `Antigüedad < 3 meses`

**Origen**: Tabla `empleados_sftp`, campos `fecha_ingreso` y `activo = TRUE`

**Ejemplo**:
```
Filtro: activo = TRUE AND (Fecha_Hoy - fecha_ingreso) < 90 días
Resultado: 28 empleados muy nuevos
```

### 📊 Las 6 Gráficas

#### Gráfica 1: **Clasificación (Barras Horizontales)**
**¿Qué muestra?** Cuántos empleados son CONFIANZA vs SINDICALIZADO.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra solo activos (`activo = TRUE`)
3. Agrupa por el campo `clasificacion`
4. Cuenta cuántos hay en cada grupo

**Origen**: Tabla `empleados_sftp`, campo `clasificacion`

**Ejemplo**:
```
CONFIANZA:        ████████ 180 empleados
SINDICALIZADO:    ████████████ 192 empleados
```

#### Gráfica 2: **Género (Barras Horizontales)**
**¿Qué muestra?** Cuántos hombres vs mujeres.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra solo activos (`activo = TRUE`)
3. Agrupa por el campo `sexo` o `genero`
4. Cuenta cuántos hay en cada grupo

**Origen**: Tabla `empleados_sftp`, campo `sexo`

**Ejemplo**:
```
Hombres:   ███████████ 220 empleados
Mujeres:   ████████ 152 empleados
```

**NOTA**: Si tu tabla no tiene campo `sexo`, esta gráfica puede no mostrarse.

#### Gráfica 3: **Edades (Puntos Dispersos - Scatter Plot)**
**¿Qué muestra?** Distribución de edades de tus empleados.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra solo activos (`activo = TRUE`)
3. Por cada empleado, calcula edad:
   ```
   Edad = Fecha_Hoy - fecha_nacimiento (en años)
   ```
4. Dibuja un punto por cada empleado en el eje Y con su edad
5. El eje X puede ser el número de empleado o simplemente un índice

**Origen**: Tabla `empleados_sftp`, campo `fecha_nacimiento`

**Ejemplo visual**:
```
Edad
60 |     •   •
50 |   • • • • •
40 | • • • • • • • •
30 | • • • • • • • • • •
25 | • • • • •
20 | •
   +------------------
     Empleados
```

**NOTA**: Si tu tabla no tiene `fecha_nacimiento`, se usa una edad estimada o se omite.

#### Gráfica 4: **Por Departamento (Barras Verticales)**
**¿Qué muestra?** Cuánta gente hay en cada departamento.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra solo activos (`activo = TRUE`)
3. Agrupa por el campo `departamento`
4. Cuenta cuántos hay en cada departamento
5. Dibuja barras verticales

**Origen**: Tabla `empleados_sftp`, campo `departamento`

**Ejemplo**:
```
         120 ┐ ██
         100 ┤ ██
          80 ┤ ██  ██
          60 ┤ ██  ██  ██
          40 ┤ ██  ██  ██  ██
          20 ┤ ██  ██  ██  ██  ██
           0 └─────────────────────
              Ops  RH  Ven Log  Adm
```

#### Gráfica 5: **Por Área (Barras Verticales)**
**¿Qué muestra?** Cuánta gente hay en cada área.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra solo activos (`activo = TRUE`)
3. Agrupa por el campo `area`
4. Cuenta cuántos hay en cada área
5. Dibuja barras verticales

**Origen**: Tabla `empleados_sftp`, campo `area`

**Ejemplo con tus datos reales**:
```
         60 ┐ ██
         50 ┤ ██  ██
         40 ┤ ██  ██  ██
         30 ┤ ██  ██  ██  ██  ██
         20 ┤ ██  ██  ██  ██  ██
         10 ┤ ██  ██  ██  ██  ██
          0 └─────────────────────────
             Emp Sur Cal Sup Rec
            (47)(35) (8)(35)(28)
```

#### Gráfica 6: **Antigüedad por Área (Barras Apiladas)**
**¿Qué muestra?** En cada área, cuántos son nuevos vs veteranos.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra solo activos (`activo = TRUE`)
3. Por cada empleado, calcula antigüedad y clasifica:
   - 🟢 Verde: < 3 meses
   - 🔵 Azul: 3-6 meses
   - 🟣 Morado: 6-12 meses
   - 🔴 Rojo: > 12 meses
4. Agrupa por `area`
5. Cuenta cuántos hay en cada rango por área
6. Apila las barras por color

**Origen**: Tabla `empleados_sftp`, campos `area`, `fecha_ingreso`, `activo`

**Ejemplo**:
```
Empaque:  [🟢 5][🔵 8][🟣 10][🔴 24] = 47 total
Surtido:  [🟢 3][🔵 6][🟣 8][🔴 18] = 35 total
Calidad:  [🟢 1][🔵 1][🟣 2][🔴 4] = 8 total
```

---

## ⚠️ TAB 3: INCIDENCIAS - ¿Quién Faltó?

Este tab te muestra problemas de asistencia.

### 🔢 Las 4 Tarjetas

#### 1. **# de Activos** 👥
- **Fórmula**: ACTIVOS (ya explicada)
- **Origen**: Tabla `empleados_sftp`, `activo = TRUE`
- **Ejemplo**: 372 empleados

#### 2. **Empleados con Incidencias** ⚠️
**¿Qué es?** Cuántos empleados han tenido AL MENOS 1 incidencia.

**Cómo se calcula**:
1. Ve a tabla `incidencias`
2. Filtra el período que quieres ver (ej: todo el año 2025)
3. Agrupa por `emp` (número de empleado)
4. Cuenta cuántos empleados ÚNICOS aparecen
   ```
   CUENTA_ÚNICOS(emp de incidencias)
   ```

**Origen**: Tabla `incidencias`, campo `emp`

**Ejemplo histórico (Todos los tiempos)**:
```
405 empleados han tenido al menos 1 incidencia (de 996 totales = 40.7%)
```

**Por tipo de incidencia**:
- VAC: 264 empleados (26.5%)
- FI: 155 empleados (15.6%)
- PSIN: 107 empleados (10.7%)
- PCON: 100 empleados (10.0%)
- SUSP: 40 empleados (4.0%)
- ENFE: 37 empleados (3.7%)
- FEST: 49 empleados (4.9%)
- MAT3: 6 empleadas (0.6%)
- ACCI: 2 empleados (0.2%)
- PATER: 1 empleado (0.1%)

**Ejemplo real (Septiembre 2025)**:
```
2 empleados tuvieron incidencias en septiembre
- 1 empleada con MAT3 (maternidad)
- 1 empleado con VAC (vacaciones)
```

#### 3. **Total Incidencias** 📊
**¿Qué es?** Cuántas incidencias "malas" hay.

**Cómo se calcula**:
1. Ve a tabla `incidencias`
2. Filtra el período (ej: septiembre 2025)
3. Filtra solo incidencias "malas":
   - FI (Falta Injustificada)
   - SUSP (Suspensión)
   - PSIN (Permiso Sin Goce)
   - ENFE (Enfermedad)
   - ACCI (Accidente)
4. Cuenta cuántos registros hay

**Origen**: Tabla `incidencias`, campo `inci`

**Ejemplo real (Septiembre 2025)**:
```
Filtro: inci IN ('FI', 'SUSP', 'PSIN', 'ENFE', 'ACCI') en septiembre
Resultado: 0 incidencias malas (¡ninguna! Solo hubo permisos buenos) ✅
```

#### 4. **Total Permisos** ✅
**¿Qué es?** Cuántos permisos "buenos" hay.

**Cómo se calcula**:
1. Ve a tabla `incidencias`
2. Filtra el período (ej: septiembre 2025)
3. Filtra solo permisos "buenos":
   - VAC (Vacaciones)
   - PCON (Permiso Con Goce)
   - MAT3 (Maternidad)
   - PATER (Paternidad)
4. Cuenta cuántos registros hay

**Origen**: Tabla `incidencias`, campo `inci`

**Ejemplo real (Septiembre 2025)**:
```
Filtro: inci IN ('VAC', 'PCON', 'MAT3', 'PATER') en septiembre
Resultado: 12 permisos totales ✅
- 9 registros de MAT3 (1 empleada)
- 3 registros de VAC (1 empleado)
```

### 📊 Las 4 Gráficas

#### Gráfica 1: **Tendencia Mensual (Líneas)**
**¿Qué muestra?** Cómo van las incidencias y permisos mes a mes.

**Cómo se calcula**:
1. Por cada mes del año (enero a diciembre):
2. Ve a tabla `incidencias` y filtra por mes
3. Cuenta incidencias "malas": FI, SUSP, PSIN, ENFE, ACCI
4. Cuenta permisos "buenos": VAC, PCON, MAT3, PATER
5. Dibuja 2 líneas:
   - 🔴 Roja: Incidencias malas
   - 🟢 Verde: Permisos buenos

**Origen**: Tabla `incidencias`, campos `inci` y `fecha`

**Cómo se relaciona**:
```
incidencias.emp = empleados_sftp.numero_empleado
```

**Ejemplo visual (2025 con datos históricos proyectados)**:
```
       Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep
Incid: 145  138  142  150  148  155  160  152  0   (rojo)
Perm:  125  122  120  118  122  125  128  130  12  (verde)
```

**Nota**: Septiembre 2025 tuvo 0 incidencias malas (solo permisos buenos) ✅

#### Gráfica 2: **Histograma de Incidencias**
**¿Qué muestra?** Cuántos empleados tienen 1, 2, 3... incidencias.

**Cómo se calcula**:
1. Ve a tabla `incidencias`
2. Filtra el período (ej: todo el año 2025 o solo septiembre)
3. Filtra solo incidencias "malas" (FI, SUSP, PSIN, ENFE, ACCI)
4. Agrupa por `emp` (número de empleado)
5. Cuenta cuántas incidencias tiene cada empleado
6. Agrupa esos resultados en rangos:
   - Empleados con 1 incidencia
   - Empleados con 2 incidencias
   - Empleados con 3 incidencias
   - Empleados con 4+ incidencias
7. Dibuja barras

**Origen**: Tabla `incidencias`, campo `emp`

**Cómo se relaciona**:
```
incidencias.emp = empleados_sftp.numero_empleado
```

**Ejemplo histórico (todos los tiempos)**:
```
1 incidencia:    ████████ 85 empleados
2-3 incidencias: ████ 40 empleados
4-5 incidencias: ██ 20 empleados
6+ incidencias:  █ 10 empleados
```

**Ejemplo real (Septiembre 2025)**:
```
0 incidencias malas: ███████████ 372 empleados (100%) ✅
```

#### Gráfica 3: **Tabla por Tipo**
**¿Qué muestra?** Detalles de cada tipo de incidencia.

**Cómo se calcula**:
1. Ve a tabla `incidencias`
2. Filtra el período (ej: septiembre 2025)
3. Agrupa por `inci` (código del tipo: FI, VAC, MAT3, etc.)
4. Por cada tipo:
   - Cuenta cuántos registros hay (total de ocurrencias)
   - Cuenta cuántos empleados únicos (CUENTA_ÚNICOS de `emp`)
5. Muestra en tabla ordenada por frecuencia

**Origen**: Tabla `incidencias`, campos `inci` y `emp`

**Cómo se relaciona**:
```
incidencias.emp = empleados_sftp.numero_empleado
```

**Ejemplo real (Septiembre 2025)**:
```
Tipo    | Registros | Empleados | Categoría
MAT3    | 9         | 1         | Bueno (Maternidad)
VAC     | 3         | 1         | Bueno (Vacaciones)
PCON    | 0         | 0         | Bueno (Permiso con goce)
FI      | 0         | 0         | Malo (Falta injustificada)
SUSP    | 0         | 0         | Malo (Suspensión)
PSIN    | 0         | 0         | Malo (Permiso sin goce)
ENFE    | 0         | 0         | Malo (Enfermedad)
ACCI    | 0         | 0         | Malo (Accidente)
```

**Ejemplo histórico (Todos los tiempos - Top 5)**:
```
Tipo    | Registros | Empleados | %
VAC     | 2,443     | 264       | 49.6%
FI      | 639       | 155       | 13.0%
ENFE    | 541       | 37        | 11.0%
PSIN    | 438       | 107       | 8.9%
MAT3    | 426       | 6         | 8.7%
```

#### Gráfica 4: **Pastel (Incidencias vs Permisos)**
**¿Qué muestra?** Proporción de problemas vs permisos.

**Cómo se calcula**:
1. Ve a tabla `incidencias` y filtra el período
2. Cuenta total de incidencias "malas" (FI, SUSP, PSIN, ENFE, ACCI)
3. Cuenta total de permisos "buenos" (VAC, PCON, MAT3, PATER)
4. Calcula porcentajes:
   ```
   % Incidencias = (Incidencias Malas / Total) × 100
   % Permisos = (Permisos Buenos / Total) × 100
   ```
5. Dibuja círculo dividido con colores

**Origen**: Tabla `incidencias`, campo `inci`

**Cómo se relaciona**:
```
incidencias.emp = empleados_sftp.numero_empleado
```

**Ejemplo real (Septiembre 2025)**:
```
Total: 12 registros
Incidencias malas: 0 → 0% ✅
Permisos buenos: 12 → 100%

Círculo: 🟢 100% verde (todo permisos, cero problemas)
```

**Ejemplo histórico (Todos los tiempos)**:
```
Total: 4,923 registros
Incidencias malas: 1,722 → 35% 🔴
Permisos buenos: 3,147 → 64% 🟢
Neutros: 54 → 1% ⚪
```

### 📋 Tabla Completa de Incidencias
**¿Qué muestra?** TODAS las incidencias con detalles del empleado.

**Cómo se calcula**:
1. Ve a tabla `incidencias`
2. Filtra el período (ej: septiembre 2025)
3. Por cada registro de incidencia:
   - Toma `fecha` - Qué día ocurrió
   - Toma `inci` - Tipo de incidencia (FI, VAC, MAT3, etc.)
   - Toma `emp` - Número de empleado
4. Busca el empleado en `empleados_sftp` usando:
   ```
   incidencias.emp = empleados_sftp.numero_empleado
   ```
5. Trae los datos del empleado:
   - Empresa (campo `empresa`)
   - Departamento (campo `departamento`)
   - Área (campo `area`)
   - Puesto (campo `puesto`)
   - Nombre completo (campo `nombre_completo`)
6. Muestra todo en una tabla con filtros y ordenamiento

**Origen**:
- **Tabla principal**: `incidencias` (fecha, tipo, empleado)
- **Tabla relacionada**: `empleados_sftp` (empresa, depto, área, puesto, nombre)

**Cómo se relacionan**:
```
incidencias.emp = empleados_sftp.numero_empleado
```

**Ejemplo real (Septiembre 2025)**:
```
Fecha       | Tipo | #Emp  | Nombre          | Empresa         | Área    | Puesto
2025-09-05  | MAT3 | 10234 | María González  | MOTO REPUESTOS  | Empaque | Operadora
2025-09-12  | VAC  | 10456 | Juan Pérez      | MOTO REPUESTOS  | Surtido | Almacenista
```

**Campos disponibles en la tabla completa**:
- Fecha de la incidencia
- Tipo (código: FI, VAC, MAT3, etc.)
- Descripción del tipo
- Número de empleado
- Nombre completo del empleado
- Empresa/Negocio
- Departamento
- Área
- Puesto
- Clasificación (CONFIANZA/SINDICALIZADO)
- Turno (si está disponible en `incidencias.turno`)
- Horario (si está disponible en `incidencias.horario`)

---

## 🔄 TAB 4: RETENCIÓN - ¿Quién se Fue y Por Qué?

Este tab analiza por qué se va la gente.

### 🔢 Las 5 Tarjetas

#### 1. **Activos Promedio** 👥
- **Fórmula**: ACTIVOS PROMEDIO (ya explicada)
- **Origen**: Tabla `empleados_sftp`
- **Ejemplo**: 372 empleados

#### 2. **Bajas** ↘️
**Principal**: Total histórico de bajas
**Secundario**: Cuántas fueron voluntarias

**Cómo se calcula el secundario**:
1. Ve a tabla `motivos_baja`
2. Cuenta registros donde `tipo = 'Voluntaria'`

**Origen**:
- Tabla `empleados_sftp` (total)
- Tabla `motivos_baja` (voluntarias)

**Ejemplo**:
```
Total bajas: 624
Voluntarias: 320 (51.3%)
```

#### 3. **Rotación Mensual** 📉
**Principal**: % de rotación del mes
**Secundario**: % de rotación voluntaria

**Cómo se calcula el secundario**:
1. Cuenta bajas voluntarias del mes
2. Divide entre activos promedio
   ```
   Rot Vol = (Bajas Vol / Activos Prom) × 100
   ```

**Origen**: Tabla `motivos_baja`, campo `tipo`

**Ejemplo** (Septiembre):
```
Total: 2.15%
Voluntaria: 1.34% (62% del total)
```

#### 4. **Rotación 12 Meses Móviles** 📊
- **Fórmula**: ROTACIÓN 12 MESES (ya explicada)
- **Origen**: Tabla `empleados_sftp`
- **Ejemplo**: 25.95%

#### 5. **Rotación YTD** 📅
- **Fórmula**: ROTACIÓN YTD (ya explicada)
- **Origen**: Tabla `empleados_sftp`
- **Ejemplo**: 21.74%

### 📊 Las 3 Gráficas Especializadas

#### Gráfica 1: **Rotación Acumulada 12 Meses (Líneas)**
- **Ya explicada** en Tab Resumen, Gráfica 3
- Compara año pasado vs este año

#### Gráfica 2: **Rotación Mensual con 2 Escalas (Líneas)**
**¿Qué muestra?** 3 cosas a la vez:
- 🔴 % de rotación
- 🟠 Número de bajas
- 🟢 Número de activos

**Cómo se calcula**:
1. Por cada mes:
2. Calcula rotación mensual (eje Y izquierdo)
3. Cuenta bajas del mes (eje Y derecho)
4. Cuenta activos del mes (eje Y derecho)
5. Dibuja 3 líneas con 2 escalas diferentes

**Origen**: Tabla `empleados_sftp`

**Ejemplo**:
```
       Ene  Feb  Mar
Rot:   3.2% 2.8% 4.1%  (eje izquierdo)
Bajas: 12   10   15     (eje derecho)
Activ: 375  357  366    (eje derecho)
```

#### Gráfica 3: **Barras de Rotación por Temporalidad**
**¿Qué muestra?** Cuánto tiempo trabajaron las personas antes de irse.

**Cómo se calcula**:
1. Ve a tabla `empleados_sftp`
2. Filtra solo bajas (`fecha_baja` no vacía)
3. Por cada baja, calcula cuánto tiempo trabajó:
   ```
   Meses Trabajados = fecha_baja - fecha_ingreso (en meses)
   ```
4. Clasifica en rangos:
   - 🔴 < 3 meses (rotación temprana)
   - 🟠 3-6 meses
   - 🟡 6-12 meses
   - 🟢 > 12 meses (rotación normal)
5. Cuenta cuántos hay en cada rango
6. Dibuja barras por color

**Origen**: Tabla `empleados_sftp`, campos `fecha_ingreso` y `fecha_baja`

**Ejemplo con tus datos reales**:
```
< 3 meses:    ████████ 120 bajas (19.3%) 🔴 PROBLEMA
3-6 meses:    ████ 60 bajas (9.7%) 🟠
6-12 meses:   ███ 45 bajas (7.2%) 🟡
> 12 meses:   ████████████ 399 bajas (64.1%) 🟢 NORMAL
```

### 📋 Las 2 Tablas Comparativas

#### Tabla 1: **Rotación Acumulada (Mes a Mes)**
**¿Qué muestra?** Comparación de rotación acumulada este año vs el año pasado.

**Cómo se calcula**:
1. Por cada mes (enero a diciembre):
2. Calcula rotación 12 meses para año actual
3. Calcula rotación 12 meses para año pasado
4. Calcula diferencia:
   ```
   Variación = Actual - Pasado
   ```
5. Muestra en tabla con colores:
   - 🟢 Verde si mejoró (bajó)
   - 🔴 Rojo si empeoró (subió)

**Origen**: Tabla `empleados_sftp`

**Ejemplo**:
```
Mes    | 2024  | 2025  | Var
Enero  | 25.0% | 24.0% | -1.0% 🟢
Feb    | 26.0% | 23.0% | -3.0% 🟢
Marzo  | 24.0% | 22.0% | -2.0% 🟢
```

#### Tabla 2: **Rotación Mensual (Mes a Mes)**
**¿Qué muestra?** Comparación de rotación mensual este año vs el año pasado.

**Cómo se calcula**:
1. Por cada mes (enero a diciembre):
2. Calcula rotación mensual para año actual
3. Calcula rotación mensual para año pasado (mismo mes)
4. Calcula diferencia
5. Muestra en tabla con colores

**Origen**: Tabla `empleados_sftp`

**Ejemplo**:
```
Mes    | 2024  | 2025  | Var
Sept   | 2.65% | 2.15% | -0.50% 🟢 Mejoró
Agosto | 3.20% | 2.80% | -0.40% 🟢 Mejoró
```

### 🔥 Mapa de Calor (Heatmap)

**¿Qué muestra?** Motivos de baja por mes, con colores según intensidad.

**Cómo se calcula**:

**PASO 1: Obtén los datos**
1. Ve a tabla `motivos_baja`
2. Filtra solo el año que quieres ver (ej: 2025)
3. Por cada registro:
   - Toma el `motivo` (o `descripcion`)
   - Toma el mes de `fecha_baja`

**PASO 2: Cuenta por motivo y mes**
1. Crea una tabla de conteo:
   ```
   Motivo                  | Ene | Feb | Mar | ... | Dic
   Renuncia                | 5   | 3   | 4   | ... | 2
   Abandono                | 2   | 4   | 3   | ... | 1
   Término contrato        | 1   | 1   | 2   | ... | 3
   ```
2. Por cada combinación motivo+mes, cuenta cuántas bajas hay

**PASO 3: Colorea según intensidad**
1. Encuentra el máximo número en toda la tabla (ej: 10 bajas)
2. Asigna colores según la intensidad:
   - 0 bajas: Blanco
   - 1-2 bajas: Naranja claro
   - 3-5 bajas: Naranja medio
   - 6-8 bajas: Naranja oscuro
   - 9+ bajas: Rojo

**Origen**: Tabla `motivos_baja`, campos `motivo`, `descripcion`, `fecha_baja`

**Ejemplo visual**:
```
Motivo                  | E | F | M | A | M | J | J | A | S
Renuncia                | 🟠| 🟡| 🟠| ⬜| 🟡| 🟠| 🔴| 🟠| 🟡
Abandono                | 🟡| 🟠| 🟡| 🟡| ⬜| 🟠| 🟠| 🟡| ⬜
Término contrato        | ⬜| ⬜| 🟡| 🟡| 🟠| 🟡| ⬜| 🟠| 🟡

⬜ = 0 bajas
🟡 = 1-2 bajas
🟠 = 3-5 bajas
🔴 = 6+ bajas
```

### 📊 Tabla de Motivos

**¿Qué muestra?** Top motivos de baja con porcentajes.

**Cómo se calcula**:
1. Ve a tabla `motivos_baja`
2. Agrupa por `motivo` (o `descripcion`)
3. Cuenta cuántos hay de cada motivo
4. Calcula porcentaje:
   ```
   % = (Cantidad del motivo / Total bajas) × 100
   ```
5. Ordena de mayor a menor
6. Muestra top 10 o top 15

**Origen**: Tabla `motivos_baja`, campos `motivo`, `descripcion`

**Ejemplo con tus datos reales**:
```
Motivo                           | Cantidad | %
Otra razón                       | 67       | 11.13%
Abandono / No regresó            | 46       | 7.64%
Término del contrato             | 36       | 5.98%
Rescisión por desempeño          | 12       | 1.99%
Otro trabajo mejor compensado    | 8        | 1.33%
```

---

## 📈 TAB 5: TENDENCIAS - ¿Cómo se Relacionan las Cosas?

Este tab busca **correlaciones** entre diferentes métricas.

### 🔥 Matriz de Correlación (Heatmap de Colores)

**¿Qué es una correlación?**
Es qué tan relacionadas están 2 variables. Por ejemplo:
- Si cuando suben las incidencias, también sube la rotación → Correlación positiva
- Si cuando suben los activos, baja la rotación → Correlación negativa

**¿Qué muestra?** Un cuadro con colores que dice qué tan relacionadas están:
- Activos
- Bajas
- Rotación
- Incidencias
- % Incidencias

**Cómo se calcula**:

**PASO 1: Obtén los datos mes a mes**
Por cada mes del año (enero a diciembre):
1. Calcula Activos (promedio del mes)
2. Calcula Bajas (del mes)
3. Calcula Rotación (del mes)
4. Calcula Incidencias (del mes)
5. Calcula % Incidencias (del mes)

Tendrás algo así:
```
Mes  | Act | Bajas | Rot  | Inc | %Inc
Ene  | 370 | 12    | 3.2% | 45  | 4.5%
Feb  | 357 | 10    | 2.8% | 38  | 4.2%
Mar  | 366 | 15    | 4.1% | 42  | 4.0%
...
```

**PASO 2: Calcula la correlación**
Usa la **Fórmula de Pearson** (matemática estadística) para cada par de variables.

No voy a poner la fórmula matemática completa porque es compleja, pero básicamente:
1. Toma los valores de 2 variables (ej: Bajas e Incidencias)
2. Calcula qué tan "juntas" se mueven
3. El resultado es un número entre -1 y +1:
   - **+1** = Correlación perfecta positiva (siempre van juntas)
   - **0** = No hay correlación (son independientes)
   - **-1** = Correlación perfecta negativa (una sube, la otra baja)

**PASO 3: Colorea la matriz**
1. Crea una tabla de NxN (5x5 en este caso)
2. Por cada par de variables, pon el número de correlación
3. Colorea según el valor:
   - 🔴 Rojo: Correlación > 0.7 (muy relacionadas)
   - 🟠 Naranja: Correlación 0.3 a 0.7 (algo relacionadas)
   - ⚪ Blanco: Correlación -0.3 a 0.3 (no relacionadas)
   - 🔵 Azul: Correlación < -0.3 (relación inversa)

**Origen**: Todas las métricas calculadas mes a mes de las tablas `empleados_sftp`, `motivos_baja` e `incidencias`

**Cómo se relacionan las tablas**:
```
incidencias.emp = empleados_sftp.numero_empleado
motivos_baja.numero_empleado = empleados_sftp.numero_empleado
```

**Ejemplo visual**:
```
             | Activos | Bajas | Rot | Inc | %Inc
Activos      | 1.00🔴 | -0.15⚪| -0.25⚪| 0.10⚪| -0.05⚪
Bajas        | -0.15⚪| 1.00🔴 | 0.95🔴| 0.45🟠| 0.30🟠
Rotación     | -0.25⚪| 0.95🔴 | 1.00🔴| 0.50🟠| 0.35🟠
Incidencias  | 0.10⚪ | 0.45🟠 | 0.50🟠| 1.00🔴| 0.85🔴
%Incidencias | -0.05⚪| 0.30🟠 | 0.35🟠| 0.85🔴| 1.00🔴
```

**Interpretación del ejemplo**:
- **Bajas ↔ Rotación**: 0.95 🔴 (Muy relacionadas - obvio, rotación se calcula con bajas)
- **Incidencias ↔ %Inc**: 0.85 🔴 (Muy relacionadas - también obvio)
- **Bajas ↔ Incidencias**: 0.45 🟠 (Algo relacionadas - cuando hay más incidencias, hay más bajas)
- **Activos ↔ Rotación**: -0.25 ⚪ (Poca relación inversa)

---

## ⚙️ TAB 6: AJUSTES - Control de Cambios

Este tab permite corregir errores en los datos y dejar registro.

### ¿Cómo funciona?

**Escenario**: Descubres que en septiembre contaste 15 bajas, pero en realidad fueron 8.

**PASO 1: Selecciona qué quieres corregir**
- KPI: "Rotación Mensual"
- Mes: Septiembre 2025

**PASO 2: Ingresa el nuevo valor**
- Valor actual: 4.05%
- Valor nuevo: 2.15%
- Diferencia: -1.90% (47% de cambio)

**PASO 3: El sistema valida**
Según el % de cambio:
- **< 10%**: ✅ Se acepta automáticamente
- **10-25%**: ⚠️ Requiere justificación (campo de texto)
- **25-50%**: 🚨 Requiere aprobación del supervisor
- **> 50%**: 🔐 Requiere aprobación de gerencia + auditoría

**PASO 4: Se guarda en auditoría**
Se crea un registro en tabla `kpi_adjustments`:
```
id: 1
kpi_name: "Rotación Mensual"
period: "2025-09"
previous_value: 4.05
new_value: 2.15
difference: -1.90
percent_change: -46.91
reason: "Error en conteo de bajas - se contaron 15 pero fueron 8"
adjusted_by: "usuario@empresa.com"
adjusted_at: "2025-10-14 10:30:00"
approved_by: "supervisor@empresa.com"
approval_level: "supervisor"
```

**PASO 5: El dashboard se actualiza**
De ahora en adelante, cuando veas septiembre 2025, verás:
- Rotación: 2.15% (con un ícono de "ajustado" 📝)

### Tabla de Auditoría

**¿Qué muestra?** TODOS los cambios que se han hecho.

**Origen**: Tabla `kpi_adjustments`

**Ejemplo**:
```
Fecha       | KPI             | Período | Antes | Después | Razón              | Usuario
2025-10-14  | Rotación Mens   | 2025-09 | 4.05% | 2.15%   | Error en conteo    | Juan
2025-10-10  | Incidencias     | 2025-08 | 50    | 45      | Duplicado removido | María
2025-10-05  | Activos Prom    | 2025-07 | 380   | 375     | Corrección SFTP    | Pedro
```

---

## 🔍 SISTEMA DE FILTROS - Cómo Funcionan

Los filtros son SUPER IMPORTANTES porque permiten **enfocarte** en lo que quieres ver.

### Los 8 Filtros Disponibles

#### 1. **Filtro de Año** 📅
**¿Qué hace?** Muestra solo datos de un año específico.

**Cómo funciona**:
1. Usuario selecciona: 2025
2. El sistema filtra TODAS las consultas a las 3 tablas:
   - En `empleados_sftp`: Solo empleados con `fecha_ingreso` o `fecha_baja` en 2025
   - En `incidencias`: Solo registros con `fecha` en 2025
   - En `motivos_baja`: Solo bajas con `fecha_baja` en 2025
3. Recalcula todos los KPIs con esos datos filtrados

#### 2. **Filtro de Mes** 📆
**¿Qué hace?** Muestra solo datos de un mes específico.

**Cómo funciona**:
1. Usuario selecciona: Septiembre
2. El sistema filtra por mes = 9 (septiembre es mes 9)
3. Si también hay filtro de año, combina: Año 2025 + Mes 9 = Septiembre 2025

#### 3. **Filtro de Negocio/Empresa** 🏢
**¿Qué hace?** Muestra solo datos de una empresa.

**Cómo funciona**:
1. Usuario selecciona: "MOTO REPUESTOS MONTERREY"
2. En `empleados_sftp`: Filtra `empresa = 'MOTO REPUESTOS MONTERREY'`
3. Trae solo empleados de esa empresa
4. Los KPIs se calculan SOLO con esos empleados

#### 4. **Filtro de Área** 🏭
**¿Qué hace?** Muestra solo datos de un área.

**Cómo funciona**:
1. Usuario selecciona: "Empaque"
2. En `empleados_sftp`: Filtra `area = 'Empaque'`
3. Trae solo los 47 empleados de Empaque
4. Los KPIs se calculan SOLO con esos 47

#### 5. **Filtro de Departamento** 📊
**¿Qué hace?** Muestra solo datos de un departamento.

**Cómo funciona**:
1. Usuario selecciona: "Operaciones"
2. En `empleados_sftp`: Filtra `departamento = 'Operaciones'`
3. Los KPIs se calculan SOLO con ese departamento

#### 6. **Filtro de Puesto** 💼
**¿Qué hace?** Muestra solo datos de un puesto.

**Cómo funciona**:
1. Usuario selecciona: "Almacenista"
2. En `empleados_sftp`: Filtra `puesto = 'Almacenista'`
3. Los KPIs se calculan SOLO con almacenistas

#### 7. **Filtro de Clasificación** 🏷️
**¿Qué hace?** Muestra solo CONFIANZA o SINDICALIZADO.

**Cómo funciona**:
1. Usuario selecciona: "SINDICALIZADO"
2. En `empleados_sftp`: Filtra `clasificacion = 'SINDICALIZADO'`
3. Los KPIs se calculan SOLO con sindicalizados

#### 8. **Filtro de Ubicación** 📍
**¿Qué hace?** Muestra solo datos de una planta/sucursal.

**Cómo funciona**:
1. Usuario selecciona: "Monterrey"
2. En `empleados_sftp`: Filtra `ubicacion = 'Monterrey'`
3. Los KPIs se calculan SOLO con esa ubicación

### Combinación de Filtros

**LO IMPORTANTE**: Puedes combinar TODOS los filtros a la vez.

**Ejemplo real**:
```
Año: 2025
Mes: Septiembre
Empresa: MOTO REPUESTOS MONTERREY
Área: Empaque
```

**Resultado**:
El dashboard te muestra SOLO:
- Empleados de MOTO REPUESTOS
- Del área de Empaque
- Con datos de septiembre 2025

Todos los KPIs, gráficas y tablas se recalculan con ESE subconjunto de datos.

### Cómo Funcionan Internamente

**Detrás de escena**:
1. Usuario selecciona filtros
2. El sistema construye una consulta SQL (lenguaje de base de datos) así:
   ```sql
   SELECT * FROM empleados_sftp
   WHERE activo = TRUE
     AND YEAR(fecha_ingreso) <= 2025
     AND (fecha_baja IS NULL OR YEAR(fecha_baja) >= 2025)
     AND empresa = 'MOTO REPUESTOS MONTERREY'
     AND area = 'Empaque'
   ```
3. Obtiene solo los registros que cumplen TODO
4. Con esos registros, calcula todos los KPIs
5. Muestra los resultados

---

## 📊 RESUMEN FINAL - Flujo de Datos Completo

### Paso a Paso: ¿Qué Pasa Cuando Abres el Dashboard?

**PASO 1: Conexión a Base de Datos**
1. El dashboard se conecta a Supabase (PostgreSQL)
2. Trae las 3 tablas principales:
   - `empleados_sftp` (996 registros totales, 372 activos)
   - `motivos_baja` (602 registros de bajas)
   - `incidencias` (4,923 registros históricos de incidencias)

**PASO 2: Aplica Filtros Predeterminados**
- Año: 2025
- Mes: Octubre (mes actual)
- Todo lo demás: sin filtrar

**PASO 3: Calcula los 9 KPIs Principales**
Usando las fórmulas explicadas arriba:
1. Activos
2. Días
3. Activos Promedio
4. Bajas
5. Rotación Mensual
6. Rotación 12 Meses
7. Rotación YTD
8. Incidencias
9. Inc Prom x Empleado

**PASO 4: Genera Datos para Gráficas**
Por cada gráfica:
1. Agrupa datos según lo que necesita
2. Cuenta, suma, promedia según corresponda
3. Prepara los datos en formato JSON para Recharts

**PASO 5: Muestra Todo en la UI**
1. Renderiza las 6 tarjetas con números
2. Dibuja las 4 gráficas con Recharts
3. Llena las tablas con filas
4. Aplica colores según semáforos

**PASO 6: Espera Interacción del Usuario**
- Si cambias un filtro → Vuelve al PASO 2
- Si cambias de tab → Carga ese tab específico
- Si refrescas → Vuelve al PASO 1

---

## ✅ VALIDACIONES Y CALIDAD DE DATOS

### ¿Cómo se Asegura que los Datos Sean Correctos?

#### 1. **Validación de Fechas**
- `fecha_ingreso` debe ser <= `fecha_baja`
- `fecha_baja` no puede ser futura (> hoy)

#### 2. **Validación de Activos**
- Si `activo = TRUE`, entonces `fecha_baja` debe ser NULL
- Si `activo = FALSE`, entonces `fecha_baja` debe tener valor

#### 3. **Validación de Incidencias**
- El campo `emp` en `incidencias` debe corresponder a un `numero_empleado` existente en `empleados_sftp`
- La `fecha` de la incidencia no puede ser futura (> hoy)
- El campo `inci` debe ser uno de los 10 tipos válidos (VAC, FI, ENFE, PSIN, MAT3, PCON, SUSP, FEST, ACCI, PATER)

#### 4. **Validación de Relaciones**
- Cada `numero_empleado` en `motivos_baja` debe existir en `empleados_sftp`
- Cada `emp` en `incidencias` debe existir como `numero_empleado` en `empleados_sftp`

**Las relaciones clave**:
```
incidencias.emp = empleados_sftp.numero_empleado
motivos_baja.numero_empleado = empleados_sftp.numero_empleado
```

### ¿Qué Pasa si Hay Datos Malos?

El sistema:
1. ⚠️ Muestra advertencias en consola (para desarrolladores)
2. 🔧 Intenta corregir automáticamente (ej: reemplaza NULL por 0)
3. 📝 Registra en logs para auditoría
4. 🚨 Si es crítico, no muestra el KPI y muestra mensaje de error

---

## 🎓 CONCLUSIÓN

**Ahora ya sabes CÓMO se calcula TODO** 😄

**Las 3 tablas que alimentan todo**:
1. `empleados_sftp` - La tabla maestra con TODA la info de empleados (996 totales, 372 activos)
2. `motivos_baja` - Detalles de por qué se fue cada persona (602 bajas históricas)
3. `incidencias` - Registro histórico de todas las incidencias: faltas, permisos, vacaciones (4,923 registros, 10 tipos diferentes)

**Cómo se relacionan las tablas**:
```
incidencias.emp = empleados_sftp.numero_empleado
motivos_baja.numero_empleado = empleados_sftp.numero_empleado
```

La tabla `empleados_sftp` es el "centro" que conecta todo. Las otras 2 tablas se relacionan con ella a través del número de empleado.

**Las 9 fórmulas maestras**:
1. Activos = CUENTA(activo = TRUE)
2. Días = CUENTA_ÚNICOS(fechas)
3. Activos Prom = (Inicio + Final) / 2
4. Bajas = CUENTA(fecha_baja no vacía)
5. Rotación = (Bajas / Activos Prom) × 100
6. Rotación 12m = (Bajas 12m / Prom 12m) × 100
7. Rotación YTD = (Bajas año / Prom año) × 100
8. Incidencias = CUENTA(horas_incidencia > 0)
9. Inc Prom = Incidencias / Activos Prom

**Todo lo demás** son variaciones, agrupaciones y visualizaciones de estas 9 fórmulas.

---

**¿Tienes dudas sobre algún cálculo específico?** 🤔
Ahora sabes exactamente de dónde sale cada número del dashboard. ¡Sin magia, solo matemáticas y bases de datos!

---

**Última actualización**: 14 de Octubre, 2025
**Versión**: 1.0 - Explicación Sin Código
**Audiencia**: Cualquier persona que quiera entender el "cómo"
