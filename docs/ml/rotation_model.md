# Modelo `rotation` – Predicción de Rotación Individual

Última actualización: 2025-11-02  
Responsable: Equipo de analítica MRM

---

## 1. Objetivo de negocio

Anticipar qué colaboradores tienen alta probabilidad de causar una baja voluntaria en los próximos **30, 60 y 90 días** para activar intervenciones diferenciadas (ajustes salariales, planes de carrera, capacitación, coaching) y reducir un costo de rotación estimado en **$50 000 MXN por empleado**.  
El modelo opera a nivel individual: cada horizonte genera una puntuación de riesgo que se consume en el dashboard y en los motores de recomendación.

---

## 2. Resumen end-to-end

1. **Extracción:** el servicio ML consulta la vista `ml_rotation_features` en Supabase (PostgREST).  
2. **Snapshots mensuales:** `RotationAttritionTrainer._build_temporal_windows` crea 12 snapshots históricos (excluyendo los últimos 3 meses) con etiquetas `target_rotacion_30d`, `target_rotacion_60d` y `target_rotacion_90d`.  
3. **Preprocesamiento:** se construyen pipelines de features numéricas y categóricas (imputación + escalado + one-hot).  
4. **Entrenamiento multi-horizonte:** se entrena un clasificador **XGBoost** por horizonte utilizando el mismo split estratificado (80/20) y ajustes de clase.  
5. **Persistencia:** los tres pipelines se encapsulan en `MultiHorizonRotationEnsemble` (`apps/ml_service/storage/models/rotation/v1.joblib`). Las métricas por horizonte se guardan en `latest.json`.  
6. **Inferencia:** FastAPI (`/models/rotation/trends`) carga el ensemble, genera probabilidades para cada horizonte y publica bundles por clasificación (`Confianza`, `Sindicalizados`).  
7. **Dashboard:** la pestaña “Model Trends” ofrece una sub-tab “Todos / Confianza / Sindicalizados” y sliders por horizonte.  
8. **Consumo secundario:** los modelos `segment_risk` e `interventions` reutilizan el ensemble para obtener probabilidades consistentes.

---

## 3. Datos y construcción del dataset

1. **Vista Supabase: `ml_rotation_features`** (`apps/ml_service/setup_database_views.sql`)  
   - Variables personales y contractuales: `genero`, `area`, `departamento`, `puesto`, `clasificacion`, `ubicacion`, `tipo_nomina`, `turno`, `empresa`.  
   - Ventanas recientes de incidencias y permisos: `neg_30d`, `neg_90d`, `neg_365d`, `permisos_90d`, `permisos_365d`, `total_90d`, `total_365d`.  
   - Fechas críticas: `fecha_ingreso`, `fecha_antiguedad`, `fecha_baja`.  
   - `target_rotacion` indica si el colaborador tuvo baja en los últimos 24 meses (para mantener consistencia con otras vistas).  
   - **Importante:** los conteos `neg_*` y `permisos_*` se calculan respecto a `CURRENT_DATE`. Para análisis históricos se recomienda parametrizar la vista o recalcular los conteos dentro del snapshot (backlog §10).

2. **Snapshots temporales (`_build_temporal_windows`)**  
   - Genera un snapshot mensual por empleado desde `today - 15 meses` hasta `today - 3 meses` (para asegurar ventana completa de 90 días).  
   - Calcula `tenure_days_at_snapshot`, `antiguedad_days_at_snapshot` y `days_until_baja`.  
   - Etiquetas:  
     - `target_rotacion_30d = 1` si `1 ≤ days_until_baja ≤ 30`.  
     - `target_rotacion_60d = 1` si `1 ≤ days_until_baja ≤ 60`.  
     - `target_rotacion_90d = 1` si `1 ≤ days_until_baja ≤ 90`.  
   - Solo se generan snapshots mientras el colaborador estaba activo (`fecha_ingreso < snapshot_date` y `fecha_baja ≥ snapshot_date` o `NULL`).

3. **Dataset vigente (2025-11-02)**  
   - 4 364 snapshots (ago-2024 → ago-2025).  
   - Distribución de positivos (aproximada): 30d ≈ 3 %, 60d ≈ 6 %, 90d ≈ 11.6 %.  
   - Balance temporal homogéneo; los conteos de incidencias requieren homologación por snapshot (ver backlog).

---

## 4. Pipeline de características

1. **Numéricas**  
   - `tenure_days`, `antiguedad_days`.  
   - `neg_30d`, `neg_90d`, `neg_365d`, `permisos_90d`, `permisos_365d`, `total_90d`, `total_365d`.  
   - Ratios derivados: `ratio_neg_90d`, `ratio_neg_365d`, `ratio_permisos_365d`.  
   - Imputación: mediana (`SimpleImputer(strategy='median')`).  
   - Escalado: `StandardScaler`.

