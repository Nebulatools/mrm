import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

async function proxyMlService(path: string, init?: RequestInit) {
  if (!ML_SERVICE_URL) {
    return NextResponse.json(
      { success: false, error: 'ML_SERVICE_URL no está configurada en el entorno' },
      { status: 500 }
    );
  }

  const response = await fetch(`${ML_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  return proxyMlService('/models', { method: 'GET' });
}
