# Dashboard MRM Simple - Explicación Completa de Tabs

**Fecha de referencia para ejemplos:** Diciembre 2025
**Última actualización:** Enero 2026

---

## Resumen Ejecutivo

El dashboard tiene **4 tabs principales**, cada uno con un propósito específico y usando **diferentes variantes de filtrado** según sus necesidades de cálculo.

| Tab | Propósito | Filtro Principal | ¿Incluye Inactivos? |
|-----|-----------|------------------|---------------------|
| **Resumen** | Vista general de KPIs | `plantillaFiltered` | No |
| **Personal** | Demografía y headcount | `plantillaFiltered` | No |
| **Incidencias** | Análisis de ausentismo | `plantillaFilteredYearScope` | No |
| **Rotación** | Análisis de bajas | `plantillaRotacionYearScope` | **Sí** (necesita contar bajas) |

---

## Sistema de Filtros

### ¿Por qué existen 4 variantes de filtrado?

Cada tab necesita ver los datos de forma diferente:

```
┌─────────────────────────────────────────────────────────────────┐
│ Usuario selecciona: Año=2025, Mes=Diciembre, Depto=Producción  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   plantillaFiltered   plantillaFilteredYearScope  plantillaRotacionYearScope
   (mes específico)    (año completo)              (año + incluye bajas)
   Solo activos        Solo activos                Activos + Inactivos
```

### Variante 1: `plantillaFiltered`
- **Scope:** `specific` (año + mes + filtros estructurales)
- **Incluye Inactivos:** No (`includeInactive: false`)
- **Uso:** KPIs del mes, headcount actual
- **Ejemplo Dic 2025:** 84 empleados activos de Producción en diciembre

### Variante 2: `plantillaFilteredYearScope`
- **Scope:** `year-only` (solo año, ignora mes)
- **Incluye Inactivos:** No
- **Uso:** Denominador para % de incidencias, comparaciones anuales
- **Ejemplo 2025:** 92 empleados activos de Producción durante el año

### Variante 3: `plantillaRotacionYearScope`
- **Scope:** `year-only`
- **Incluye Inactivos:** **Sí** (`includeInactive: true`)
- **Uso:** Cálculo de rotación (necesita contar los que se fueron)
- **Ejemplo 2025:** 98 empleados (92 activos + 6 que se fueron)

### Variante 4: `plantillaFilteredGeneral`
- **Scope:** `general` (sin filtro temporal)
- **Incluye Inactivos:** Sí
- **Uso:** Comparaciones históricas año vs año

---

## TAB 1: RESUMEN

### Propósito
Vista ejecutiva con los KPIs más importantes y tendencias generales.

### Filtros que usa
- `plantillaFiltered` para KPIs del mes
- `plantillaFilteredYearScope` para heatmap anual
- `plantillaFilteredGeneral` para comparaciones históricas

### KPIs (5 tarjetas principales)

| KPI | Fórmula | Ejemplo Dic 2025 |
|-----|---------|------------------|
| **Activos al cierre** | `COUNT(activo=true AND fecha_ingreso <= fin_mes)` | 84 empleados |
| **Ingresos (Mes)** | `COUNT(fecha_ingreso BETWEEN inicio_mes AND fin_mes)` | 3 nuevos |
| **Bajas (Mes)** | `COUNT(fecha_baja BETWEEN inicio_mes AND fin_mes)` | 5 bajas |
| **Antigüedad Promedio** | `AVG(meses desde fecha_ingreso hasta hoy)` | 26.4 meses |
| **Empl. < 3 meses** | `COUNT(antigüedad < 3 meses)` | 10 empleados |

### Heatmap de Bajas por Motivo
- **Filas:** 21 motivos de baja únicos
- **Columnas:** Enero a Diciembre
- **Valores:** Cantidad de bajas por mes/motivo
- **Color:** Intensidad = cantidad

