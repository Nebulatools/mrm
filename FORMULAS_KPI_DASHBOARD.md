# FÓRMULAS KPI DASHBOARD HR

**Documento Ejecutivo Completo** | Última actualización: Enero 2025

---

## RESUMEN RÁPIDO

| Tab | KPIs | Gráficas | Tablas |
|-----|------|----------|--------|
| Resumen | 6 | 6 | 1 |
| Incidencias | 4 | 6 | 2 |
| Rotación | 4 | 4 | 6 |

---

# TAB 1: RESUMEN

## KPI Cards (6)

### 1. Empleados Activos
```
Activos = COUNT(empleados WHERE activo = TRUE en fecha)
```
**Comparación:** vs mes anterior

---

### 2. Rotación Mensual
```
Rotación % = (Bajas del mes ÷ Activos Promedio) × 100

Activos Promedio = (Activos inicio mes + Activos fin mes) ÷ 2
```
**Default:** Muestra VOLUNTARIA | **Toggle:** Total, Involuntaria, Voluntaria

**Ejemplo:** 6 bajas ÷ 82 activos prom × 100 = **7.3%**

---

### 3. Rotación 12 Meses Móviles
```
Rotación 12M % = (Bajas últimos 12 meses ÷ Activos Promedio 12M) × 100
```
**Período:** Desde hace 11 meses hasta fin del mes actual

**Ejemplo:** 50 bajas 12M ÷ 80 activos prom × 100 = **62.5%**

---

### 4. Rotación Año Actual (YTD)
```
Rotación YTD % = (Bajas desde 1-Ene ÷ Activos Promedio YTD) × 100
```
**Período:** 1 de enero hasta fin del mes actual

**Ejemplo:** 25 bajas YTD ÷ 85 activos prom × 100 = **29.4%**

---

### 5. % Incidencias
```
% Incidencias = (Total Incidencias ÷ Días Laborados) × 100

Días Laborados = Empleados Activos × Días Laborables (L-S)
```
**Códigos:** FI, SUSP, ENFE, MAT3, MAT1

---

### 6. % Permisos
```
% Permisos = (Total Permisos ÷ Días Laborados) × 100
```
**Códigos:** PSIN, PCON, FEST, PATER, JUST (SIN Vacaciones)

---

## Gráficas Tab Resumen (6)

### 1. Empleados Activos por Antigüedad
- **Tipo:** Barras apiladas por ubicación
- **Eje X:** Ubicaciones (CAD, CORPORATIVO, FILIALES)
- **Eje Y:** Número de empleados
- **Categorías:** 0-3 meses, 3-6 meses, 6-12 meses, 1-3 años, +3 años
```
Antigüedad (meses) = (Fecha_Actual - Fecha_Ingreso) ÷ 30.44
```

---

### 2. Rotación Mensual (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** ene-dic (FIJO, solo año seleccionado)
- **Eje Y:** % Rotación mensual
- **Toggle:** Total, Involuntaria, Voluntaria (default)
```
Rotación % = (Bajas ubicación en mes ÷ Activos Prom ubicación) × 100
```

---

### 3. Rotación - 12 Meses Móviles (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** Últimos 12 meses DINÁMICOS (Feb 24, Mar 24... Ene 25)
- **Eje Y:** % Rotación 12M
- **Toggle:** Total, Involuntaria, Voluntaria (default)
```
Rotación 12M % = Bajas ubicación 12M ÷ Activos Prom ubicación 12M × 100
```

---

### 4. Rotación - Lo que va del Año (YTD por Ubicación)
- **Tipo:** Líneas acumuladas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** ene-dic (FIJO)
- **Eje Y:** % Rotación YTD
- **Toggle:** Total, Involuntaria, Voluntaria (default)
```
Rotación YTD % = Bajas acumuladas ubicación desde Ene ÷ Activos Prom ubicación × 100
```

---

### 5. Incidencias - Últimos 12 Meses (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** Últimos 12 meses dinámicos
- **Eje Y:** % de empleados con incidencias
```
% Incidencias = (Empleados únicos con incidencias ÷ Activos ubicación) × 100
```

---

### 6. Permisos - Últimos 12 Meses (por Ubicación)
- **Tipo:** Líneas (CAD, CORPORATIVO, FILIALES)
- **Eje X:** Últimos 12 meses dinámicos
- **Eje Y:** % de empleados con permisos
```
% Permisos = (Empleados únicos con permisos ÷ Activos ubicación) × 100
```

---

## Tablas Tab Resumen (1)

### Tabla: Detalle por Ubicación
| Ubicación | Activos | Rot. Mensual | Rot. 12M | Rot. YTD | Incidencias | Permisos |

