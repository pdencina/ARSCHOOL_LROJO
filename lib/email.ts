import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend() {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

const FROM_EMAIL = 'AR School <notificaciones@arschoolglobal.com>'

export async function enviarEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}) {
  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })
    if (error) {
      console.error('Error enviando email:', error)
      return { ok: false, error }
    }
    return { ok: true, id: data?.id }
  } catch (e) {
    console.error('Error enviando email:', e)
    return { ok: false, error: e }
  }
}

// Templates
export function templateComunicado(titulo: string, contenido: string, colegio: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #1a2332; padding-bottom: 16px; margin-bottom: 24px;">
        <strong style="font-size: 16px; color: #1a2332;">AR SCHOOL</strong>
        <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">${colegio}</span>
      </div>
      <h2 style="color: #1a2332; font-size: 18px; margin: 0 0 12px;">${titulo}</h2>
      <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
        ${contenido.replace(/\n/g, '<br/>')}
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 11px;">
        Este mensaje fue enviado desde la plataforma AR School. No responda a este correo.
      </div>
    </div>
  `
}

export function templateReporteDiario(alumno: string, curso: string, fecha: string, resumen: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #1a2332; padding-bottom: 16px; margin-bottom: 24px;">
        <strong style="font-size: 16px; color: #1a2332;">AR SCHOOL</strong>
        <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">Reporte Diario</span>
      </div>
      <h2 style="color: #1a2332; font-size: 18px; margin: 0 0 4px;">Reporte de ${alumno}</h2>
      <p style="color: #9ca3af; font-size: 13px; margin: 0 0 20px;">${curso} · ${fecha}</p>
      <div style="background: #f8f9fb; border-radius: 8px; padding: 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
        ${resumen}
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 11px;">
        Ingresa a la plataforma para ver el reporte completo.
      </div>
    </div>
  `
}

