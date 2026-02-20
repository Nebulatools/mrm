# Auditoría Completa ML — 18 Febrero 2026

---

## Veredicto General (POST-CORRECCIONES)

| Modelo | Estado | Detalle |
|--------|--------|---------|
| `rotation` | **CORREGIDO** | 194 empleados (fix snapshot). F1=0.12, AUC=0.77. Precision baja pero recall 62% |
| `absenteeism_risk` | **CORREGIDO** | Target forward-looking. AUC=0.90, distribución real ALTO:33, MEDIO:94, BAJO:44 |
| `absence_forecast` | **MEJORADO** | 11 códigos (antes 7). ENFE sigue subprediciendo (-83%) |
| `attrition_causes` | **OK** | Weighted F1=0.54, 8 clases, SHAP funcional |

---

## 1. ROTATION — Análisis Detallado

### Bug crítico: 549 empleados en predicciones (debería ser 194)

**Causa raíz**: `generate_rotation_predictions()` hacía:
```python
features_df = await database.fetch_dataframe(
    "SELECT * FROM ml_employee_features WHERE snapshot_date = (SELECT MAX(...))"
)
```
Pero el REST adapter **ignora el WHERE** — devuelve las 4,641 rows de TODOS los 13 snapshots. El fix aplicado hoy para absenteeism NO se aplicó a rotation porque el `/predict` falló con error de sklearn.

**Error al re-generar**: `'LogisticRegression' object has no attribute 'multi_class'` — el modelo `.joblib` fue entrenado con sklearn que guardó atributo `multi_class`, pero la versión actual de sklearn lo eliminó. **Necesita re-entrenamiento**.

**Impacto en UI**: Muestra 549 empleados únicos cuando solo hay 194 activos. Un empleado aparece con datos de distintos meses, y el número 73 ALTO incluye empleados de snapshots viejos que ya no son activos.

### Métricas del modelo (preocupantes)

| Métrica | Horizonte 14d | Horizonte 28d |
|---------|--------------|--------------|
| ROC-AUC | 0.727 | 0.768 |
| Precision | **5.8%** | **6.8%** |
| Recall | 47.8% | 61.8% |
| F1 | **10.4%** | **12.2%** |
| Average Precision | 24.0% | 25.4% |
| Positive Rate (train) | 2.1% | 3.9% |
| Positive Rate (test) | 1.6% | 2.3% |

**Diagnóstico**:
- **Precision del 6.8%** = De cada 100 empleados que marca como "se va", solo 6-7 realmente se van. **94% son falsos positivos**.
- ROC-AUC de 0.77 parece decente, pero con clases tan desbalanceadas (solo 2-4% positivos) es engañoso.
- El ganador es **LogisticRegression** por `average_precision`, lo cual es correcto dado el desbalance.
- **F1 de 0.12** es muy bajo — el modelo tiene poco valor predictivo real.

**¿Por qué tantos ALTO (73)?** Con precision de 6.8%, el modelo sobreestima el riesgo masivamente. El threshold de 0.7 para "ALTO" es demasiado bajo para este modelo. Necesitaría calibración.

### Feature importances (preocupante)
Las top features son **áreas y departamentos** (categorías one-hot), no features operacionales. Esto sugiere que el modelo aprende "empleados de X departamento se van más" en vez de patrones predictivos como faltas o antigüedad.

### Datos de entrenamiento
- **Fuente**: `ml_employee_features` (13 snapshots, 2025-03 a 2026-02)
- **Train**: 3,174 rows | **Test**: 1,467 rows
- **Target**: `tuvo_baja_siguiente_28d` (4.8% positivos = solo 116 casos de baja en todo el dataset)
- **Problema**: Solo 116 positivos en 4,641 rows. Con clases tan raras, cualquier modelo va a generar muchos falsos positivos.

---

## 2. ABSENTEEISM RISK — Análisis Detallado

### Data leakage total — el modelo es un lookup, no una predicción

**Evidencia concreta de data leakage**:

| Feature | Importancia XGBoost |
|---------|-------------------|
| `faltas_neg_28d` | **0.221** (más alta) |
| `tasa_faltas_neg_28d` | **0.261** (segunda más alta) |
| `tendencia_num` | **0.221** |
| `total_incidencias_28d` | **0.170** |
| Todas las demás | 0.000 |

El target es `faltas_neg_28d >= 2`. Las features `faltas_neg_28d` y `tasa_faltas_neg_28d` (que es `faltas_neg_28d / algo`) son literalmente el target reescrito. El modelo aprende: "if faltas_neg_28d >= 2 → 1, else → 0" — que es la definición exacta del target.

**Resultado**:
- **TODOS los algoritmos** (XGBoost, RF, LR, LightGBM) tienen AUC = 1.0, F1 = 1.0
- Probabilidades binarias: 0.0003 o 0.9996 (no hay zona gris)
- Los 3 empleados ALTO son exactamente los 3 con `faltas_neg_28d >= 2` hoy

