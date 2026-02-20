# Análisis Granular de los 4 Modelos ML

**Última corrida verificada**: 18 Febrero 2026
**Datos fuente**: Supabase project `ufdlwhdrrvktthcxwpzt`

---

## Población objetivo

- **373 empleados activos** en `empleados_sftp` (fecha_baja IS NULL)
  - **194 Sindicalizados** (clasificacion = "Sindicalizados", `es_operativo = true`)
  - **179 Confianza** (clasificacion = "Confianza", `es_operativo = false`)
- **Los modelos ML solo predicen para los 194 Sindicalizados** (`es_operativo = true`)
- Los 179 de Confianza no reciben predicciones individuales (decisión de diseño)

---

## Resumen Ejecutivo (datos verificados en UI y Supabase)

| Modelo | Qué predice | Predicciones | Distribución UI (28d) |
|--------|-------------|-------------|----------------------|
| `rotation` | ¿Empleado se va en 14/28d? | 448 rows | ALTO:2, MEDIO:76, BAJO:66, MINIMO:50 |
| `absenteeism_risk` | ¿Empleado faltará 2+ veces en 28d? | 195 rows | ALTO:33, MEDIO:94, BAJO:44, MINIMO:23 |
| `absence_forecast` | ¿Cuántas ausencias por código? | 33 rows | 11 códigos × 3 horizontes, total 28d: 206 |
| `attrition_causes` | ¿Qué factores causan cada tipo de baja? | 0 (análisis SHAP) | F1:0.54, 8 clases de motivo |

---

## 1. Modelo `rotation` — Predicción de Rotación Individual

### Qué hace
Predice la **probabilidad de que un empleado Sindicalizado se vaya** (baja voluntaria o involuntaria) en los próximos 14 o 28 días.

### Datos de entrenamiento
- **Fuente**: tabla `ml_employee_features` (Gold layer)
- **Rango de snapshots**: 2025-03-01 a 2026-02-18 (13 snapshots mensuales)
- **Total rows**: 4,641 (13 snapshots × ~357 empleados operativos por snapshot)
- **Target**: `tuvo_baja_siguiente_14d` y `tuvo_baja_siguiente_28d` (boolean, calculado al generar snapshots mirando si el empleado tuvo baja en los N días siguientes)
- **Positive rate**: 2.1% (14d) / 3.9% (28d) — solo 116 bajas en 4,641 rows
- **Solo operativos** (`es_operativo = true`, Sindicalizados)

### Features usadas (28 features)
**Numéricas (20)**:
- Demográficas: `edad`, `antiguedad_dias`
- Rolling faltas negativas: `faltas_neg_7d`, `14d`, `28d`, `56d`, `90d`
- Faltas injustificadas: `fi_7d`, `14d`, `28d`, `90d`
- Salud: `salud_28d`, `salud_90d`
- Permisos: `permisos_28d`, `permisos_90d`
- Vacaciones: `vacaciones_90d`
- Totales: `total_incidencias_28d`, `total_incidencias_90d`
- Tendencia: `tasa_faltas_neg_28d`, `tendencia_num`, `dias_desde_ultima_falta`

**Categóricas (8)**:
- `genero`, `generacion`, `departamento`, `area`, `ubicacion2`, `turno`, `empresa`, `clasificacion`

### Algoritmo
- **MultiHorizonEnsemble**: Entrena modelos separados para horizonte 14d y 28d
- **4 algoritmos evaluados por horizonte**: XGBoost, LightGBM, RandomForest, LogisticRegression
- **Ganador (ambos horizontes)**: LogisticRegression (mejor `average_precision`)
- **Pipeline**: StandardScaler + OneHotEncoder → LogisticRegression
- **Split**: Temporal — últimos 3 meses como test (train: 3,174, test: 1,467)

### Métricas del modelo
| Métrica | 14d | 28d |
|---------|-----|-----|
| ROC-AUC | 0.727 | 0.769 |
| Precision | 5.8% | 6.8% |
| Recall | 47.8% | 61.8% |
| F1 | 10.4% | 12.2% |
| Avg Precision | 24.0% | 25.4% |

