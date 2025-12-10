import { NextResponse } from "next/server";

type NarrativeLevel = "manager" | "analyst";

const cache = new Map<
  string,
  { text: string; timestamp: number }
>();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

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

    const levelGuidance: Record<NarrativeLevel, string> = {
      manager:
        "Formato: 2 frases claras (≤45 palabras). Titular + conclusión ejecutiva. Enfoque en impacto negocio/people. Evita porcentajes complejos; usa +/- y palabras como 'estable' o 'creciendo'. Emojis opcionales (máx 1).",
      analyst:
        "Formato: 3-5 bullets técnicos (≤120 palabras). Incluye variaciones %, anomalías y correlaciones. Sé específico en métricas y áreas. Sin adornos.",
    };

    const prompt = `
Contexto (JSON filtrado actual): ${serializedContext}
Sección: ${section}
Audiencia objetivo: ${userLevel}

Sigue SOLO las instrucciones de esta audiencia. No describas otros niveles ni añadas títulos de otros roles.
${levelGuidance[userLevel as NarrativeLevel]}

Reglas generales:
- Español de negocio (México). No menciones "JSON".
- Solo menciona áreas/deptos/turnos si están presentes en los datos.
- Si falta dato, dilo brevemente. No inventes métricas.
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
          { role: "system", content: "Eres un analista senior de RRHH." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 320,
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
