import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export async function GET(request: NextRequest, context: { params: { modelId: string } }) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  if (!ML_SERVICE_URL) {
    return NextResponse.json(
      { success: false, error: 'ML_SERVICE_URL no está configurada' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/models/${context.params.modelId}/analysis`, {
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
          : 'Error al obtener análisis del modelo';
      return NextResponse.json({ success: false, error: message }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching model analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Error de conexión con el servicio ML' },
      { status: 500 }
    );
  }
}
