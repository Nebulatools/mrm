from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from .base import BaseModelTrainer, TrainOutput
from ..database import Database
from ..schemas import ModelType
from ..utils.sklearn import build_one_hot_encoder


ROTATION_FEATURES_SQL = """
SELECT
    e.numero_empleado AS employee_id,
    e.genero,
    e.area,
    e.departamento,
    e.puesto,
    e.clasificacion,
    e.ubicacion,
    e.tipo_nomina,
    e.turno,
    e.empresa,
    e.fecha_ingreso,
    e.fecha_antiguedad,
    e.fecha_baja
FROM empleados_sftp e
WHERE e.fecha_ingreso IS NOT NULL
ORDER BY e.numero_empleado;
"""


PREDICTION_HORIZONS: tuple[int, ...] = (30, 60, 90)


class MultiHorizonRotationEnsemble:
    """
    Contenedor serializable que agrupa un pipeline por horizonte (30, 60, 90 días).
    """

    def __init__(self, pipelines: Dict[int, Pipeline]) -> None:
        self._pipelines = dict(pipelines)

    @property
    def horizons(self) -> List[int]:
        return sorted(self._pipelines.keys())

    def predict_proba(self, X: pd.DataFrame) -> Dict[int, np.ndarray]:
        probabilities: Dict[int, np.ndarray] = {}
        for horizon, pipeline in self._pipelines.items():
            proba = pipeline.predict_proba(X)
            probabilities[horizon] = proba[:, 1] if proba.ndim == 2 else proba
        return probabilities

    def get_pipeline(self, horizon: int) -> Pipeline:
        if horizon not in self._pipelines:
            raise KeyError(f'No hay pipeline entrenado para el horizonte {horizon} días.')
        return self._pipelines[horizon]

def _normalize_clasificacion(value: Any) -> str:
    if value is None:
        return 'Desconocido'
    text = str(value).strip()
    if not text or text.lower() in {'nan', 'none'}:
        return 'Desconocido'
    upper = text.upper()
    if 'SIND' in upper:
        return 'Sindicalizados'
    if 'CONF' in upper:
        return 'Confianza'
    return text.title()


