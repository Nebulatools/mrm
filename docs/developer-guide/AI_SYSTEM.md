# Sistema de AI - Documentación Completa

> **Última actualización:** Enero 2026
> **Propósito:** Permitir debugging y modificación de prompts del sistema de AI

---

## 1. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAPAS DE AI DEL SISTEMA                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CAPA 1: AIAnalyzer (Local)          CAPA 2: GeminiAIService (Cloud)   │
│  ├─ Reglas de negocio hardcoded      ├─ Google Gemini 2.5-Flash        │
│  ├─ Análisis síncrono                ├─ OpenAI gpt-4o-mini             │
│  └─ Sin llamadas externas            └─ Cache 10 min                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dos sistemas de AI paralelos:

| Sistema | Archivo | Propósito | Requiere API Key |
|---------|---------|-----------|------------------|
| **GeminiAIService** | `gemini-ai.ts` | Análisis estructurado, resumen abandonos | Sí (Gemini) |
| **AIAnalyzer** | `ai-analyzer.ts` | Reglas hardcoded, detección local | No |
| **Narrative API** | `api/narrative/route.ts` | Narrativas contextuales | Sí (OpenAI) |

---

## 2. ARCHIVOS CLAVE Y UBICACIONES

| Archivo | Propósito | Líneas Totales |
|---------|-----------|----------------|
| `apps/web/src/lib/gemini-ai.ts` | Servicio principal AI (Gemini + OpenAI) | 601 |
| `apps/web/src/lib/ai-analyzer.ts` | Análisis local con reglas | 251 |
| `apps/web/src/app/api/narrative/route.ts` | Endpoint OpenAI para narrativas | 123 |
| `apps/web/src/components/smart-narrative.tsx` | UI de narrativas | ~164 |
| `apps/web/src/components/ai-insights.tsx` | UI de insights AI | ~379 |

---

## 3. CONFIGURACIÓN DE MODELOS

### 3.1 Google Gemini (`gemini-ai.ts`)

**Ubicación:** `apps/web/src/lib/gemini-ai.ts` líneas 37-45

```typescript
model: 'models/gemini-2.5-flash'

generationConfig: {
  temperature: 0.7,      // Creatividad moderada
  topK: 40,              // Top-K sampling
  topP: 0.95,            // Nucleus sampling
  maxOutputTokens: 2048  // Máximo de tokens de salida
}
```

### 3.2 OpenAI (`api/narrative/route.ts`)

**Ubicación:** `apps/web/src/app/api/narrative/route.ts` líneas 84-91

```typescript
model: "gpt-4o-mini"
temperature: 0.7
max_tokens: 320
```

### 3.3 Variables de Entorno Requeridas

```bash
# Para Gemini (análisis de KPIs y resumen de abandonos)
NEXT_PUBLIC_GEMINI_API_KEY=AIza...

# Para OpenAI (narrativas contextuales)
OPENAI_API_KEY=sk-...
```

---

## 4. PROMPTS LITERALES

### 4.1 PROMPT: Análisis de KPIs (Gemini)

**Ubicación:** `apps/web/src/lib/gemini-ai.ts` líneas 181-231
**Método:** `createAnalysisPrompt(kpis, period)`

```
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
```

---

### 4.2 PROMPT: Narrativas (OpenAI)

**Ubicación:** `apps/web/src/app/api/narrative/route.ts` líneas 52-71

**System prompt (línea 86):**
```
Eres un analista senior de RRHH.
```

**User prompt (dinámico, líneas 59-71):**
```
Contexto (JSON filtrado actual): ${serializedContext}
Sección: ${section}
Audiencia objetivo: ${userLevel}

Sigue SOLO las instrucciones de esta audiencia. No describas otros niveles ni añadas títulos de otros roles.
${levelGuidance[userLevel]}

Reglas generales:
- Español de negocio (México). No menciones "JSON".
- Solo menciona áreas/deptos/turnos si están presentes en los datos.
- Si falta dato, dilo brevemente. No inventes métricas.
```

**Instrucciones por nivel (`levelGuidance`, líneas 52-57):**

| Nivel | Instrucciones |
|-------|---------------|
| **manager** | `"Formato: 2 frases claras (≤45 palabras). Titular + conclusión ejecutiva. Enfoque en impacto negocio/people. Evita porcentajes complejos; usa +/- y palabras como 'estable' o 'creciendo'. Emojis opcionales (máx 1)."` |
| **analyst** | `"Formato: 3-5 bullets técnicos (≤120 palabras). Incluye variaciones %, anomalías y correlaciones. Sé específico en métricas y áreas. Sin adornos."` |

---

### 4.3 PROMPT: Análisis de Gráficas (Gemini)

