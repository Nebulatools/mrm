# Próximos Pasos — ML Pipeline

**Fecha**: 18 Febrero 2026
**Estado**: 4/4 modelos entrenados, predicciones en dashboard

---

## Estado Actual (post-correcciones, verificado en UI)

| Modelo | Predicciones | AUC | Distribución 28d | Estado |
|--------|-------------|-----|-------------------|--------|
| `rotation` | 448 (194 emps) | 0.77 | ALTO:2, MEDIO:76, BAJO:66, MINIMO:50 | OK |
| `absenteeism_risk` | 195 (194 emps) | 0.90 | ALTO:33, MEDIO:94, BAJO:44, MINIMO:23 | OK |
| `absence_forecast` | 33 (11 códigos) | — | Total 28d: 206 ausencias | OK |
| `attrition_causes` | 0 (análisis) | — | F1:0.54, 8 clases | OK |

**Población**: 194 empleados Sindicalizados activos (de 373 activos totales)
**Ver análisis detallado**: `docs/ml/ML_MODELS_DEEP_ANALYSIS.md`
**Ver auditoría**: `docs/ml/ML_AUDIT_FEB2026.md`

### Correcciones ya aplicadas (Sesión 3)
- ~~PRIORIDAD 1~~: Rotation re-entrenado, 194 empleados (era 549)
- ~~PRIORIDAD 2~~: Absenteeism target forward-looking (AUC 1.0 → 0.90)
- ~~PRIORIDAD 3~~: Forecast con 11 códigos (era 7, faltaban MAT3, FEST, PATER, ACCI)

---

## PRIORIDAD 1: Tab Causas funcione sin ML service (PENDIENTE)

**Problema**: "SHAP no disponible" cuando el ML service no está corriendo.

**Solución**: Leer `latest.json` directamente o guardar SHAP results en tabla de Supabase al entrenar.

---

## PRIORIDAD 2: Mejorar rotation (F1 de 0.12 → meta 0.30+)

**Problema real**: Solo 116 positivos en 4,641 rows (2.5%). Opciones:
- **Calibrar thresholds**: ALTO ≥ 0.9 en vez de ≥ 0.7 (reduce falsos positivos)
- **SMOTE/oversampling**: Balancear clases
- **Feature engineering**: Agregar "cambios" entre snapshots (tendencias de faltas)
- **Reducir a top-N**: Mostrar los 20 empleados con mayor riesgo en vez de threshold

---

## Mejoras de Infraestructura

### 4. Accuracy Tracking automático
- El cron `accuracy_tracking` (lunes 4am) ya está implementado
- **Esperar 2-4 semanas** para que acumule datos de comparación
- Luego: dashboard puede mostrar "precisión del modelo" en tab Predicciones

### 5. Weekly Snapshots
- El cron `weekly_snapshot` (domingos 11pm) ya está implementado
- **Esperar 1 semana** para ver primer snapshot en `ml_weekly_snapshots`
- Usar para gráficos de tendencia de headcount, bajas, incidencias

### 6. Refresh automático de Silver/Gold
- Crons `refresh_silver` y `refresh_features` implementados
- **Verificar que las funciones RPC en Supabase están disponibles**: `refresh_silver_views()`, `refresh_ml_employee_features()`
- Si no existen → crear como stored procedures

---

## Mejoras de Frontend

### 7. Tab Predicciones — Filtros adicionales
- Filtrar por departamento, área, ubicación
- Export CSV de empleados en riesgo
- Drill-down: click en empleado → detalle con features y SHAP values

### 8. Tab Predicciones — Integrar absenteeism_risk
- Actualmente solo muestra rotation risk en la tabla de empleados
- **Agregar sección**: "Empleados en riesgo de ausentismo" con datos de `absenteeism_risk`
- Mostrar ambos modelos side-by-side o en tabs internos