---

# TAB 2: INCIDENCIAS

## KPI Cards (4)

### 1. # de Activos
```
Activos = COUNT(empleados activos en fecha)
```

### 2. Empleados con Incidencias
```
% = (Empleados únicos con incidencias ÷ Activos) × 100
```
**Códigos:** FI, SUSP, ENFE, MAT3, MAT1

### 3. Incidencias
```
% = (Total incidencias ÷ Días Laborables) × 100

Días Laborables = Activos × Días laborables del mes (L-S)
```

### 4. Permisos
```
% = (Total permisos ÷ Días Laborables) × 100
```
**Códigos:** PSIN, PCON, FEST, PATER, JUST (SIN VAC)

---

## Códigos de Incidencias

| Grupo | Códigos | Descripción |
|-------|---------|-------------|
| **Faltas** | FI, SUSP | Falta Injustificada, Suspensión |
| **Salud** | ENFE, MAT3, MAT1 | Enfermedad, Maternidad |
| **Permisos** | PSIN, PCON, FEST, PATER, JUST | Permisos autorizados |
| **Vacaciones** | VAC | Vacaciones (separado) |

---

## Gráficas Tab Incidencias (6)

### 1. Tendencia Mensual (4 categorías)
- **Tipo:** Líneas (4 series)
- **Eje X:** Últimos 12 meses
- **Series:** Faltas, Salud, Permisos, Vacaciones
```
% Categoría = COUNT(incidencias categoría) ÷ Días laborables × 100
```

---

### 2. Distribución de Ausentismos (Pastel)
- **Tipo:** Pastel/Donut
- **Categorías:** Faltas, Salud, Permisos, Vacaciones
```
% Categoría = COUNT(categoría) ÷ Total ausentismos × 100
```

---

### 3. Ausentismo vs Permisos por Día
- **Tipo:** Barras agrupadas por día
- **Ausentismos:** TODOS los códigos incluyendo VAC
- **Permisos:** PSIN, PCON, FEST, PATER, JUST (SIN VAC)

---

### 4. Incidencias por Ubicación
- **Tipo:** Barras horizontales
- **Ubicaciones:** CAD, CORPORATIVO, FILIALES
```
Total = COUNT(incidencias por ubicación en período)
```

---

### 5. Top Incidencias por Código
- **Tipo:** Barras horizontales
- **Ordenamiento:** Por frecuencia descendente
```
Frecuencia = COUNT(incidencias por código)
```

---

### 6. Incidencias por Departamento
- **Tipo:** Barras horizontales
- **Ordenamiento:** Por cantidad descendente
```
% = (Incidencias departamento ÷ Activos departamento) × 100
```

---

## Tablas Tab Incidencias (2)

### Tabla 1: Detalle de Incidencias
| Empleado | Fecha | Código | Descripción | Ubicación | Departamento |

### Tabla 2: Resumen por Código
| Código | Descripción | Cantidad | % del Total |

---

# TAB 3: ROTACIÓN

## KPI Cards (4)

### 1. Activos Promedio
```
Activos Promedio = (Activos Inicio + Activos Fin) ÷ 2
```

### 2. Rotación Mensual
```
% = (Bajas mes ÷ Activos Promedio) × 100
```
**Toggle:** Total, Voluntaria (default), Involuntaria

### 3. Rotación 12M Móviles
```
% = (Bajas 12M ÷ Activos Promedio 12M) × 100
```
**Período:** Últimos 12 meses hasta mes actual

### 4. Rotación YTD
```
% = (Bajas YTD ÷ Activos Promedio YTD) × 100
```
**Período:** 1-Ene hasta mes actual

---

## Clasificación de Bajas

| Tipo | Motivos |
|------|---------|
| **INVOLUNTARIA** | Rescisión por desempeño, Rescisión por disciplina, Término del contrato |
| **VOLUNTARIA** | Renuncia, Abandono, Otras razones |

---

## Gráficas Tab Rotación (4)

### 1. Rotación Acumulada (12 meses móviles)
- **Tipo:** Barras + Línea comparativa
- **Eje X:** ene-dic (fijo)
- **Barras:** Año actual (rolling 12M a cada punto)
- **Línea:** Año anterior (mismo cálculo)
- **Toggle:** Total, Voluntaria, Involuntaria
```
Para cada mes M:
Rotación 12M = (Bajas desde M-11 hasta M ÷ Activos Promedio ventana) × 100
```

---

### 2. Rotación YTD (Año vs Año Anterior)
- **Tipo:** Barras + Línea comparativa
- **Eje X:** ene-dic (fijo)
- **Barras:** Año actual (acumulado desde enero)
- **Línea:** Año anterior
- **Toggle:** Total, Voluntaria, Involuntaria
```
Rotación YTD = (Bajas desde Ene hasta mes ÷ Activos Promedio período) × 100
```