**Interpretación**: ROC-AUC 0.77 es decente pero con 2-4% de positivos, la precision es baja. De cada 100 que marca "se va", solo 7 realmente se van. Sin embargo, el recall de 62% significa que detecta 6 de cada 10 bajas reales.

### Predicciones en `ml_predictions_log`
- **194 empleados × 2 horizontes = 388 predicciones individuales**
- **60 predicciones de segmentos** (por area, depto, empresa, ubicacion2, genero, generacion, total)
- **Total**: 448 rows

### Distribución verificada en UI (28d)
| Nivel | Threshold | Empleados | Top empleado |
|-------|-----------|-----------|-------------|
| ALTO | prob ≥ 0.70 | **2** | #2757 (76.9%) — 135 días antigüedad, 7 faltas en 90d |
| MEDIO | prob ≥ 0.40 | **76** | #2780 (69.0%) |
| BAJO | prob ≥ 0.15 | **66** | #2484 (40.0%) |
| MINIMO | prob < 0.15 | **50** | — |
| **Total** | | **194** | |

### Cómo llega a la UI
```
ml_predictions_log WHERE model_name='rotation'
    → hook filtra: numero_empleado IS NOT NULL → employees (tabla)
    → hook filtra: segment_type IS NOT NULL → segments (chart áreas)
    → hook cuenta: risk_level por horizon=28 → KPI cards
```
**Tab Rotación**: 4 KPI cards + tabla filtrable por horizonte/riesgo + chart horizontal de bajas por área (top 10)

---

## 2. Modelo `absenteeism_risk` — Riesgo de Ausentismo Recurrente

### Qué hace
Predice si un empleado Sindicalizado tendrá **2 o más faltas negativas** en el **próximo período** (28 días).

### Datos de entrenamiento
- **Fuente**: tabla `ml_employee_features` (Gold layer)
- **Rango**: 2025-03-01 a 2026-02-01 (12 snapshots, el último se descarta porque no tiene "futuro")
- **Total rows después de shift**: 4,092 (se pierden ~357 del último snapshot)
- **Target FORWARD-LOOKING**: Para cada snapshot, el target es si en el **SIGUIENTE** snapshot `faltas_neg_28d >= 2`
- **Positive rate**: 6.7%
- **Solo operativos** (`es_operativo = true`)

### Fix de data leakage aplicado
Antes el target era `faltas_neg_28d >= 2` del **mismo** snapshot (el modelo veía la respuesta). Ahora:
```python
df = df.sort_values(['employee_id', 'snapshot_date'])
df['next_faltas'] = df.groupby('employee_id')['faltas_neg_28d'].shift(-1)
df['target_ausentismo'] = (df['next_faltas'] >= 2).astype(int)
```
Esto hace que el modelo aprenda: "dado el estado actual del empleado, ¿tendrá 2+ faltas en el siguiente mes?"

### Features usadas (22 numéricas + 8 categóricas)
Mismas que rotation, más:
- `ratio_fi_to_neg`: proporción FI / faltas negativas (28d)
- `ratio_neg_recent_vs_old`: faltas recientes (28d) / antiguas (90d)

### Algoritmo
- **4 algoritmos evaluados**: XGBoost, LightGBM, RandomForest, LogisticRegression
- **Ganador**: LogisticRegression (mejor `average_precision`)
- **Split**: 75/25 stratified (train: 3,069, test: 1,023)

### Métricas del modelo
| Métrica | Valor |
|---------|-------|
| ROC-AUC | **0.900** |
| Precision | 19.5% |
| Recall | 86.8% |
| F1 | 0.319 |
| Avg Precision | 0.512 |
| CV Mean | 0.355 |

**Interpretación**: AUC 0.90 es bueno. Recall de 87% = detecta la mayoría de los empleados que van a faltar. Precision 19.5% = de cada 5 marcados como riesgo, 1 realmente faltará 2+ veces.

