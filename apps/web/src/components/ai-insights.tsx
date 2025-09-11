"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Lightbulb, 
  Eye,
  ChevronDown,
  ChevronRight,
  Target,
  BarChart3
} from "lucide-react";
import { geminiAI, type AIInsight, type AIAnalysis } from "@/lib/gemini-ai";
import { KPIResult } from "@/lib/kpi-calculator";

interface AIInsightsProps {
  kpis: KPIResult[];
  period?: string;
}

export function AIInsights({ kpis, period = 'monthly' }: AIInsightsProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [chartAnalysis, setChartAnalysis] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [loadingChart, setLoadingChart] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (kpis && kpis.length > 0) {
      setLoading(true);
      geminiAI.analyzeKPIs(kpis, period)
        .then(setAnalysis)
        .catch(error => {
          console.error('🤖 Error generating AI insights:', error);
          setAnalysis(null);
        })
        .finally(() => setLoading(false));
    }
  }, [kpis, period]);

  const toggleInsight = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'neutral':
        return <BarChart3 className="h-5 w-5 text-blue-500" />;
      default:
        return <Eye className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult('');
    
    try {
      const result = await geminiAI.testConnection();
      setTestResult(result.message);
    } catch (e) {
      const error = e as Error;
      setTestResult('❌ Error al testear conexión: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAnalyzeCharts = async () => {
    if (!kpis || kpis.length === 0) return;
    
    setLoadingChart(true);
    setChartAnalysis('');
    
    try {
      const chartAnalysisResult = await geminiAI.analyzeChartTrends(kpis, 'line');
      setChartAnalysis(chartAnalysisResult);
    } catch (e) {
      const error = e as Error;
      setChartAnalysis('❌ Error al analizar gráficas: ' + error.message);
    } finally {
      setLoadingChart(false);
    }
  };

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Análisis con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Brain className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-gray-600">Analizando KPIs con IA...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análisis con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm text-gray-600">No se pudo generar el análisis de IA</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Análisis con IA
          <Badge variant="outline" className="ml-auto">
            Puntuación: <span className={getScoreColor(analysis.overallScore)}>{analysis.overallScore}/100</span>
          </Badge>
        </CardTitle>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testingConnection}
          >
            {testingConnection ? (
              <Brain className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Test IA
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeCharts}
            disabled={loadingChart || !kpis || kpis.length === 0}
          >
            {loadingChart ? (
              <BarChart3 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            Analizar Gráficas
          </Button>
        </div>
        
        {/* Test Result */}
        {testResult && (
          <div className="mt-3 p-3 bg-gray-50 border rounded-lg">
            <p className="text-sm text-gray-700">{testResult}</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Analysis */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Puntuación General</h4>
              <span className={`text-sm font-medium ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}/100
              </span>
            </div>
            <Progress value={analysis.overallScore} className="h-2" />
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Resumen Ejecutivo</h4>
            <p className="text-sm text-blue-800">{analysis.summary}</p>
          </div>
        </div>

        {/* Trends Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Mejorando</span>
            </div>
            {analysis.trends.improving.length > 0 ? (
              <ul className="text-sm text-green-800 space-y-1">
                {analysis.trends.improving.map((kpi, index) => (
                  <li key={index}>• {kpi}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600">Ninguno</p>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900">Declinando</span>
            </div>
            {analysis.trends.declining.length > 0 ? (
              <ul className="text-sm text-red-800 space-y-1">
                {analysis.trends.declining.map((kpi, index) => (
                  <li key={index}>• {kpi}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-600">Ninguno</p>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">Estables</span>
            </div>
            {analysis.trends.stable.length > 0 ? (
              <ul className="text-sm text-gray-800 space-y-1">
                {analysis.trends.stable.map((kpi, index) => (
                  <li key={index}>• {kpi}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">Ninguno</p>
            )}
          </div>
        </div>

        {/* Detailed Insights */}
        {analysis.insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Insights Detallados</h4>
            {analysis.insights.map((insight, index) => (
              <div key={index} className="border rounded-lg">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto"
                  onClick={() => toggleInsight(index.toString())}
                >
                  <div className="flex items-center gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="text-left">
                      <div className="font-medium">{insight.kpi}</div>
                      <div className="text-sm text-gray-600 truncate max-w-md">
                        {insight.insight}
                      </div>
                    </div>
                    <Badge className={getPriorityColor(insight.priority)}>
                      {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                  </div>
                  {expandedInsights.has(index.toString()) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                
                {expandedInsights.has(index.toString()) && (
                  <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Análisis:</h5>
                        <p className="text-sm text-gray-700">{insight.insight}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Recomendación:</h5>
                        <p className="text-sm text-gray-700">{insight.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Strategic Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-purple-900">Recomendaciones Estratégicas</h4>
            </div>
            <ul className="space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-medium text-purple-700 mt-0.5">{index + 1}.</span>
                  <span className="text-sm text-purple-800">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Advanced Chart Analysis */}
        {chartAnalysis && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">Análisis Avanzado de Gráficas</h4>
            </div>
            <div className="text-sm text-indigo-800 whitespace-pre-wrap">
              {chartAnalysis}
            </div>
          </div>
        )}

        {/* Loading state for chart analysis */}
        {loadingChart && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 animate-spin text-blue-500" />
              <div>
                <h4 className="font-medium text-gray-900">Analizando Gráficas con IA</h4>
                <p className="text-sm text-gray-600">Identificando patrones y tendencias visuales...</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export as default to replace the old component
