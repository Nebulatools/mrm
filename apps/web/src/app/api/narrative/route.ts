import { NextResponse } from "next/server";

type NarrativeLevel = "manager" | "analyst";
type NarrativeSection = "overview" | "incidents" | "retention" | "personal";

const cache = new Map<
  string,
  { text: string; timestamp: number }
>();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

// Diccionario de métricas para que la IA entienda cada campo
const METRICS_DICTIONARY = `
DICCIONARIO DE MÉTRICAS:
- rotacionMensual: % de rotación total del mes (bajas/activos promedio × 100)
- rotacionMensualVoluntaria: Solo renuncias voluntarias (el empleado decidió irse)
- rotacionMensualClaves: Solo despidos/término contrato (involuntaria, la empresa decidió)
- rotacionAcumulada: Rotación rolling de los últimos 12 meses
- rotacionAnioActual: Rotación acumulada del año (YTD - Year To Date)
- activosPromedio: Promedio de empleados activos (inicio+fin período / 2)
- bajasVoluntarias/Involuntarias: Cantidad de bajas del mes por tipo
- ingresosMes: Nuevas contrataciones del mes
- antigPromMesesActual: Antigüedad promedio en meses de empleados activos
- *Anterior: Valor del período previo para comparación
- *Variacion: Cambio porcentual vs período anterior (positivo = aumentó, negativo = disminuyó)
`;

// Instrucciones específicas por sección
const SECTION_FOCUS: Record<NarrativeSection, string> = {
  retention: `
ENFOQUE: Analiza ROTACIÓN, BAJAS y RETENCIÓN.
- Prioriza: rotacionMensual, bajasVoluntarias vs bajasInvoluntarias, rotacionAcumulada, antigüedad
- Compara voluntaria vs involuntaria: ¿cuál domina? ¿hay tendencia?
- Si rotación alta: menciona impacto operativo. Si baja: destaca estabilidad.
- Antigüedad promedio indica experiencia del equipo (alta = expertise, baja = equipo nuevo)`,

  incidents: `
ENFOQUE: Analiza INCIDENCIAS, FALTAS, PERMISOS y AUSENTISMO.
- Prioriza: incidencias totales, faltas %, permisos %, vacaciones, salud (incapacidades)
- Identifica patrones: ¿hay picos de ausentismo? ¿días específicos?
- Impacto en productividad: más incidencias = menos capacidad operativa`,

  overview: `
ENFOQUE: PANORAMA BALANCEADO de todos los indicadores clave.
- Da una visión ejecutiva que combine rotación + incidencias + headcount
- Destaca lo más relevante del período (positivo y negativo)
- Una sola narrativa coherente, no listas de métricas`,

  personal: `
ENFOQUE: Analiza DEMOGRAFÍA, COMPOSICIÓN y DISTRIBUCIÓN del equipo.
- Prioriza: headcount activo, distribución por área/depto, antigüedad, ingresos del mes
- Compara crecimiento/contracción del equipo vs período anterior
- Si hay concentración en áreas específicas, menciónalo`,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contextData, userLevel, section } = body ?? {};

    if (!contextData || !userLevel || !section) {
      return NextResponse.json(
        { error: "Faltan contextData, userLevel o section" },
        { status: 400 }
      );
    }

    if (!["manager", "analyst"].includes(userLevel)) {
      return NextResponse.json(
        { error: "userLevel inválido" },
        { status: 400 }
      );
    }

    const serializedContext = (() => {
      try {
        return JSON.stringify(contextData);
      } catch {
        return "{}";
      }
    })();

    const cacheKey = `${section}-${userLevel}-${serializedContext}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ text: cached.text, cached: true });
    }

    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openAIKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY no configurada en el servidor." },
        { status: 500 }
      );
    }

    // Extraer contexto de filtros del payload
    const filtrosActivos = contextData.filtrosActivos || {};
    const poblacionFiltrada = filtrosActivos.poblacionFiltrada ?? "N/A";
    const poblacionTotal = filtrosActivos.poblacionTotal ?? "N/A";
    const periodLabel = contextData.periodLabel ?? "período desconocido";
    const filtersCount = contextData.filtersCount ?? 0;

    // Construir descripción de filtros activos
    const filtrosDescripcion = (() => {
      const partes: string[] = [];
      if (filtrosActivos.empresas?.length > 0) partes.push(`Negocio: ${filtrosActivos.empresas.join(", ")}`);
      if (filtrosActivos.areas?.length > 0) partes.push(`Área: ${filtrosActivos.areas.join(", ")}`);
      if (filtrosActivos.departamentos?.length > 0) partes.push(`Depto: ${filtrosActivos.departamentos.join(", ")}`);
      if (filtrosActivos.puestos?.length > 0) partes.push(`Puesto: ${filtrosActivos.puestos.join(", ")}`);
      if (filtrosActivos.clasificaciones?.length > 0) partes.push(`Clasificación: ${filtrosActivos.clasificaciones.join(", ")}`);
      if (filtrosActivos.ubicaciones?.length > 0) partes.push(`Ubicación: ${filtrosActivos.ubicaciones.join(", ")}`);
      return partes.length > 0 ? partes.join(" | ") : "Sin filtros de estructura (vista general)";
    })();

    const levelGuidance: Record<NarrativeLevel, string> = {
      manager:
        "Formato: 3-4 frases claras (≤80 palabras). Titular impactante + contexto del período + conclusión + recomendación clave. Enfoque en impacto negocio/people. Usa términos como 'estable', 'creciendo', 'alerta'. Emojis opcionales (máx 1).",
      analyst:
        "Formato: 5-8 bullets técnicos (≤200 palabras). Incluye variaciones %, anomalías y correlaciones. Sé específico en métricas, compara con período anterior. Identifica tendencias y causas probables. Sin adornos.",
    };

    const sectionFocus = SECTION_FOCUS[section as NarrativeSection] || SECTION_FOCUS.overview;

    const prompt = `
=== CONTEXTO DE FILTROS ACTIVOS ===
Período: ${periodLabel} (comparado con el mes anterior)
Filtros aplicados (${filtersCount}): ${filtrosDescripcion}
Población analizada: ${poblacionFiltrada} empleados (de ${poblacionTotal} totales)

${filtersCount > 0 ? "→ IMPORTANTE: Inicia tu análisis mencionando el segmento filtrado. Ej: 'Para el departamento X...' o 'En el área de Y...'" : "→ Vista general de toda la organización."}

${METRICS_DICTIONARY}

${sectionFocus}

=== DATOS DEL PERÍODO ===
${serializedContext}

=== INSTRUCCIONES DE FORMATO ===
Audiencia: ${userLevel === "manager" ? "EJECUTIVO (gerente, director)" : "ANALISTA (técnico RRHH)"}
${levelGuidance[userLevel as NarrativeLevel]}

=== REGLAS ===
- Español de negocio (México). No menciones "JSON" ni nombres de campos técnicos.
- Solo menciona áreas/deptos/turnos si están en los filtros o datos.
- Si falta un dato clave, indícalo brevemente. Nunca inventes métricas.
- Los números deben coincidir con los datos proporcionados.
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un analista senior de RRHH con experiencia en dashboards ejecutivos. Generas narrativas claras, precisas y accionables basadas en datos de rotación, incidencias y headcount." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `OpenAI error ${response.status}: ${errorBody}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Respuesta vacía de OpenAI al generar narrativa." },
        { status: 500 }
      );
    }

    cache.set(cacheKey, { text, timestamp: Date.now() });
    return NextResponse.json({ text, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Error interno: ${message}` },
      { status: 500 }
    );
  }
}