2. **Categóricas**  
   - `genero`, `area`, `departamento`, `puesto`, `clasificacion`, `ubicacion`, `tipo_nomina`, `turno`, `empresa`.  
   - Imputación: moda. Codificación: `build_one_hot_encoder()` (One-Hot sin colinearidad).

3. **Targets**  
   - `target_rotacion_{30,60,90}d` en enteros `{0,1}`.  
   - Durante `prepare_features(include_target=False)` se generan matrices reutilizadas por los tres modelos.

---

## 5. Entrenamiento multi-horizonte

1. **Clase entrenadora:** `RotationAttritionTrainer` (`apps/ml_service/app/models/rotation.py`).  
2. **Splits:**  
   - Índices comunes (80 % train / 20 % test) estratificados por el target de 90 días para mantener comparabilidad entre horizontes.  
   - Cada horizonte utiliza el mismo `train_indices`/`test_indices`.  
3. **Algoritmo:** `XGBClassifier` por horizonte con hiperparámetros fijos:  
   - `max_depth=4`, `n_estimators=300`, `learning_rate=0.05`, `subsample=0.8`, `colsample_bytree=0.7`, `reg_lambda=1.0`, `tree_method='hist'`.  
   - Clase balance: `scale_pos_weight = (#negativos / #positivos)` calculado sobre el conjunto de entrenamiento de cada horizonte.  
4. **Métricas por horizonte:**  
   - ROC-AUC (con fallback `None` si la clase positiva no aparece en validación).  
   - Average Precision, precisión, recall, F1, especificidad, tasas de error, tamaños de muestra, tasas positivas en train/test/total.  
   - `cross_val_score` (ROC-AUC, 5 folds) con manejo de errores en caso de clases desbalanceadas extremas.  
   - Métricas por `clasificacion` (Confianza / Sindicalizados) para el horizonte de 90 días (`metrics.per_horizon["90"]["by_clasificacion"]`).  
5. **Business value:** calculado solo para 90 días (mismo supuesto de ROI que la versión anterior).

---

## 6. Artefactos y persistencia

1. **Modelo entrenado:** `MultiHorizonRotationEnsemble`  
   - Contiene un `Pipeline` por horizonte (`{30: pipeline_30d, 60: pipeline_60d, 90: pipeline_90d}`).  
   - Método `predict_proba(X)` devuelve un diccionario `{horizon: np.ndarray}`.  
   - Implementa un wrapper para compatibilidad retroactiva: si se carga un artefacto antiguo (pipeline único), se encapsula como horizonte 90 y los demás se derivan con la estrategia histórica.

2. **Métricas (`latest.json`)**  
   ```json
   {
     "metrics": {
       "roc_auc": 0.97,
       "average_precision": 0.80,
       "...": "...",
       "per_horizon": {
         "30": { "...": "..." },
         "60": { "...": "..." },
         "90": {
           "...": "...",
           "by_clasificacion": {
             "Confianza": { "...": "..." },
             "Sindicalizados": { "...": "..." }
           }
         }
       }
     },
     "artifacts": {
       "per_horizon": {
         "30": { "feature_importances": {...}, ... },
         "60": { ... },
         "90": { ... }
       }
     }
   }
   ```  
   - El bloque principal mantiene compatibilidad (métricas de 90 días).  
   - `per_horizon` y `by_clasificacion` permiten análisis detallado y ajuste de umbrales.

3. **Persistencia histórica:** cada reentrenamiento crea `history_{timestamp}.json`.

---

## 7. Flujo de inferencia y API

1. **Carga de artefacto:** `_prepare_rotation_prediction_frame` llama `rotation_trainer.load_estimator()`; soporta tanto el ensemble nuevo como el pipeline heredado (deriva 30/60 utilizando razones históricas si fuera necesario).  
2. **Predicciones:**  
   - Se calculan matrices de features (`prepare_features(..., include_target=False)`) a partir del snapshot más reciente.  
   - Antes de segmentar, cualquier snapshot con `clasificacion` vacía se rellena consultando `empleados_sftp`; si aun así no se encuentra valor, se marca explícitamente como `Desconocido`.  
   - `predict_proba` devuelve un diccionario `{horizonte: probas}`; si el artefacto solo contiene 90 días se reutiliza `base_probs` con ponderadores (`fallback_weights`) que usan la razón histórica entre celdas reales 30/60/90 para derivar los otros horizontes.  
   - Se almacenan las columnas `prediction_{30,60,90}d` y se duplican como `predicted_{30,60,90}` para mantener compatibilidad con integraciones anteriores.  
   - Las probabilidades en 30, 60 y 90 días corresponden a la suma de probabilidades individuales de baja en cada horizonte; para cada colaborador `predicted_30 ≤ predicted_60 ≤ predicted_90` porque los horizontes son incluyentes.
3. **Segmentación por clasificación:**  
   - Se normaliza `clasificacion` → `Confianza`, `Sindicalizados`, `Desconocido`.  
   - Se calculan series históricas (`actual_series`) mapeando motivos de baja al segmento correspondiente.  
