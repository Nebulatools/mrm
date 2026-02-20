# Implementación ML Completada — Sesiones 1 a 3

**Última actualización**: 18 Febrero 2026
**Objetivo**: Predecir bajas y faltas para empleados operativos (Sindicalizados) con cortes por área, dirección, negocio, género, generación. Entrenar continuamente y trackear precisión.

---

## Reglas Fundamentales
- Tablas raw (`empleados_sftp`, `motivos_baja`, `incidencias`) **NO se tocan**
- Dashboard frontend **NO cambia** — sigue calculando KPIs en browser
- Capas Silver/Gold son tablas NUEVAS, solo para ML
- `ubicacion2` viene de `empleados_sftp` (JOIN), no de `incidencias`

---

## Arquitectura Implementada

```
BRONZE (existente, NO se tocó)
empleados_sftp + motivos_baja + incidencias
                ↓ (SELECT/JOIN, read-only)
SILVER (materialized views NUEVAS en Supabase)
mv_empleados_master + mv_incidencias_enriquecidas
                ↓
GOLD (tablas NUEVAS en Supabase)
ml_employee_features + ml_predictions_log + ml_weekly_snapshots
                ↓
ML SERVICE (Python/FastAPI) ← lee de Gold/Silver via REST, escribe predicciones
                ↓
FRONTEND (Next.js) ← lee ml_predictions_log via Supabase JS client
```

---

## Fase 0: Limpieza — COMPLETADA

### Modelos Python Eliminados (5 archivos borrados)
| Archivo | Modelo | Razón de eliminación |
|---------|--------|---------------------|
| `models/patterns.py` | GMM clustering | No solicitado |
| `models/segment_risk.py` | K-Means riesgo | No solicitado |
| `models/productivity.py` | Regresión productividad | Prenomina insuficiente |
| `models/interventions.py` | Decision tree recomendaciones | No solicitado |
| `models/lifecycle.py` | Survival analysis | No solicitado |

### Vistas Supabase Eliminadas (7 vistas)
```sql
DROP VIEW IF EXISTS ml_rotation_features, ml_absenteeism_features,
  ml_attrition_features, ml_forecast_features, ml_lifecycle_features,
  v_incidencias_completas, v_bajas_involuntarias_mensual;
-- ⚠️ CONSERVADA: v_motivos_baja_unicos (usada por frontend)
```

---

## Fase 1: Silver Layer — COMPLETADA en Supabase

### `mv_empleados_master` (Materialized View)
- JOIN de `empleados_sftp` + `motivos_baja` con lógica de rehire
- Campos calculados: edad, antigüedad_días, generación, es_operativo, motivo normalizado
- **1,075 registros** (733 operativos históricos, 194 activos)

### `mv_incidencias_enriquecidas` (Materialized View)
- Incidencia + datos del empleado via JOIN
- Incluye: ubicacion2, depto, area, genero, generacion, es_operativo
- Categorización: es_negativa, es_falta_injustificada, categoria_incidencia
- **8,880+ registros**

---

## Fase 2: Gold Layer — COMPLETADA en Supabase

### `ml_employee_features` (Tabla — refresh diario)
- **4,641 rows** across 13 snapshots históricos
- **194 empleados operativos activos** en cada snapshot
- Feature vector por empleado:
  - Demográficas: edad, genero, generacion, antiguedad_dias, es_operativo
  - Organizacionales: departamento, area, ubicacion2, turno, empresa, clasificacion, puesto
  - Rolling incidencias: faltas_neg 7d/14d/28d/56d/90d, FI, permisos, salud, vacaciones
  - Tendencias: tasa_faltas_neg_28d, tendencia_faltas, dias_desde_ultima_falta
  - Targets: tuvo_baja_siguiente_14d, tuvo_baja_siguiente_28d

### `ml_predictions_log` (Tabla — se llena al entrenar/predecir)
- model_name, algorithm_name, prediction_date, horizon
- Por empleado: numero_empleado, predicted_probability, risk_level
- Por segmento: segment_type, segment_value, predicted_count
- Cortes: genero, generacion
- Tracking: actual_value, was_correct (llenado por accuracy cron)
- SHAP: top_features JSONB

