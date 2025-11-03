"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  BarChart3,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MLAnalysisTabProps {
  modelId?: string;
}

interface ModelAnalysis {
  model_id: string;
  model_name: string;
  last_trained_at: string;
  metrics: {
    roc_auc: number;
    precision: number;
    recall: number;
    f1_score: number;
    average_precision: number;
    specificity: number;
  };
  cross_validation: {
    cv_mean: number;
    cv_std: number;
    cv_scores: number[];
  };
  confusion_matrix: {
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
    true_positives: number;
  };
  roc_curve?: {
    fpr: number[];
    tpr: number[];
    thresholds: number[];
  };
  precision_recall_curve?: {
    precision: number[];
    recall: number[];
    thresholds: number[];
  };
  feature_importances: Array<{
    feature: string;
    importance: number;
  }>;
  dataset: {
    total_samples: number;
    train_size: number;
    test_size: number;
    positive_rate: number;
  };
  recommendations: Array<{
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
    action: string;
  }>;
  business_value?: {
    empleados_en_riesgo_detectados: number;
    empleados_perdidos_no_detectados: number;
    falsas_alarmas: number;
    empleados_retenidos_estimados: number;
    ahorro_potencial_mxn: number;
    costo_intervenciones_mxn: number;
    roi_estimado_mxn: number;
    tasa_exito_intervencion_asumida: number;
    costo_rotacion_por_empleado_mxn: number;
  };
}

