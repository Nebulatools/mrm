import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

type TrendsCacheEntry = {
  data: unknown;
  timestamp: number;
};

// Cache en memoria para usar snapshots recientes y evitar golpear el servicio ML en cada visita
const trendsCache = new Map<string, TrendsCacheEntry>();
const TRENDS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

export async function GET(request: NextRequest, context: { params: { modelId: string } }) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const modelId = context.params.modelId;
  const cacheKey = modelId;
  const cached = trendsCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < TRENDS_CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { status: 200 });
  }

  if (!ML_SERVICE_URL) {
    if (cached) {
      return NextResponse.json(
        { ...(cached.data as object), stale: true, note: 'Usando snapshot en caché. ML_SERVICE_URL no configurada.' },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'ML_SERVICE_URL no está configurada' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/models/${modelId}/trends`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const rawBody = await response.text();
    let data: unknown = {};

    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as unknown;
      } catch {
        data = { detail: rawBody };
      }
    }

    if (!response.ok) {
      const candidate =
        typeof data === 'object' && data !== null
          ? (data as Record<string, unknown>).error ?? (data as Record<string, unknown>).detail
          : undefined;
      const message =
        typeof candidate === 'string' && candidate.trim().length > 0
          ? candidate
          : 'Error al obtener tendencias del modelo';

      if (cached) {
        console.warn('[ml-trends] Error remoto, devolviendo snapshot en caché:', message);
        return NextResponse.json(
          { ...(cached.data as object), stale: true, note: 'Usando snapshot en caché por error remoto.' },
          { status: 200 }
        );
      }

      return NextResponse.json({ success: false, error: message }, { status: response.status });
    }

    if (process.env.NODE_ENV !== 'production') {
      try {
        const monthly = Array.isArray((data as Record<string, any>)?.monthly)
          ? (data as Record<string, any>).monthly.map((item: Record<string, any>) => item?.month)
          : [];
        console.log('[ml-trends]', modelId, 'months:', monthly);
      } catch {
        // ignore logging errors
      }
    }

    trendsCache.set(cacheKey, { data, timestamp: now });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching model trends:', error);

    if (cached) {
      console.warn('[ml-trends] Error de conexión, devolviendo snapshot en caché.');
      return NextResponse.json(
        { ...(cached.data as object), stale: true, note: 'Usando snapshot en caché por error de conexión con el servicio ML.' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error de conexión con el servicio ML' },
      { status: 500 }
    );
  }
}
