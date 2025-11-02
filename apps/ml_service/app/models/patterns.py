from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.impute import SimpleImputer
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler

from .base import BaseModelTrainer, TrainOutput
from ..schemas import ModelType


PATTERNS_SQL = """
WITH empleados AS (
    SELECT
        e.numero_empleado AS employee_id,
        e.area,
        e.departamento,
        e.turno,
        e.clasificacion,
        e.tipo_nomina,
        e.empresa,
        e.fecha_ingreso,
        e.fecha_antiguedad
    FROM empleados_sftp e
    WHERE e.activo = TRUE
),
incidencias_resumen AS (
    SELECT
        emp AS employee_id,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
                          AND inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI']))::decimal / 90.0 AS neg_rate_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'
                          AND inci = ANY(ARRAY['FI','SUSP','PSIN','ENFE','ACCI']))::decimal / 180.0 AS neg_rate_180d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
                          AND inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST']))::decimal / 90.0 AS permiso_rate_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'
                          AND inci = ANY(ARRAY['VAC','PCON','MAT3','MAT1','PATER','JUST']))::decimal / 180.0 AS permiso_rate_180d
    FROM incidencias
    WHERE fecha >= CURRENT_DATE - INTERVAL '180 days'
    GROUP BY emp
),
asistencia AS (
    SELECT
        numero_empleado AS employee_id,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days' AND presente) AS dias_presentes_90d,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '90 days' AND horas_incidencia > 0) AS dias_incidencia_90d
    FROM asistencia_diaria
    WHERE fecha >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY numero_empleado
)
SELECT
    e.employee_id,
    e.area,
    e.departamento,
    e.turno,
    e.clasificacion,
    e.tipo_nomina,
    e.empresa,
    COALESCE(i.neg_rate_90d, 0) AS neg_rate_90d,
    COALESCE(i.neg_rate_180d, 0) AS neg_rate_180d,
    COALESCE(i.permiso_rate_90d, 0) AS permiso_rate_90d,
    COALESCE(i.permiso_rate_180d, 0) AS permiso_rate_180d,
    COALESCE(a.dias_presentes_90d, 0) AS dias_presentes_90d,
    COALESCE(a.dias_incidencia_90d, 0) AS dias_incidencia_90d,
    DATE_PART('day', CURRENT_DATE::timestamp - e.fecha_ingreso::timestamp) AS tenure_days
FROM empleados e
LEFT JOIN incidencias_resumen i ON i.employee_id = e.employee_id
LEFT JOIN asistencia a ON a.employee_id = e.employee_id;
"""


class PatternsClusteringTrainer(BaseModelTrainer):
    model_id = 'labor_patterns'
    model_name = 'Clustering de patrones laborales'
    model_type = ModelType.CLUSTERING
    description = 'Agrupa empleados en patrones de comportamiento (disciplinados, inconstantes, críticos).'

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(PATTERNS_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError('No hay empleados activos para clusterizar patrones laborales.')

        numeric_features: List[str] = [
            'neg_rate_90d',
            'neg_rate_180d',
            'permiso_rate_90d',
            'permiso_rate_180d',
            'dias_presentes_90d',
            'dias_incidencia_90d',
            'tenure_days',
        ]

        for col in numeric_features:
            if col not in df.columns:
                df[col] = 0
            df[col] = df[col].fillna(0)

        scaler = StandardScaler()
        imputer = SimpleImputer(strategy='median')

        X = imputer.fit_transform(df[numeric_features])
        X_scaled = scaler.fit_transform(X)

        gmm = GaussianMixture(n_components=5, covariance_type='full', random_state=14)
        gmm.fit(X_scaled)
        cluster_probs = gmm.predict_proba(X_scaled)
        primary_cluster = cluster_probs.argmax(axis=1)

        df['cluster'] = primary_cluster
        df['cluster_confidence'] = cluster_probs.max(axis=1)

        # Secondary validation with DBSCAN to flag outliers
        dbscan = DBSCAN(eps=0.5, min_samples=12)
        db_labels = dbscan.fit_predict(X_scaled)
        df['dbscan_label'] = db_labels

        cluster_summary = (
            df.groupby('cluster')
            .agg(
                empleados=('employee_id', 'count'),
                neg_rate_90d=('neg_rate_90d', 'mean'),
                permiso_rate_90d=('permiso_rate_90d', 'mean'),
                dias_incidencia_90d=('dias_incidencia_90d', 'mean'),
                confianza_media=('cluster_confidence', 'mean'),
                outliers=('dbscan_label', lambda s: int((s == -1).sum())),
            )
            .reset_index()
            .sort_values('neg_rate_90d', ascending=False)
        )

        artifacts = {
            'cluster_summary': cluster_summary.to_dict(orient='records'),
        }

        metrics: Dict[str, Any] = {
            'clusters': int(cluster_summary['cluster'].nunique()),
            'empleados_clusterizados': int(df.shape[0]),
            'outliers_detected': int((df['dbscan_label'] == -1).sum()),
        }

        estimator = {
            'gmm': gmm,
            'scaler': scaler,
            'imputer': imputer,
            'numeric_features': numeric_features,
        }

        return TrainOutput(estimator=estimator, metrics=metrics, artifacts=artifacts)
