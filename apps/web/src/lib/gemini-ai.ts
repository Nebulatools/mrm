import { GoogleGenerativeAI } from '@google/generative-ai';
import type { KPIResult } from './kpi-calculator';

export type NarrativeLevel = 'executive' | 'manager' | 'analyst';

export interface AIInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  kpi: string;
  insight: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIAnalysis {
  summary: string;
  insights: AIInsight[];
  overallScore: number; // 0-100
  trends: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
  recommendations: string[];
}

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private cache = new Map<string, { data: AIAnalysis; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache
  
  constructor() {
    // Use API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'demo-key';
    console.log('🤖 Inicializando IA (gemini-2.5-flash para análisis estructurado) con API key:', apiKey !== 'demo-key' ? '✅ API key configurada' : '⚠️ Usando modo demo');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'models/gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
  }

  async analyzeKPIs(kpis: KPIResult[], period: string = 'monthly'): Promise<AIAnalysis> {
    console.log('🤖 Starting IA analysis for KPIs');
    
    const cacheKey = `analysis-${period}-${JSON.stringify(kpis.map(k => k.value))}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📋 Returning cached AI analysis');
      return cached.data;
    }

    try {
      // Check API key configuration
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'demo-key' || apiKey === 'your_gemini_api_key_here') {
        console.log('🎲 Usando análisis mock - API key no configurada correctamente');
        console.log('💡 Para usar IA real: Ve a https://aistudio.google.com/app/apikey y configura NEXT_PUBLIC_GEMINI_API_KEY');
        return this.generateMockAnalysis(kpis, period);
      }

      console.log('🚀 Enviando solicitud a IA...');
      
      // Create prompt for Gemini
      const prompt = this.createAnalysisPrompt(kpis, period);
      console.log('📝 Prompt generado:', prompt.substring(0, 300) + '...');
      
      // Call Gemini API with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IA API timeout after 30 seconds')), 30000);
      });
      
      const apiPromise = this.model.generateContent(prompt);
      
      const result = await Promise.race([apiPromise, timeoutPromise]);
      const response = (result as Awaited<ReturnType<typeof this.model.generateContent>>).response;
      
      if (!response) {
        throw new Error('No response from IA API');
      }
      
      const analysisText = response.text();
      console.log('📦 Respuesta de IA recibida:', analysisText.length, 'caracteres');
      
      if (!analysisText || analysisText.trim().length === 0) {
        throw new Error('Empty response from IA API');
      }
      
      // Parse the AI response into structured data
      const analysis = this.parseAIResponse(analysisText, kpis);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      console.log('✅ Análisis con Gemini AI completado exitosamente');
      return analysis;
      
    } catch (error) {
      console.error('❌ Error en análisis con Gemini AI:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('API_KEY_INVALID')) {
        console.error('🔑 API key de Gemini inválida - verifica tu configuración');
      } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
        console.error('📊 Cuota de Gemini excedida - espera o verifica tu cuenta');
      } else if (errorMessage.includes('timeout')) {
        console.error('⏱️ Timeout de Gemini - la API tardó demasiado');
      } else {
        console.error('🚨 Error desconocido:', errorMessage);
      }
      
      // Fallback to enhanced mock analysis
      console.log('🔄 Usando análisis mock mejorado como fallback');
      return {
        ...this.generateMockAnalysis(kpis, period),
        summary: `🤖 Análisis alternativo generado (Error de API): ${this.generateMockAnalysis(kpis, period).summary}`
      };
    }
  }

  async generateNarrative(
    contextData: unknown,
    userLevel: NarrativeLevel,
    section: string
  ): Promise<string> {
    const serializedContext = (() => {
      try {
        return JSON.stringify(contextData);
      } catch {
        return '{}';
      }
    })();

    const response = await fetch('/api/narrative', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contextData, userLevel, section, serializedContext }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || 'Error al generar narrativa.');
    }

    const data = await response.json();
    if (!data?.text) {
      throw new Error('Respuesta vacía al generar narrativa.');
    }
    return data.text as string;
  }

  private createAnalysisPrompt(kpis: KPIResult[], period: string): string {
    // Crear análisis detallado de cada KPI con contexto empresarial
    const kpiAnalysis = kpis.map(kpi => {
      const change = kpi.variance_percentage || 0;
      const status = change > 5 ? '📈 MEJORANDO' : change < -5 ? '📉 EMPEORANDO' : '➡️ ESTABLE';
      const vsTarget = kpi.target ? ` | Meta: ${kpi.target} ${kpi.value > kpi.target ? '⚠️ EXCEDE' : '✅ DENTRO'}` : '';
      
      return `• ${kpi.name}: ${kpi.value} ${status} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)${vsTarget}`;
    }).join('\n');

    // Calcular métricas de rendimiento
    const totalKpis = kpis.length;
    const improving = kpis.filter(k => (k.variance_percentage || 0) > 5).length;
    const declining = kpis.filter(k => (k.variance_percentage || 0) < -5).length;
    const onTarget = kpis.filter(k => k.target && k.value <= k.target).length;
    const withTargets = kpis.filter(k => k.target).length;

    return `
Eres un EXPERTO ANALISTA DE RECURSOS HUMANOS con 15+ años de experiencia en análisis de KPIs corporativos y gestión de talento. Analiza estos datos del período ${period} y proporciona insights avanzados como consultor senior de RRHH.

📊 DATOS DE KPIs EMPRESARIALES:
${kpiAnalysis}

📈 MÉTRICAS DE RENDIMIENTO:
- Total KPIs analizados: ${totalKpis}
- KPIs mejorando: ${improving} (${((improving/totalKpis)*100).toFixed(1)}%)
- KPIs empeorando: ${declining} (${((declining/totalKpis)*100).toFixed(1)}%)
- KPIs dentro de meta: ${onTarget}/${withTargets} ${withTargets > 0 ? `(${((onTarget/withTargets)*100).toFixed(1)}%)` : ''}

🎯 CONTEXTO EMPRESARIAL:
- Industria: Recursos Humanos y gestión de talento
- Período: ${period}
- Fórmulas: Estándares internacionales de RRHH (SHRM, CIPD)
- Benchmarks: Comparación vs período anterior y metas establecidas

⚡ ANÁLISIS REQUERIDO (RESPONDE SOLO JSON):
{
  "summary": "Análisis ejecutivo del estado de RRHH en 2-3 oraciones con insights clave y contexto de negocio",
  "overallScore": número_entero_0_a_100,
  "insights": [
    {
      "type": "positive|negative|warning|neutral",
      "kpi": "nombre_exacto_del_kpi",
      "insight": "Análisis profesional específico con datos cuantitativos y impacto en el negocio",
      "recommendation": "Acción concreta y específica con timeline y responsables sugeridos",
      "priority": "high|medium|low"
    }
  ],
  "trends": {
    "improving": ["lista_de_kpis_con_tendencia_positiva"],
    "declining": ["lista_de_kpis_con_tendencia_negativa"], 
    "stable": ["lista_de_kpis_estables"]
  },
  "recommendations": [
    "Recomendación estratégica 1: Específica y accionable con timeline",
    "Recomendación estratégica 2: Con KPIs impactados y responsables",
    "Recomendación estratégica 3: Con métricas de éxito y ROI esperado",
    "Recomendación estratégica 4: Con riesgos identificados y mitigación"
  ]
}

IMPORTANTE: 
- Analiza patrones entre KPIs (ej: si rotación ↑ entonces incidencias ↑)
- Considera seasonality y contexto del período
- Proporciona insights cuantitativos específicos
- Incluye benchmark vs industria cuando sea relevante
- RESPONDE ÚNICAMENTE EL JSON, SIN MARKDOWN NI TEXTO ADICIONAL
`;
  }

  private parseAIResponse(response: string, kpis: KPIResult[]): AIAnalysis {
    try {
      console.log('🤖 Raw Gemini response:', response.substring(0, 200) + '...');
      
      // Clean the response - remove markdown, extra whitespace, and common prefixes
      let cleanResponse = response
        .replace(/```json|```/g, '')
        .replace(/^(Here's the analysis:|Here is the analysis:|Analysis:|JSON:)/i, '')
        .trim();
      
      // Find JSON object in response
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      console.log('🧹 Cleaned response for parsing:', cleanResponse.substring(0, 200) + '...');
      
      const parsed = JSON.parse(cleanResponse);
      
      // Validate required fields and provide defaults
      const analysis: AIAnalysis = {
        summary: parsed.summary || 'Análisis generado por Gemini AI',
        overallScore: typeof parsed.overallScore === 'number' ? 
          Math.max(0, Math.min(100, parsed.overallScore)) : 75,
        insights: Array.isArray(parsed.insights)
          ? parsed.insights.map((insight: unknown) => {
              const record = (typeof insight === 'object' && insight !== null)
                ? insight as Record<string, unknown>
                : {};

              const allowedTypes: AIInsight['type'][] = ['positive', 'negative', 'warning', 'neutral'];
              const rawType = typeof record.type === 'string' ? record.type.toLowerCase() : '';
              const type: AIInsight['type'] = allowedTypes.includes(rawType as AIInsight['type'])
                ? rawType as AIInsight['type']
                : 'neutral';

              const kpi = typeof record.kpi === 'string' && record.kpi.trim().length > 0
                ? record.kpi
                : 'KPI General';

              const insightText = typeof record.insight === 'string' && record.insight.trim().length > 0
                ? record.insight
                : 'Análisis no disponible';

              const recommendationText = typeof record.recommendation === 'string' && record.recommendation.trim().length > 0
                ? record.recommendation
                : 'Recomendación no disponible';

              const allowedPriorities: AIInsight['priority'][] = ['high', 'medium', 'low'];
              const rawPriority = typeof record.priority === 'string' ? record.priority.toLowerCase() : '';
              const priority: AIInsight['priority'] = allowedPriorities.includes(rawPriority as AIInsight['priority'])
                ? rawPriority as AIInsight['priority']
                : 'medium';

              return {
                type,
                kpi,
                insight: insightText,
                recommendation: recommendationText,
                priority
              };
            })
          : [],
        trends: {
          improving: Array.isArray(parsed.trends?.improving) ? parsed.trends.improving : [],
          declining: Array.isArray(parsed.trends?.declining) ? parsed.trends.declining : [],
          stable: Array.isArray(parsed.trends?.stable) ? parsed.trends.stable : []
        },
        recommendations: Array.isArray(parsed.recommendations) ? 
          parsed.recommendations.slice(0, 6) : [] // Limit to 6 recommendations
      };
      
      console.log('✅ Successfully parsed Gemini AI analysis:', {
        summary: analysis.summary.substring(0, 50) + '...',
        score: analysis.overallScore,
        insights: analysis.insights.length,
        recommendations: analysis.recommendations.length
      });
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Error parsing IA response:', error);
      console.log('🔄 Falling back to mock analysis');
      
      // Fallback to mock analysis with notification
      return {
        ...this.generateMockAnalysis(kpis, 'monthly'),
        summary: `⚠️ Error al procesar respuesta de IA. Usando análisis alternativo: ${this.generateMockAnalysis(kpis, 'monthly').summary}`
      };
    }
  }

  private generateMockAnalysis(kpis: KPIResult[], period: string): AIAnalysis {
    const insights: AIInsight[] = [];
    const improving: string[] = [];
    const declining: string[] = [];
    const stable: string[] = [];

    // Generate insights based on KPI data
    kpis.forEach(kpi => {
      const variance = kpi.variance_percentage || 0;
      
      if (variance > 10) {
        improving.push(kpi.name);
        insights.push({
          type: 'positive',
          kpi: kpi.name,
          insight: `${kpi.name} muestra una mejora significativa del ${variance.toFixed(1)}% respecto al período anterior.`,
          recommendation: `Continuar con las estrategias actuales para mantener esta tendencia positiva en ${kpi.name}.`,
          priority: 'medium'
        });
      } else if (variance < -10) {
        declining.push(kpi.name);
        insights.push({
          type: 'negative',
          kpi: kpi.name,
          insight: `${kpi.name} presenta una disminución del ${Math.abs(variance).toFixed(1)}%, lo cual requiere atención.`,
          recommendation: `Implementar un plan de acción para mejorar ${kpi.name} y revertir la tendencia negativa.`,
          priority: 'high'
        });
      } else {
        stable.push(kpi.name);
      }

      // Check if KPI exceeds target
      if (kpi.target && kpi.value > kpi.target) {
        insights.push({
          type: 'warning',
          kpi: kpi.name,
          insight: `${kpi.name} (${kpi.value}) excede la meta establecida (${kpi.target}).`,
          recommendation: `Revisar las causas del exceso en ${kpi.name} y ajustar estrategias si es necesario.`,
          priority: 'high'
        });
      }
    });

    // Calculate overall score based on performance
    const positiveCount = improving.length;
    const negativeCount = declining.length;
    const overallScore = Math.max(20, Math.min(95, 75 + (positiveCount * 10) - (negativeCount * 15)));

    return {
      summary: `Durante el período ${period}, se observa un rendimiento ${overallScore > 80 ? 'excelente' : overallScore > 60 ? 'bueno' : 'que requiere atención'} en los KPIs de RRHH. ${positiveCount > 0 ? `${positiveCount} indicadores muestran mejoras,` : ''} ${negativeCount > 0 ? `${negativeCount} requieren atención inmediata.` : 'La mayoría de indicadores mantienen estabilidad.'}`,
      overallScore,
      insights,
      trends: {
        improving,
        declining,
        stable
      },
      recommendations: [
        'Establecer revisiones quincenales de KPIs críticos para detectar tendencias temprano',
        'Implementar programas de retención específicos para reducir la rotación de personal',
        'Crear sistema de alertas automáticas cuando los KPIs excedan umbrales establecidos',
        'Desarrollar planes de acción específicos para KPIs con tendencia negativa'
      ]
    };
  }

  // Advanced method to analyze charts and trends
  async analyzeChartTrends(kpis: KPIResult[], chartType: string = 'line'): Promise<string> {
    console.log('📊 Iniciando análisis avanzado de gráficas con IA');
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'demo-key' || apiKey === 'your_gemini_api_key_here') {
      return 'Análisis de gráficas no disponible - API key de IA no configurada';
    }

    try {
      const chartData = kpis.map(kpi => ({
        name: kpi.name,
        value: kpi.value,
        change: kpi.variance_percentage || 0,
        target: kpi.target,
        category: kpi.category
      }));

      const prompt = `
Como EXPERTO en análisis de datos y visualización empresarial, analiza las siguientes métricas de RRHH representadas en gráficas tipo ${chartType}:

📊 DATOS PARA ANÁLISIS DE GRÁFICAS:
${chartData.map(item => `• ${item.name}: ${item.value} (${item.change > 0 ? '+' : ''}${item.change.toFixed(1)}%) [${item.category}]`).join('\n')}

🎯 ANÁLISIS REQUERIDO:
Proporciona un análisis profesional de las tendencias visuales, patrones en las gráficas, y correlaciones entre métricas. Incluye:
1. Patrones visuales identificados en los datos
2. Correlaciones entre diferentes KPIs
3. Tendencias temporales y estacionalidad
4. Anomalías o puntos de inflexión
5. Proyecciones basadas en las tendencias actuales

Responde con un análisis narrativo profesional de máximo 250 palabras.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      console.log('✅ Análisis de gráficas completado');
      return analysisText;

    } catch (error) {
      console.error('❌ Error en análisis de gráficas:', error);
      return 'Error al analizar las tendencias de las gráficas. Intenta nuevamente.';
    }
  }

  // Test connection to Gemini AI
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'demo-key' || apiKey === 'your_gemini_api_key_here') {
        return {
          success: false,
          message: 'API key de Gemini no configurada. Ve a https://aistudio.google.com/app/apikey'
        };
      }

      console.log('🧪 Testeando conexión con Gemini AI...');
      
      const testPrompt = 'Responde con exactamente: "Conexión exitosa con Gemini AI"';
      const result = await this.model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();

      const responseTime = Date.now() - startTime;

      if (text.includes('Conexión exitosa') || text.includes('exitosa')) {
        return {
          success: true,
          message: `✅ Gemini AI funcionando correctamente (${responseTime}ms)`,
          responseTime
        };
      } else {
        return {
          success: true,
          message: `✅ Gemini AI responde pero con formato inesperado (${responseTime}ms): ${text.substring(0, 100)}...`,
          responseTime
        };
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `❌ Error de conexión (${responseTime}ms): ${errorMessage}`,
        responseTime
      };
    }
  }

  // Method to get personalized recommendations for specific KPIs
  async getKPIRecommendations(kpi: KPIResult): Promise<string[]> {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY === 'demo-key') {
      return this.getMockRecommendations(kpi);
    }

    try {
      const prompt = `
Como experto en RRHH, proporciona 3 recomendaciones específicas para mejorar este KPI:

KPI: ${kpi.name}
Valor actual: ${kpi.value}
${kpi.previous_value ? `Valor anterior: ${kpi.previous_value} (cambio: ${kpi.variance_percentage?.toFixed(1)}%)` : ''}
${kpi.target ? `Meta: ${kpi.target}` : ''}

Responde con una lista de 3 recomendaciones específicas y accionables.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const recommendations = response.text().split('\n').filter(line => line.trim().length > 0);
      
      return recommendations.slice(0, 3);
    } catch (error) {
      console.error('Error getting KPI recommendations:', error);
      return this.getMockRecommendations(kpi);
    }
  }

  private getMockRecommendations(kpi: KPIResult): string[] {
    const recommendations: { [key: string]: string[] } = {
      'Activos': [
        'Revisar planes de contratación y crecimiento del equipo',
        'Optimizar procesos de onboarding para nuevos empleados',
        'Evaluar la carga de trabajo actual vs capacidad del equipo'
      ],
      'Bajas': [
        'Implementar programa de retención de talento',
        'Realizar entrevistas de salida para identificar patrones',
        'Mejorar beneficios y ambiente laboral'
      ],
      'Rotación Mensual': [
        'Analizar causas de rotación por departamento',
        'Implementar plan de carrera y desarrollo profesional',
        'Mejorar proceso de selección para mejor fit cultural'
      ],
      'Incidencias': [
        'Establecer protocolo de seguimiento de incidencias',
        'Implementar capacitación preventiva',
        'Crear sistema de alertas tempranas'
      ],
      'default': [
        'Establecer metas específicas y medibles para este KPI',
        'Implementar seguimiento regular y reportes',
        'Crear plan de acción basado en análisis de tendencias'
      ]
    };

    return recommendations[kpi.name] || recommendations['default'];
  }
}

export async function summarizeAbandonos(descriptions: string[]): Promise<string[]> {
  if (!descriptions.length) return ['No hay descripciones para resumir en este mes.'];

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const prompt = `
Eres analista de RRHH. Lee las descripciones de bajas con motivos "otro/abandono/sin información".
Devuelve EXACTAMENTE 3 bullets concisos con patrones/causas (no repitas texto literal).
Solo bullets, sin numeración ni texto extra.

Descripciones:
${descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}
`;

  try {
    if (!apiKey || apiKey === "demo-key" || apiKey === "your_gemini_api_key_here") {
      return ['Configura NEXT_PUBLIC_GEMINI_API_KEY para generar el resumen con LLM.'];
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Preferir la ruta completa para evitar 404 en v1beta
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    // Timeout de cortesía para evitar que el UI quede colgado si la API tarda demasiado
    const timeoutMs = 25000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout al generar el resumen con Gemini (${timeoutMs}ms)`)), timeoutMs)
    );

    const response = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]);
    const text = response.response?.text() || "";
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^[\-\*\d\.\)\s]+/, "").trim())
      .filter((l) => l.length > 0)
      .slice(0, 3);
    return lines.length ? lines : ['Sin respuesta del modelo.'];
  } catch (err) {
    console.error("Error en summarizeAbandonos:", err);
    return ['Error al generar el resumen con LLM.'];
  }
}

// Export singleton instance
export const geminiAI = new GeminiAIService();