```
Ejemplo Diciembre 2025:
┌──────────────────────┬─────┬─────┬─────┬───────┬─────┐
│ Motivo               │ Ene │ Feb │ ... │ Nov   │ Dic │
├──────────────────────┼─────┼─────┼─────┼───────┼─────┤
│ Baja Voluntaria      │  45 │  38 │ ... │   35  │  31 │
│ Término del contrato │   2 │   3 │ ... │    3  │   2 │
│ Abandono             │   4 │   5 │ ... │    4  │   3 │
└──────────────────────┴─────┴─────┴─────┴───────┴─────┘
```

---

## TAB 2: PERSONAL

### Propósito
Análisis demográfico de la plantilla: edad, género, antigüedad, clasificación.

### Filtros que usa
- `plantillaFiltered` (solo empleados activos del período)
- `activeEmployeesCurrent` (para gráficas de antigüedad)

### Componentes

#### 1. Gráfica de Clasificación (Pie/Donut)
```
Fórmula: COUNT(empleados) GROUP BY clasificacion

Ejemplo Dic 2025:
- Confianza: 52 empleados (62%)
- Sindicalizado: 32 empleados (38%)
```

#### 2. Distribución por Edad (Scatter)
```
Fórmula:
  edad = (hoy - fecha_nacimiento) / 365.25
  COUNT(empleados) GROUP BY edad

Ejemplo Dic 2025:
- Pico: 35-42 años (mayoría de empleados)
- Rango: 18-62 años
```

#### 3. Antigüedad por Área (Barras Horizontales Apiladas)
```
Fórmula:
  antigüedad_meses = monthsBetween(fecha_ingreso, hoy)
  Bins: <3m, 3-6m, 6-12m, 12m+
  COUNT(empleados) GROUP BY area, bin

Ejemplo Dic 2025:
┌─────────────┬──────┬───────┬────────┬───────┐
│ Área        │ <3m  │ 3-6m  │ 6-12m  │ 12m+  │
├─────────────┼──────┼───────┼────────┼───────┤
│ CAD         │  45  │   60  │   85   │  550  │
│ CORPORATIVO │  15  │   25  │   40   │  142  │
│ FILIALES    │   8  │   12  │   18   │   56  │
└─────────────┴──────┴───────┴────────┴───────┘
```

#### 4. Tabla Edad-Género
- Rangos de edad: 18-24, 25-34, 35-44, 45-54, 55+
- Columnas: Masculino, Femenino, Total

#### 5. Tabla Antigüedad-Género
- Rangos: <3m, 3-6m, 6-12m, 1-2 años, 2-5 años, 5+ años
- Columnas: Masculino, Femenino, Total

---

## TAB 3: INCIDENCIAS

### Propósito
Análisis de ausentismo: faltas, incapacidades, permisos, vacaciones.

### Filtros que usa
- `plantillaFilteredYearScope` (denominador de empleados activos)
- `incidenciasFiltered` (incidencias de empleados filtrados)

### Clasificación de Códigos

| Categoría | Códigos | Descripción |
|-----------|---------|-------------|
| **Faltas** | FI, SUSP | Falta Injustificada, Suspensión |
| **Salud** | ENFE, MAT1, MAT3, ACCI, INCA | Enfermedad, Maternidad, Accidente, Incapacidad |
| **Permisos** | PSIN, PCON, FEST, PATER, JUST, FJ | Permisos varios |
| **Vacaciones** | VAC | Vacaciones (separado) |

### KPIs Principales

| KPI | Fórmula | Ejemplo Dic 2025 |
|-----|---------|------------------|
| **Incidencias (Faltas+Salud)** | `COUNT(inci IN {FI,SUSP,ENFE,MAT1,MAT3,ACCI,INCA})` | 156 |
| **Permisos+Vacaciones** | `COUNT(inci IN {PSIN,PCON,FEST,PATER,JUST,VAC})` | 412 |
| **% Incidencias** | `(Incidencias / Días_Laborables) × 100` | 7.1% |

### Cálculo del Denominador
```
Activos Promedio = (Activos_Inicio_Mes + Activos_Fin_Mes) / 2
Días Laborables = 22 días (diciembre 2025, excluyendo domingos y festivos)

% Incidencias = (156 / (82 × 22)) × 100 = 8.6%
```

### Gráficas

