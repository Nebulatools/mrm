/**
 * Email Notifier Service
 *
 * Servicio de notificaciones por email para el sistema SFTP.
 * Notifica sobre importaciones pendientes, completadas, errores, etc.
 */

import nodemailer from 'nodemailer';

// Configuración del transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

// Destinatarios de notificaciones (se puede extender a múltiples)
const getNotificationRecipients = (): string[] => {
  const recipients = process.env.NOTIFICATION_EMAILS || process.env.SMTP_USER || '';
  return recipients.split(',').map(email => email.trim()).filter(Boolean);
};

export interface ImportSummary {
  empleados: number;
  bajas: number;
  incidencias: number | null;
  permisos?: number | null;
  errors: string[];
}

export interface StructureChange {
  filename: string;
  added: string[];
  removed: string[];
}

export interface RecordDiffSummary {
  table: string;
  inserts: number;
  updates: number;
  deletes: number;
  unchanged: number;
}

/**
 * Verifica si el servicio de email está configurado
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Notifica cuando se detectan cambios estructurales que requieren aprobación
 */
export async function notifyStructureChangesDetected(
  logId: number,
  changes: StructureChange[],
  adminUrl?: string
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('📧 Email no configurado - saltando notificación de cambios estructurales');
    return false;
  }

  const recipients = getNotificationRecipients();
  if (recipients.length === 0) {
    console.log('📧 No hay destinatarios configurados');
    return false;
  }

  const changesHtml = changes.map(change => `
    <div style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
      <strong>📄 ${change.filename}</strong>
      ${change.added.length > 0 ? `
        <div style="color: #28a745; margin-top: 5px;">
          <strong>+ Columnas agregadas:</strong> ${change.added.join(', ')}
        </div>
      ` : ''}
      ${change.removed.length > 0 ? `
        <div style="color: #dc3545; margin-top: 5px;">
          <strong>- Columnas eliminadas:</strong> ${change.removed.join(', ')}
        </div>
      ` : ''}
    </div>
  `).join('');

  const approveUrl = adminUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #ffc107; color: #000; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">⚠️ Aprobación Requerida</h1>
      </div>

      <div style="padding: 20px; background: #f8f9fa;">
        <p>Se detectaron <strong>cambios estructurales</strong> en los archivos SFTP que requieren tu aprobación antes de importar.</p>

        <h3>Cambios detectados:</h3>
        ${changesHtml}

        <div style="margin-top: 20px; text-align: center;">
          <a href="${approveUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Revisar y Aprobar
          </a>
        </div>

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          ID de importación: ${logId}<br>
          Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"MRM Dashboard" <${FROM_EMAIL}>`,
      to: recipients.join(', '),
      subject: '⚠️ [MRM] Aprobación requerida - Cambios estructurales SFTP',
      html,
    });
    console.log(`📧 Notificación enviada: cambios estructurales (log_id: ${logId})`);
    return true;
  } catch (error) {
    console.error('Error enviando notificación de cambios estructurales:', error);
    return false;
  }
}

/**
 * Notifica cuando una importación se completa exitosamente
 */
export async function notifyImportCompleted(
  logId: number,
  summary: ImportSummary,
  recordDiffs?: RecordDiffSummary[]
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('📧 Email no configurado - saltando notificación de importación completada');
    return false;
  }

  const recipients = getNotificationRecipients();
  if (recipients.length === 0) return false;

  const hasErrors = summary.errors.length > 0;
  const statusColor = hasErrors ? '#ffc107' : '#28a745';
  const statusIcon = hasErrors ? '⚠️' : '✅';
  const statusText = hasErrors ? 'Completada con advertencias' : 'Completada exitosamente';

  const diffsHtml = recordDiffs && recordDiffs.length > 0 ? `
    <h3>Detalle de cambios:</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
      <thead>
        <tr style="background: #e9ecef;">
          <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Tabla</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #dee2e6;">Nuevos</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #dee2e6;">Actualizados</th>
          <th style="padding: 8px; text-align: center; border: 1px solid #dee2e6;">Sin cambios</th>
        </tr>
      </thead>
      <tbody>
        ${recordDiffs.map(diff => `
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${diff.table}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6; color: #28a745;">${diff.inserts}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6; color: #007bff;">${diff.updates}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6; color: #6c757d;">${diff.unchanged}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const errorsHtml = hasErrors ? `
    <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 15px;">
      <strong>⚠️ Advertencias:</strong>
      <ul style="margin: 5px 0 0 0; padding-left: 20px;">
        ${summary.errors.map(err => `<li>${err}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${statusColor}; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">${statusIcon} Importación ${statusText}</h1>
      </div>

      <div style="padding: 20px; background: #f8f9fa;">
        <h3>Resumen de importación:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>👥 Empleados</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${summary.empleados}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>📤 Bajas</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${summary.bajas}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>📋 Incidencias</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${summary.incidencias ?? 0}</td>
          </tr>
          ${summary.permisos !== undefined && summary.permisos !== null ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>🏖️ Permisos</strong></td>
            <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${summary.permisos}</td>
          </tr>
          ` : ''}
        </table>

        ${diffsHtml}
        ${errorsHtml}

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          ID de importación: ${logId}<br>
          Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"MRM Dashboard" <${FROM_EMAIL}>`,
      to: recipients.join(', '),
      subject: `${statusIcon} [MRM] Importación SFTP ${statusText}`,
      html,
    });
    console.log(`📧 Notificación enviada: importación completada (log_id: ${logId})`);
    return true;
  } catch (error) {
    console.error('Error enviando notificación de importación completada:', error);
    return false;
  }
}

/**
 * Notifica cuando una importación falla
 */
export async function notifyImportFailed(
  errorMessage: string,
  context?: { logId?: number; filename?: string; step?: string }
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('📧 Email no configurado - saltando notificación de error');
    return false;
  }

  const recipients = getNotificationRecipients();
  if (recipients.length === 0) return false;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">❌ Error en Importación SFTP</h1>
      </div>

      <div style="padding: 20px; background: #f8f9fa;">
        <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
          <strong>Error:</strong>
          <pre style="margin: 10px 0 0 0; white-space: pre-wrap; word-break: break-word;">${errorMessage}</pre>
        </div>

        ${context ? `
        <h3>Contexto:</h3>
        <ul>
          ${context.logId ? `<li><strong>ID de importación:</strong> ${context.logId}</li>` : ''}
          ${context.filename ? `<li><strong>Archivo:</strong> ${context.filename}</li>` : ''}
          ${context.step ? `<li><strong>Paso:</strong> ${context.step}</li>` : ''}
        </ul>
        ` : ''}

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"MRM Dashboard" <${FROM_EMAIL}>`,
      to: recipients.join(', '),
      subject: '❌ [MRM] Error en importación SFTP',
      html,
    });
    console.log('📧 Notificación enviada: error en importación');
    return true;
  } catch (error) {
    console.error('Error enviando notificación de fallo:', error);
    return false;
  }
}