### Predicciones en `ml_predictions_log`
- **194 empleados × 1 horizonte (28d) = 194 individuales**
- **1 total agregado**
- **Total**: 195 rows

### Distribución verificada en UI (28d)
| Nivel | Empleados | Ejemplo top |
|-------|-----------|-------------|
| ALTO | **33** | #2692 (92.3%) — faltas_neg_90d=4, RH |
| MEDIO | **94** | #2179 (69.3%) |
| BAJO | **44** | — |
| MINIMO | **23** | — |
| **Total** | **194** | |

**Cross-validación del top ALTO**:
| Empleado | Prob | faltas_neg_28d actual | faltas_neg_90d | tendencia | Depto |
|----------|------|----------------------|----------------|-----------|-------|
| 2692 | 92.3% | 0 | 4 | estable | RH |
| 2110 | 92.0% | 6 | 17 | empeorando | Operaciones |
| 2757 | 91.6% | 0 | 7 | estable | Filiales |
| 2780 | 91.2% | 0 | 3 | estable | Operaciones |

Los empleados ALTO tienen historial de faltas en 90d (3-17), lo cual tiene sentido como predictor de faltas futuras.

### Cómo llega a la UI
```
ml_predictions_log WHERE model_name='absenteeism_risk'
    → hook filtra: numero_empleado IS NOT NULL → absenteeismEmployees
    → hook cuenta: risk_level por horizon=28 → absenteeismRiskCounts
```
**Tab Ausentismo**: 3 KPI cards (ALTO/MEDIO/BAJO) + Total evaluados (194) + chart distribución + tabla filtrable

---

## 3. Modelo `absence_forecast` — Forecast de Ausencias por Código

### Qué hace
Proyecta **cuántas ausencias habrá por código de incidencia** en los próximos 7, 14 y 28 días. No es por empleado — es un agregado para toda la operación.

### Datos de entrenamiento
- **Fuente**: `mv_incidencias_enriquecidas` (Silver, 9,094 registros) + `mv_empleados_master` (para headcount)
- **Rango**: últimos 400 días de incidencias (2025-01 a 2026-02)
- **Procesamiento en Python** (REST no ejecuta SQL):
  1. Fetch todas las incidencias → `groupby(fecha, codigo_incidencia).count()`
  2. Grid de calendario × 11 códigos, fill gaps con 0
  3. Headcount diario desde `mv_empleados_master`

### 11 Códigos monitoreados (verificados en UI)
| Código | Descripción | 7d | 14d | **28d** | Real últimos 28d | Diff |
|--------|-------------|-----|------|---------|------------------|------|
| **VAC** | Vacaciones | 39.7 | 78.1 | **151.8** | 113 | +34% |
| **MAT3** | Maternidad | 7.1 | 14.4 | **29.3** | 18 | +63% |
| **FEST** | Festivo | 2.5 | 5.1 | **10.5** | 5 | +110% |
| **PCON** | Permiso con goce | 2.1 | 3.8 | **6.3** | 2 | +215% |
| **ENFE** | Enfermedad | 1.4 | 2.6 | **4.3** | 25 | **-83%** |
| **SUSP** | Suspensión | 1.0 | 1.7 | **2.9** | 0 | — |
| **ACCI** | Accidente | 0.1 | 0.2 | **0.5** | 0 | — |
| **PATER** | Paternidad | 0.1 | 0.1 | **0.4** | 0 | — |
| **PSIN** | Permiso sin goce | 0.6 | 0.3 | **0.0** | 1 | — |
| **INC** | Incapacidad | 0 | 0 | **0.0** | 0 | OK |
| **FI** | Falta injustificada | 0.3 | 0 | **0.0** | 0 | OK |
| | | **55** | **107** | **206** | **164** | |

**Nota**: ENFE subpredice severamente (4.3 vs 25 real). Posible causa: brote atípico de enfermedad en periodo reciente que el SARIMAX no captura.