**¿Se usó correctamente el fix del snapshot?** SÍ — después del fix, ahora muestra 194 empleados (correcto) en vez de 4,641. Pero el modelo sigue siendo inútil por el leakage.

### Datos de entrenamiento
- **Fuente**: `ml_employee_features` (todas las rows históricas)
- **Train**: 3,480 rows | **Test**: 1,161 rows
- **Target**: `faltas_neg_28d >= 2` (6.6% positivos = 295 casos)
- **Positive rate**: 6.6% (más alto que rotation, pero el target es circular)

---

## 3. ABSENCE FORECAST — Análisis Detallado

### Comparación forecast vs realidad (últimos 28 días)

| Código | Real últimos 28d | Forecast 28d | Diferencia | Evaluación |
|--------|-----------------|--------------|------------|------------|
| **VAC** | 113 | 151.8 | +34% | Sobreestima, pero razonable |
| **ENFE** | 25 | 4.3 | **-83%** | **MUY SUBPREDICE** |
| **MAT3** | 18 | — | No monitoreado | Falta código MAT3 |
| **FEST** | 5 | — | No monitoreado | Falta código FEST |
| **PCON** | 2 | 6.3 | +215% | Sobreestima |
| **PSIN** | 1 | 0.0 | -100% | Subpredice |
| **FI** | 0 | 0.0 | OK | Correcto |
| **INC** | 0 | 0.0 | OK | Correcto |
| **SUSP** | 0 | 2.9 | Sobreestima | Sin datos reales recientes |

### Problemas identificados

1. **ENFE subpredicción severa**: Real=25, Forecast=4.3. MASE=4.16 (4x peor que naive). El modelo SARIMAX no captura los patrones de enfermedad. Posible causa: estacionalidad irregular, eventos únicos (brote de enfermedad).

2. **Códigos faltantes**: MAT3 (maternidad) y FEST (festivos) no están en los 7 códigos monitoreados. MAT3 tuvo 18 incidencias en 28 días — es significativo.

3. **VAC domina todo**: 151.8 de 165 total (92%). El forecast es básicamente "habrá muchas vacaciones". Los otros códigos son ruido en comparación.

### Datos de entrenamiento
- **Fuente**: `mv_incidencias_enriquecidas` (9,094 registros de 2025-01 a 2026-02)
- **Ventana**: últimos 400 días de incidencias
- **7 códigos**: FI, INC, VAC, PCON, PSIN, SUSP, ENFE
- **Faltantes**: MAT1, MAT3, ACCI, INCA, FEST, PATER, JUST
- **Headcount exógeno**: calculado diario desde `mv_empleados_master`
- **Train**: 369 días por código | **Validation**: 28 días

### Métricas SARIMAX por código
| Código | MASE | Evaluación |
|--------|------|------------|
| FI | 0.41 | Bueno (mejor que naive) |
| INC | 0.00 | Trivial (siempre 0) |
| PCON | 0.63 | Aceptable |
| PSIN | 0.63 | Aceptable |
| SUSP | 0.87 | Marginal |
| VAC | 2.45 | Malo (peor que naive) |
| ENFE | **4.16** | **Muy malo** |

---

## 4. ATTRITION CAUSES — Análisis Detallado

### El modelo más honesto de los cuatro

**Classification report por clase**:

| Clase | Precision | Recall | F1 | Support (test) |
|-------|-----------|--------|-----|----------------|
| Abandono / No regresó | 70.3% | 72.2% | **71.2%** | 36 |
| Otra razón | 47.6% | 66.7% | **55.6%** | 30 |
| Término del contrato | 68.4% | 59.1% | **63.4%** | 22 |
| Rescisión por desempeño | 50.0% | 37.5% | **42.9%** | 8 |
| Rescisión por disciplina | 25.0% | 50.0% | **33.3%** | 6 |
| Otro trabajo mejor compensado | 0% | 0% | **0%** | 5 |
| Otros | 0% | 0% | **0%** | 5 |
| Regreso a la escuela | 0% | 0% | **0%** | 1 |

**Diagnóstico**:
- Las 3 clases grandes (Abandono, Otra razón, Término) se predicen bien (F1 55-71%)
- Las clases con <10 muestras en test (Otro trabajo, Otros, Regreso) no se pueden predecir — F1=0%
- Esto es **esperado y correcto** — es un problema de datos, no de modelo

### SHAP — Factores importantes
Los resultados SHAP del modelo están en `storage/metrics/attrition_causes/latest.json` y se muestran en el tab Causas cuando el ML service está corriendo. El error "SHAP no disponible" ocurre porque el service no está activo.

### Datos de entrenamiento
- **Fuente**: `mv_empleados_master` (450 bajas de Feb 2024 a Ene 2026) + `mv_incidencias_enriquecidas` (incidencias agregadas por empleado)
- **Train**: 337 | **Test**: 113
- **Features de incidencias**: neg_90d, neg_180d, fi_90d, permisos_365d, total_365d (calculadas en Python, no SQL)

---

## 5. Bug Sistémico: REST Adapter No Ejecuta SQL

