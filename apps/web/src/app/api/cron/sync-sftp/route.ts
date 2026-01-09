import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron Job Endpoint - Sincronización Automática SFTP
 *
 * Se ejecuta automáticamente cada lunes a las 2:00 AM (configurado en vercel.json)
 * Llama al endpoint de importación con autenticación de servicio
 */

export async function GET(request: NextRequest) {
  // Verificar que la request viene de Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.CRON_SYNC_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🕐 Cron job triggered: Sincronización automática SFTP');

  try {
    // Construir URL completa para el endpoint de importación
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const importUrl = `${protocol}://${host}/api/import-sftp-real-data?trigger=cron`;

    console.log(`📡 Llamando a: ${importUrl}`);

    // Llamar al endpoint de importación
    const response = await fetch(importUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { 'x-cron-secret': cronSecret } : {})
      }
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Sincronización automática completada');
      console.log('📊 Resultados:', result.results || result.data);

      return NextResponse.json({
        success: true,
        message: 'Sincronización automática completada',
        timestamp: new Date().toISOString(),
        results: result.results || result.data,
        schedule: result.schedule
      });
    } else {
      console.error('❌ Error en sincronización:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error crítico en cron job:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// También permitir POST para testing manual
export async function POST(request: NextRequest) {
  return GET(request);
}
