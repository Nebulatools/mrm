import { KPIResult } from './kpi-calculator';

export interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'forecast';
  title: string;
  description: string;
  confidence_score: number;
  impact: 'high' | 'medium' | 'low';
  related_kpis: string[];
  action_items?: string[];
  created_at: string;
}

export class AIAnalyzer {
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Analyze trends in KPI data
  analyzeTrends(kpis: KPIResult[]): AIInsight[] {
    const insights: AIInsight[] = [];

    kpis.forEach(kpi => {
      if (kpi.variance_percentage !== undefined && kpi.previous_value !== undefined) {
        const variance = kpi.variance_percentage;
        
        if (Math.abs(variance) > 15) {
          const isPositive = variance > 0;
          const trendType = Math.abs(variance) > 25 ? 'anomaly' : 'trend';
          
          insights.push({
            id: this.generateId(),
            type: trendType,
            title: `${trendType === 'anomaly' ? 'Anomalía detectada' : 'Tendencia significativa'} en ${kpi.name}`,
            description: `Se detectó un ${isPositive ? 'aumento' : 'descenso'} del ${Math.abs(variance).toFixed(1)}% en ${kpi.name} comparado con el período anterior.`,
            confidence_score: Math.min(0.9, Math.abs(variance) / 30),
            impact: Math.abs(variance) > 25 ? 'high' : 'medium',
            related_kpis: [kpi.name],
            action_items: this.generateActionItems(kpi, variance),
            created_at: new Date().toISOString()
          });
        }
      }
    });

    return insights;
  }

  // Detect anomalies in KPI data
  detectAnomalies(kpis: KPIResult[]): AIInsight[] {
    const insights: AIInsight[] = [];

    // Check for specific business rule violations
    const rotacionKPI = kpis.find(k => k.name.includes('Rotación'));
    const incidenciasKPI = kpis.find(k => k.name.includes('%incidencias'));

    // High turnover anomaly
    if (rotacionKPI && rotacionKPI.value > 15) {
      insights.push({
        id: this.generateId(),
        type: 'anomaly',
        title: 'Alta rotación de personal detectada',
        description: `La rotación mensual de ${rotacionKPI.value.toFixed(2)}% supera significativamente el umbral saludable del 10%.`,
        confidence_score: 0.85,
        impact: 'high',
        related_kpis: [rotacionKPI.name],
        action_items: [
          'Realizar encuestas de satisfacción laboral',
          'Revisar políticas de compensación y beneficios',
          'Implementar programas de retención de talento',
          'Analizar las causas principales de las renuncias'
        ],
        created_at: new Date().toISOString()
      });
    }

    // High incident rate anomaly
    if (incidenciasKPI && incidenciasKPI.value > 8) {
      insights.push({
        id: this.generateId(),
        type: 'anomaly',
        title: 'Alto índice de incidencias',
        description: `El porcentaje de incidencias de ${incidenciasKPI.value.toFixed(2)}% indica posibles problemas operacionales.`,
        confidence_score: 0.80,
        impact: 'medium',
        related_kpis: [incidenciasKPI.name],
        action_items: [
          'Investigar las causas raíz de las incidencias más frecuentes',
          'Implementar programas de prevención',
          'Mejorar los procesos de capacitación',
          'Establecer protocolos de seguimiento más estrictos'
        ],
        created_at: new Date().toISOString()
      });
    }

    return insights;
  }

  // Generate recommendations based on KPI performance
  generateRecommendations(kpis: KPIResult[]): AIInsight[] {
    const insights: AIInsight[] = [];

    const activosKPI = kpis.find(k => k.name === 'Activos');
    const rotacionKPI = kpis.find(k => k.name.includes('Rotación'));
    const incPromKPI = kpis.find(k => k.name.includes('Inc prom'));

    // Workforce optimization recommendation
    if (activosKPI && rotacionKPI) {
      const isStable = rotacionKPI.value < 10 && Math.abs(rotacionKPI.variance_percentage || 0) < 5;
      
      if (isStable) {
        insights.push({
          id: this.generateId(),
          type: 'recommendation',
          title: 'Oportunidad de crecimiento de plantilla',
          description: 'La estabilidad actual en la rotación de personal y el rendimiento sólido sugieren una buena oportunidad para el crecimiento estratégico del equipo.',
          confidence_score: 0.75,
          impact: 'medium',
          related_kpis: [activosKPI.name, rotacionKPI.name],
          action_items: [
            'Evaluar necesidades de expansión por departamento',
            'Desarrollar un plan de contratación escalonado',
            'Identificar perfiles críticos para el crecimiento',
            'Preparar programas de onboarding mejorados'
          ],
          created_at: new Date().toISOString()
        });
      }
    }

    // Performance improvement recommendation
    if (incPromKPI && incPromKPI.value < 0.5) {
      insights.push({
        id: this.generateId(),
        type: 'recommendation',
        title: 'Excelente gestión de incidencias',
        description: 'El bajo índice de incidencias por empleado indica una gestión efectiva. Es momento de documentar y replicar las mejores prácticas.',
        confidence_score: 0.70,
        impact: 'low',
        related_kpis: [incPromKPI.name],
        action_items: [
          'Documentar las mejores prácticas actuales',
          'Crear un manual de procedimientos estándar',
          'Implementar un sistema de reconocimiento',
          'Compartir estrategias exitosas con otros equipos'
        ],
        created_at: new Date().toISOString()
      });
    }

    return insights;
  }

