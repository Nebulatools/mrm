# Modelo: Riesgo de Rotación por Segmento

## Propósito
- Detectar agrupaciones (empresa · área · departamento) con mayor probabilidad de bajas en los próximos 90 días.
- Priorizar segmentos críticos para diseñar intervenciones preventivas y dimensionar impacto potencial.

Este indicador alimenta la pestaña **Tendencias → Riesgo de rotación por segmento** del dashboard y el panel **Admin → Modelos ML**.

## Fuentes de datos
- Vista `ml_rotation_features` en Supabase (ver `apps/ml_service/setup_database_views.sql`).
  - Información base de empleados (`empleados_sftp`).
  - Ventanas de incidencias negativas/permiso a 30, 90 y 365 días.
  - Motivos y fechas de baja recientes (`motivos_baja`).
- Predicciones individuales generadas por el modelo de rotación (`rotation`).

## Pipeline de entrenamiento
1. **Carga de datos**: se obtienen las features de `ml_rotation_features` vía REST (service role key).
2. **Probabilidades individuales**: se reutiliza el modelo `rotation` para generar la probabilidad de baja a 30, 60 y 90 días para cada colaborador activo.
3. **Agregación por segmento** (`empresa`, `area`, `departamento`):
   - `headcount`: cantidad de colaboradores activos.
   - `riesgo_promedio`: media de la probabilidad a 90 días.
   - `riesgo_p75`: percentil 75 de la probabilidad (identifica colas de riesgo alto).
   - `ratio_negativa`: incidencias negativas (365d) ÷ total incidencias (365d).
   - `ratio_permiso`: incidencias de permiso (365d) ÷ total incidencias (365d).
4. **Filtrado de segmentos pequeños**: se descartan grupos con `headcount < 5` para evitar clusters dominados por outliers de 1–2 personas. Si todos los segmentos son <5, se usa el universo completo como fallback.
5. **Preprocesamiento**: imputación mediana + `StandardScaler`.
6. **Clusterización**: `KMeans` con `n_clusters = 4`, inicialización `k-means++`, `n_init = 20`, `random_state = 42`.
7. **Persistencia**: el pipeline se guarda en `storage/models/segment_risk/v1.joblib` y los metadatos en `storage/metrics/segment_risk/latest.json`.

## Métricas reportadas
Las métricas aparecen en el panel Admin (archivo `apps/ml_service/app/models/segment_risk.py`).

| Métrica | Descripción |
| --- | --- |
| `segments_total` | Total de segmentos detectados en la agregación (incluye chicos).
| `segments_used` | Segmentos utilizados realmente en el clustering (`headcount ≥ 5`).
| `headcount_total` | Headcount sumado de todos los segmentos detectados.
| `headcount_used` | Headcount cubierto por los segmentos usados en el clustering.
| `min_segment_size` | Umbral aplicado (5 por defecto).
| `silhouette_score` | Calidad interna del clustering (se calcula solo si hay ≥ 2 clusters válidos y suficientes segmentos).

El artefacto `segment_summary` guarda el Top 10 de segmentos con mayor `riesgo_promedio` dentro del clúster crítico.

## Generación de tendencias en la UI
La ruta `/models/segment_risk/trends` (ver `apps/ml_service/app/main.py`) reutiliza el pipeline entrenado:

1. **Serie histórica**: combina las bajas reales (`motivos_baja`) por mes con las predicciones históricas del modelo `rotation` para mostrar el histórico “Último mes – Histórico”.
   - La serie se reindexa para incluir meses con 0 bajas, garantizando continuidad hasta el último cierre disponible (por ejemplo, octubre aún aparece aunque el conteo sea nulo).
2. **Pronóstico** (3 meses): combina las probabilidades individuales del modelo `rotation` para toda la organización. La suma de probabilidades por horizonte se usa como “bajas esperadas” y se distribuye en los tres meses siguientes (mismo enfoque que el tab de rotación). Los segmentos de mayor riesgo se adjuntan como contexto, pero no alteran el total pronosticado.
   - El forecast arranca en el mes inmediatamente posterior al último mes con bajas reales. Si existe información en octubre, las curvas naranjas comienzan en noviembre.
   - Predicción total de bajas a 30/60/90 días (`predicted`).
   - Intervalo de confianza simple ±15 % (`predicted_lower`/`predicted_upper`).
3. **Metadata**: incluye `segments_high_risk` (Top 10 con mayor riesgo promedio), cobertura del clúster crítico (`high_risk_coverage`), `forecast_totals` (predicciones globales por horizonte) y totales agregados para comparaciones YTD.
4. **Filtros en la UI**: el frontend (`ModelTrendsTab`) permite ver todos los segmentos o uno específico, elegir horizonte (30/60/90 días) y muestra métricas clave (histórico, forecast, umbral).

## Cómo re-entrenar
- Desde la UI: **Admin → Modelos ML → Riesgo de rotación por segmento → Entrenar ahora**.
- API: `POST /api/ml/models/segment_risk/train` (Next.js), que a su vez proxyea a `/models/segment_risk/train` del servicio FastAPI.
- Scheduler: semanal (cron `15 2 * * 0`), se persiste en el `ModelScheduler`.

## Validaciones y pruebas recomendadas
1. **Integridad de features** (Supabase MCP o SQL editor):
   ```sql
   SELECT empresa, area, departamento, COUNT(*) AS headcount
   FROM ml_rotation_features
   GROUP BY 1,2,3
   HAVING COUNT(*) >= 5
   ORDER BY headcount DESC
   LIMIT 10;
   ```
   Asegura que existan segmentos suficientes con headcount ≥5.
2. **Consistencia del clustering**:
   - Revisar métrica `silhouette_score` (>0.25 suele indicar separación aceptable).
   - Verificar que `segments_used` cubra ≥70 % del `headcount_total`; si no, reconsiderar el umbral.
3. **Comparación histórica**: contrastar “Último mes – Histórico” con un conteo manual de bajas reales:
   ```sql
   SELECT date_trunc('month', fecha_baja) AS mes, COUNT(*)
   FROM motivos_baja
   WHERE fecha_baja >= date_trunc('month', CURRENT_DATE) - INTERVAL '6 months'
   GROUP BY 1
   ORDER BY 1 DESC;
   ```
4. **Top segmentos**: confirmar que `segments_high_risk` coincida con los segmentos de mayor riesgo promedio dentro del clúster crítico.

> Nota: en ambientes con plan gratuito de Render, el servicio ML puede “dormirse”. El primer request tarda unos segundos mientras arranca.

## Buenas prácticas adicionales
- Mantener el modelo de rotación actualizado antes de re-entrenar `segment_risk`, ya que sus probabilidades son la base del clustering.
- Evaluar ajustar `min_segment_size` si se incorporan más sucursales o si se desea foco en micro-equipos.
- Exportar el `segment_summary` después de cada entrenamiento para alimentar iniciativas de talento (se guarda en `storage/metrics/segment_risk/latest.json`).