**Ubicación:** `apps/web/src/lib/gemini-ai.ts` líneas 415-430
**Método:** `analyzeChartTrends(kpis, chartType)`

```
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
```

---

### 4.4 PROMPT: Resumen de Abandonos (Gemini)

**Ubicación:** `apps/web/src/lib/gemini-ai.ts` líneas 558-565
**Función:** `summarizeAbandonos(descriptions)`

```
Eres analista de RRHH. Lee las descripciones de bajas con motivos "otro/abandono/sin información".
Devuelve EXACTAMENTE 3 bullets concisos con patrones/causas (no repitas texto literal).
Solo bullets, sin numeración ni texto extra.

Descripciones:
${descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}
```

---

### 4.5 PROMPT: Recomendaciones por KPI (Gemini)

**Ubicación:** `apps/web/src/lib/gemini-ai.ts` líneas 499-508
**Método:** `getKPIRecommendations(kpi)`

```
Como experto en RRHH, proporciona 3 recomendaciones específicas para mejorar este KPI:

KPI: ${kpi.name}
Valor actual: ${kpi.value}
${kpi.previous_value ? `Valor anterior: ${kpi.previous_value} (cambio: ${kpi.variance_percentage?.toFixed(1)}%)` : ''}
${kpi.target ? `Meta: ${kpi.target}` : ''}

Responde con una lista de 3 recomendaciones específicas y accionables.
```

---

## 5. UMBRALES Y REGLAS DE NEGOCIO

### 5.1 Umbrales de Detección (`ai-analyzer.ts`)

**Ubicación:** `apps/web/src/lib/ai-analyzer.ts`

| Umbral | Valor | Línea | Uso |
|--------|-------|-------|-----|
| Tendencia significativa | `>15%` varianza | 28 | Genera insight tipo 'trend' |
| Anomalía | `>25%` varianza | 30 | Genera insight tipo 'anomaly' con impact 'high' |
| Rotación alta | `>15%` valor | 59 | Genera alerta de alta rotación |
| Rotación saludable | `<10%` valor | 64 | Umbral de referencia |
| Incidencias alta | `>8%` valor | 79 | Genera alerta de alto índice |
| Inc/empleado excelente | `<0.5` valor | 134 | Genera recomendación positiva |
| Mínimo para forecast | `>5%` varianza | 161 | Requiere varianza mínima |

### 5.2 Cálculo de Confidence Score

```typescript
// Para trends/anomalies (línea 37)
confidence_score = Math.min(0.9, Math.abs(variance) / 30)

// Para forecasts (línea 170)
confidence_score = Math.max(0.4, Math.min(0.8, Math.abs(variance_percentage) / 20))

// Para anomalías hardcodeadas
confidence_score = 0.85  // rotación alta (línea 65)
confidence_score = 0.80  // incidencias altas (línea 85)
```

### 5.3 Mensajes Generados por AIAnalyzer

**Alta Rotación (líneas 63-75):**
```
Título: "Alta rotación de personal detectada"
Descripción: "La rotación mensual de ${value}% supera significativamente el umbral saludable del 10%."
Action Items:
- 'Realizar encuestas de satisfacción laboral'
- 'Revisar políticas de compensación y beneficios'
- 'Implementar programas de retención de talento'
- 'Analizar las causas principales de las renuncias'
```

**Alto Índice de Incidencias (líneas 83-95):**
```
Título: "Alto índice de incidencias"
Descripción: "El porcentaje de incidencias de ${value}% indica posibles problemas operacionales."
Action Items:
- 'Investigar las causas raíz de las incidencias más frecuentes'
- 'Implementar programas de prevención'
- 'Mejorar los procesos de capacitación'
- 'Establecer protocolos de seguimiento más estrictos'
```

---

## 6. INTERFACES TYPESCRIPT

### 6.1 AIAnalysis (`gemini-ai.ts`, líneas 14-24)

```typescript
export interface AIAnalysis {
  summary: string;                    // Análisis ejecutivo 2-3 oraciones
  insights: AIInsight[];              // Array de insights
  overallScore: number;               // 0-100
  trends: {
    improving: string[];              // KPIs mejorando
    declining: string[];              // KPIs empeorando
    stable: string[];                 // KPIs estables
  };
  recommendations: string[];          // 4-6 recomendaciones estratégicas
}
```

### 6.2 AIInsight de Gemini (`gemini-ai.ts`, líneas 6-12)

```typescript
export interface AIInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  kpi: string;
  insight: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}
```

### 6.3 AIInsight de AIAnalyzer (`ai-analyzer.ts`, líneas 3-13)