### Algoritmo: SARIMAX (uno por código)
- **Orden**: (1,1,1) — AR(1), differencing(1), MA(1)
- **Seasonal**: (0,1,1,7) — estacionalidad semanal
- **Exógena**: headcount diario
- **Validación**: últimos 28 días como test, luego refit con todos los datos
- **369 días de entrenamiento** por código

### Predicciones en `ml_predictions_log`
- **11 códigos × 3 horizontes = 33 rows**
- Cada row tiene: `segment_type='codigo_incidencia'`, `segment_value=código`, `predicted_count`

### Cómo llega a la UI
```
ml_predictions_log WHERE model_name='absence_forecast'
    → hook filtra: predicted_count IS NOT NULL → forecast[]
    → agrupa por code y horizon → chart de barras agrupado
    → suma horizon=28 → KPI "Ausencias próx. 28d"
    → suma horizon=7 → KPI "Ausencias próx. 7d"
```
**Tab Forecast**: 3 KPI cards (7d, 28d, # códigos) + chart barras agrupado 7d/14d/28d + tabla detalle

---

## 4. Modelo `attrition_causes` — Causas Raíz de Bajas (SHAP)

### Qué hace
Clasifica **por qué se fue cada empleado** y usa SHAP para explicar qué factores influyen más en cada tipo de baja. Es un modelo de **análisis**, no genera predicciones individuales.

### Datos de entrenamiento
- **Fuente**: `mv_empleados_master` (450 bajas últimos 24 meses) + `mv_incidencias_enriquecidas` (para features de incidencias)
- **Rango**: bajas de 2024-02-19 a 2026-01-30
- **Split**: 75/25 → train: 337, test: 113

### Procesamiento de datos
1. Fetch `mv_empleados_master` → filtrar bajas últimos 24 meses
2. Fetch `mv_incidencias_enriquecidas` → agregar por empleado:
   - `neg_90d`: faltas negativas en 90d antes de la baja
   - `neg_180d`: faltas negativas en 180d antes de la baja
   - `fi_90d`: faltas injustificadas en 90d antes de la baja
   - `permisos_365d`: permisos en 365d antes de la baja
   - `total_365d`: total incidencias en 365d antes de la baja
3. Ratios derivados: `ratio_neg_90`, `ratio_neg_180`, `ratio_fi`

### Target: `motivo_grouped` (8 clases)
| Clase | Registros | % | F1 (test) |
|-------|-----------|---|-----------|
| Abandono / No regresó | 144 | 32% | **0.712** |
| Otra razón | 117 | 26% | **0.556** |
| Término del contrato | 88 | 20% | **0.634** |
| Rescisión por desempeño | 32 | 7% | 0.429 |
| Rescisión por disciplina | 25 | 6% | 0.333 |
| Otro trabajo mejor compensado | 21 | 5% | 0.000 |
| Otros (agrupado <5) | 18 | 4% | 0.000 |
| Regreso a la escuela | 5 | 1% | 0.000 |

Clases con <5 muestras → F1=0 (no hay suficientes datos para aprender esos patrones).

### Algoritmo
- **XGBoost multiclass** (multi:softprob, 300 estimators, max_depth=4)
- **LabelEncoder** para clases texto → número
- **SHAP TreeExplainer** para explicabilidad (con fallback a feature_importances si SHAP falla)

### Métricas globales
- **Weighted F1**: 0.54
- **Macro F1**: 0.33
- Las 3 clases grandes (72% de datos) tienen F1 > 0.55

### Resultados SHAP
Almacenados en `storage/metrics/attrition_causes/latest.json`, accesibles via `GET /models/attrition_causes/analysis`. Contienen:
- `shap_top_features`: ranking global de features
- `per_class_shap`: top features por cada clase de motivo

### Cómo llega a la UI
```
GET /api/ml/models/attrition_causes/analysis
    → proxy a ML service → lee latest.json
    → response.artifacts.shap_top_features → chart horizontal
    → response.artifacts.per_class_shap → cards por motivo
    → response.metrics.weighted_f1 → KPI card
```
**Tab Causas**: 3 KPI cards (F1, # clases, muestras) + chart SHAP + cards per-class top 5 features

**Nota**: Requiere ML service corriendo (`localhost:8001`). Sin el service, muestra "SHAP no disponible".

---

## Flujo Completo Verificado: Supabase → ML → UI

```
SUPABASE (Bronze — NO se toca)
├── empleados_sftp (1,051 registros, 373 activos)
├── motivos_baja (676 registros)
└── incidencias (9,094 registros)
       ↓ Materialized Views (Silver)
├── mv_empleados_master (1,075) → 194 Sindicalizados activos + 179 Confianza
└── mv_incidencias_enriquecidas (9,094) → incidencia + datos del empleado
       ↓ Gold Layer
└── ml_employee_features (4,641) → 13 snapshots × ~357 operativos
       ↓
ML SERVICE (FastAPI, puerto 8001)
├── POST /models/rotation/train         → LogisticRegression, AUC 0.77
├── POST /models/absenteeism_risk/train → LogisticRegression, AUC 0.90
├── POST /models/absence_forecast/train → SARIMAX × 11 códigos
├── POST /models/attrition_causes/train → XGBoost 8 clases, F1 0.54
├── POST /models/{id}/predict           → INSERT ml_predictions_log
└── GET  /models/attrition_causes/analysis → SHAP results
       ↓
SUPABASE (Gold)
└── ml_predictions_log (676 rows total)
    ├── rotation:        448 (194 emp × 2 horizontes + 60 segmentos)
    ├── absenteeism_risk: 195 (194 emp × 1 horizonte + 1 total)
    └── absence_forecast:  33 (11 códigos × 3 horizontes)
       ↓
FRONTEND (Next.js, puerto 3001)
└── Hook: use-ml-predictions.ts
    └── Supabase JS → SELECT * FROM ml_predictions_log (limit 7000, latestOnly)
        └── Filtra por model_name → distribuye a 4 sub-tabs
       ↓
DASHBOARD → Tab Predicciones
├── Sub-tab Rotación     ← model_name='rotation'       → KPIs + tabla + chart áreas
├── Sub-tab Ausentismo   ← model_name='absenteeism_risk' → KPIs + distribución + tabla
├── Sub-tab Forecast     ← model_name='absence_forecast'  → KPIs + chart códigos + tabla
└── Sub-tab Causas       ← GET /analysis                  → SHAP charts + per-class cards
```

---

## Bugs Corregidos (Sesión 3)

### 1. Snapshot leak en predicciones (CRÍTICO)
- **Antes**: `fetch_dataframe(SQL con WHERE)` ignoraba WHERE → 4,641 rows (todos los snapshots)
- **Después**: Filtrado en Python → solo 194 del snapshot más reciente
- **Afectaba**: rotation (549 empleados) y absenteeism (4,641 predicciones)

### 2. Data leakage en absenteeism target (CRÍTICO)
- **Antes**: Target `faltas_neg_28d >= 2` con `faltas_neg_28d` como feature → AUC 1.0 artificial
- **Después**: Target forward-looking (shift al siguiente snapshot) → AUC 0.90 real

### 3. REST router confundía vistas (MEDIO)
- **Antes**: SQL con `mv_incidencias_enriquecidas` Y `mv_empleados_master` → router escogía `mv_empleados_master`
- **Después**: Queries separadas explícitas por vista

### 4. XGBoost multiclass con labels string (MEDIO)
- **Antes**: `tipo_baja` solo tenía "Baja" (1 clase) → error
- **Después**: Target cambiado a `motivo_grouped` (8 clases) + LabelEncoder

### 5. Códigos faltantes en forecast (MENOR)
- **Antes**: 7 códigos (faltaba MAT3, FEST, PATER, ACCI)
- **Después**: 11 códigos monitoreados
