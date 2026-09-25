import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { ETIQUETA_DOCUMENTO, type TipoDocumento } from '@/lib/firmaSiguiente'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/contratos/enviar-firma
// Body: { matricula_id, tipo: 'contrato' | 'pagare' | 'ambos', modalidad? }
// Genera el enlace de firma de cada documento y envía UN solo email al apoderado.
// Con 'ambos' se envían solo los documentos que faltan: la familia firma uno tras otro
// desde el mismo enlace (antes llegaban dos correos y solía firmarse solo el pagaré).
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()

  // Verificar permisos
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { matricula_id, tipo = 'contrato', modalidad } = body
  if (!matricula_id) return NextResponse.json({ error: 'matricula_id requerido' }, { status: 400 })
  if (!['contrato', 'pagare', 'ambos'].includes(tipo)) return NextResponse.json({ error: 'Tipo de documento no válido' }, { status: 400 })

  // Guardar la modalidad elegida para que el documento firmado sea consistente
  if (modalidad === 'completo' || modalidad === 'hermanos_2x1') {
    const { error } = await admin.from('matriculas').update({ modalidad_contrato: modalidad }).eq('id', matricula_id)
    if (error) console.error('Modalidad de contrato:', error.message)
  }

  // Obtener datos de la matrícula
  const { data: matricula } = await admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido, curso), familia:familias(nombre_apoderado, apellido_apoderado, email, rut)')
    .eq('id', matricula_id)
    .single()

  if (!matricula) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })
  const m = matricula as any

  if (!m.familia?.email) {
    return NextResponse.json({ error: 'No hay email del apoderado registrado' }, { status: 400 })
  }

  const nombreCompleto = `${m.familia.nombre_apoderado ?? ''} ${m.familia.apellido_apoderado ?? ''}`.trim()
  if (!nombreCompleto) {
    return NextResponse.json({ error: 'No hay nombre del apoderado registrado' }, { status: 400 })
  }

  // Documentos a enviar: con 'ambos', solo los que faltan firmar (contrato primero)
  const pendientes: TipoDocumento[] = []
  if ((tipo === 'contrato' || tipo === 'ambos') && !(tipo === 'ambos' && m.firmado_at)) pendientes.push('contrato')
  if ((tipo === 'pagare' || tipo === 'ambos') && !(tipo === 'ambos' && m.firmado_pagare_at)) pendientes.push('pagare')
  if (pendientes.length === 0) {
    return NextResponse.json({ error: 'El contrato y el pagaré ya están firmados' }, { status: 400 })
  }

  const expiraAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 horas
  const tokens: Record<string, string> = {}

  for (const doc of pendientes) {
    // Invalidar enlaces anteriores de ese documento (pendientes o ya abiertos, sin firmar)
    await admin
      .from('firma_tokens')
      .update({ estado: 'cancelado' })
      .eq('matricula_id', matricula_id)
      .eq('tipo', doc)
      .in('estado', ['pendiente', 'visto'])

    const token = randomBytes(32).toString('hex')
    const { error } = await admin.from('firma_tokens').insert({
      matricula_id,
      token,
      tipo: doc,
      email_destino: m.familia.email,
      nombre_completo_esperado: nombreCompleto,
      rut_esperado: m.familia.rut || null,
      expira_at: expiraAt.toISOString(),
      enviado_por: user.id,
    })
    if (error) return NextResponse.json({ error: `No se pudo generar el enlace de firma: ${error.message}` }, { status: 500 })
    tokens[doc] = token
  }

  // Un solo enlace: el del primer documento pendiente. Al firmarlo, la página ofrece el siguiente.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const firmaUrl = `${baseUrl}/firmar/${tokens[pendientes[0]]}`
  const alumnoNombre = `${m.alumno?.nombre ?? ''} ${m.alumno?.apellido ?? ''}`.trim()
  const varios = pendientes.length > 1
  const etiquetas = pendientes.map(d => ETIQUETA_DOCUMENTO[d])

  const envio = await enviarEmail({
    to: m.familia.email,
    subject: varios
      ? `AR School — Firmar contrato y pagaré de ${alumnoNombre}`
      : `AR School — Firmar ${etiquetas[0]} de ${alumnoNombre}`,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:550px;margin:0 auto;padding:30px 20px;">
        <div style="text-align:center;margin-bottom:24px;">
          <strong style="font-size:16px;color:#1B3A5C;">AR SCHOOL</strong>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Fundación Educacional AR Ministries</div>
        </div>

        <h2 style="color:#1B3A5C;font-size:18px;text-align:center;margin-bottom:8px;">
          ${varios ? `${pendientes.length} documentos pendientes de firma` : 'Documento pendiente de firma'}
        </h2>

        <p style="color:#4b5563;font-size:14px;text-align:center;margin-bottom:24px;">
          Estimado/a <strong>${nombreCompleto}</strong>,
        </p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${varios ? 'Documentos:' : 'Documento:'}</p>
          ${etiquetas.map((e, i) => `<p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1B3A5C;">${varios ? `${i + 1}. ` : ''}${e}</p>`).join('')}
          <p style="margin:10px 0 4px;font-size:13px;color:#6b7280;">Alumno:</p>
          <p style="margin:0;font-size:14px;font-weight:500;color:#1B3A5C;">${alumnoNombre} — ${m.alumno?.curso ?? ''}</p>
        </div>

        <p style="color:#4b5563;font-size:13px;line-height:1.6;margin-bottom:24px;">
          ${varios
            ? 'Haga clic en el botón para revisar y firmar. Firmará los documentos <strong>uno tras otro</strong>: al terminar el primero, la página le llevará al siguiente.'
            : 'Para firmar electrónicamente este documento, haga clic en el siguiente botón. Podrá revisar el documento completo antes de confirmar su firma.'}
        </p>

        <div style="text-align:center;margin:28px 0;">
          <a href="${firmaUrl}" style="display:inline-block;background:#1B3A5C;color:white;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;">
            ${varios ? `Revisar y firmar (${pendientes.length} documentos)` : 'Revisar y firmar documento'}
          </a>
        </div>

        <div style="background:#FEF3EC;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin:20px 0;">
          <p style="margin:0;font-size:12px;color:#9a3412;line-height:1.5;">
            <strong>Importante:</strong> Este enlace expira en 72 horas. Al firmar cada documento se le enviará un código de verificación a este mismo correo. Su firma consistirá en ingresar su nombre completo y RUT como declaración de consentimiento.
          </p>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>

        <p style="font-size:11px;color:#9ca3af;text-align:center;line-height:1.5;">
          Si no reconoce esta solicitud, puede ignorar este correo.<br/>
          Fundación Educacional AR Ministries · RUT 65.168.392-0
        </p>
      </div>
    `,
  })
  if (envio && (envio as any).ok === false) {
    return NextResponse.json({ error: 'Se generó el enlace, pero no se pudo enviar el email. Intente nuevamente.' }, { status: 502 })
  }

  // Actualizar estado del contrato en la matrícula
  const { error: eEstado } = await admin.from('matriculas').update({ estado_contrato: 'enviado' }).eq('id', matricula_id)
  if (eEstado) console.error('estado_contrato:', eEstado.message)

  return NextResponse.json({
    ok: true,
    documentos: pendientes,
    token: tokens[pendientes[0]],
    email_enviado_a: m.familia.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
    expira_at: expiraAt.toISOString(),
    firma_url: firmaUrl,
  })
}
