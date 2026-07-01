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