### `ml_weekly_snapshots` (Tabla — para foto semanal)
- Foto semanal: activos, bajas, incidencias por clasificación, depto, area, empresa, genero, generacion

---

## Fase 3: Modelos — 4 ENTRENADOS Y FUNCIONANDO

### 1. `rotation` — Predicción de rotación individual (14d/28d)
- **Archivo**: `apps/ml_service/app/models/rotation.py`
- **Clase**: `RotationAttritionTrainer` + `MultiHorizonEnsemble`
- Lee de `ml_employee_features` (Gold layer)
- Evalúa 4 algoritmos: XGBoost, LightGBM, RandomForest, LogisticRegression
- Split temporal: últimos 3 meses como test
- **Output**: MultiHorizonEnsemble con predict_proba() → Dict[horizon, probabilities]
- **Predicciones**: 448 rows (194 emp × 2 horizontes + 60 segmentos)
- **Cron**: Lunes 2am

### 2. `absenteeism_risk` — Riesgo de ausentismo recurrente
- **Archivo**: `apps/ml_service/app/models/absenteeism.py`
- **Clase**: `AbsenteeismRiskTrainer`
- Lee de `ml_employee_features` (Gold layer)
- **Sesión 3 fix**: Deriva `tendencia_num` desde `tendencia_faltas` (texto) en Python — la columna SQL calculada no existía en REST
- Clasificación binaria: ¿empleado tendrá 2+ faltas negativas en próximos 30d?
- Evalúa 4 algoritmos, selecciona ganador
- **Ganador**: LogisticRegression (AUC 0.90, target forward-looking corregido)
- **Predicciones**: 195 rows (194 per-employee + 1 total agregado)
- **Cron**: Lunes 3am

### 3. `absence_forecast` — Forecast de faltas por código
- **Archivo**: `apps/ml_service/app/models/forecast_absence.py`
- **Clase**: `AbsenceForecastTrainer`
- Lee de `mv_incidencias_enriquecidas` (Silver) + `mv_empleados_master` (Silver)
- **Sesión 3 fix**: `load_training_frame()` reescrito — el SQL CTE original no funciona con REST adapter. Ahora agrega datos en pandas: groupby(fecha, codigo) → count, headcount diario calculado desde empleados
- SARIMAX por código de incidencia con headcount como exog
- **11 códigos entrenados**: FI, INC, VAC, PCON, PSIN, SUSP, ENFE, MAT3, FEST, PATER, ACCI
- Forecast a 7, 14, 28 días
- **Predicciones**: 33 rows (11 códigos × 3 horizontes)
- **Cron**: Lunes 3:30am

### 4. `attrition_causes` — Causas raíz de bajas (SHAP)
- **Archivo**: `apps/ml_service/app/models/attrition_causes.py`
- **Clase**: `AttritionCausesTrainer`
- Lee de `mv_empleados_master` (Silver) + `mv_incidencias_enriquecidas` (Silver)
- **Sesión 3 fixes**:
  - `load_training_frame()` ahora carga incidencias por separado y agrega features (neg_90d, neg_180d, etc.) en Python
  - Target cambiado de `tipo_baja` (una sola clase "Baja") a `motivo_grouped` (8 clases)
  - Clases pequeñas (<5 muestras) agrupadas en "Otros"
  - LabelEncoder agregado para compatibilidad con XGBoost multiclass
  - SHAP analysis robusto: maneja formatos list (old) y 3D array (new XGBoost), con fallback a feature_importances_
- **8 clases**: Abandono/No regresó, Otra razón, Término del contrato, Rescisión por desempeño, Rescisión por disciplina, Otro trabajo mejor compensado, Regreso a la escuela, Otros
- **Weighted F1**: 0.54 (esperable con 8 clases desbalanceadas)
- **Predicciones**: 0 (modelo de análisis — consultar `/models/attrition_causes/analysis` para SHAP)
- **Cron**: día 1 de cada mes, 3:30am

---

## Fase 4: Scheduler y Cron Jobs — COMPLETADA

### Archivo: `apps/ml_service/app/scheduling/scheduler.py`

