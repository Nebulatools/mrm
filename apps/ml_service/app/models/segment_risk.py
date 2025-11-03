from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

import numpy as np
import pandas as pd
import joblib
from sklearn.cluster import KMeans
from sklearn.impute import SimpleImputer
from sklearn.metrics import silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .base import BaseModelTrainer, TrainOutput
from .rotation import ROTATION_FEATURES_SQL, MultiHorizonRotationEnsemble, RotationAttritionTrainer
from ..config import Settings
from ..database import Database
from ..schemas import ModelType


class SegmentRiskTrainer(BaseModelTrainer):
    model_id = 'segment_risk'
    model_name = 'Riesgo de rotación por segmento'
    model_type = ModelType.CLUSTERING
    description = 'Clusterización de segmentos (área/departamento) basada en riesgo de rotación y patrones de ausentismo.'

    def __init__(self, settings: Settings, database: Database) -> None:
        super().__init__(settings, database)
        self.rotation_trainer = RotationAttritionTrainer(settings, database)
        self.n_clusters = 4

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        df = await self.database.fetch_dataframe(ROTATION_FEATURES_SQL)
        return df

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()

        rotation_model = self._ensure_rotation_model(df)
        X_features, _, _, _ = self.rotation_trainer.prepare_features(df, include_target=False)

        probabilities_map = rotation_model.predict_proba(X_features)
        if isinstance(probabilities_map, dict):
            probabilities = probabilities_map.get(90)
            if probabilities is None:
                # Si el modelo multi-horizonte no contiene 90d, utilizamos el mayor disponible.
                horizon = max(probabilities_map.keys())
                probabilities = probabilities_map[horizon]
        else:
            probabilities = probabilities_map
        df['rotation_probability'] = np.asarray(probabilities, dtype=float)

        aggregated = (
            df.groupby(['empresa', 'area', 'departamento'], dropna=False)
            .agg(
                headcount=('employee_id', 'count'),
                riesgo_promedio=('rotation_probability', 'mean'),
                riesgo_p75=('rotation_probability', lambda s: float(np.percentile(s, 75))),
                incidencias_neg_90d=('neg_90d', 'sum'),
                incidencias_neg_365d=('neg_365d', 'sum'),
                permisos_365d=('permisos_365d', 'sum'),
                total_365d=('total_365d', 'sum'),
            )
            .reset_index()
        )

        aggregated['ratio_negativa'] = aggregated['incidencias_neg_365d'] / aggregated['total_365d'].replace(0, np.nan)
        aggregated['ratio_negativa'] = aggregated['ratio_negativa'].fillna(0)
        aggregated['ratio_permiso'] = aggregated['permisos_365d'] / aggregated['total_365d'].replace(0, np.nan)
        aggregated['ratio_permiso'] = aggregated['ratio_permiso'].fillna(0)

        feature_cols = [
            'headcount',
            'riesgo_promedio',
            'riesgo_p75',
            'ratio_negativa',
            'ratio_permiso',
        ]

        features = aggregated[feature_cols]

        pipeline = Pipeline(
            steps=[
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler()),
                ('cluster', KMeans(n_clusters=self.n_clusters, init='k-means++', n_init=20, random_state=42)),
            ]
        )

        pipeline.fit(features)

        labels = pipeline.named_steps['cluster'].labels_
        aggregated['cluster'] = labels

        metrics: Dict[str, Any] = {
            'segments': int(aggregated['cluster'].nunique()),
            'headcount_total': int(aggregated['headcount'].sum()),
        }

        # Compute silhouette only if feasible
        try:
            transformed = pipeline.named_steps['scaler'].transform(
                pipeline.named_steps['imputer'].transform(features)
            )
            if len(np.unique(labels)) > 1 and len(labels) > self.n_clusters:
                metrics['silhouette_score'] = float(silhouette_score(transformed, labels))
        except Exception:
            metrics['silhouette_score'] = None

        top_segments = (
            aggregated.sort_values('riesgo_promedio', ascending=False)
            .head(10)
            .to_dict(orient='records')
        )

        artifacts = {
            'segment_summary': top_segments,
        }

        return TrainOutput(estimator=pipeline, metrics=metrics, artifacts=artifacts)

    def _ensure_rotation_model(self, frame: pd.DataFrame) -> MultiHorizonRotationEnsemble:
        rotation_model_path = (
            self.settings.models_dir
            / self.rotation_trainer.model_id
            / f'{self.rotation_trainer.model_version}.joblib'
        )
        if rotation_model_path.exists():
            loaded = joblib.load(rotation_model_path)
            if isinstance(loaded, MultiHorizonRotationEnsemble):
                return loaded
            if hasattr(loaded, 'predict_proba'):
                return MultiHorizonRotationEnsemble({90: loaded})
            raise ValueError('Artefacto de rotación desconocido; reentrena el modelo para actualizarlo.')

        # If not available, train rotation model first using the provided frame
        rotation_output = self.rotation_trainer.run_training(frame)
        self.rotation_trainer._persist_estimator(rotation_output.estimator)
        self.rotation_trainer._persist_metrics(
            rotation_output.metrics,
            datetime.now(timezone.utc),
            rotation_output.artifacts,
        )
        estimator = rotation_output.estimator
        if isinstance(estimator, MultiHorizonRotationEnsemble):
            return estimator
        return MultiHorizonRotationEnsemble({90: estimator})