1. **Pie Chart - Distribución por Tipo**
   - Salud: 42%
   - Permisos: 38%
   - Faltas: 15%
   - Vacaciones: 5%

2. **Línea - Tendencia Diaria**
   - X: Días del mes (1-31)
   - Y: Cantidad de incidencias por día

3. **Barras - Por Día de la Semana**
   - Lunes: 28, Martes: 26, ..., Domingo: 2

### Tabla de Ausentismo
| Empleado | Departamento | Código | Días | Total |
|----------|--------------|--------|------|-------|
| Juan P.  | Operaciones  | FI     | 8    | 8     |
| María G. | Ventas       | INCA   | 6    | 6     |

---

## TAB 4: ROTACIÓN

### Propósito
Análisis de bajas: rotación mensual, acumulada, por motivo, voluntaria vs involuntaria.

### Filtros que usa
- `plantillaRotacionYearScope` (**incluye inactivos** para contar bajas)
- `plantillaDismissalDetail` (detalle de empleados con baja)
- `bajasFiltered` (registros de motivos_baja)

### Clasificación de Motivos

**Involuntarios (3 tipos):**
| Motivo | Casos 2025 |
|--------|------------|
| Rescisión por desempeño | 12 |
| Rescisión por disciplina | 8 |
| Término del contrato | 36 |
| **Total Involuntario** | **56** |

**Voluntarios (18 tipos principales):**
| Motivo | Casos 2025 |
|--------|------------|
| Baja Voluntaria | 421 |
| Otra razón | 67 |
| Abandono / No regresó | 46 |
| Regreso a la escuela | 15 |
| ... (otros 14 motivos) | 71 |
| **Total Voluntario** | **620** |

### Fórmulas de Rotación

#### Rotación Mensual
```
Activos Promedio = (Activos_Inicio + Activos_Fin) / 2
                 = (80 + 84) / 2 = 82

Rotación Mensual Voluntaria = (Bajas_Voluntarias / Activos_Promedio) × 100
                            = (4 / 82) × 100 = 4.88%

Rotación Mensual Involuntaria = (Bajas_Involuntarias / Activos_Promedio) × 100
                              = (1 / 82) × 100 = 1.22%

Rotación Mensual Total = 4.88% + 1.22% = 6.10%
```

#### Rotación Acumulada 12 Meses
```
Ventana: Enero 2025 - Diciembre 2025 (rolling 12 meses)

Suma_Bajas_12M = 45+38+42+35+40+38+41+39+37+42+35+31 = 463
Activos_Promedio_12M = promedio de los 12 meses = ~85

Rotación_12M = (463 / 85) × 100 = ~54.5% anualizada
```

#### Rotación YTD (Año en Curso)
```
Período: 1 Enero 2025 - 31 Diciembre 2025

Total_Bajas_YTD = 676 (suma de todas las bajas del año)
Activos_Promedio_YTD = promedio enero-diciembre = ~82

Rotación_YTD = (676 / 82) × 100 = 82.4%
```

### KPIs (5 tarjetas)

| KPI | Valor Dic 2025 | Variación vs Nov |
|-----|----------------|------------------|
| **Activos Promedio** | 82 | -0.6% |
| **Bajas Voluntarias** | 4 | -20% |
| **Rotación Mensual Vol.** | 4.88% | -1.2pp |
| **Rotación Acum. 12M** | 12.4% | +0.3pp |
| **Rotación YTD** | 11.8% | +0.2pp |

### Tablas de Análisis

#### 1. Rotación por Motivo × Área
```
┌─────────────┬─────────────────┬──────────┬───────────┐
│ Área        │ Baja Voluntaria │ Abandono │ Término   │
├─────────────┼─────────────────┼──────────┼───────────┤
│ CAD         │       28        │    8     │     2     │
│ CORPORATIVO │       12        │    2     │     1     │
│ FILIALES    │        5        │    1     │     0     │
└─────────────┴─────────────────┴──────────┴───────────┘
```

