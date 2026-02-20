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
      { success: false, error: 'ML_SERVICE_URL no está configurada' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/models/${context.params.modelId}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data?.detail === 'string' ? data.detail : 'Error al generar predicciones';
      return NextResponse.json({ success: false, error: message }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { success: false, error: 'Error de conexión con el servicio ML' },
      { status: 500 }
    );
  }
}