---

### 3. Rotación Mensual (Año vs Año Anterior)
- **Tipo:** Barras + Línea comparativa
- **Eje X:** ene-dic (fijo)
- **Barras:** Año actual (rotación mensual)
- **Línea:** Año anterior
- **Toggle:** Total, Voluntaria, Involuntaria
```
Rotación Mensual % = (Bajas mes ÷ Activos Promedio mes) × 100
```

---

### 4. Rotación por Temporalidad (Antigüedad al momento de baja)
- **Tipo:** Barras agrupadas
- **Eje X:** Categorías de antigüedad
- **Categorías:** <3 meses, 3-6 meses, 6-12 meses, +12 meses
```
Antigüedad = fecha_baja - fecha_ingreso
Cantidad = COUNT(bajas donde antigüedad en rango)
```

---

## Tablas Tab Rotación (6)

### Tabla 1: Rotación Acumulada 12 Meses Móviles
**Archivo:** `retention-charts.tsx`
| Mes | Año Ant. % | # Bajas 12M | # Activos prom 12M | Año Act. % | # Bajas 12M | # Activos prom 12M | Variación |
|-----|-----------|-------------|-------------------|-----------|-------------|-------------------|-----------|
```
% Rot. 12M = (Bajas ventana 12M ÷ Activos Promedio 12M) × 100
Variación % = ((Actual - Anterior) ÷ Anterior) × 100
```

---

### Tabla 2: Rotación Mensual Comparativa
**Archivo:** `retention-charts.tsx`
| Mes | Año Ant. % | # Bajas | # Activos (fin) | Año Act. % | # Bajas | # Activos (fin) | Variación |
|-----|-----------|---------|-----------------|-----------|---------|-----------------|-----------|
```
% Rotación = (Bajas del mes ÷ Activos Promedio mes) × 100
```

---

### Tabla 3: Rotación por Motivo y Área
**Archivo:** `rotation-by-motive-area-table.tsx`
| Área | Motivo 1 | Motivo 2 | Motivo 3 | Motivo 4 | Motivo 5 | Total |
|------|----------|----------|----------|----------|----------|-------|
| TOTAL | n | n | n | n | n | N |
| % | % | % | % | % | % | 100% |
```
SOURCE: empleados_sftp (plantilla) WHERE fecha_baja IS NOT NULL
JOIN: motivos_baja para obtener motivo por numero_empleado
Top 5 motivos: ORDER BY frecuencia DESC LIMIT 5
% = (Total motivo ÷ Grand Total) × 100
```

---

### Tabla 4: Rotación por Motivo y Antigüedad
**Archivo:** `rotation-by-motive-seniority-table.tsx`
| Motivo | 0-1 mes | 1-3 meses | 3-6 meses | 6m-1 año | 1-3 años | 3-5 años | 5+ años | Total |
|--------|---------|-----------|-----------|----------|----------|----------|---------|-------|
```
SOURCE: empleados_sftp WHERE fecha_baja AND fecha_ingreso
Antigüedad = differenceInMonths(fecha_baja, fecha_ingreso)
Buckets: 0-1, 1-3, 3-6, 6-12, 12-36, 36-60, 60+ meses
Top 5 motivos por frecuencia
```

---

### Tabla 5: Motivo de Baja por Mes
**Archivo:** `rotation-by-motive-month-table.tsx`
| Motivo | ENE | FEB | MAR | ABR | MAY | JUN | JUL | AGO | SEP | OCT | NOV | DIC | Total |
|--------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-------|
```
SOURCE: empleados_sftp WHERE fecha_baja
JOIN: motivos_baja para motivo
Filtro: año seleccionado
Mes = fecha_baja.getMonth() + 1
Top 5 motivos por frecuencia
Meses futuros = null (mostrado como '-')
```

---

### Tabla 6: Rotación por Ubicación - Resumen Anual
**Archivo:** `rotation-combined-table.tsx`
| MÉTRICA | UBICACIÓN | ENE | FEB | ... | DIC | PROMEDIO |
|---------|-----------|-----|-----|-----|-----|----------|
| Activos | CAD | n | n | ... | n | avg |
| Activos | CORPORATIVO | n | n | ... | n | avg |
| Activos | FILIALES | n | n | ... | n | avg |
| TOTAL | | n | n | ... | n | avg |
| Bajas Voluntarias | CAD | n | n | ... | n | avg |
| ... | ... | ... | ... | ... | ... | ... |
| Bajas Involuntarias | ... | ... | ... | ... | ... | ... |
| % Rotación | ... | % | % | ... | % | avg% |
```
UBICACIONES: ['CAD', 'CORPORATIVO', 'FILIALES']
MÉTRICAS: Activos, Bajas Voluntarias, Bajas Involuntarias, % Rotación

Activos = Headcount promedio del mes (inicio + fin) / 2
Involuntarias = bajas WHERE isMotivoClave(motivo) = true
Voluntarias = Total bajas - Involuntarias
% Rotación = (bajas mes ÷ avgHeadcount) × 100

Mapeo ubicación: normalizeCCToUbicacion(cc)
```

