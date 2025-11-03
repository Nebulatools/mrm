#!/usr/bin/env python3
"""
Script de prueba del modelo de rotación corregido

Ejecutar: python scripts/test-rotation-model.py
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde apps/ml_service/.env
project_root = Path(__file__).parent.parent
env_file = project_root / 'apps' / 'ml_service' / '.env'
load_dotenv(env_file)

# Agregar app al path
sys.path.insert(0, str(project_root / 'apps' / 'ml_service'))

import asyncio
from app.config import Settings
from app.database import Database
from app.models.rotation import RotationAttritionTrainer


async def test_rotation_model():
    print("🧪 PRUEBA DEL MODELO DE ROTACIÓN CORREGIDO")
    print("=" * 80)
    print()

    # Configuración
    settings = Settings()
    database = Database(settings.database_url)

    print("📊 Paso 1: Cargando datos de entrenamiento...")
    trainer = RotationAttritionTrainer(settings, database)

    try:
        # Cargar datos
        frame = await trainer.load_training_frame()
        print(f"✅ Datos cargados: {len(frame)} registros (snapshots históricos)")
        print()

        # Mostrar primeras filas
        print("📋 Primeros 5 registros:")
        print(frame.head().to_string())
        print()

        # Estadísticas del dataset
        print("📈 Estadísticas del dataset:")
        print(f"   - Total de snapshots: {len(frame)}")
        print(f"   - Empleados únicos: {frame['employee_id'].nunique()}")
        print(f"   - Fechas de snapshot únicas: {frame['snapshot_date'].nunique()}")
        print()

        # Distribución del target
        if 'target_rotacion_90d' in frame.columns:
            target_dist = frame['target_rotacion_90d'].value_counts()
            print("🎯 Distribución del target (rotación en próximos 90 días):")
            print(f"   - No rotación (0): {target_dist.get(0, 0)} ({target_dist.get(0, 0)/len(frame)*100:.1f}%)")
            print(f"   - Sí rotación (1): {target_dist.get(1, 0)} ({target_dist.get(1, 0)/len(frame)*100:.1f}%)")
            print()

            positives = target_dist.get(1, 0)
            if positives < 2:
                print("❌ ERROR: No hay suficientes casos positivos (bajas) para entrenar.")
                print("   El modelo necesita al menos 2 casos de rotación.")
                return
        else:
            print("❌ ERROR: Columna 'target_rotacion_90d' no encontrada en el dataset.")
            return

        # Preparar features
        print("🔧 Paso 2: Preparando features...")
        X, y, features_num, features_cat = trainer.prepare_features(frame, include_target=True)

        print(f"✅ Features preparadas:")
        print(f"   - Features numéricas ({len(features_num)}): {', '.join(features_num)}")
        print(f"   - Features categóricas ({len(features_cat)}): {', '.join(features_cat)}")
        print(f"   - Shape de X: {X.shape}")
        print(f"   - Shape de y: {y.shape if y is not None else 'None'}")
        print()

        # Verificar valores
        print("🔍 Paso 3: Verificando calidad de datos...")
        print(f"   - Valores nulos en X: {X.isnull().sum().sum()}")
        print(f"   - Valores nulos en y: {y.isnull().sum() if y is not None else 'N/A'}")
        print()

        # Entrenar modelo
        print("🚀 Paso 4: Entrenando modelo...")
        print("   (Esto puede tomar 30-60 segundos)")
        print()

        result = trainer.run_training(frame)

        print("=" * 80)
        print("✅ ¡ENTRENAMIENTO COMPLETADO!")
        print("=" * 80)
        print()

        # Mostrar métricas
        metrics = result.metrics
        print("📊 MÉTRICAS DEL MODELO:")
        print()
        print(f"   🎯 ROC-AUC:          {metrics['roc_auc']:.3f}")
        print(f"   📏 Precision:        {metrics['precision']:.3f}")
        print(f"   🔍 Recall:           {metrics['recall']:.3f}")
        print(f"   ⚖️  F1-Score:         {metrics['f1']:.3f}")
        print(f"   🎓 CV Mean (5-fold): {metrics['cv_mean']:.3f} ± {metrics['cv_std']:.3f}")
        print()

        # Matriz de confusión
        print("🔢 MATRIZ DE CONFUSIÓN:")
        print(f"   - Verdaderos Negativos (TN): {metrics['true_negatives']}")
        print(f"   - Falsos Positivos (FP):     {metrics['false_positives']}")
        print(f"   - Falsos Negativos (FN):     {metrics['false_negatives']}")
        print(f"   - Verdaderos Positivos (TP): {metrics['true_positives']}")
        print()

        # Valor de negocio
        if 'business_value' in result.artifacts:
            bv = result.artifacts['business_value']
            print("💰 VALOR DE NEGOCIO:")
            print(f"   - Empleados en riesgo detectados: {bv['empleados_en_riesgo_detectados']}")
            print(f"   - Empleados retenidos (estimado):  {bv['empleados_retenidos_estimados']}")
            print(f"   - Ahorro potencial: ${bv['ahorro_potencial_mxn']:,.0f} MXN")
            print(f"   - Costo intervenciones: ${bv['costo_intervenciones_mxn']:,.0f} MXN")
            print(f"   - ROI estimado: ${bv['roi_estimado_mxn']:,.0f} MXN")
            print()

        # Features más importantes
        if 'feature_importances' in result.artifacts:
            importances = result.artifacts['feature_importances']
            sorted_feats = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]
            print("🔝 TOP 10 FEATURES MÁS IMPORTANTES:")
            for i, (feat, imp) in enumerate(sorted_feats, 1):
                print(f"   {i:2d}. {feat:30s} {imp:.4f}")
            print()

        # Recomendaciones
        print("=" * 80)
        print("💡 RECOMENDACIONES:")
        print("=" * 80)
        print()

        if metrics['roc_auc'] >= 0.70:
            print("✅ EXCELENTE: ROC-AUC >= 0.70")
            print("   El modelo tiene buen poder predictivo.")
        elif metrics['roc_auc'] >= 0.60:
            print("⚠️  ACEPTABLE: ROC-AUC entre 0.60-0.70")
            print("   El modelo funciona pero tiene margen de mejora.")
        else:
            print("❌ BAJO: ROC-AUC < 0.60")
            print("   Considera agregar más features o más datos históricos.")

        print()

        if metrics['recall'] < 0.40:
            print("⚠️  RECALL BAJO (<0.40):")
            print("   Solo detectas ~{:.0f}% de rotaciones reales.".format(metrics['recall'] * 100))
            print("   Considera ajustar el threshold o balancear clases.")
        else:
            print(f"✅ Recall: {metrics['recall']:.1%} - Detectas la mayoría de casos.")

        print()
        print("🎉 Prueba completada exitosamente!")
        print()

    except Exception as e:
        print(f"❌ ERROR durante el entrenamiento:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return

    finally:
        await database.close()


if __name__ == '__main__':
    asyncio.run(test_rotation_model())
