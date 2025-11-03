import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export async function POST(request: NextRequest, context: { params: { modelId: string } }) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  if (!ML_SERVICE_URL) {
    return NextResponse.json(
      { success: false, error: 'ML_SERVICE_URL no está configurada en el entorno' },
      { status: 500 }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const response = await fetch(`${ML_SERVICE_URL}/models/${context.params.modelId}/train`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
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
        : 'Error al entrenar el modelo';
    return NextResponse.json({ success: false, error: message }, { status: response.status });
  }

  const successPayload = typeof data === 'object' && data !== null ? data : { data };
  return NextResponse.json(successPayload, { status: response.status });
}
