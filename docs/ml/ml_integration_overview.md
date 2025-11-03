# ML Integration Overview

Última actualización: 2025-11-02  
Responsable: Equipo de analítica MRM

Este documento describe la arquitectura de analítica avanzada en el proyecto **mrm_simple**, cómo se integran los modelos de ML con Supabase y el dashboard web, y las pautas operativas para mantenerlos.

---

## 1. Arquitectura End-to-End

**Componentes principales**

1. **Supabase (Postgres + PostgREST)**
   - Tablas maestras: `empleados_sftp`, `incidencias`, `motivos_baja`, `asistencia_diaria` (cuando esté poblada).
   - Vistas para ML (ver `apps/ml_service/setup_database_views.sql`):
     - `ml_rotation_features`, `ml_absenteeism_features`, `ml_attrition_features`, `ml_forecast_features`, `ml_lifecycle_features`, `ml_patterns_features`, `ml_productivity_features`.

2. **Servicio ML (`apps/ml_service`)**
   - FastAPI + scheduler (`apscheduler`).
   - Adaptador de datos REST (`app/database_rest.py`) que consulta las vistas anteriores mediante la API de Supabase.
   - Entrenadores en `app/models/*.py`, cada uno hereda de `BaseModelTrainer`.
   - Artefactos persistidos en `apps/ml_service/storage/models` y métricas en `apps/ml_service/storage/metrics`.

3. **Dashboard Web (`apps/web`)**
   - Página de administración y pestaña “Analysis ML” consumen el API del servicio ML.
   - Muestra métricas, curvas y riesgos individuales por modelo.

4. **MCP Supabase (Codex/Claude CLI)**
   - Permite ejecutar queries de diagnóstico directamente desde el IDE.

---

## 2. Flujo de datos y entrenamiento

1. **Extracción**  
   - Cada entrenador llama `load_training_frame()` y obtiene un DataFrame desde la vista correspondiente.  
   - Las vistas ya entregan ventanas agregadas (ej. incidencias 30/90/365 días) para mantener el pipeline consistente.

2. **Preprocesamiento**  
   - `prepare_features()` normaliza columnas, imputa faltantes y define listas numéricas/categóricas.
   - El `BaseModelTrainer` aplica `ColumnTransformer` con `SimpleImputer`, `StandardScaler` y One-Hot Encoding.

3. **Entrenamiento**  
   - Cada modelo implementa `run_training(frame, **kwargs)` con su algoritmo (XGBoost, Random Forest, SARIMAX, etc.).
   - Se ejecuta un split `train_test` o la técnica apropiada (series temporales, clustering, supervivencia).
   - Métricas + artefactos se almacenan en `latest.json` y un archivo histórico por timestamp.

4. **Persistencia**  
   - Modelos (`*.joblib`) y métricas se guardan en `storage/` según el `model_id`.
   - El resumen más reciente se expone vía `BaseModelTrainer.latest_summary()`.

5. **Consumo en el dashboard**  
   - Endpoints FastAPI (`/models`, `/models/{id}`, `/models/{id}/analysis`, `/models/{id}/train`) alimentan la UI.
   - El dashboard muestra: métricas agregadas, curvas ROC/PR, matriz de confusión y recomendaciones.

---

## 3. Scheduler y automatización

- El `ModelScheduler` registra trabajos por defecto (ver `app/models/registry.py`): semanal, quincenal, mensual o trimestral.
- El cron se puede modificar desde el dashboard; se almacena en `storage/scheduler.json`.
- Los trabajos ejecutan `trainer.train()` y actualizan automáticamente los artefactos.

**Prácticas recomendadas**

1. Mantener las vistas SQL actualizadas cuando cambian estructuras en Supabase.
2. Revisar `storage/metrics/{model_id}/latest.json` tras cada corrida automática.
3. Configurar alertas (pendiente) para cuando una corrida falle.

---

## 4. Estado de los modelos (2025-11-02)

| Modelo | ID | Tipo | Algoritmo principal | Cadencia (default) |
| --- | --- | --- | --- | --- |
| Predicción de rotación individual | `rotation` | Clasificación | XGBoostClassifier | Semanal (domingo 02:00) |
| Riesgo de rotación por segmento | `segment_risk` | Clustering | XGBoost + KMeans | Semanal (domingo 02:15) |
| Riesgo de ausentismo recurrente | `absenteeism_risk` | Clasificación | RandomForestClassifier | Semanal (lunes 02:00) |
| Forecast de faltas/permisos | `absence_forecast` | Series temporales | SARIMAX | Semanal (domingo 02:30) |
| Clustering de patrones laborales | `labor_patterns` | Clustering | GaussianMixture / DBSCAN | Mensual (1er domingo 03:00) |
| Causas raíz de bajas | `attrition_causes` | Clasificación + SHAP | XGBoostClassifier | Mensual (1er domingo 03:30) |
| Impacto en productividad | `productivity_impact` | Regresión | ElasticNet | Mensual (1er domingo 04:00) |
| Intervenciones preventivas | `preventive_interventions` | Recomendador | DecisionTree + contextual bandit | Mensual (1er domingo 04:30) |
| Ciclo de vida del colaborador | `employee_lifecycle` | Supervivencia | CoxPHFitter | Trimestral (1er domingo 05:00) |

> **Nota:** Todos dependen de las vistas SQL; si falta información (ej. `incidencias` vacía), algunos features se imputan en cero.

---

## 5. Operación y mantenimiento

### Checklist de reentrenamiento

1. Validar que las vistas devuelvan filas (`SELECT count(*) FROM ...` vía MCP).
2. Ejecutar `POST /models/{id}/train` desde el dashboard o `scripts/test-rotation-model.py`.
3. Verificar `latest.json` y revisar curvas/metricas en la pestaña Analysis ML.
4. Ajustar umbral de decisión en el dashboard según precisión/recall deseados.

### Monitoreo sugerido

- Registrar en Supabase una tabla `ml_training_runs` (pendiente) con métricas clave.
- Revisar proporción de etiquetas positivas mensual para detectar drift.
- Configurar dashboards en Supabase o en la web para ver tendencias.

### Debug rápido

1. Ejecutar `pytest apps/ml_service/tests -q` para validar lógica crítica.
2. Usar MCP Supabase (`/rest/v1`) para inspeccionar datos.
3. Revisar logs del servicio ML (uvicorn) si un entrenamiento falla.

---

## 6. Añadir o actualizar modelos

1. Crear vista SQL con las features necesarias y agregarla a `SQL_TO_VIEW_MAP` si el nombre es nuevo.
2. Implementar `Trainer` especializado en `app/models/`.
3. Registrar en `app/models/registry.py` con `ModelConfig`.
4. Añadir pruebas en `apps/ml_service/tests`.
5. Documentar en este archivo (tabla) y, si aplica, crear un documento específico en `docs/ml/`.

---

## 7. Recursos relacionados

- SQL de vistas: `apps/ml_service/setup_database_views.sql`
- Configuración: `apps/ml_service/app/config.py`
- Scheduler: `apps/ml_service/app/scheduling/scheduler.py`
- API FastAPI: `apps/ml_service/app/main.py`
- Scripts de prueba: `scripts/test-rotation-model.py`, `scripts/validate-ml-data.ts`
- Documentación específica: `docs/ml/rotation_model.md`

Mantén este documento actualizado cada vez que se agregue un nuevo modelo, se cambien cadencias o se modifique la arquitectura de datos.
