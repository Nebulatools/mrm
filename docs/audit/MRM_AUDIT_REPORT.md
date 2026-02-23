# MRM ML Predictions System — Audit Report

**Branch:** `qa` (commits `65723b9`, `e2664bf`)
**Fecha de auditoría:** 2026-02-23
**Scope:** Todos los cambios de ML/predicciones en `qa` vs `main`
**Auditor:** Claude Opus 4.6

---

## 1. Resumen Ejecutivo

Se introduce un **servicio de ML completo** (`apps/ml_service/`) con 4 modelos de predicción y su integración frontend en el dashboard existente de Next.js. El sistema incluye:

- **4 modelos de ML:** rotation, absenteeism_risk, absence_forecast, attrition_causes
- **API FastAPI** con endpoints de entrenamiento, predicción, análisis y scheduling
- **Adaptador REST** para consultar Supabase sin conexión directa a PostgreSQL
- **Tab "Predicciones"** integrada en el dashboard principal
- **Scheduler automático** con APScheduler para re-entrenamiento y tracking de accuracy

### Veredicto General

El sistema tiene una **arquitectura sólida** con buena separación de responsabilidades, pero presenta **varios hallazgos críticos y de seguridad** que deben resolverse antes del merge a `main`.

---

## 2. Hallazgos Críticos (BLOQUEANTES)

### 2.1 CRIT-01: Archivos `__pycache__` y binarios `.pyc` comprometidos en git

**Archivos afectados:** 20 archivos `.pyc` en `__pycache__/`
**Impacto:** Contamina el repositorio con artefactos de build, aumenta tamaño innecesariamente, causa conflictos entre desarrolladores con distintas versiones de Python.

El `.gitignore` fue actualizado correctamente con `**/__pycache__/` y `*.pyc`, pero los archivos ya fueron committed antes de agregar la regla.

**Acción requerida:**
```bash
git rm -r --cached apps/ml_service/app/__pycache__/
git rm -r --cached apps/ml_service/app/models/__pycache__/
git rm -r --cached apps/ml_service/app/scheduling/__pycache__/
```

### 2.2 CRIT-02: Métricas de storage y scheduler state committed en git

**Archivos afectados:**
- `apps/ml_service/storage/metrics/*/latest.json` (4 archivos)
- `apps/ml_service/storage/metrics/*/history_*.json` (7 archivos)
- `apps/ml_service/storage/scheduler.json`
- `apps/ml_service/storage/models/rotation/v1.joblib` (1.18 MB binario, ya removido pero en historial)

**Impacto:** Los archivos de métricas contienen datos de entrenamiento del ambiente local/QA, que sobreescribirían los de producción al hacer deploy. El scheduler.json tiene estado local que no debería compartirse. El joblib de 1.18 MB estará en el historial de git permanentemente.

**Acción requerida:**
- Agregar a `.gitignore`:
  ```
  apps/ml_service/storage/metrics/
  apps/ml_service/storage/scheduler.json
  ```
- `git rm --cached` para todos estos archivos
- Considerar un `.gitkeep` en los directorios vacíos si se necesita la estructura

### 2.3 CRIT-03: Import faltante en `rotation.py` — `train_test_split`

**Archivo:** `apps/ml_service/app/models/rotation.py:161`
**Código afectado:**
```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y,
)
```

`train_test_split` no está importado en `rotation.py`. Este path se ejecuta solo como fallback (cuando el test set no tiene ambas clases), pero cuando se activa, el training crasheará con `NameError`.

**Acción requerida:** Agregar `from sklearn.model_selection import train_test_split` al archivo.

### 2.4 CRIT-04: Enum `QUARTERLY` referenciado pero no definido en `ScheduleFrequency`

**Archivo:** `apps/ml_service/app/utils/schedules.py:31`
**Archivo de definición:** `apps/ml_service/app/schemas.py:16-22`

`schedule_to_cron()` maneja `ScheduleFrequency.QUARTERLY`, pero el enum `ScheduleFrequency` solo define: `MANUAL`, `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`.

Esto significa que si alguien configura un schedule con `frequency: "quarterly"`, Pydantic rechazará el valor antes de que llegue a `schedule_to_cron()`. No es un crash en runtime, pero indica un diseño incompleto.