  // Generate forecasts based on current trends
  generateForecasts(kpis: KPIResult[]): AIInsight[] {
    const insights: AIInsight[] = [];

    kpis.forEach(kpi => {
      if (kpi.variance_percentage !== undefined && Math.abs(kpi.variance_percentage) > 5) {
        const trend = kpi.variance_percentage > 0 ? 'creciente' : 'decreciente';
        const projectedValue = kpi.value * (1 + (kpi.variance_percentage / 100));
        
        insights.push({
          id: this.generateId(),
          type: 'forecast',
          title: `Proyección para ${kpi.name}`,
          description: `Basado en la tendencia ${trend} actual (${kpi.variance_percentage.toFixed(1)}%), se proyecta que ${kpi.name} alcance aproximadamente ${projectedValue.toFixed(2)} el próximo período.`,
          confidence_score: Math.max(0.4, Math.min(0.8, Math.abs(kpi.variance_percentage) / 20)),
          impact: Math.abs(kpi.variance_percentage) > 15 ? 'high' : 'medium',
          related_kpis: [kpi.name],
          created_at: new Date().toISOString()
        });
      }
    });

    return insights;
  }

  // Generate action items based on KPI performance and variance
  private generateActionItems(kpi: KPIResult, variance: number): string[] {
    const isPositive = variance > 0;
    const actionItems: string[] = [];

    switch (kpi.category) {
      case 'headcount':
        if (kpi.name.includes('Activos')) {
          actionItems.push(
            isPositive ? 'Evaluar capacidad de integración de nuevo personal' : 'Investigar causas de la reducción de plantilla',
            isPositive ? 'Asegurar recursos para onboarding' : 'Implementar estrategias de retención',
            'Revisar proyecciones de crecimiento organizacional'
          );
        } else if (kpi.name.includes('Bajas')) {
          actionItems.push(
            isPositive ? 'Analizar patrones en las salidas del personal' : 'Mantener estrategias actuales de retención',
            'Realizar entrevistas de salida detalladas',
            'Evaluar clima organizacional'
          );
        }
        break;

      case 'incidents':
        actionItems.push(
          isPositive ? 'Investigar el aumento en incidencias' : 'Documentar mejores prácticas actuales',
          'Revisar procesos de capacitación',
          'Implementar medidas preventivas',
          'Establecer seguimiento más frecuente'
        );
        break;

      case 'retention':
        actionItems.push(
          isPositive ? 'Implementar programa de retención urgente' : 'Mantener y fortalecer estrategias actuales',
          'Analizar factores de satisfacción laboral',
          'Revisar paquetes de compensación',
          'Mejorar oportunidades de desarrollo profesional'
        );
        break;

      default:
        actionItems.push(
          'Monitorear tendencia de cerca',
          'Realizar análisis más profundo',
          'Considerar ajustes estratégicos'
        );
    }

    return actionItems;
  }

  // Main analysis method that combines all insights
  analyzeKPIData(kpis: KPIResult[]): AIInsight[] {
    const allInsights: AIInsight[] = [
      ...this.analyzeTrends(kpis),
      ...this.detectAnomalies(kpis),
      ...this.generateRecommendations(kpis),
      ...this.generateForecasts(kpis)
    ];

    // Sort by impact and confidence
    return allInsights.sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      const aScore = impactWeight[a.impact] * a.confidence_score;
      const bScore = impactWeight[b.impact] * b.confidence_score;
      return bScore - aScore;
    });
  }
}

export const aiAnalyzer = new AIAnalyzer();