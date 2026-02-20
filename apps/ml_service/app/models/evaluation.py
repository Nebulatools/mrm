"""
Multi-algorithm evaluation pipeline.

Trains multiple algorithms for a classification or regression task,
compares metrics, and returns the best performer.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from ..utils.sklearn import build_one_hot_encoder


@dataclass
class AlgorithmResult:
    """Result of training a single algorithm."""
    name: str
    pipeline: Pipeline
    metrics: Dict[str, Any]
    cv_scores: List[float]


@dataclass
class EvaluationResult:
    """Result of multi-algorithm evaluation."""
    winner_name: str
    winner_pipeline: Pipeline
    winner_metrics: Dict[str, Any]
    all_results: Dict[str, AlgorithmResult]
    comparison_summary: List[Dict[str, Any]]


# Algorithm factory functions

def _build_xgboost(scale_pos_weight: float, **kwargs: Any) -> XGBClassifier:
    return XGBClassifier(
        max_depth=kwargs.get('max_depth', 4),
        n_estimators=kwargs.get('n_estimators', 300),
        learning_rate=kwargs.get('learning_rate', 0.05),
        subsample=0.8,
        colsample_bytree=0.7,
        objective='binary:logistic',
        eval_metric='auc',
        tree_method='hist',
        scale_pos_weight=scale_pos_weight,
        reg_lambda=1.0,
        random_state=42,
    )


def _build_random_forest(class_weight: str = 'balanced_subsample', **kwargs: Any) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=kwargs.get('n_estimators', 400),
        max_depth=kwargs.get('max_depth', 8),
        min_samples_split=20,
        class_weight=class_weight,
        random_state=42,
        n_jobs=-1,
    )


def _build_logistic_regression(**kwargs: Any) -> LogisticRegression:
    return LogisticRegression(
        max_iter=1000,
        class_weight='balanced',
        random_state=42,
        solver='lbfgs',
    )


# Optional: LightGBM (only if installed)
def _build_lightgbm(scale_pos_weight: float, **kwargs: Any) -> Any:
    try:
        from lightgbm import LGBMClassifier
        return LGBMClassifier(
            max_depth=kwargs.get('max_depth', 4),
            n_estimators=kwargs.get('n_estimators', 300),
            learning_rate=kwargs.get('learning_rate', 0.05),
            subsample=0.8,
            colsample_bytree=0.7,
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            verbose=-1,
        )
    except ImportError:
        return None


CLASSIFIER_BUILDERS = {
    'xgboost': _build_xgboost,
    'random_forest': _build_random_forest,
    'logistic_regression': _build_logistic_regression,
    'lightgbm': _build_lightgbm,
}


def build_preprocessor(
    numeric_features: List[str],
    categorical_features: List[str],
) -> ColumnTransformer:
    """Build a standard preprocessor for numeric + categorical features."""
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler()),
    ])
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', build_one_hot_encoder()),
    ])
    return ColumnTransformer(transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features),
    ])


def evaluate_classifiers(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    numeric_features: List[str],
    categorical_features: List[str],
    algorithms: Optional[List[str]] = None,
    primary_metric: str = 'average_precision',
    cv_folds: int = 5,
) -> EvaluationResult:
    """
    Train and evaluate multiple classification algorithms.

    Args:
        X_train, y_train: Training data
        X_test, y_test: Test data
        numeric_features: List of numeric column names
        categorical_features: List of categorical column names
        algorithms: List of algorithm names to try (default: all available)
        primary_metric: Metric to use for selecting the winner
        cv_folds: Number of cross-validation folds

    Returns:
        EvaluationResult with the best algorithm and comparison data
    """
    if algorithms is None:
        algorithms = list(CLASSIFIER_BUILDERS.keys())

    # Compute class weight for imbalanced data
    positives = float(y_train.sum())
    negatives = float((y_train == 0).sum())
    scale_pos_weight = max(1.0, negatives / positives) if positives > 0 else 1.0

    results: Dict[str, AlgorithmResult] = {}

    for algo_name in algorithms:
        builder = CLASSIFIER_BUILDERS.get(algo_name)
        if builder is None:
            continue

        estimator = builder(scale_pos_weight=scale_pos_weight)
        if estimator is None:
            # Library not installed (e.g., lightgbm)
            continue

        preprocessor = build_preprocessor(numeric_features, categorical_features)
        pipeline = Pipeline(steps=[
            ('preprocess', preprocessor),
            ('model', estimator),
        ])

        try:
            pipeline.fit(X_train, y_train)
            y_proba = pipeline.predict_proba(X_test)[:, 1]
            y_pred = (y_proba >= 0.5).astype(int)

            metrics: Dict[str, Any] = {
                'roc_auc': _safe_metric(roc_auc_score, y_test, y_proba),
                'average_precision': _safe_metric(average_precision_score, y_test, y_proba),
                'precision': float(precision_score(y_test, y_pred, zero_division=0)),
                'recall': float(recall_score(y_test, y_pred, zero_division=0)),
                'f1': float(f1_score(y_test, y_pred, zero_division=0)),
            }

            # Cross-validation
            cv_scores_list: List[float] = []
            try:
                cv_scores = cross_val_score(
                    pipeline, X_train, y_train,
                    cv=min(cv_folds, max(2, int(y_train.sum()))),
                    scoring='average_precision',
                )
                cv_scores_list = cv_scores.tolist()
                metrics['cv_mean'] = float(cv_scores.mean())
                metrics['cv_std'] = float(cv_scores.std())
            except ValueError:
                metrics['cv_mean'] = None
                metrics['cv_std'] = None

            results[algo_name] = AlgorithmResult(
                name=algo_name,
                pipeline=pipeline,
                metrics=metrics,
                cv_scores=cv_scores_list,
            )
        except Exception as e:
            # Skip algorithms that fail (e.g., not enough data)
            continue

    if not results:
        raise ValueError('No algorithms succeeded during evaluation.')

    # Select winner based on primary metric
    winner_name = max(
        results.keys(),
        key=lambda name: results[name].metrics.get(primary_metric) or 0.0,
    )

    # Build comparison summary
    comparison = []
    for name, result in sorted(results.items(), key=lambda x: x[1].metrics.get(primary_metric) or 0.0, reverse=True):
        comparison.append({
            'algorithm': name,
            'roc_auc': result.metrics.get('roc_auc'),
            'average_precision': result.metrics.get('average_precision'),
            'f1': result.metrics.get('f1'),
            'cv_mean': result.metrics.get('cv_mean'),
            'is_winner': name == winner_name,
        })

    winner = results[winner_name]
    return EvaluationResult(
        winner_name=winner_name,
        winner_pipeline=winner.pipeline,
        winner_metrics=winner.metrics,
        all_results=results,
        comparison_summary=comparison,
    )


def get_feature_names_from_pipeline(
    pipeline: Pipeline,
    numeric_features: List[str],
    categorical_features: List[str],
) -> List[str]:
    """Extract feature names from a fitted pipeline with ColumnTransformer."""
    preprocessor: ColumnTransformer = pipeline.named_steps['preprocess']
    feature_names: List[str] = []
    for name, transformer, features in preprocessor.transformers_:
        if name == 'num':
            feature_names.extend(features)
        elif name == 'cat':
            encoder = transformer.named_steps['encoder']
            feature_names.extend(encoder.get_feature_names_out(features))
    return feature_names


def extract_feature_importances(
    pipeline: Pipeline,
    numeric_features: List[str],
    categorical_features: List[str],
) -> Dict[str, float]:
    """Extract feature importances from a fitted pipeline."""
    model = pipeline.named_steps['model']
    feature_names = get_feature_names_from_pipeline(pipeline, numeric_features, categorical_features)

    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
    elif hasattr(model, 'coef_'):
        importances = np.abs(model.coef_[0]) if model.coef_.ndim > 1 else np.abs(model.coef_)
    else:
        return {}

    return {
        feature: float(importance)
        for feature, importance in zip(feature_names, importances)
    }


def _safe_metric(metric_fn: Any, y_true: Any, y_score: Any) -> Optional[float]:
    """Safely compute a metric, returning None on failure."""
    try:
        return float(metric_fn(y_true, y_score))
    except (ValueError, ZeroDivisionError):
        return None
