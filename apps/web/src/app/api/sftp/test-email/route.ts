import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { sendTestEmail, isEmailConfigured } from '@/lib/email-notifier';

/**
 * POST /api/sftp/test-email
 *
 * Envía un email de prueba para verificar la configuración SMTP.
 * Solo accesible para admins.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  // Verificar configuración
  if (!isEmailConfigured()) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: 'Email no configurado. Verifica las variables SMTP_HOST, SMTP_USER, SMTP_PASS en .env.local',
      env: {
        SMTP_HOST: process.env.SMTP_HOST ? '✅ Configurado' : '❌ No configurado',
        SMTP_USER: process.env.SMTP_USER ? '✅ Configurado' : '❌ No configurado',
        SMTP_PASS: process.env.SMTP_PASS ? '✅ Configurado' : '❌ No configurado',
        SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || 'No configurado',
      }
    }, { status: 400 });
  }

  // Enviar email de prueba
  const result = await sendTestEmail();

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Email de prueba enviado correctamente',
      sentTo: process.env.NOTIFICATION_EMAILS || process.env.SMTP_USER,
    });
  }

  return NextResponse.json({
    success: false,
    configured: true,
    error: result.error,
  }, { status: 500 });
}

/**
 * GET /api/sftp/test-email
 *
 * Verifica el estado de la configuración de email sin enviar.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  return NextResponse.json({
    configured: isEmailConfigured(),
    env: {
      SMTP_HOST: process.env.SMTP_HOST ? '✅ Configurado' : '❌ No configurado',
      SMTP_PORT: process.env.SMTP_PORT || '587 (default)',
      SMTP_USER: process.env.SMTP_USER ? '✅ Configurado' : '❌ No configurado',
      SMTP_PASS: process.env.SMTP_PASS ? '✅ Configurado' : '❌ No configurado',
      SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || 'No configurado',
      NOTIFICATION_EMAILS: process.env.NOTIFICATION_EMAILS || process.env.SMTP_USER || 'No configurado (usará SMTP_USER)',
    }
  });
}
