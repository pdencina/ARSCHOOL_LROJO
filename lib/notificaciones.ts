import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail, templateComunicado } from './email'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface NotificacionOpts {
  colegioId: string
  titulo: string
  mensaje?: string
  tipo?: 'info' | 'alerta' | 'cobranza' | 'academico' | 'sistema'
  href?: string
  // Destinatarios: usuarios específicos o por rol
  usuarioIds?: string[]
  roles?: string[]
  // Email opcional
  enviarEmailNotif?: boolean
  emailSubject?: string
  emailHtml?: string
}

/**
 * Crear notificaciones in-app para usuarios específicos o por rol.
 * Opcionalmente envía email a los usuarios que tengan email registrado.
 */
export async function crearNotificaciones(opts: NotificacionOpts) {
  const admin = getAdmin()
  const {
    colegioId, titulo, mensaje, tipo = 'info', href,
    usuarioIds, roles, enviarEmailNotif = false, emailSubject, emailHtml,
  } = opts

  // Resolver lista de usuario_ids
  let destinatarios: { id: string; email: string }[] = []

  if (usuarioIds && usuarioIds.length > 0) {
    const { data } = await admin
      .from('usuarios')
      .select('id, email')
      .in('id', usuarioIds)
      .eq('activo', true)
    destinatarios = (data ?? []) as any[]
  } else if (roles && roles.length > 0) {
    const { data } = await admin
      .from('usuarios')
      .select('id, email')
      .eq('colegio_id', colegioId)
      .in('rol', roles)
      .eq('activo', true)
    destinatarios = (data ?? []) as any[]
  }

  if (destinatarios.length === 0) return { notificados: 0, emailsEnviados: 0 }

  // Insertar notificaciones in-app
  const notificaciones = destinatarios.map(u => ({
    colegio_id: colegioId,
    usuario_id: u.id,
    titulo,
    mensaje: mensaje ?? null,
    tipo,
    href: href ?? null,
    leida: false,
  }))

  await admin.from('notificaciones').insert(notificaciones)

  // Enviar emails si se solicita
  let emailsEnviados = 0
  if (enviarEmailNotif && emailHtml) {
    const emails = destinatarios
      .map(u => u.email)
      .filter(Boolean)

    if (emails.length > 0) {
      // Enviar en batches de 10 para no saturar
      const BATCH_SIZE = 10
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE)
        const result = await enviarEmail({
          to: batch,
          subject: emailSubject ?? titulo,
          html: emailHtml,
        })
        if (result.ok) emailsEnviados += batch.length
      }
    }
  }

  return { notificados: destinatarios.length, emailsEnviados }
}

/**
 * Notificar publicación de horario a todos los tutores del colegio.
 */
export async function notificarHorarioPublicado(colegioId: string, tituloHorario: string) {
  return crearNotificaciones({
    colegioId,
    titulo: '📅 Nuevo horario publicado',
    mensaje: `Se ha publicado el horario: ${tituloHorario}. Revisa tu planificación personal.`,
    tipo: 'academico',
    href: '/planificacion',
    roles: ['tutor'],
    enviarEmailNotif: true,
    emailSubject: `AR School — Nuevo horario publicado`,
    emailHtml: templateNotificacionHorario(tituloHorario),
  })
}

/**
 * Notificar nuevo comunicado a apoderados (y opcionalmente tutores).
 */
export async function notificarComunicado(
  colegioId: string,
  titulo: string,
  contenido: string,
  colegio: string,
  cursos?: string[] | null
) {
  // Notificación in-app a apoderados
  const result = await crearNotificaciones({
    colegioId,
    titulo: `📢 ${titulo}`,
    mensaje: contenido.substring(0, 100) + (contenido.length > 100 ? '...' : ''),
    tipo: 'info',
    href: '/portal/comunicados',
    roles: ['apoderado'],
    enviarEmailNotif: true,
    emailSubject: `AR School — ${titulo}`,
    emailHtml: templateComunicado(titulo, contenido, colegio),
  })

  return result
}

// Template de email para horario publicado
function templateNotificacionHorario(titulo: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #1a2332; padding-bottom: 16px; margin-bottom: 24px;">
        <strong style="font-size: 16px; color: #1a2332;">AR SCHOOL</strong>
        <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">Planificación</span>
      </div>
      <h2 style="color: #1a2332; font-size: 18px; margin: 0 0 12px;">📅 Nuevo horario publicado</h2>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
        Se ha publicado un nuevo horario: <strong>${titulo}</strong>
      </p>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
        Ingresa a la plataforma para revisar tu horario personal y ver los bloques que tienes asignados esta semana.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.arschoolglobal.com'}/planificacion" 
           style="background: #1a2332; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
          Ver mi horario
        </a>
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 11px;">
        Este mensaje fue enviado automáticamente. No responda a este correo.
      </div>
    </div>
  `
}