export function templateInvitacionApoderado(nombre: string, alumno: string, linkAcceso: string, programa?: string) {
  // Determinar branding según programa
  const esLions = programa?.toLowerCase().includes('lions') || programa?.toLowerCase().includes('soccer')
  const esWorship = programa?.toLowerCase().includes('worship') || programa?.toLowerCase().includes('música') || programa?.toLowerCase().includes('music')

  const brandName = esLions ? 'LIONS SOCCER SCHOOL' : esWorship ? 'AR WORSHIP SCHOOL' : 'AR SCHOOL GLOBAL'
  const brandColor = esLions ? '#2D5A3F' : esWorship ? '#6B4C9A' : '#1a2332'
  const welcomeMsg = esLions ? '¡Bienvenido/a a Lions Soccer School!' : esWorship ? '¡Bienvenido/a a AR Worship School!' : '¡Bienvenido/a a AR School!'
  const inscripcionMsg = esLions ? 'ha sido inscrito exitosamente en nuestra escuela de fútbol' : esWorship ? 'ha sido inscrito exitosamente en nuestra escuela de música' : 'ha sido matriculado exitosamente en nuestro Centro Educativo'

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.arschoolglobal.com'
  const logoUrl = esLions ? `${baseUrl}/logo-lions.png` : esWorship ? `${baseUrl}/logo-worship.png` : `${baseUrl}/logo-arschool.png`

  const features = esLions ? [
    'Ver horarios de entrenamiento',
    'Revisar asistencia a sesiones',
    'Consultar estado de pagos',
    'Recibir comunicados del equipo',
  ] : esWorship ? [
    'Ver horarios de clases de música',
    'Revisar asistencia y progreso',
    'Consultar estado de pagos',
    'Acceder a recursos y materiales',
  ] : [
    'Ver reportes diarios de su hijo/a',
    'Revisar calificaciones y asistencia',
    'Comunicarse con los tutores',
    'Consultar estado de pagos',
    'Acceder a documentos y comunicados',
  ]

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid ${brandColor}; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
        <img src="${logoUrl}" alt="${brandName}" style="height: 48px; max-width: 200px; object-fit: contain; margin-bottom: 8px;" />
        <div style="font-size: 10px; color: #9ca3af; letter-spacing: 1px;">Fundación ARM Global</div>
      </div>
      <h2 style="color: ${brandColor}; font-size: 18px; margin: 0 0 12px;">${welcomeMsg}</h2>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">Estimado/a <strong>${nombre}</strong>,</p>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">Le informamos que <strong>${alumno}</strong> ${inscripcionMsg}.</p>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">Se ha creado una cuenta en nuestra plataforma para que pueda hacer seguimiento. Para activar su cuenta, haga click en el siguiente botón:</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${linkAcceso}" style="background: ${brandColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">Crear mi contraseña</a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">Si el botón no funciona, copie y pegue este enlace en su navegador:</p>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${linkAcceso}</p>
      <div style="background: #f8f9fb; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px;"><strong>¿Qué puede hacer en la plataforma?</strong></p>
        <ul style="color: #6b7280; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 16px;">
          ${features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 11px;">
        Este enlace expira en 24 horas. Si tiene problemas para acceder, contacte a la administración.<br/>
        Fundación ARM Global · www.arschoolglobal.com
      </div>
    </div>
  `
}

export function templatePagoMora(apoderado: string, alumno: string, monto: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #1a2332; padding-bottom: 16px; margin-bottom: 24px;">
        <strong style="font-size: 16px; color: #1a2332;">AR SCHOOL</strong>
        <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">Aviso de pago</span>
      </div>
      <p style="color: #4b5563; font-size: 14px;">Estimado/a ${apoderado},</p>
      <p style="color: #4b5563; font-size: 14px;">Le recordamos que tiene un saldo pendiente de <strong style="color: #c53030;">${monto}</strong> correspondiente a ${alumno}.</p>
      <p style="color: #4b5563; font-size: 14px;">Por favor regularice su situación a la brevedad.</p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 11px;">
        Este es un mensaje automático. Para consultas contacte a la administración del colegio.
      </div>
    </div>
  `
}


export function templateCumpleanos(nombre: string, apellido: string, edad: number, nombreApoderado: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #1B3A5C; padding-bottom: 16px; margin-bottom: 24px;">
        <strong style="font-size: 16px; color: #1B3A5C;">AR SCHOOL GLOBAL</strong>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 60px; margin-bottom: 12px;">🎂</div>
        <h1 style="color: #1B3A5C; font-size: 24px; margin: 0 0 8px;">¡Feliz cumpleaños, ${nombre}!</h1>
        <p style="color: #E8722A; font-size: 18px; font-weight: bold; margin: 0;">¡Hoy cumple ${edad} años!</p>
      </div>
      <div style="background: #FEF3EC; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
          Estimado/a <strong>${nombreApoderado}</strong>,
        </p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 12px 0 0;">
          Desde la familia de AR School queremos enviar un cariñoso saludo a <strong>${nombre} ${apellido}</strong> en este día tan especial. 
          Que este nuevo año de vida esté lleno de aprendizajes, aventuras y mucho amor.
        </p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 12px 0 0; font-style: italic;">
          "Que tu meta más alta sea siempre el amor."
        </p>
      </div>
      <p style="color: #4b5563; font-size: 14px; text-align: center; margin-top: 20px;">
        Con cariño,<br/><strong style="color: #1B3A5C;">Equipo AR School Global</strong>
      </p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 11px; text-align: center;">
        Fundación Educacional AR Ministries · Modelo Educativo A.M.O.R.
      </div>
    </div>
  `
}

/**
 * Comprobante de pago en línea (Webpay).
 * Se envía al apoderado al confirmarse el pago.
 */
export function templateComprobantePago(d: {
  pagador: string
  alumno: string
  concepto: string
  monto: number
  ordenCompra: string
  codigoAutorizacion?: string | null
  ultimosDigitos?: string | null
  fecha: string
  tipoPago?: string | null
  cuotas?: number | null
}) {
  const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`
  const fila = (label: string, valor?: string | null) => valor
    ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px;">${label}</td><td style="padding:7px 0;text-align:right;font-size:13px;color:#1a2332;font-weight:600;">${valor}</td></tr>`
    : ''

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;padding:0;">
      <!-- Header -->
      <div style="background:#2D5A3F;padding:28px 24px;text-align:center;border-radius:12px 12px 0 0;">
        <div style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.5px;">AR SCHOOL</div>
        <div style="color:rgba(255,255,255,0.75);font-size:11px;margin-top:3px;">Fundación Educacional AR Ministries</div>
        <div style="margin-top:16px;display:inline-block;background:rgba(255,255,255,0.15);padding:6px 14px;border-radius:20px;">
          <span style="color:#ffffff;font-size:12px;font-weight:600;">✓ Pago confirmado</span>
        </div>
      </div>

      <!-- Body -->
      <div style="background:#ffffff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;">
        <p style="margin:0 0 4px;color:#1a2332;font-size:15px;font-weight:600;">Hola ${d.pagador},</p>
        <p style="margin:0 0 22px;color:#4b5563;font-size:13px;line-height:1.6;">
          Recibimos tu pago correctamente. Este correo es tu comprobante.
        </p>

        <!-- Monto destacado -->
        <div style="background:#EDF5F0;border:1px solid rgba(45,90,63,0.2);border-radius:12px;padding:20px;text-align:center;margin-bottom:22px;">
          <div style="color:#2D5A3F;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Monto pagado</div>
          <div style="color:#2D5A3F;font-size:30px;font-weight:700;margin-top:6px;">${fmt(d.monto)}</div>
        </div>

        <!-- Detalle -->
        <table style="width:100%;border-collapse:collapse;">
          ${fila('Alumno', d.alumno)}
          ${fila('Concepto', d.concepto)}
          ${fila('Fecha', d.fecha)}
          ${fila('Medio de pago', 'Webpay (Transbank)')}
          ${fila('Tipo', d.tipoPago)}
          ${d.cuotas && d.cuotas > 1 ? fila('Cuotas', String(d.cuotas)) : ''}
          ${fila('Tarjeta', d.ultimosDigitos ? `**** ${d.ultimosDigitos}` : null)}
          ${fila('N° autorización', d.codigoAutorizacion)}
          ${fila('Orden de compra', d.ordenCompra)}
        </table>

        <div style="margin-top:22px;padding-top:18px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
            Guarda este comprobante como respaldo de tu pago. Si tienes dudas sobre tu estado de cuenta,
            comunícate con la administración del centro educativo.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f9fafb;padding:16px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:10px;line-height:1.6;">
          Fundación Educacional AR Ministries · RUT 65.168.392-0<br/>
          Victoria 52, Santiago · Puente Alto · Punta Arenas
        </p>
      </div>
    </div>
  `
}