class RotationAttritionTrainer(BaseModelTrainer):
    model_id = 'rotation'
    model_name = 'Predicción de rotación individual'
    model_type = ModelType.CLASSIFICATION
    description = (
        'Predicción PROACTIVA de riesgo de rotación en próximos 90 días. '
        'Identifica empleados en riesgo ANTES de que decidan renunciar, '
        'permitiendo intervenciones preventivas (mejora salarial, cambio de área, capacitación). '
        'VALOR DE NEGOCIO: Reducir costo de rotación (estimado $50,000 MXN por empleado) '
        'identificando 30-40% de casos con 2-3 meses de anticipación.'
    )

    def __init__(self, settings, database: Database) -> None:
        super().__init__(settings, database)
        self.target_column = 'target_rotacion_90d'  # Nuevo target con ventana temporal

    async def load_training_frame(self, **kwargs: Any) -> pd.DataFrame:
        # Cargar datos base de empleados
        df_base = await self.database.fetch_dataframe(ROTATION_FEATURES_SQL)

        # Construir ventanas temporales en Python
        df = self._build_temporal_windows(df_base)
        return df

    def _build_temporal_windows(self, df_base: pd.DataFrame) -> pd.DataFrame:
        """
        Construye ventanas temporales (snapshots históricos) en Python.
        Esto evita problemas con SQL complejo en Supabase.
        """
        import datetime
        from dateutil.relativedelta import relativedelta

        # Convertir fechas
        df_base['fecha_ingreso'] = pd.to_datetime(df_base['fecha_ingreso'])
        df_base['fecha_antiguedad'] = pd.to_datetime(df_base['fecha_antiguedad'], errors='coerce')
        df_base['fecha_baja'] = pd.to_datetime(df_base['fecha_baja'], errors='coerce')

        # Generar fechas de snapshot (cada mes en últimos 12 meses)
        end_date = datetime.date.today() - relativedelta(months=3)  # Excluir últimos 3 meses
        start_date = end_date - relativedelta(months=12)

        snapshot_dates = []
        current = start_date
        while current <= end_date:
            snapshot_dates.append(current)
            current = current + relativedelta(months=1)

        # Construir dataset de snapshots
        snapshots = []

        for snapshot_date in snapshot_dates:
            for _, emp in df_base.iterrows():
                fecha_ingreso = emp['fecha_ingreso'].date()
                fecha_baja = emp['fecha_baja'].date() if pd.notna(emp['fecha_baja']) else None

                days_until_baja: int | None = None

                # Reutilizar conteos agregados del dataset base si existen
                count_columns = [
                    'neg_30d',
                    'neg_90d',
                    'neg_365d',
                    'permisos_90d',
                    'permisos_365d',
                    'total_90d',
                    'total_365d',
                ]
                aggregated_counts: Dict[str, float] = {}
                for col in count_columns:
                    value = emp[col] if col in emp.index else 0
                    aggregated_counts[col] = float(value) if pd.notna(value) else 0.0

                # Solo empleados activos en snapshot_date
                if fecha_ingreso < snapshot_date and (fecha_baja is None or fecha_baja >= snapshot_date):
                    # Calcular target por horizonte: ¿Se dio de baja en próximos X días?
                    target_flags = {horizon: 0 for horizon in PREDICTION_HORIZONS}
                    if fecha_baja is not None:
                        delta_days = (fecha_baja - snapshot_date).days
                        if delta_days >= 0:
                            days_until_baja = delta_days
                        for horizon in PREDICTION_HORIZONS:
                            if 1 <= delta_days <= horizon:
                                target_flags[horizon] = 1

                    # Calcular antigüedad en snapshot_date
                    tenure_days = (snapshot_date - fecha_ingreso).days
                    fecha_ant = emp['fecha_antiguedad'].date() if pd.notna(emp['fecha_antiguedad']) else fecha_ingreso
                    antiguedad_days = (snapshot_date - fecha_ant).days

                    snapshot = {
                        'employee_id': emp['employee_id'],
                        'snapshot_date': snapshot_date,
                        'target_rotacion_30d': target_flags[30],
                        'target_rotacion_60d': target_flags[60],
                        'target_rotacion_90d': target_flags[90],
                        'tenure_days_at_snapshot': tenure_days,
                        'antiguedad_days_at_snapshot': antiguedad_days,
                        'genero': emp['genero'],
                        'area': emp['area'],
                        'departamento': emp['departamento'],
                        'puesto': emp['puesto'],
                        'clasificacion': emp['clasificacion'],
                        'ubicacion': emp['ubicacion'],
                        'tipo_nomina': emp['tipo_nomina'],
                        'turno': emp['turno'],
                        'empresa': emp['empresa'],
                        'days_until_baja': days_until_baja,
                    }
                    snapshot.update(aggregated_counts)
                    snapshots.append(snapshot)

        return pd.DataFrame(snapshots)

    def prepare_features(
        self,
        frame: pd.DataFrame,
        *,
        include_target: bool = True,
        target_column: str | None = None,
    ) -> tuple[pd.DataFrame, pd.Series | None, List[str], List[str]]:
        df = frame.copy()

        # Fill numeric columns with zero for counts
        count_cols = [
            'neg_30d',
            'neg_90d',
            'neg_365d',
            'permisos_90d',
            'permisos_365d',
            'total_90d',
            'total_365d',
        ]
        for col in count_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # CAMBIO IMPORTANTE: Ya NO calculamos tenure desde ahora, usamos el precalculado
        # tenure_days_at_snapshot y antiguedad_days_at_snapshot ya vienen del SQL
        if 'tenure_days_at_snapshot' in df.columns:
            df['tenure_days'] = pd.to_numeric(df['tenure_days_at_snapshot'], errors='coerce').fillna(0)
        else:
            # Fallback para compatibilidad
            df['tenure_days'] = 0

        if 'antiguedad_days_at_snapshot' in df.columns:
            df['antiguedad_days'] = pd.to_numeric(df['antiguedad_days_at_snapshot'], errors='coerce').fillna(0)
        else:
            # Fallback para compatibilidad
            df['antiguedad_days'] = 0

        # Validar y convertir target
        resolved_target = target_column or self.target_column
        if include_target and resolved_target and resolved_target in df.columns:
            df[resolved_target] = (
                pd.to_numeric(df[resolved_target], errors='coerce').fillna(0).astype(int)
            )

        # Ratios (calculados con datos de incidencias)
        df['ratio_neg_90d'] = df['neg_90d'] / df['total_90d'].replace(0, np.nan)
        df['ratio_neg_365d'] = df['neg_365d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_permisos_365d'] = df['permisos_365d'] / df['total_365d'].replace(0, np.nan)
        df['ratio_neg_90d'] = df['ratio_neg_90d'].fillna(0)
        df['ratio_neg_365d'] = df['ratio_neg_365d'].fillna(0)
        df['ratio_permisos_365d'] = df['ratio_permisos_365d'].fillna(0)

        features_numeric: List[str] = [
            'tenure_days',
            'antiguedad_days',
            'neg_30d',
            'neg_90d',
            'neg_365d',
            'permisos_90d',
            'permisos_365d',
            'ratio_neg_90d',
            'ratio_neg_365d',
            'ratio_permisos_365d',
        ]

        # Features categóricas
        features_categorical: List[str] = [
            'genero',
            'area',
            'departamento',
            'puesto',
            'clasificacion',
            'ubicacion',
            'tipo_nomina',
            'turno',
            'empresa',
        ]

        # Ensure missing columns exist
        for col in features_numeric:
            if col not in df.columns:
                df[col] = 0
        for col in features_categorical:
            if col not in df.columns:
                df[col] = 'UNKNOWN'

        X = df[features_numeric + features_categorical]
        y = None
        if include_target and resolved_target and resolved_target in df.columns:
            y = pd.to_numeric(df[resolved_target], errors='coerce').fillna(0).astype(int)

        return X, y, features_numeric, features_categorical

    def run_training(self, frame: pd.DataFrame, **kwargs: Any) -> TrainOutput:
        X, _, features_numeric, features_categorical = self.prepare_features(frame, include_target=False)
        if X.empty:
            raise ValueError('Dataset para el modelo de rotación está vacío.')

        base_target_column = 'target_rotacion_90d'
        if base_target_column not in frame.columns:
            raise ValueError('El dataset no incluye la columna target_rotacion_90d.')

        base_target = pd.to_numeric(frame[base_target_column], errors='coerce').fillna(0).astype(int)
        if base_target.sum() == 0:
            raise ValueError(
                'El horizonte de 90 días no tiene bajas registradas. '
                'Se requiere al menos un positivo para entrenar.'
            )

        indices = np.arange(len(X))
        train_indices, test_indices = train_test_split(
            indices,
            test_size=0.2,
            random_state=42,
            stratify=base_target,
        )

        X_train = X.iloc[train_indices]
        X_test = X.iloc[test_indices]

        pipelines: Dict[int, Pipeline] = {}
        per_horizon_metrics: Dict[str, Dict[str, Any]] = {}
        per_horizon_artifacts: Dict[str, Dict[str, Any]] = {}
        business_value: Dict[str, Any] | None = None

        for horizon in PREDICTION_HORIZONS:
            target_column = f'target_rotacion_{horizon}d'
            if target_column not in frame.columns:
                raise ValueError(f'El dataset no incluye la columna {target_column}.')

            y_full = pd.to_numeric(frame[target_column], errors='coerce').fillna(0).astype(int)
            y_train = y_full.iloc[train_indices]
            y_test = y_full.iloc[test_indices]

            positives_train = int((y_train == 1).sum())
            negatives_train = int((y_train == 0).sum())
            if positives_train == 0 or negatives_train == 0:
                raise ValueError(
                    f'No hay suficientes ejemplos para entrenar el horizonte {horizon}d '
                    f'(positivos={positives_train}, negativos={negatives_train}).'
                )

            numeric_transformer = Pipeline(
                steps=[
                    ('imputer', SimpleImputer(strategy='median')),
                    ('scaler', StandardScaler()),
                ]
            )
            categorical_transformer = Pipeline(
                steps=[
                    ('imputer', SimpleImputer(strategy='most_frequent')),
                    ('encoder', build_one_hot_encoder()),
                ]
            )
            preprocessor = ColumnTransformer(
                transformers=[
                    ('num', numeric_transformer, features_numeric),
                    ('cat', categorical_transformer, features_categorical),
                ]
            )
            estimator = XGBClassifier(
                max_depth=4,
                n_estimators=300,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.7,
                objective='binary:logistic',
                eval_metric='auc',
                tree_method='hist',
                scale_pos_weight=self._compute_class_weight(y_train),
                reg_lambda=1.0,
                random_state=42,
            )

            pipeline = Pipeline(
                steps=[
                    ('preprocess', preprocessor),
                    ('model', estimator),
                ]
            )
            pipeline.fit(X_train, y_train)
            pipelines[horizon] = pipeline

            y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
            y_pred = (y_pred_proba >= 0.5).astype(int)

            try:
                roc_auc = float(roc_auc_score(y_test, y_pred_proba))
            except ValueError:
                roc_auc = None
            try:
                avg_precision = float(average_precision_score(y_test, y_pred_proba))
            except ValueError:
                avg_precision = None

            precision_value = float(precision_score(y_test, y_pred, zero_division=0))
            recall_value = float(recall_score(y_test, y_pred, zero_division=0))
            f1_value = float(f1_score(y_test, y_pred, zero_division=0))

            cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
            tn, fp, fn, tp = (int(value) for value in cm.flatten())

            specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else None
            false_positive_rate = float(fp / (fp + tn)) if (fp + tn) > 0 else None
            false_negative_rate = float(fn / (fn + tp)) if (fn + tp) > 0 else None

            try:
                cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring='roc_auc')
                cv_mean = float(cv_scores.mean())
                cv_std = float(cv_scores.std())
                cv_scores_list = cv_scores.tolist()
            except ValueError:
                cv_scores_list = []
                cv_mean = None
                cv_std = None

            try:
                fpr, tpr, roc_thresholds = roc_curve(y_test, y_pred_proba)
                roc_curve_payload: Dict[str, Any] | None = {
                    'fpr': fpr.tolist(),
                    'tpr': tpr.tolist(),
                    'thresholds': roc_thresholds.tolist(),
                }
            except ValueError:
                roc_curve_payload = None

            try:
                precision_curve, recall_curve, pr_thresholds = precision_recall_curve(y_test, y_pred_proba)
                pr_curve_payload: Dict[str, Any] | None = {
                    'precision': precision_curve.tolist(),
                    'recall': recall_curve.tolist(),
                    'thresholds': pr_thresholds.tolist(),
                }
            except ValueError:
                pr_curve_payload = None

            positive_rate_total = float(y_full.mean())
            positive_rate_train = float(y_train.mean())
            positive_rate_test = float(y_test.mean())

            feature_importances = self._extract_feature_importances(pipeline, features_numeric, features_categorical)

            horizon_metrics: Dict[str, Any] = {
                'roc_auc': roc_auc,
                'average_precision': avg_precision,
                'precision': precision_value,
                'recall': recall_value,
                'f1': f1_value,
                'specificity': specificity,
                'false_positive_rate': false_positive_rate,
                'false_negative_rate': false_negative_rate,
                'true_negatives': tn,
                'false_positives': fp,
                'false_negatives': fn,
                'true_positives': tp,
                'train_size': int(len(y_train)),
                'test_size': int(len(y_test)),
                'total_samples': int(len(y_full)),
                'positive_rate_total': positive_rate_total,
                'positive_rate_train': positive_rate_train,
                'positive_rate_test': positive_rate_test,
                'cv_mean': cv_mean,
                'cv_std': cv_std,
                'threshold': 0.5,
            }
            per_horizon_metrics[str(horizon)] = horizon_metrics

            if horizon == 90:
                metrics_by_clasificacion: Dict[str, Dict[str, Any]] = {}
                clasificacion_series = (
                    frame.iloc[test_indices]['clasificacion']
                    .astype(str)
                    .fillna('DESCONOCIDO')
                    .replace({'nan': 'DESCONOCIDO', 'None': 'DESCONOCIDO'})
                    .apply(_normalize_clasificacion)
                )
                evaluation_df = pd.DataFrame({
                    'segment': clasificacion_series.values,
                    'y_true': y_test.values,
                    'y_pred': y_pred,
                    'y_score': y_pred_proba,
                })
                for segment, group in evaluation_df.groupby('segment'):
                    segment_metrics: Dict[str, Any] = {
                        'support': int(len(group)),
                        'positive_rate': float(group['y_true'].mean()),
                        'precision': float(precision_score(group['y_true'], group['y_pred'], zero_division=0)),
                        'recall': float(recall_score(group['y_true'], group['y_pred'], zero_division=0)),
                        'f1': float(f1_score(group['y_true'], group['y_pred'], zero_division=0)),
                    }
                    if group['y_true'].nunique() >= 2:
                        try:
                            segment_metrics['roc_auc'] = float(roc_auc_score(group['y_true'], group['y_score']))
                        except ValueError:
                            segment_metrics['roc_auc'] = None
                        try:
                            segment_metrics['average_precision'] = float(
                                average_precision_score(group['y_true'], group['y_score'])
                            )
                        except ValueError:
                            segment_metrics['average_precision'] = None
                    else:
                        segment_metrics['roc_auc'] = None
                        segment_metrics['average_precision'] = None
                        segment_metrics['warning'] = 'Distribución desbalanceada (una sola clase en validación).'
                    metrics_by_clasificacion[str(segment)] = segment_metrics
                if metrics_by_clasificacion:
                    horizon_metrics['by_clasificacion'] = metrics_by_clasificacion

            per_horizon_artifacts[str(horizon)] = {
                'feature_importances': feature_importances,
                'confusion_matrix': {
                    'true_negatives': tn,
                    'false_positives': fp,
                    'false_negatives': fn,
                    'true_positives': tp,
                },
                'roc_curve': roc_curve_payload,
                'precision_recall_curve': pr_curve_payload,
                'cv_scores': cv_scores_list,
            }

            if horizon == 90:
                costo_rotacion_por_empleado = 50_000
                tasa_exito_intervencion = 0.30
                empleados_en_riesgo_detectados = tp
                empleados_perdidos_no_detectados = fn
                falsas_alarmas = fp
                empleados_retenidos = int(empleados_en_riesgo_detectados * tasa_exito_intervencion)
                ahorro_potencial_mxn = empleados_retenidos * costo_rotacion_por_empleado
                costo_intervencion = 5_000
                costo_total_intervenciones = (empleados_en_riesgo_detectados + falsas_alarmas) * costo_intervencion
                roi_estimado = ahorro_potencial_mxn - costo_total_intervenciones

                business_value = {
                    'empleados_en_riesgo_detectados': empleados_en_riesgo_detectados,
                    'empleados_perdidos_no_detectados': empleados_perdidos_no_detectados,
                    'falsas_alarmas': falsas_alarmas,
                    'empleados_retenidos_estimados': empleados_retenidos,
                    'ahorro_potencial_mxn': ahorro_potencial_mxn,
                    'costo_intervenciones_mxn': costo_total_intervenciones,
                    'roi_estimado_mxn': roi_estimado,
                    'tasa_exito_intervencion_asumida': tasa_exito_intervencion,
                    'costo_rotacion_por_empleado_mxn': costo_rotacion_por_empleado,
                }

        if '90' not in per_horizon_metrics:
            raise RuntimeError('No se pudo entrenar el horizonte principal de 90 días.')

        primary_metrics = per_horizon_metrics['90']
        metrics: Dict[str, Any] = {
            'roc_auc': primary_metrics['roc_auc'],
            'average_precision': primary_metrics['average_precision'],
            'precision': primary_metrics['precision'],
            'recall': primary_metrics['recall'],
            'f1': primary_metrics['f1'],
            'cv_mean': primary_metrics['cv_mean'],
            'cv_std': primary_metrics['cv_std'],
            'true_negatives': primary_metrics['true_negatives'],
            'false_positives': primary_metrics['false_positives'],
            'false_negatives': primary_metrics['false_negatives'],
            'true_positives': primary_metrics['true_positives'],
            'specificity': primary_metrics['specificity'],
            'false_positive_rate': primary_metrics['false_positive_rate'],
            'false_negative_rate': primary_metrics['false_negative_rate'],
            'positive_rate': primary_metrics['positive_rate_total'],
            'train_size': primary_metrics['train_size'],
            'test_size': primary_metrics['test_size'],
            'total_samples': primary_metrics['total_samples'],
            'per_horizon': per_horizon_metrics,
        }

        main_artifacts = per_horizon_artifacts['90']
        artifacts: Dict[str, Any] = {
            'feature_importances': main_artifacts['feature_importances'],
            'confusion_matrix': main_artifacts['confusion_matrix'],
            'roc_curve': main_artifacts['roc_curve'],
            'precision_recall_curve': main_artifacts['precision_recall_curve'],
            'cv_scores': main_artifacts['cv_scores'],
            'per_horizon': per_horizon_artifacts,
        }
        if business_value is not None:
            artifacts['business_value'] = business_value

        ensemble = MultiHorizonRotationEnsemble(pipelines)
        return TrainOutput(estimator=ensemble, metrics=metrics, artifacts=artifacts)

    def _compute_class_weight(self, y: pd.Series) -> float:
        positives = float(y.sum())
        negatives = float((y == 0).sum())
        if positives == 0:
            return 1.0
        return max(1.0, negatives / positives)

    def _extract_feature_importances(
        self,
        pipeline: Pipeline,
        features_numeric: List[str],
        features_categorical: List[str],
    ) -> Dict[str, float]:
        model: XGBClassifier = pipeline.named_steps['model']
        preprocess: ColumnTransformer = pipeline.named_steps['preprocess']

        encoded_feature_names: List[str] = []
        for name, transformer, features in preprocess.transformers_:
            if name == 'cat':
                encoder = transformer.named_steps['encoder']
                feature_names = encoder.get_feature_names_out(features)
                encoded_feature_names.extend(feature_names.tolist())
            elif name == 'num':
                encoded_feature_names.extend(features)

        importances = model.feature_importances_
        return {
            feature: float(importance)
            for feature, importance in zip(encoded_feature_names, importances)
        }