| Job ID | Cron | Descripción |
|--------|------|-------------|
| `rotation` | `0 2 * * 1` | Retrain modelo de rotación |
| `absenteeism_risk` | `0 3 * * 1` | Retrain modelo de ausentismo |
| `absence_forecast` | `30 3 * * 1` | Retrain forecast de faltas |
| `attrition_causes` | `30 3 1 * *` | Retrain causas SHAP (mensual) |
| `refresh_silver` | `30 0 * * *` | Refresh materialized views Silver |
| `refresh_features` | `0 1 * * *` | Refresh ml_employee_features |
| `weekly_snapshot` | `0 23 * * 0` | Foto semanal (domingos 11pm) |
| `accuracy_tracking` | `0 4 * * 1` | Comparar predicciones vs realidad |

### Flujo post-entrenamiento
Después de cada training, el scheduler automáticamente:
1. Guarda el modelo entrenado (.joblib)
2. Llama a `_generate_predictions()` → genera predicciones para empleados activos
3. Persiste estado del scheduler

---

## Fase 5: Frontend — Tab Predicciones — COMPLETADA

### Componentes
| Archivo | Función |
|---------|---------|
| `src/hooks/use-ml-predictions.ts` | Hook que lee `ml_predictions_log` via Supabase |
| `src/components/ml/ml-predictions-tab.tsx` | 4 secciones: KPI cards, tabla riesgo, chart segmentos, chart forecast |
| `src/components/dashboard-page.tsx` | 5to tab "Predicciones" |
| `src/app/api/ml/models/[modelId]/predict/route.ts` | Proxy POST a ML service |
| `src/app/api/ml/predictions/route.ts` | Proxy GET a ML service |
| `src/lib/supabase.ts` | `getMLPredictions()` — lectura directa de Supabase |

### Tab Predicciones muestra
1. **KPI Cards**: Riesgo ALTO (73), MEDIO (178), BAJO (83), Ausencias próx. 28d (165)
2. **Tabla de empleados en riesgo**: Filtrable por horizonte (14d/28d) y nivel de riesgo
3. **Bajas predichas por área**: Bar chart horizontal top 10 áreas
4. **Forecast de ausencias por código**: Bar chart agrupado 7d/14d/28d por código (VAC, PCON, ENFE, SUSP, FI, PSIN, INC)

---