### El problema raíz de todo

`DatabaseREST.fetch_dataframe()` en `database_rest.py`:
1. Recibe un SQL string
2. **Solo extrae el nombre de la vista** del SQL (heurística por keywords)
3. Hace `GET /rest/v1/{view_name}?select=*` — devuelve TODAS las rows
4. **Ignora**: WHERE, JOIN, GROUP BY, HAVING, subqueries, CTEs

**Consecuencias**:
- Cualquier SQL con `WHERE snapshot_date = MAX(...)` devuelve todos los snapshots
- SQL con JOINs de múltiples tablas → solo devuelve una tabla (la primera detectada)
- SQL con agregaciones → devuelve rows sin agregar
- CTE con `generate_series` → devuelve raw data sin el grid

**Cada trainer tuvo que reimplementar la lógica SQL en Python** en `load_training_frame()`:
- `forecast_absence.py` → groupby + grid + headcount en pandas
- `attrition_causes.py` → fetch incidents separado + aggregation en pandas
- `absenteeism.py` → derive `tendencia_num` en pandas
- `predictions.py` → filter snapshot + operativos en pandas

---

## 6. Problemas de UI Detectados

### 6.1 Tab Causas: "SHAP no disponible"
**Causa**: El componente hace `fetch("/api/ml/models/attrition_causes/analysis")` que proxea a `http://localhost:8001` — si el ML service no está corriendo, falla.
**Fix**: Los datos están en `storage/metrics/attrition_causes/latest.json`. Se podría leer directamente de Supabase o del filesystem.

### 6.2 Rotation: 549 empleados mostrados
**Causa**: Las predicciones se generaron ANTES del fix de snapshot. Necesitan re-generarse.
**Blocker**: El modelo `.joblib` tiene incompatibilidad de sklearn (`multi_class` removed). Necesita re-entrenamiento.

### 6.3 Encoding corrupto en feature names
En los metrics JSON aparecen: `area_Administraci?n`, `area_Cr?dito`, `departamento_DIRECCI?N`. Los `?` son caracteres UTF-8 (á, é, ó) que se corrompieron en el OneHotEncoder. No afecta el modelo pero se ve mal en UI.

---

## 7. Recomendaciones Ordenadas por Prioridad

### PRIORIDAD 1: Re-entrenar rotation y re-generar predicciones
```bash
curl -X POST http://localhost:8001/models/rotation/train
curl -X POST http://localhost:8001/models/rotation/predict
```
Esto arregla: el bug de 549 empleados Y el error de sklearn. Las predicciones se generarán con el fix de snapshot.

### PRIORIDAD 2: Rehacer absenteeism_risk con target forward-looking
Cambiar en `absenteeism.py`:
```python
# ACTUAL (data leakage):
df['target_ausentismo'] = (df['faltas_neg_28d'] >= 2).astype(int)

# CORRECTO (forward-looking):
# Para cada snapshot, mirar si en el SIGUIENTE snapshot faltas_neg_28d >= 2
df = df.sort_values(['numero_empleado', 'snapshot_date'])
df['target_ausentismo'] = df.groupby('numero_empleado')['faltas_neg_28d'].shift(-1)
df['target_ausentismo'] = (df['target_ausentismo'] >= 2).astype(int)
df = df.dropna(subset=['target_ausentismo'])  # Drop last snapshot (no future)
```
Esto eliminará features con leakage y dará métricas reales.

### PRIORIDAD 3: Agregar códigos faltantes al forecast
Cambiar `FORECAST_CODES` en `forecast_absence.py`:
```python
FORECAST_CODES = ['FI', 'INC', 'VAC', 'PCON', 'PSIN', 'SUSP', 'ENFE', 'MAT3', 'FEST', 'PATER']
```

### PRIORIDAD 4: Guardar SHAP results en Supabase
Para que el tab Causas funcione sin el ML service corriendo — guardar los artifacts de attrition_causes en una tabla o leerlos desde `latest.json` en el frontend.

### PRIORIDAD 5: Calibración de thresholds de rotation
Con precision de 6.8%, los thresholds actuales (ALTO ≥0.7) generan demasiados falsos positivos. Opciones:
- Subir threshold ALTO a 0.9
- O mostrar solo top-N empleados en vez de threshold fijo
- O usar percentiles: top 5% = ALTO, siguiente 10% = MEDIO

---

## 8. Datos Reales en Supabase (estado actual)

```sql
-- Resultado real al 18 Feb 2026
SELECT model_name, COUNT(*) FROM ml_predictions_log GROUP BY model_name;
-- rotation:        1,216  ← NECESITA REGENERAR (549 emps, debería ser 194)
-- absenteeism_risk:  195  ← OK (194 emps, pero modelo inútil por leakage)
-- absence_forecast:   21  ← OK (7 códigos × 3 horizontes)

SELECT COUNT(*) FROM ml_employee_features
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM ml_employee_features)
AND es_operativo = true;
-- 194 empleados operativos activos (cifra correcta)
```