**Acción requerida:** O agregar `QUARTERLY = 'quarterly'` al enum, o eliminar el branch de `schedules.py`.

---

## 3. Hallazgos de Seguridad

### 3.1 SEC-01: CORS configurado con `allow_origins=['*']`

**Archivo:** `apps/ml_service/app/main.py:63-69`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
```

**Impacto:** Permite requests desde cualquier origen con credentials. En un servicio interno esto puede ser aceptable durante QA, pero `allow_credentials=True` + `allow_origins=['*']` es una combinación que navegadores modernos bloquean parcialmente. Si el servicio se expone a internet, cualquier sitio podría invocar los endpoints de entrenamiento.

**Recomendación:** Restringir `allow_origins` al dominio del frontend Next.js (ej. `['http://localhost:3000', 'https://mrm.vercel.app']`).

### 3.2 SEC-02: Servicio ML sin autenticación propia

**Archivo:** `apps/ml_service/app/main.py` (todos los endpoints)

Ningún endpoint del FastAPI service requiere autenticación. Cualquiera con acceso de red al servicio puede:
- Entrenar modelos (`POST /models/{id}/train`)
- Generar predicciones que se escriben a Supabase (`POST /models/{id}/predict`)
- Modificar schedules (`POST /models/{id}/schedule`)
- Leer datos sensibles de empleados (`GET /predictions`)

Los proxy routes de Next.js (`/api/ml/*`) sí validan `requireAdmin()`, lo cual protege el acceso vía frontend. Pero el servicio FastAPI expuesto directamente carece de protección.

**Recomendación:** Agregar middleware de autenticación con API key o Bearer token al FastAPI service.

### 3.3 SEC-03: Service role key expuesta en REST adapter

**Archivo:** `apps/ml_service/app/database_rest.py:59-63`

El `service_role_key` de Supabase se envía en cada request como header. Esto es correcto para comunicación server-to-server, pero:
- El key se pasa en constructor sin validación de que no sea vacía
- Si el servicio ML se despliega en un entorno donde las env vars no están configuradas, `supabase_service_key` puede ser `None` (definido como `Optional` en config), y el adaptador lo convertirá a string vacío, lo que causaría requests no autenticadas silenciosamente.

**Recomendación:** Validar que `service_role_key` no sea vacío/None en el constructor de `DatabaseREST`.

---

## 4. Hallazgos de Calidad de Código

### 4.1 QC-01: Duplicación de lógica de preparación de features

La lógica de preparar features (fill NaN, coercion numérica, fill categoricals con 'UNKNOWN') se repite casi idéntica en:
- `rotation.py:106-116` (training)
- `main.py:440-452` (trends endpoint)
- `predictions.py:67-78` (rotation predictions)
- `predictions.py:293-309` (absenteeism predictions)
- `absenteeism.py:125-136` (training)

Cada copia tiene ligeras variaciones de default value ('UNKNOWN' vs 'DESCONOCIDO' en attrition_causes). Si se agrega un feature nuevo o se cambia la lógica de imputación, hay que actualizar 5 sitios.

**Recomendación:** Extraer una función utilitaria `prepare_features(df, numeric_cols, categorical_cols, fill_cat='UNKNOWN')` en `base.py` o un módulo utils.

### 4.2 QC-02: `database_rest.py` fallback heurístico para routing de queries

**Archivo:** `apps/ml_service/app/database_rest.py:134-173`

`_detect_view_name()` usa heurísticas de string matching para mapear SQL queries a vistas de Supabase. El fallback default es `'ml_employee_features'`, lo que significa que cualquier query no reconocida silenciosamente consultará la vista incorrecta sin error.

**Ejemplo problemático:** En `scheduler.py:238`, se ejecuta `fetch_dataframe('SELECT * FROM ml_predictions_log')`, y `_detect_view_name` lo mapea correctamente solo porque contiene el literal `ml_predictions_log`. Pero si alguien escribe una query con `JOIN ml_predictions_log ...` y otra tabla, el matching podría fallar.

**Recomendación:** Eliminar el fallback default y lanzar `ValueError` cuando no se pueda detectar la vista, forzando uso explícito.

### 4.3 QC-03: Deprecated `@app.on_event` en FastAPI

**Archivo:** `apps/ml_service/app/main.py:72-81`

`@app.on_event('startup')` y `@app.on_event('shutdown')` están deprecados en FastAPI >= 0.110. La forma moderna es usar el `lifespan` context manager.

**Impacto:** Funcional ahora, pero emitirá warnings en versiones futuras.

### 4.4 QC-04: `forecast_absence.py` usa `.fillna(method='ffill')` (deprecated pandas)

**Archivo:** `apps/ml_service/app/models/forecast_absence.py:171`
```python
headcount = headcount.set_index('day').asfreq('D', method='ffill')
```

`method='ffill'` en `asfreq()` y `.fillna(method='bfill')` en la línea 171 están deprecated en pandas >= 2.1. Deben reemplazarse con `.ffill()` y `.bfill()` respectivamente.

### 4.5 QC-05: Encoding corrupto en feature importances almacenados

**Archivo:** `apps/ml_service/storage/metrics/rotation/latest.json:39-50`

Los valores almacenados contienen caracteres corruptos:
```json
"area_Administraci?n y Finanzas": 1.236,
"departamento_DIRECCI?N GENERAL": 1.599,
```

Esto indica que el OneHotEncoder codificó valores con encoding incorrecto (probablemente Latin-1 vs UTF-8 en los datos originales). Los feature names con `?` en lugar de acentos (`ó`, `Ó`) dificultan la interpretación de resultados.

**Recomendación:** Normalizar encoding de valores categóricos antes del OneHotEncoding, o usar `unidecode` para limpiar los nombres.

### 4.6 QC-06: `scheduler.json` referencia modelos no registrados en `MODEL_REGISTRY`

**Archivo:** `apps/ml_service/storage/scheduler.json` contiene:
- `employee_lifecycle`
- `labor_patterns`
- `preventive_interventions`
- `productivity_impact`
- `segment_risk`

Pero `MODEL_REGISTRY` (registry.py) solo registra: `rotation`, `absenteeism_risk`, `absence_forecast`, `attrition_causes`.

Los 5 modelos extra existen como archivos Python (`lifecycle.py`, `patterns.py`, etc.) pero no están registrados. El scheduler intentará programarlos si se persiste este state, causando KeyError silencioso o jobs fantasma.

**Recomendación:** Limpiar `scheduler.json` para solo contener modelos registrados, o registrar los 5 modelos faltantes en `MODEL_REGISTRY`.

---

## 5. Hallazgos de Arquitectura

### 5.1 ARCH-01: Dependencia dual de `database.py` (asyncpg) y `database_rest.py` (httpx)

El sistema tiene dos adaptadores de base de datos:
- `database.py` — conexión directa PostgreSQL con `asyncpg`
- `database_rest.py` — REST API vía Supabase PostgREST con `httpx`

En `main.py`, se usa `DatabaseREST`. Sin embargo:
- `base.py:37` importa `from ..database import Database` (la clase asyncpg)
- `registry.py:9` importa `from ..database import Database`
- `predictions.py:27` importa `from ..database import Database`

Esto funciona porque Python duck-typing: `DatabaseREST` expone la misma interfaz que `Database`. Pero el type hint es incorrecto — los trainers esperan `Database` pero reciben `DatabaseREST`.

**Recomendación:** Crear un `Protocol` o ABC compartido para ambos adaptadores y usarlo como type hint.

### 5.2 ARCH-02: `insert_rows` en `DatabaseREST` no valida respuestas

**Archivo:** `database_rest.py:90-101`

```python
async def insert_rows(self, table: str, rows: list[dict]) -> int:
    ...
    resp = await client.post(f'/{table}', json=batch)
    resp.raise_for_status()
    inserted += len(batch)
    return inserted
```

El conteo retornado asume que todos los registros del batch se insertaron si no hay error HTTP. Pero Supabase PostgREST puede retornar 200 con inserciones parciales (duplicados con `ON CONFLICT`). El header `Prefer: return=representation` está configurado, pero la respuesta no se valida contra el conteo real.

**Impacto:** Podrían reportarse más predicciones insertadas de las que realmente se guardaron.

### 5.3 ARCH-03: Predicciones se borran y re-insertan sin transacción

**Archivo:** `main.py:679-691`

```python
# Delete old predictions for this model+date
await client.delete('/ml_predictions_log', params={...})
# Insert new
count = await database.insert_rows('ml_predictions_log', rows)
```

Si el delete tiene éxito pero el insert falla, se pierden las predicciones anteriores sin reemplazo. No hay transacción que envuelva ambas operaciones.

**Recomendación:** Insertar primero con un `batch_id` diferente, luego eliminar los antiguos, o usar upsert.

### 5.4 ARCH-04: Frontend lee directamente de Supabase, bypass del servicio ML

**Archivo:** `apps/web/src/hooks/use-ml-predictions.ts:47`
```typescript
const raw = await db.getMLPredictions({ latestOnly: true, limit: 7000 });
```

El hook `useMLPredictions` consulta `ml_predictions_log` directamente vía Supabase client (anon key), mientras que los API routes de Next.js (`/api/ml/predictions`) hacen proxy al servicio ML.

Esto significa que:
- Las predicciones se leen sin pasar por el servicio ML
- El admin auth de los API routes es irrelevante para la lectura de predicciones
- Cualquier usuario con la anon key podría leer las predicciones (depende de RLS en Supabase)

**Recomendación:** Verificar que la tabla `ml_predictions_log` tenga RLS policies adecuadas, o rutear todas las lecturas a través de los API routes autenticados.

### 5.5 ARCH-05: CausesSection hace fallback a `localhost:8001`

**Archivo:** `apps/web/src/components/ml/ml-predictions-tab.tsx:551-559`

```typescript
// Fallback: try reading from stored metrics via ML service directly
const resp2 = await fetch("http://localhost:8001/models/attrition_causes/analysis");
```

El componente frontend intenta llamar directamente a `localhost:8001` como fallback. Esto:
- Solo funciona en desarrollo local
- Fallará silenciosamente en producción (Vercel)
- Expone la arquitectura interna al cliente

**Recomendación:** Eliminar el fallback a localhost y solo usar el proxy de Next.js (`/api/ml/models/attrition_causes/analysis`). Si el API proxy no existe para este endpoint, crearlo.

---

## 6. Hallazgos de Rendimiento

### 6.1 PERF-01: `forecast_absence.py` calcula headcount iterando día por día

**Archivo:** `apps/ml_service/app/models/forecast_absence.py:128-135`

```python
headcounts = {}
for d in calendar:
    dt = pd.Timestamp(d)
    active = emp_df[
        (emp_df['fecha_ingreso'] <= dt)
        & (emp_df['fecha_baja_final'].isna() | (emp_df['fecha_baja_final'] >= dt))
    ]
    headcounts[d] = len(active)
```

Con ~400 días de calendario y ~1000 empleados, esto ejecuta ~400K comparaciones de DataFrame. Es un cuello de botella notable.

**Recomendación:** Vectorizar usando un approach de "event-based counting" con `cumsum` sobre ingresos y bajas ordenados.

### 6.2 PERF-02: `latestOnly` filtra en cliente después de traer 7000 rows

**Archivo:** `apps/web/src/lib/supabase.ts:399-410`

```typescript
if (latestOnly) {
    const latestDates = new Map<string, string>();
    for (const row of data) { ... }
    return data.filter(...);
}
```

Primero trae hasta 7000 registros de `ml_predictions_log`, luego filtra en JavaScript. Sería más eficiente filtrar por `prediction_date` en la query de Supabase.

**Recomendación:** Ejecutar una sub-query o RPC para obtener la fecha más reciente por modelo, luego filtrar server-side.

### 6.3 PERF-03: Attrition causes itera por cada empleado sobre todas las incidencias

**Archivo:** `apps/ml_service/app/models/attrition_causes.py:144-157`

```python
for emp_id, group in inc_df.groupby('numero_empleado'):
    fb = group['fecha_baja'].iloc[0]
    # ... window calculations
```

Con ~676 ex-empleados y ~8900 incidencias, el groupby + loop con filtros temporales es O(n*m). Podría vectorizarse con merge + boolean masks.

---

## 7. Hallazgos de Integración Frontend-Backend

### 7.1 INT-01: Tab "Predicciones" grid tiene 5 columnas pero `grid-cols-4`

**Archivo:** `apps/web/src/components/ml/ml-predictions-tab.tsx:139`

```tsx
<TabsList className="grid w-full grid-cols-4">
```

El tab principal del dashboard ahora tiene 5 tabs (Resumen, Personal, Incidencias, Rotación, Predicciones) pero el grid interno de ML tiene 4 sub-tabs. Esto está correcto para las sub-tabs internas, pero vale verificar que el tab parent se ajusta visualmente con 5 elementos.

### 7.2 INT-02: API route `/api/ml/models/[modelId]/predict` no valida `modelId`

**Archivo:** `apps/web/src/app/api/ml/models/[modelId]/predict/route.ts:20`

```typescript
const response = await fetch(`${ML_SERVICE_URL}/models/${context.params.modelId}/predict`, ...);
```

El `modelId` se pasa directamente a la URL del servicio ML sin sanitización. Aunque el FastAPI service valida contra `MODEL_REGISTRY`, un `modelId` con caracteres especiales (ej. `../admin`) podría causar path traversal en la URL construida.

**Recomendación:** Validar `modelId` contra un whitelist (`/^[a-z_]+$/`) antes de incluirlo en la URL.

### 7.3 INT-03: Variable de entorno `ML_SERVICE_URL` no documentada

Los API routes requieren `ML_SERVICE_URL` pero esta variable no está documentada en CLAUDE.md ni en los ejemplos de `.env.local`.

**Acción requerida:** Documentar `ML_SERVICE_URL` (ej. `http://localhost:8001`) en la sección de Environment Configuration.

---

## 8. Modelos de ML — Análisis Técnico

### 8.1 Modelo: Rotation (Predicción de rotación individual)

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Clasificación binaria multi-horizonte (14d, 28d) |
| **Algoritmos evaluados** | XGBoost, LightGBM, RandomForest, LogisticRegression |
| **Ganador actual** | LogisticRegression (por `average_precision`) |
| **ROC-AUC (28d)** | 0.769 |
| **Average Precision (28d)** | 0.254 |
| **F1 (28d)** | 0.122 |
| **Features** | 20 numéricas + 8 categóricas |
| **Fuente de datos** | `ml_employee_features` (Gold layer) |
| **Split temporal** | Últimos 90 días como test set |

**Observaciones:**
- El F1 de 0.12 es muy bajo, indicando que el modelo tiene dificultades para detectar bajas reales sin generar muchos falsos positivos
- El `average_precision` de 0.254 es modesto — esperable con clases muy desbalanceadas (pocas bajas vs muchos activos)
- LogisticRegression ganó sobre XGBoost/LightGBM, lo cual sugiere que los datos pueden ser linealmente separables o que los tree-based models están overfitting
- El cross-validation mean (0.308) vs test AP (0.254) muestra gap moderado

### 8.2 Modelo: Absenteeism Risk

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Clasificación binaria (2+ faltas negativas en 30d) |
| **Target** | Forward-looking: `next_faltas_neg_28d >= 2` |
| **Features** | 22 numéricas (incluye 2 ratios derivados) + 8 categóricas |
| **Fuente** | `ml_employee_features` |

**Observaciones:**
- Buen diseño del target forward-looking usando `shift(-1)` por empleado
- Los ratios derivados (`ratio_fi_to_neg`, `ratio_neg_recent_vs_old`) añaden señal
- El split es random (no temporal), lo cual puede causar data leakage si los snapshots son cercanos

### 8.3 Modelo: Absence Forecast (SARIMAX)

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Time series (SARIMAX por código de incidencia) |
| **Códigos** | FI, INC, VAC, PCON, PSIN, SUSP, ENFE, MAT3, FEST, PATER, ACCI |
| **Horizontes** | 7, 14, 28 días |
| **Exógena** | Headcount diario |
| **Parámetros** | order=(1,1,1), seasonal_order=(0,1,1,7) |
| **Fuente** | `mv_incidencias_enriquecidas` + `mv_empleados_master` |

**Observaciones:**
- Los parámetros SARIMAX son fijos (no auto-seleccionados). Esto puede no ser óptimo para todos los códigos
- La estacionalidad semanal (7) es apropiada para datos laborales
- Buena práctica: refit en datos completos después de validación
- `FORECAST_CODES` en la constante incluye 11 códigos pero la SQL query solo genera 7. Los 4 extra (MAT3, FEST, PATER, ACCI) tendrán 0 registros en el grid y se saltarán

### 8.4 Modelo: Attrition Causes (SHAP)

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Clasificación multiclase (motivo de baja) |
| **Algoritmo** | XGBoost con softprob |
| **Explicabilidad** | SHAP TreeExplainer |
| **Features** | 10 numéricas + 8 categóricas |
| **Fuente** | `mv_empleados_master` + `mv_incidencias_enriquecidas` |

**Observaciones:**
- Buen manejo de clases pequeñas: agrupa motivos con < 5 muestras en "Otros"
- SHAP per-class permite explicar qué factores impulsan cada tipo de baja
- El fallback a `feature_importances_` nativo cuando SHAP falla es correcto
- El modelo no genera predicciones per-employee (es analítico), correctamente manejado en el endpoint `/predict`

---

## 9. Dependencias Externas (Fuera del Repositorio)

Los siguientes componentes son referenciados pero **no existen en este repositorio**. Su existencia en Supabase debe verificarse antes del deploy:

### 9.1 Vistas/Tablas requeridas en Supabase

| Objeto | Tipo | Usado por |
|--------|------|-----------|
| `ml_employee_features` | Vista/Tabla (Gold layer) | rotation, absenteeism_risk |
| `ml_predictions_log` | Tabla | predictions.py, use-ml-predictions.ts |
| `ml_weekly_snapshots` | Tabla | scheduler (snapshot semanal) |
| `mv_empleados_master` | Vista materializada (Silver layer) | attrition_causes, forecast_absence |
| `mv_incidencias_enriquecidas` | Vista materializada (Silver layer) | attrition_causes, forecast_absence |

### 9.2 RPCs requeridos en Supabase

| Función | Llamada desde |
|---------|---------------|
| `refresh_silver_views()` | scheduler.py:201 |
| `refresh_ml_employee_features(snapshot_date)` | scheduler.py:211 |
| `take_weekly_snapshot()` | scheduler.py:219 |

### 9.3 Columnas requeridas en `ml_employee_features`

```
numero_empleado, snapshot_date, edad, genero, generacion, antiguedad_dias,
es_operativo, departamento, area, ubicacion2, turno, empresa, clasificacion, puesto,
faltas_neg_7d, faltas_neg_14d, faltas_neg_28d, faltas_neg_56d, faltas_neg_90d,
fi_7d, fi_14d, fi_28d, fi_90d, salud_28d, salud_90d, permisos_28d, permisos_90d,
vacaciones_90d, total_incidencias_28d, total_incidencias_90d, tasa_faltas_neg_28d,
tendencia_faltas, dias_desde_ultima_falta,
tuvo_baja_siguiente_14d, tuvo_baja_siguiente_28d
```

### 9.4 Columnas requeridas en `ml_predictions_log`

```
id, model_name, algorithm_name, prediction_date, horizon, numero_empleado,
predicted_probability, risk_level, segment_type, segment_value, predicted_count,
genero, generacion, top_features, was_correct, actual_value
```

### 9.5 Columnas requeridas en `mv_empleados_master`

```
numero_empleado, fecha_baja_final, motivo_baja, tipo_baja, edad, antiguedad_dias,
genero, generacion, es_operativo, departamento, area, ubicacion2, turno, empresa,
clasificacion, fecha_ingreso
```

### 9.6 Columnas requeridas en `mv_incidencias_enriquecidas`

```
numero_empleado, fecha, codigo_incidencia, es_negativa, es_falta_injustificada,
categoria_incidencia
```

---

## 10. Checklist de Acciones Pre-Merge

### Bloqueantes (DEBE resolverse)

- [ ] **CRIT-01** — Remover archivos `__pycache__/*.pyc` del tracking de git
- [ ] **CRIT-02** — Remover `storage/metrics/` y `storage/scheduler.json` del tracking; agregar a `.gitignore`
- [ ] **CRIT-03** — Agregar `from sklearn.model_selection import train_test_split` en `rotation.py`
- [ ] **CRIT-04** — Agregar `QUARTERLY` al enum o eliminar el branch en `schedules.py`
- [ ] **SEC-01** — Restringir CORS origins a dominios conocidos
- [ ] **INT-03** — Documentar `ML_SERVICE_URL` en configuración de entorno

### Recomendados (DEBERÍA resolverse)

- [ ] **SEC-02** — Agregar autenticación al servicio FastAPI (API key mínimo)
- [ ] **SEC-03** — Validar que `service_role_key` no sea None/vacío en constructor de DatabaseREST
- [ ] **ARCH-03** — Implementar upsert o transacción para delete+insert de predicciones
- [ ] **ARCH-05** — Eliminar fallback a `localhost:8001` en CausesSection
- [ ] **INT-02** — Sanitizar `modelId` en API route antes de interpolarlo en URL
- [ ] **QC-02** — Eliminar fallback default en `_detect_view_name()`, lanzar error explícito
- [ ] **QC-05** — Normalizar encoding de valores categóricos antes del OneHotEncoding
- [ ] **QC-06** — Limpiar `scheduler.json` o registrar modelos faltantes

### Mejoras futuras (PODRÍA resolverse)

- [ ] **QC-01** — Extraer función utilitaria para preparación de features
- [ ] **QC-03** — Migrar de `@app.on_event` a `lifespan` context manager
- [ ] **QC-04** — Reemplazar `method='ffill'` deprecated por `.ffill()`
- [ ] **ARCH-01** — Crear Protocol/ABC para unificar type hints de adaptadores DB
- [ ] **ARCH-02** — Validar conteo real de inserciones desde respuesta PostgREST
- [ ] **ARCH-04** — Agregar RLS policies a `ml_predictions_log` o rutear lecturas por API
- [ ] **PERF-01** — Vectorizar cálculo de headcount diario
- [ ] **PERF-02** — Filtrar `latestOnly` server-side en Supabase
- [ ] **PERF-03** — Vectorizar agregación de incidencias en attrition_causes

---

## 11. Resumen de Archivos Modificados

### Servicio ML (nuevo - `apps/ml_service/`)

| Archivo | Propósito | LOC |
|---------|-----------|-----|
| `app/main.py` | FastAPI app, endpoints, trends | ~745 |
| `app/config.py` | Settings via pydantic-settings | ~44 |
| `app/database.py` | Adaptador asyncpg (legacy) | ~58 |
| `app/database_rest.py` | Adaptador REST Supabase | ~248 |
| `app/schemas.py` | Pydantic models para API | ~76 |
| `app/models/base.py` | Trainer abstracto + persistencia | ~117 |
| `app/models/rotation.py` | Modelo de rotación multi-horizonte | ~260 |
| `app/models/absenteeism.py` | Modelo de ausentismo recurrente | ~205 |
| `app/models/forecast_absence.py` | SARIMAX por código de incidencia | ~283 |
| `app/models/attrition_causes.py` | Causas raíz con SHAP | ~312 |
| `app/models/evaluation.py` | Pipeline multi-algoritmo | ~301 |
| `app/models/predictions.py` | Generación de predicciones | ~372 |
| `app/models/registry.py` | Registro de modelos | ~106 |
| `app/scheduling/scheduler.py` | APScheduler wrapper | ~307 |
| `app/utils/sklearn.py` | OneHotEncoder compat helper | ~26 |
| `app/utils/schedules.py` | Cron expression builder | ~34 |
| `requirements.txt` | Dependencias Python | ~21 |

### Frontend (modificado/nuevo - `apps/web/`)

| Archivo | Cambio | Propósito |
|---------|--------|-----------|
| `src/components/dashboard-page.tsx` | Modificado | Agrega tab "Predicciones" |
| `src/components/ml/ml-predictions-tab.tsx` | Nuevo | UI completa de 4 sub-tabs ML |
| `src/components/ml/index.ts` | Modificado | Export del nuevo componente |
| `src/hooks/use-ml-predictions.ts` | Nuevo | Hook para cargar predicciones |
| `src/lib/supabase.ts` | Modificado | Agrega `getMLPredictions()` |
| `src/app/api/ml/predictions/route.ts` | Nuevo | Proxy a ML service para GET predictions |
| `src/app/api/ml/models/[modelId]/predict/route.ts` | Nuevo | Proxy a ML service para POST predict |

---

*Fin del reporte de auditoría.*