```typescript
export interface AIInsight {
  id: string;                         // ID único (9 chars)
  type: 'trend' | 'anomaly' | 'recommendation' | 'forecast';
  title: string;
  description: string;
  confidence_score: number;           // 0-1
  impact: 'high' | 'medium' | 'low';
  related_kpis: string[];
  action_items?: string[];
  created_at: string;                 // ISO timestamp
}
```

### 6.4 NarrativeLevel

```typescript
// gemini-ai.ts línea 4
export type NarrativeLevel = 'manager' | 'analyst';

// api/narrative/route.ts línea 3
type NarrativeLevel = "manager" | "analyst";
```

---

## 7. FLUJO DE DATOS COMPLETO

### 7.1 Flujo: SmartNarrative (OpenAI)

```
Usuario clickea "Generar"
         │
         ▼
SmartNarrative.handleGenerate()
         │
         ├─ data = narrativePayload (de dashboard-page.tsx)
         ├─ level = "manager" | "analyst"
         └─ section = "overview" | "headcount" | "incidents" | "retention"
         │
         ▼
geminiAI.generateNarrative(data, level, section)
         │
         ▼
POST /api/narrative
         │
         ├─ body: { contextData, userLevel, section, serializedContext }
         │
         ▼
OpenAI gpt-4o-mini
         │
         ├─ system: "Eres un analista senior de RRHH."
         └─ user: prompt dinámico con levelGuidance
         │
         ▼
Response: { text: string, cached: boolean }
         │
         ▼
UI renderiza narrativa
```

### 7.2 Flujo: AIInsights (Gemini)

```
ai-insights.tsx useEffect
         │
         ├─ kpis = KPIResult[] (del dashboard)
         └─ period = "monthly"
         │
         ▼
geminiAI.analyzeKPIs(kpis, period)
         │
         ├─ Verifica cache (10 min TTL)
         ├─ Verifica API key
         │
         ▼
createAnalysisPrompt(kpis, period)
         │
         ▼
Gemini API (gemini-2.5-flash)
         │
         ▼
parseAIResponse(responseText)
         │
         ├─ Limpia markdown (```json, ```)
         ├─ Extrae JSON entre { }
         └─ Valida estructura
         │
         ▼
AIAnalysis {
  summary, overallScore, insights[], trends, recommendations
}
         │
         ▼
UI renderiza análisis completo
```

### 7.3 Estructura de narrativePayload

```typescript
narrativePayload = {
  periodLabel: string,           // "Mes de Enero 2025"
  filtersSummary: string,        // "Sin filtros aplicados"
  filtersCount: number,
  section: string,

  kpis: {
    activosPromedio: number,
    activosPromedioAnterior: number,
    activosPromedioVariacion: number,
    rotacionMensual: number,
    rotacionMensualAnterior: number,
    rotacionMensualVariacion: number,
    // ... más KPIs de retención
    bajasTotalesMes: number,
    bajasTotalesMesAnterior: number,
  },

  headcount: {
    activosFinMes: number,
    activosFinMesPrev: number,
    ingresosMes: number,
    ingresosMesPrev: number,
    antigPromMesesActual: number,
    antigPromMesesPrev: number,
  },

  dataSources: {
    empleados_sftp: { rows, fields },
    motivos_baja: { rows, fields },
    incidencias: { rows, fields },
    asistencia_diaria: { fields },
  },
}
```

---

## 8. SISTEMA DE CACHE

### 8.1 Cache de Gemini (`gemini-ai.ts`, líneas 29-30)

```typescript
private cache = new Map<string, { data: AIAnalysis; timestamp: number }>();
private readonly CACHE_TTL = 10 * 60 * 1000;  // 10 minutos

// Clave de cache (línea 51)
const cacheKey = `analysis-${period}-${JSON.stringify(kpis.map(k => k.value))}`;
```

### 8.2 Cache de Narrativas (`api/narrative/route.ts`, líneas 5-9)

```typescript
const cache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;  // 10 minutos

// Clave de cache (línea 38)
const cacheKey = `${section}-${userLevel}-${serializedContext}`;
```

---

## 9. MANEJO DE ERRORES Y FALLBACKS

### 9.1 Fallback Mock Analysis (`gemini-ai.ts`, líneas 330-395)

Cuando no hay API key o falla la llamada, se genera análisis local:

```typescript
generateMockAnalysis(kpis, period): AIAnalysis {
  // Analiza varianzas > 10% como positive, < -10% como negative
  // Score = 75 + (positivos × 10) - (negativos × 15)
  // Clamp entre 20 y 95
}
```

### 9.2 Recomendaciones Mock por KPI (líneas 522-551)

```typescript
const mockRecommendations = {
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
}
```