/**
 * Notifica cuando una importación es bloqueada por concurrencia
 */
export async function notifyImportBlocked(
  existingImportId: number,
  existingStatus: string
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const recipients = getNotificationRecipients();
  if (recipients.length === 0) return false;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6c757d; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">🔒 Importación Bloqueada</h1>
      </div>

      <div style="padding: 20px; background: #f8f9fa;">
        <p>Se intentó iniciar una nueva importación pero ya existe una en curso.</p>

        <div style="background: #e9ecef; padding: 15px; border-radius: 5px;">
          <p><strong>Importación existente:</strong></p>
          <ul>
            <li>ID: ${existingImportId}</li>
            <li>Estado: ${existingStatus}</li>
          </ul>
        </div>

        <p style="margin-top: 15px;">Por favor espera a que termine la importación actual o revisa su estado en el panel de administración.</p>

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"MRM Dashboard" <${FROM_EMAIL}>`,
      to: recipients.join(', '),
      subject: '🔒 [MRM] Importación bloqueada - Ya hay una en curso',
      html,
    });
    console.log('📧 Notificación enviada: importación bloqueada');
    return true;
  } catch (error) {
    console.error('Error enviando notificación de bloqueo:', error);
    return false;
  }
}

/**
 * Envía un email de prueba para verificar la configuración
 */
export async function sendTestEmail(): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'SMTP no configurado. Verifica SMTP_HOST, SMTP_USER y SMTP_PASS en .env.local' };
  }

  const recipients = getNotificationRecipients();
  if (recipients.length === 0) {
    return { success: false, error: 'No hay destinatarios configurados' };
  }

  try {
    await transporter.sendMail({
      from: `"MRM Dashboard" <${FROM_EMAIL}>`,
      to: recipients.join(', '),
      subject: '✅ [MRM] Prueba de configuración de email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Configuración Correcta</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <p>Este es un email de prueba del sistema de notificaciones MRM.</p>
            <p>Si recibes este mensaje, la configuración de email está funcionando correctamente.</p>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
            </p>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
