import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ modelId: string }> }
) {
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
  }

  const params = await context.params;
  const response = await fetch(`${ML_SERVICE_URL}/models/${params.modelId}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