4. **Respuesta API `/models/rotation/trends`:**  
   ```json
   {
     "model_id": "rotation",
     "monthly": [...],
     "segmented": {
       "Confianza": { "monthly": [...], "metadata": {...} },
       "Sindicalizados": { ... }
     },
     "metadata": {
       "per_horizon_metrics": { ... },
       "overall_predicted_totals": { "30": ..., "60": ..., "90": ... },
       "segments": {
         "Confianza": { "predicted_totals": {...}, ... },
         "Sindicalizados": { ... }
       }
     }
   }
   ```  
   - El front-end muestra una sub-tab “Todos / Confianza / Sindicalizados” reutilizando la misma gráfica y métricas para cada bundle.

5. **Fallback legacy:** si en Supabase aún existe el artefacto antiguo (solo 90 días) se recalcula 30/60 multiplicando por las razones históricas hasta que se reentrene con la versión multi-horizonte.

---

## 8. Meses incompletos y proyección

1. **Corte de entrenamiento:** se excluyen los últimos 3 meses para asegurar etiquetas completas (90 días).  
2. **Predicción del mes en curso:** el endpoint usa el snapshot más reciente disponible. Si se requiere proyectar un mes parcial (ej. primeros 10 días), se recomienda:  
   - Generar un snapshot adicional marcado con campo `data_coverage` (% de días con información real).  
   - Recalcular incidencias `neg_*` y `permisos_*` considerando solo los días observados.  
   - Señalar en el dashboard qué meses muestran datos reales vs. estimados.  
3. **Contribuciones futuras:** el backend sigue distribuyendo `predicted_30/60/90` en un horizonte de hasta 3 meses utilizando las diferencias entre horizontes (ej. 90d - 60d). Con las probabilidades reales la proyección es más estable que el escalamiento histórico.

---

## 9. Operación, monitoreo y pruebas

1. **Reentrenamiento**  
   - Cadencia default: semanal (domingo 02:00).  
   - Ejecutable manualmente vía `POST /models/rotation/train` o `scripts/test-rotation-model.py`.  
   - Tras desplegar esta actualización es indispensable ejecutar un reentrenamiento manual para generar los nuevos artefactos (`per_horizon`, `by_clasificacion`).  
   - Verificar `apps/ml_service/storage/metrics/rotation/latest.json`.

2. **Monitoreo**  
   - Vigilar `metrics.per_horizon["30"]["positive_rate_train"]` vs. `["90"]`; cambios abruptos indican drift.  
   - Revisar cada semana `metadata.segments` para confirmar que Confianza/Sindicalizados mantienen tasas razonables.  
   - Activar alertas si `metrics.roc_auc` cae >5 % vs. promedio móvil.

3. **Pruebas**  
   - `pytest apps/ml_service/tests/test_rotation_trainer.py -q` asegura que el pipeline produce etiquetas y entrena sin errores.  
   - No olvidar actualizar pruebas unitarias si se agregan features o se modifica la lógica de snapshots.

4. **Integración con otros modelos**  
   - `segment_risk` y `preventive_interventions` ahora cargan `MultiHorizonRotationEnsemble`; se mantiene compatibilidad con artefactos viejos mediante encapsulado automático.

---

## 10. Próximos pasos / backlog

1. Parametrizar `ml_rotation_features` para devolver conteos de incidencias alineados a cada `snapshot_date`.  
2. Crear snapshot de inferencia para el mes activo con indicador `data_coverage`.  
3. Persistir corridas de entrenamiento en Supabase (`ml_training_runs`) incluyendo métricas por horizonte y segmento.  
4. Incorporar variables de desempeño (ventas, bonos, evaluaciones) cuando estén disponibles en las tablas fuente.  
5. Evaluar calibración de probabilidades (Platt / isotónica) si RRHH requiere probabilidades absolutas.  
6. Automatizar reportes para RRHH con top riesgos y drivers por clasificación.  
7. Documentar procedimiento operativo para la generación de snapshots parciales y su publicación en el dashboard.

---

## 11. Referencias rápidas

- **Código del modelo:** `apps/ml_service/app/models/rotation.py`  
- **Clase ensemble:** `MultiHorizonRotationEnsemble` (mismo archivo)  
- **API FastAPI:** `_prepare_rotation_prediction_frame`, `_build_rotation_trends_response` (`apps/ml_service/app/main.py`)  
- **Segregación por clasificación:** front-end `apps/web/src/components/model-trends-tab.tsx`  
- **Vista SQL:** `apps/ml_service/setup_database_views.sql` (`ml_rotation_features`)  
- **Artefactos:** `apps/ml_service/storage/models/rotation/v1.joblib`, `apps/ml_service/storage/metrics/rotation/latest.json`  
- **Modelos dependientes:** `segment_risk`, `preventive_interventions`

Mantén este documento actualizado con cada auditoría relevante, cambios de hiperparámetros o nuevas señales incorporadas en el modelo.