export function MLAnalysisTab({ modelId = 'rotation' }: MLAnalysisTabProps) {
  const [analysis, setAnalysis] = useState<ModelAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ml/models/${modelId}/analysis`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar análisis');
      }

      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [modelId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || 'No se pudo cargar el análisis del modelo.'}
        </AlertDescription>
        <Button variant="outline" size="sm" onClick={loadAnalysis} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </Alert>
    );
  }

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('es-MX');
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  const getMetricBadgeVariant = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'default';
    if (value >= thresholds.warning) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {analysis.model_name}
              </CardTitle>
              <CardDescription className="mt-2">
                Modelo ID: <code className="text-xs">{analysis.model_id}</code>
                <br />
                Último entrenamiento: {formatDate(analysis.last_trained_at)}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadAnalysis}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Business Value - PRIORITY: Show first */}
      {analysis.business_value && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-5 w-5" />
              Impacto de Negocio
            </CardTitle>
            <CardDescription>
              ¿Qué valor aporta este modelo? Estimación de ROI basada en métricas actuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">
                <p className="text-sm text-muted-foreground">Empleados en Riesgo Detectados</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                  {analysis.business_value.empleados_en_riesgo_detectados}
                </p>
                <p className="text-xs text-muted-foreground mt-1">True Positives - casos reales identificados</p>
              </div>

              <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950">
                <p className="text-sm text-muted-foreground">Casos Perdidos (No Detectados)</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                  {analysis.business_value.empleados_perdidos_no_detectados}
                </p>
                <p className="text-xs text-muted-foreground mt-1">False Negatives - oportunidades perdidas</p>
              </div>

              <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950">
                <p className="text-sm text-muted-foreground">Falsas Alarmas</p>
                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                  {analysis.business_value.falsas_alarmas}
                </p>
                <p className="text-xs text-muted-foreground mt-1">False Positives - intervenciones innecesarias</p>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                <p className="text-sm text-muted-foreground">Empleados Retenidos (Estimado)</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                  {analysis.business_value.empleados_retenidos_estimados}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Asumiendo {formatPercent(analysis.business_value.tasa_exito_intervencion_asumida)} de éxito en intervenciones
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950">
                <p className="text-sm text-muted-foreground">Ahorro Potencial</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {formatCurrency(analysis.business_value.ahorro_potencial_mxn)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(analysis.business_value.costo_rotacion_por_empleado_mxn)} por empleado retenido
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-rose-50 dark:bg-rose-950">
                <p className="text-sm text-muted-foreground">Costo de Intervenciones</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                  {formatCurrency(analysis.business_value.costo_intervenciones_mxn)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Capacitación, mejoras salariales, cambios de área
                </p>
              </div>

              <div className={cn(
                "border-2 rounded-lg p-4 col-span-full md:col-span-2 lg:col-span-3",
                analysis.business_value.roi_estimado_mxn > 0
                  ? "bg-green-100 dark:bg-green-900 border-green-500"
                  : "bg-red-100 dark:bg-red-900 border-red-500"
              )}>
                <p className="text-sm text-muted-foreground">ROI Estimado (Ahorro - Costo)</p>
                <p className={cn(
                  "text-4xl font-bold",
                  analysis.business_value.roi_estimado_mxn > 0
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                )}>
                  {formatCurrency(analysis.business_value.roi_estimado_mxn)}
                </p>
                <p className="text-sm mt-2">
                  {analysis.business_value.roi_estimado_mxn > 0
                    ? "✅ El modelo genera valor positivo para el negocio"
                    : "⚠️ Las intervenciones cuestan más que el ahorro estimado"}
                </p>
              </div>
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Nota Importante</AlertTitle>
              <AlertDescription>
                Estos cálculos son estimaciones basadas en:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Costo de rotación: {formatCurrency(analysis.business_value.costo_rotacion_por_empleado_mxn)} por empleado</li>
                  <li>Tasa de éxito de intervenciones: {formatPercent(analysis.business_value.tasa_exito_intervencion_asumida)}</li>
                  <li>Costo de intervención: $5,000 MXN por empleado</li>
                </ul>
                Ajusta estos valores en el código para reflejar tus costos reales.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="space-y-3">
          {analysis.recommendations.map((rec, index) => {
            const Icon = rec.type === 'success' ? CheckCircle2 : rec.type === 'warning' ? AlertTriangle : Info;
            const variant = rec.type === 'success' ? 'default' : rec.type === 'warning' ? 'destructive' : 'default';

            return (
              <Alert key={index} variant={variant}>
                <Icon className="h-4 w-4" />
                <AlertTitle>{rec.title}</AlertTitle>
                <AlertDescription>
                  {rec.message}
                  <br />
                  <strong>Acción:</strong> {rec.action}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Main Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas de Rendimiento</CardTitle>
          <CardDescription>Evaluación en conjunto de prueba ({analysis.dataset.test_size} muestras)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              label="ROC-AUC"
              value={formatPercent(analysis.metrics.roc_auc)}
              variant={getMetricBadgeVariant(analysis.metrics.roc_auc, { good: 0.75, warning: 0.65 })}
              description="Área bajo la curva ROC"
            />
            <MetricCard
              label="Precision"
              value={formatPercent(analysis.metrics.precision)}
              variant={getMetricBadgeVariant(analysis.metrics.precision, { good: 0.70, warning: 0.60 })}
              description="Verdaderos positivos / Positivos predichos"
            />
            <MetricCard
              label="Recall (Sensibilidad)"
              value={formatPercent(analysis.metrics.recall)}
              variant={getMetricBadgeVariant(analysis.metrics.recall, { good: 0.70, warning: 0.60 })}
              description="Verdaderos positivos / Total positivos reales"
            />
            <MetricCard
              label="F1-Score"
              value={formatPercent(analysis.metrics.f1_score)}
              variant={getMetricBadgeVariant(analysis.metrics.f1_score, { good: 0.70, warning: 0.60 })}
              description="Media armónica de Precision y Recall"
            />
            <MetricCard
              label="Especificidad"
              value={formatPercent(analysis.metrics.specificity)}
              variant={getMetricBadgeVariant(analysis.metrics.specificity, { good: 0.70, warning: 0.60 })}
              description="Verdaderos negativos / Total negativos reales"
            />
            <MetricCard
              label="Average Precision"
              value={formatPercent(analysis.metrics.average_precision)}
              variant={getMetricBadgeVariant(analysis.metrics.average_precision, { good: 0.75, warning: 0.65 })}
              description="Precisión promedio ponderada"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cross-Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Validación Cruzada (5-Fold)</CardTitle>
          <CardDescription>Estabilidad del modelo en diferentes particiones del dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">ROC-AUC Promedio</p>
              <p className="text-2xl font-bold">{formatPercent(analysis.cross_validation.cv_mean)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Desviación Estándar</p>
              <p className="text-2xl font-bold">{formatPercent(analysis.cross_validation.cv_std)}</p>
              {analysis.cross_validation.cv_std > 0.1 && (
                <Badge variant="destructive" className="mt-2">Alta Variabilidad</Badge>
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Scores por fold:</p>
            <div className="flex gap-2">
              {analysis.cross_validation.cv_scores.map((score, index) => (
                <Badge key={index} variant="outline">
                  Fold {index + 1}: {formatPercent(score)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confusion Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matriz de Confusión</CardTitle>
          <CardDescription>Distribución de predicciones correctas e incorrectas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">
              <p className="text-sm text-muted-foreground">Verdaderos Negativos</p>
              <p className="text-3xl font-bold">{analysis.confusion_matrix.true_negatives}</p>
            </div>
            <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950">
              <p className="text-sm text-muted-foreground">Falsos Positivos</p>
              <p className="text-3xl font-bold">{analysis.confusion_matrix.false_positives}</p>
            </div>
            <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950">
              <p className="text-sm text-muted-foreground">Falsos Negativos</p>
              <p className="text-3xl font-bold">{analysis.confusion_matrix.false_negatives}</p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">
              <p className="text-sm text-muted-foreground">Verdaderos Positivos</p>
              <p className="text-3xl font-bold">{analysis.confusion_matrix.true_positives}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variables Más Importantes (Top 10)</CardTitle>
          <CardDescription>Features que más influyen en las predicciones del modelo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.feature_importances.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm font-medium w-8">{index + 1}.</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">{feature.feature}</span>
                    <span className="text-sm text-muted-foreground">{formatPercent(feature.importance)}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${feature.importance * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dataset Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Dataset</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Muestras</p>
              <p className="text-2xl font-bold">{analysis.dataset.total_samples}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entrenamiento</p>
              <p className="text-2xl font-bold">{analysis.dataset.train_size}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prueba</p>
              <p className="text-2xl font-bold">{analysis.dataset.test_size}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tasa Positiva</p>
              <p className="text-2xl font-bold">{formatPercent(analysis.dataset.positive_rate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  variant,
  description,
}: {
  label: string;
  value: string;
  variant: 'default' | 'secondary' | 'destructive';
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Badge variant={variant} className="text-xs">
          {value}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