### 9. Tab Predicciones — Análisis SHAP
- Mostrar resultados de `attrition_causes/analysis` como:
  - Bar chart de SHAP feature importances globales
  - Per-class breakdown: "¿Qué factores causan Abandono vs Rescisión?"
  - Tabla interactiva con drill-down por clase

### 10. Tab Predicciones — Tendencias de precisión
- Una vez que `accuracy_tracking` tenga datos:
  - Line chart: predicciones vs realidad por semana
  - Métricas de drift: ¿el modelo se degrada con el tiempo?

---

## Deploy del ML Service (ALTA prioridad)

### Problema actual
El ML service solo corre mientras tengas `uvicorn` levantado en tu máquina local. Los crons de APScheduler (retrain semanal, refresh diario, accuracy tracking) **no se ejecutan** cuando cierras la terminal.

### Requerimientos
- Proceso **siempre corriendo** (24/7) — APScheduler necesita proceso vivo
- ~512MB RAM mínimo (sklearn, xgboost, statsmodels, shap)
- No es serverless-friendly (cold starts de 30s+, modelos pesados)
- Conexión a Supabase via REST (ya funciona, no necesita acceso directo a Postgres)

### Opción recomendada: Railway (~$5/mes)
- Deploy con `Dockerfile`, siempre on, auto-deploy desde GitHub
- Config simple: 3 env vars y listo
- Logs y métricas incluidos

### Otras opciones viables
| Servicio | Costo | Notas |
|----------|-------|-------|
| Render | $7/mes (Starter) | Free tier se duerme → mata crons |
| Fly.io | ~$3-5/mes | Buena free tier, config más manual |
| DigitalOcean Droplet | $6/mes | Control total, tú mantienes el server |

### Qué se necesita crear
1. **`Dockerfile`** en `apps/ml_service/` — imagen con Python 3.13 + dependencias
2. **Env vars** en el servicio cloud:
   - `DATABASE_URL`
   - `SUPABASE_PROJECT_URL` (`https://ufdlwhdrrvktthcxwpzt.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Los modelos (.joblib) se re-entrenan automáticamente si el container reinicia — el scheduler los recrea en el siguiente cron

### Flujo post-deploy
```
Container arranca → uvicorn inicia → APScheduler registra jobs
  → Lunes 00:30  refresh Silver views
  → Lunes 01:00  refresh ml_employee_features
  → Lunes 02:00  retrain rotation → auto-predict
  → Lunes 03:00  retrain absenteeism_risk → auto-predict
  → Lunes 03:30  retrain absence_forecast → auto-predict
  → Día 1 03:30  retrain attrition_causes
  → Domingo 23:00  weekly snapshot
  → Lunes 04:00  accuracy tracking
```

---

## Mejoras Avanzadas (Futuro)

### 11. Retrain automático con threshold
- Si accuracy cae por debajo de X% → auto-retrain
- Notificación al admin cuando el modelo se degrada

### 12. A/B Testing de modelos
- Guardar versiones múltiples (v1, v2)
- Comparar predicciones side-by-side

### 13. API para external consumers
- Endpoint REST para que sistemas externos consulten riesgo de un empleado
- Autenticación con API key

---

## Comandos Rápidos

```bash
# Levantar ML Service
cd apps/ml_service && source .env && python -m uvicorn app.main:app --port 8001

# Re-entrenar todos los modelos
curl -X POST http://localhost:8001/models/rotation/train
curl -X POST http://localhost:8001/models/absenteeism_risk/train
curl -X POST http://localhost:8001/models/absence_forecast/train
curl -X POST http://localhost:8001/models/attrition_causes/train

# Generar predicciones
curl -X POST http://localhost:8001/models/rotation/predict
curl -X POST http://localhost:8001/models/absenteeism_risk/predict
curl -X POST http://localhost:8001/models/absence_forecast/predict

# Verificar estado en Supabase
# SELECT model_name, COUNT(*) FROM ml_predictions_log GROUP BY model_name;

# Ver análisis SHAP
curl http://localhost:8001/models/attrition_causes/analysis | python3 -m json.tool
```