---

## 10. GUÍA DE DEBUGGING

### 10.1 Para modificar prompts de Gemini

**Archivo:** `apps/web/src/lib/gemini-ai.ts`

| Método | Línea | Propósito |
|--------|-------|-----------|
| `createAnalysisPrompt()` | 164-231 | Prompt principal de análisis |
| `analyzeChartTrends()` | 415-430 | Análisis de gráficas |
| `getKPIRecommendations()` | 499-508 | Recomendaciones por KPI |
| `summarizeAbandonos()` | 558-565 | Resumen de abandonos |

### 10.2 Para modificar prompts de OpenAI

**Archivo:** `apps/web/src/app/api/narrative/route.ts`

| Elemento | Línea | Propósito |
|----------|-------|-----------|
| System prompt | 86 | Role del asistente |
| levelGuidance | 52-57 | Instrucciones por nivel |
| Prompt dinámico | 59-71 | Template completo |

### 10.3 Para modificar umbrales

**Archivo:** `apps/web/src/lib/ai-analyzer.ts`

| Umbral | Búsqueda en código | Línea |
|--------|-------------------|-------|
| Varianza trend | `Math.abs(variance) > 15` | 28 |
| Varianza anomaly | `Math.abs(variance) > 25` | 30 |
| Rotación alta | `rotacionKPI.value > 15` | 59 |
| Incidencias altas | `incidenciasKPI.value > 8` | 79 |
| Inc/empleado excelente | `incPromKPI.value < 0.5` | 134 |

### 10.4 Console logs útiles para debugging

**En `gemini-ai.ts`:**
```typescript
// Línea 72 - Ver prompt enviado
console.log('📝 Prompt generado:', prompt.substring(0, 300) + '...');

// Línea 89 - Ver respuesta raw
console.log('📦 Respuesta de IA recibida:', analysisText.length, 'caracteres');

// Línea 236 - Ver respuesta completa
console.log('🤖 Raw Gemini response:', response.substring(0, 200) + '...');

// Línea 252 - Ver JSON limpio
console.log('🧹 Cleaned response for parsing:', cleanResponse.substring(0, 200) + '...');
```

**En `api/narrative/route.ts`:**
```typescript
// Agregar después de línea 13 para ver request
console.log('Request body:', body);

// Agregar después de línea 38 para ver cache key
console.log('Cache key:', cacheKey);

// Agregar después de línea 104 para ver respuesta
console.log('OpenAI response:', data);
```

### 10.5 Verificar configuración de API keys

```bash
# Verificar en .env.local
cat apps/web/.env.local | grep -E "(GEMINI|OPENAI)"

# Esperado:
# NEXT_PUBLIC_GEMINI_API_KEY=AIza...
# OPENAI_API_KEY=sk-...
```

### 10.6 Test de conexión Gemini

El servicio incluye método de prueba (`gemini-ai.ts` líneas 446-490):

```typescript
const result = await geminiAI.testConnection();
// { success: boolean, message: string, responseTime?: number }
```

---

## 11. CHECKLIST DE MODIFICACIONES

### Para cambiar el tono de las narrativas:
1. Editar `levelGuidance` en `api/narrative/route.ts` líneas 52-57
2. Ajustar `max_tokens` en línea 90 si necesitas respuestas más largas

### Para cambiar umbrales de detección:
1. Modificar valores en `ai-analyzer.ts` líneas 28, 30, 59, 79, 134
2. Considerar ajustar `confidence_score` correspondiente

### Para cambiar el formato de salida de Gemini:
1. Modificar estructura JSON en prompt (`gemini-ai.ts` líneas 199-222)
2. Actualizar `parseAIResponse()` (líneas 234-327) para manejar nueva estructura
3. Actualizar interface `AIAnalysis` si cambian los campos

### Para agregar nuevo tipo de análisis:
1. Agregar método en `GeminiAIService` o `AIAnalyzer`
2. Crear prompt específico siguiendo patrón existente
3. Manejar fallback/mock para cuando no hay API key
4. Integrar en componente UI correspondiente

---

## 12. TROUBLESHOOTING COMÚN

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| "API key no configurada" | Variable de entorno vacía | Verificar `.env.local` |
| "Timeout de Gemini" | API lenta o red | Aumentar timeout (línea 76) |
| "Error parsing AI response" | Respuesta no es JSON válido | Revisar prompt para asegurar JSON |
| "Respuesta vacía de OpenAI" | Token limit muy bajo | Aumentar `max_tokens` |
| Cache no funciona | Keys diferentes | Verificar construcción de `cacheKey` |
| Insights no aparecen | Varianzas bajas | Reducir umbrales de detección |