#### 2. Rotación por Motivo × Antigüedad
```
┌──────────┬─────────────────┬──────────┬───────────┐
│ Antig.   │ Baja Voluntaria │ Abandono │ Término   │
├──────────┼─────────────────┼──────────┼───────────┤
│ <3 meses │        8        │    3     │     1     │
│ 3-6 meses│        6        │    2     │     0     │
│ 6-12 mes │        4        │    1     │     1     │
│ 12+ meses│       19        │    2     │     1     │
└──────────┴─────────────────┴──────────┴───────────┘
```

#### 3. Rotación por Motivo × Mes
```
┌─────────────────┬─────┬─────┬─────┬─────┬─────┐
│ Motivo          │ Ene │ Feb │ ... │ Nov │ Dic │
├─────────────────┼─────┼─────┼─────┼─────┼─────┤
│ Baja Voluntaria │  45 │  38 │ ... │  35 │  31 │
│ Abandono        │   4 │   5 │ ... │   4 │   3 │
│ Término Contrato│   2 │   3 │ ... │   3 │   2 │
└─────────────────┴─────┴─────┴─────┴─────┴─────┘
```

---

## Arquitectura de Código

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                      dashboard-page.tsx                          │
│                      (Orquestador ~800 líneas)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │  useDashboardData()  │  │ usePlantillaFilters()│             │
│  │  - Carga plantilla   │  │ - 4 variantes filtro │             │
│  │  - Carga bajas       │  │ - Memoizado          │             │
│  │  - Carga incidencias │  └──────────────────────┘             │
│  └──────────────────────┘                                        │
│                                                                  │
│  ┌──────────────────────┐                                        │
│  │  useRetentionKPIs()  │                                        │
│  │  - Cálculo rotación  │                                        │
│  │  - Vol/Invol desglose│                                        │
│  └──────────────────────┘                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │PersonalTab│       │IncidentsTab│      │RotacionTab│
   │(~700 lín) │       │(~800 lín)  │      │(~400 lín) │
   └───────────┘       └───────────┘       └───────────┘
```

### Archivos Clave

| Archivo | Propósito | Líneas |
|---------|-----------|--------|
| `dashboard-page.tsx` | Orquestador principal | ~800 |
| `hooks/use-dashboard-data.ts` | Carga de datos | ~165 |
| `hooks/use-plantilla-filters.ts` | 4 variantes de filtro | ~175 |
| `hooks/use-retention-kpis.ts` | Cálculos de rotación | ~280 |
| `tabs/personal-tab.tsx` | Tab Personal | ~700 |
| `tabs/rotacion-tab.tsx` | Tab Rotación | ~400 |
| `incidents-tab.tsx` | Tab Incidencias | ~800 |
| `lib/utils/kpi-helpers.ts` | Fórmulas core | ~300 |

---

## Verificación de Datos

### Checklist por Tab

**Tab Resumen:**
- [ ] Activos al cierre = empleados sin fecha_baja o fecha_baja > fin_mes
- [ ] Ingresos = nuevos en el mes
- [ ] Bajas = terminaciones en el mes

**Tab Personal:**
- [ ] Solo muestra empleados activos
- [ ] Antigüedad calculada desde fecha_ingreso
- [ ] Edad calculada desde fecha_nacimiento

**Tab Incidencias:**
- [ ] Denominador = empleados activos promedio
- [ ] Solo incidencias de empleados activos
- [ ] Códigos clasificados correctamente

**Tab Rotación:**
- [ ] Incluye empleados inactivos (para contar bajas)
- [ ] Motivos clasificados Vol/Invol correctamente
- [ ] Fórmula: Bajas / Activos_Promedio × 100

---

## Glosario

| Término | Definición |
|---------|------------|
| **Activos Promedio** | (Inicio + Fin) / 2 del período |
| **Rotación Voluntaria** | Empleado decide irse (renuncia, abandono, etc.) |
| **Rotación Involuntaria** | Empresa decide (rescisión, término contrato) |
| **Rotación Acumulada 12M** | Rolling 12 meses hacia atrás |
| **Rotación YTD** | Año en curso (enero hasta mes actual) |
| **includeInactive** | Flag para incluir empleados con fecha_baja |
| **scope: specific** | Filtra por año + mes |
| **scope: year-only** | Filtra solo por año |
| **scope: general** | Sin filtro temporal |
