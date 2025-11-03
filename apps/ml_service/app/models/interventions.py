from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

import joblib

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from .absenteeism import ABSENTEEISM_SQL
from .base import BaseModelTrainer, TrainOutput
from .rotation import ROTATION_FEATURES_SQL, MultiHorizonRotationEnsemble, RotationAttritionTrainer
from ..schemas import ModelType
from ..utils.sklearn import build_one_hot_encoder


class PreventiveInterventionsTrainer(BaseModelTrainer):
    model_id = 'preventive_interventions'
    model_name = 'Sugerencia de intervenciones preventivas'
    model_type = ModelType.RECOMMENDER
    description = 'Árbol de decisión que recomienda intervenciones basadas en riesgo combinado de rotación y ausentismo.'

    def __init__(self, settings, database) -> None:
        super().__init__(settings, database)
        self.rotation_trainer = RotationAttritionTrainer(settings, database)

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        rotation_df = await self.database.fetch_dataframe(ROTATION_FEATURES_SQL)
        absenteeism_df = await self.database.fetch_dataframe(ABSENTEEISM_SQL)
        latest_month = absenteeism_df['month_start'].max() if not absenteeism_df.empty else None
        absenteeism_latest = (
            absenteeism_df[absenteeism_df['month_start'] == latest_month]
            if latest_month
            else pd.DataFrame(columns=absenteeism_df.columns)
        )

        if absenteeism_latest.empty:
            absenteeism_latest = pd.DataFrame(
                columns=['employee_id', 'neg_prev_28d', 'neg_prev_56d', 'neg_prev_365d', 'target_ausentismo']
            )

        features = rotation_df.merge(
            absenteeism_latest[['employee_id', 'neg_prev_28d', 'neg_prev_56d', 'target_ausentismo']],
            on='employee_id',
            how='left',
        )
        return features

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        df = frame.copy()
        if df.empty:
            raise ValueError('No hay suficientes datos combinados para generar recomendaciones preventivas.')

        rotation_model = self._ensure_rotation_model(df)
        X_rot, _, _, _ = self.rotation_trainer.prepare_features(df, include_target=False)
        probabilities_map = rotation_model.predict_proba(X_rot)
        if isinstance(probabilities_map, dict):
            rot_prob = probabilities_map.get(90)
            if rot_prob is None:
                horizon = max(probabilities_map.keys())
                rot_prob = probabilities_map[horizon]
        else:
            rot_prob = probabilities_map
        df['rotation_probability'] = np.asarray(rot_prob, dtype=float)

        df['neg_prev_28d'] = df['neg_prev_28d'].fillna(0)
        df['neg_prev_56d'] = df['neg_prev_56d'].fillna(0)
        df['target_ausentismo'] = df['target_ausentismo'].fillna(0)

        df['accion_recomendada'] = df.apply(self._rule_based_action, axis=1)

        feature_cols = [
            'rotation_probability',
            'neg_90d',
            'neg_365d',
            'permisos_365d',
            'neg_prev_28d',
            'neg_prev_56d',
            'target_ausentismo',
        ]
        for col in feature_cols:
            df[col] = df[col].fillna(0)

        categorical_cols = ['area', 'departamento', 'clasificacion', 'empresa']
        for col in categorical_cols:
            df[col] = df[col].fillna('DESCONOCIDO')

        X = df[feature_cols + categorical_cols]
        y = df['accion_recomendada']

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=123,
            stratify=y,
        )

        pipeline = Pipeline(
            steps=[
                ('imputer', SimpleImputer(strategy='most_frequent')),
                ('encoder', build_one_hot_encoder()),
                ('model', DecisionTreeClassifier(max_depth=5, min_samples_leaf=20, random_state=123)),
            ]
        )

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        accuracy = float(accuracy_score(y_test, y_pred))
        action_distribution = y.value_counts(normalize=True).to_dict()

        rules_snapshot = (
            df.groupby('accion_recomendada')['rotation_probability']
            .agg(['mean', 'count'])
            .reset_index()
            .to_dict(orient='records')
        )

        artifacts = {
            'action_distribution': action_distribution,
            'rules_snapshot': rules_snapshot,
        }

        metrics: Dict[str, Any] = {
            'accuracy': accuracy,
        }

        return TrainOutput(estimator=pipeline, metrics=metrics, artifacts=artifacts)

    def _rule_based_action(self, row: pd.Series) -> str:
        prob = row.get('rotation_probability', 0.0)
        neg_recent = row.get('neg_90d', 0.0)
        neg_prev_28 = row.get('neg_prev_28d', 0.0)
        ausentismo_flag = row.get('target_ausentismo', 0)

        if prob >= 0.75 and neg_recent >= 2:
            return 'Plan de retención personalizado'
        if prob >= 0.6 and ausentismo_flag >= 1:
            return 'Mentoría y seguimiento semanal'
        if prob >= 0.5 and neg_prev_28 >= 1:
            return 'Revisión con Recursos Humanos'
        if neg_recent >= 3:
            return 'Acción disciplinaria y coaching'
        return 'Reconocimiento y refuerzo positivo'

    def _ensure_rotation_model(self, df: pd.DataFrame) -> MultiHorizonRotationEnsemble:
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

        rotation_output = self.rotation_trainer.run_training(df)
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