---

# CÁLCULOS BASE

## Activos Promedio (Denominador Universal)
```javascript
Activos_Inicio = COUNT(empleado) WHERE
  fecha_ingreso ≤ inicio_período AND
  (fecha_baja IS NULL OR fecha_baja > inicio_período)

Activos_Fin = COUNT(empleado) WHERE
  fecha_ingreso ≤ fin_período AND
  (fecha_baja IS NULL OR fecha_baja > fin_período)

Activos_Promedio = (Activos_Inicio + Activos_Fin) / 2
```

## Bajas en Período
```javascript
Bajas = COUNT(empleado) WHERE
  fecha_baja >= inicio_período AND
  fecha_baja <= fin_período

// Voluntarias
Bajas_Vol = Bajas WHERE motivo IN ('Renuncia', 'Abandono', 'Otras razones')

// Involuntarias
Bajas_Inv = Bajas WHERE motivo IN ('Rescisión por desempeño', 'Rescisión por disciplina', 'Término del contrato')
```

## Días Laborables
```javascript
Días_Laborables_Mes = COUNT(días lunes-sábado en período)
Días_Laborados = Activos × Días_Laborables_Mes
```

## Antigüedad
```javascript
// Para empleados activos
Antigüedad_Meses = (Fecha_Actual - Fecha_Ingreso) / 30.44

// Clasificación para gráfica de activos
if meses < 3: '0-3 meses'
if meses < 6: '3-6 meses'
if meses < 12: '6-12 meses'
if meses < 36: '1-3 años'
else: '+3 años'

// Clasificación para bajas (temporalidad)
if meses < 3: '<3 meses'
if meses < 6: '3-6 meses'
if meses < 12: '6-12 meses'
else: '+12 meses'
```

---

# MAPEO DE UBICACIONES

| Centro de Costo (cc) | Ubicación |
|---------------------|-----------|
| CAD | CAD |
| *MRM*, DIRECCION*, DIRE*, TESORERIA* | CORPORATIVO |
| SM*, DF, TORREON, CHIHUAHUA, YAMAHA, TERRAPARK, MOTOSTAFF | FILIALES |

---

# ARCHIVOS DE REFERENCIA

| Archivo | Contenido |
|---------|-----------|
| `kpi-helpers.ts` | Funciones de cálculo de rotación |
| `kpi-calculator.ts` | Cálculos generales de KPIs |
| `normalizers.ts` | Mapeo de códigos y ubicaciones |
| `summary-comparison.tsx` | Tab Resumen |
| `incidents-tab.tsx` | Tab Incidencias |
| `retention-charts.tsx` | Gráficas y tablas comparativas de Rotación |
| `dashboard-page.tsx` | Controlador principal |
| `rotation-by-motive-area-table.tsx` | Tabla: Rotación por Motivo y Área |
| `rotation-by-motive-seniority-table.tsx` | Tabla: Rotación por Motivo y Antigüedad |
| `rotation-by-motive-month-table.tsx` | Tabla: Motivo de Baja por Mes |
| `rotation-combined-table.tsx` | Tabla: Rotación por Ubicación - Resumen Anual |

---

# NOTAS IMPORTANTES

1. **Toggle por defecto:** Las gráficas muestran **VOLUNTARIA** por defecto
2. **Vacaciones separadas:** VAC NO se incluye en "Permisos" de los KPI cards
3. **12M Móviles:** Siempre calcula ventana de 12 meses hacia atrás desde la fecha actual
4. **Activos Promedio:** Es el denominador para TODAS las rotaciones
5. **Variación %:** Compara año actual vs año anterior
6. **Comparación KPIs:**
   - Rotación Mensual: vs mismo mes del año anterior
   - Rotación 12M y YTD: vs mismo punto del año anterior
   - Incidencias/Permisos: vs mes anterior
7. **Días laborables:** Lunes a Sábado (6 días por semana)
8. **Filtros aplicables:** Ubicación, Departamento, Área, Año, Mes

---

*Documento generado para referencia ejecutiva del Dashboard HR MRM*