## API REST del ML Service

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/models` | Lista todos los modelos con estado |
| GET | `/models/{id}` | Detalle de un modelo |
| POST | `/models/{id}/train` | Entrenar modelo manualmente |
| POST | `/models/{id}/schedule` | Configurar schedule de un modelo |
| GET | `/models/{id}/analysis` | Análisis detallado (métricas, confusion matrix, features) |
| GET | `/models/{id}/trends` | Tendencias actual vs predicho (solo rotation) |
| POST | `/models/{id}/predict` | Generar predicciones → `ml_predictions_log` |
| GET | `/predictions` | Leer predicciones (query: model_name, risk_level, limit) |

### POST /predict — Deduplicación (Sesión 3)
Antes de insertar nuevas predicciones, elimina las existentes del mismo `model_name` + `prediction_date`. Esto evita duplicados al re-ejecutar `/predict`.

### DatabaseREST (adapter para Supabase)
- **Archivo**: `apps/ml_service/app/database_rest.py`
- Lee datos via PostgREST (`GET /rest/v1/{view_name}`)
- Paginación automática (1000 rows por request)
- Detección automática de vista por contenido del SQL query
- `insert_rows()`: Escribe rows en batches de 500
- `rpc()`: Llama funciones RPC de Supabase

---

## Datos en Supabase (estado actual — 18 Feb 2026)

| Tabla/Vista | Tipo | Rows | Descripción |
|-------------|------|------|-------------|
| empleados_sftp | Bronze | 1,051 | Raw employee data (NO tocar) |
| motivos_baja | Bronze | 676 | Raw termination records (NO tocar) |
| incidencias | Bronze | 8,880+ | Raw incident records (NO tocar) |
| mv_empleados_master | Silver MV | 1,075 | Empleado unificado con lógica rehire |
| mv_incidencias_enriquecidas | Silver MV | 8,880+ | Incidencia enriquecida |
| ml_employee_features | Gold | 4,641 | Feature vectors (13 snapshots × ~357 emp) |
| **ml_predictions_log** | Gold | **676** | **Rotation (448) + Absenteeism (195) + Forecast (33)** |
| ml_weekly_snapshots | Gold | 0 | Se llena con cron semanal (domingos 11pm) |

---

## Estructura de Archivos del ML Service

```
apps/ml_service/
├── app/
│   ├── main.py              # FastAPI app, endpoints, trends logic
│   ├── config.py             # Settings (pydantic-settings, .env)
│   ├── database.py           # Database protocol/interface
│   ├── database_rest.py      # Supabase REST adapter
│   ├── schemas.py            # Pydantic models
│   ├── models/
│   │   ├── base.py           # BaseModelTrainer (abstract, persistence)
│   │   ├── registry.py       # MODEL_REGISTRY (4 modelos)
│   │   ├── evaluation.py     # Multi-algorithm evaluation pipeline
│   │   ├── predictions.py    # Prediction generation + logging
│   │   ├── rotation.py       # RotationAttritionTrainer + MultiHorizonEnsemble
│   │   ├── absenteeism.py    # AbsenteeismRiskTrainer
│   │   ├── forecast_absence.py # AbsenceForecastTrainer (SARIMAX)
│   │   └── attrition_causes.py # AttritionCausesTrainer (SHAP)
│   ├── scheduling/
│   │   └── scheduler.py      # ModelScheduler (APScheduler wrapper)
│   └── utils/
│       ├── io.py             # File I/O helpers
│       ├── schedules.py      # Cron expression helpers
│       └── sklearn.py        # OneHotEncoder helper
├── storage/
│   ├── models/               # Trained model artifacts (.joblib)
│   │   ├── rotation/v1.joblib
│   │   ├── absenteeism_risk/v1.joblib
│   │   ├── absence_forecast/v1.joblib
│   │   └── attrition_causes/v1.joblib
│   ├── metrics/              # Training metrics (.json)
│   │   ├── rotation/latest.json
│   │   ├── absenteeism_risk/latest.json
│   │   ├── absence_forecast/latest.json
│   │   └── attrition_causes/latest.json
│   └── scheduler.json        # Scheduler state persistence
├── requirements.txt
├── .env                      # Supabase credentials
└── README.md
```

---

## Bugs Resueltos (Sesión 3)

### 1. REST adapter routing: SQL con múltiples vistas
- **Problema**: `FORECAST_SQL` menciona `mv_incidencias_enriquecidas` Y `mv_empleados_master`. `_detect_view_name()` encuentra `mv_empleados_master` primero y redirige incorrectamente
- **Fix**: Usar queries simples `SELECT * FROM mv_incidencias_enriquecidas` para forzar la vista correcta, luego agregar en Python

### 2. attrition_causes: una sola clase de target
- **Problema**: `tipo_baja` solo tiene valor "Baja" (450 records) — XGBoost necesita ≥2 clases
- **Fix**: Cambiar target a `motivo_grouped` (8 clases con min 5 samples), agregar LabelEncoder

### 3. attrition_causes: SHAP 3D array
- **Problema**: XGBoost moderno retorna `shap_values` como 3D numpy array `(n_samples, n_features, n_classes)` en vez de list
- **Fix**: Manejo robusto de ambos formatos + fallback a `feature_importances_`

### 4. absenteeism: columna tendencia_num inexistente
- **Problema**: SQL CASE expression (`tendencia_num`) no se ejecuta en REST — solo existe `tendencia_faltas` como texto
- **Fix**: `df['tendencia_num'] = df['tendencia_faltas'].map({'empeorando': 1, 'mejorando': -1}).fillna(0)`

### 5. Predicciones duplicadas
- **Problema**: Llamar `/predict` dos veces duplica rows
- **Fix (Sesión 3)**: DELETE previo por `model_name + prediction_date` antes de INSERT

---

## Dependencias Python

### Instaladas y funcionando
- fastapi, uvicorn, httpx (API + REST client)
- pandas, numpy (data processing)
- scikit-learn 1.7.2 (pipelines, preprocessing)
- xgboost 3.1.1 (gradient boosting)
- lightgbm (gradient boosting alternativo)
- statsmodels (SARIMAX para forecast)
- shap (explainability para attrition_causes)
- apscheduler 3.11.1 (cron jobs)
- pydantic, pydantic-settings (config/schemas)
- joblib (model persistence)
