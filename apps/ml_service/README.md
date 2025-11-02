# ML Service (FastAPI)

Servicio Orquestador de modelos de analítica avanzada para Recursos Humanos. Expone endpoints REST para entrenar y consultar los modelos descritos en `docs/ml/model_strategy.md` y programa entrenamientos automáticos vía APScheduler.

## Endpoints principales

- `GET /health` — verificación rápida.
- `GET /models` — lista de modelos con métricas y próxima ejecución.
- `POST /models/{id}/train` — reentrena el modelo indicado.
- `POST /models/{id}/schedule` — actualiza la programación (`manual`, `daily`, `weekly`, `monthly`, `quarterly`).

## Servidor local

```bash
cd apps/ml_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Variables de entorno requeridas:

- `DATABASE_URL` — cadena de conexión Postgres (Supabase).
- `ML_MODELS_DIR` (opcional) — ruta para persistir artefactos entrenados.
- `ML_METRICS_DIR` (opcional) — ruta para métricas.
- `ML_SCHEDULER_STATE_PATH` (opcional) — JSON con estado del scheduler.

## Arquitectura interna

- `app/models/` — Trainers especializados por caso de uso.
- `app/scheduling/` — Scheduler APScheduler + persistencia.
- `app/utils/` — utilidades para I/O.
- `app/schemas.py` — esquemas Pydantic para respuestas/solicitudes.

Cada `Trainer` comparte la clase base `BaseModelTrainer` que maneja persistencia en disco (`joblib`) y registra métricas en JSON.

## Pruebas

Las pruebas viven en `tests/` (ver sección de testing general). Ejecutar con `pytest` desde `apps/ml_service`.
