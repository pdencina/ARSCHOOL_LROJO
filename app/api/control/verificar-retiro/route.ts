import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail } from '@/lib/email'
import { createHash } from 'crypto'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /api/control/verificar-retiro
// Acciones:
//   'enviar_codigo' — Envía código de 6 dígitos al email del apoderado
//   'verificar'     — Valida código + firma y registra el retiro
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus', 'tutor_supervisor'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { accion, alumno_ids, persona_nombre, persona_rut, persona_parentesco, email_override } = body

  if (!accion || !alumno_ids || alumno_ids.length === 0) {
    return NextResponse.json({ error: 'accion y alumno_ids son requeridos' }, { status: 400 })
  }

  const primerAlumnoId = alumno_ids[0]

  // === ACCIÓN: ENVIAR CÓDIGO ===
  if (accion === 'enviar_codigo') {
    let emailDestino = email_override || ''
    let nombreApoderado = ''

    // Si no hay email override, usar el del apoderado
    if (!emailDestino) {
      const { data: familia } = await admin
        .from('familias')
        .select('email, nombre_apoderado, apellido_apoderado')
        .eq('alumno_id', primerAlumnoId)
        .limit(1)
        .single()

      if (!familia || !(familia as any).email) {
        return NextResponse.json({ error: 'No hay email registrado. Ingrese un email manualmente.' }, { status: 400 })
      }
      const fam = familia as any
      emailDestino = fam.email
      nombreApoderado = `${fam.nombre_apoderado || ''} ${fam.apellido_apoderado || ''}`.trim()
    }
    const codigo = generarCodigo()
    const expiraAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // Obtener nombres de alumnos para el email
    const { data: alumnosData } = await admin
      .from('alumnos')
      .select('nombre, apellido')
      .in('id', alumno_ids)

    const nombresAlumnos = (alumnosData ?? []).map((a: any) => `${a.nombre} ${a.apellido}`).join(', ')

    // Guardar código
    await admin.from('codigos_retiro').insert({
      colegio_id: usuario.colegio_id,
      alumno_ids: alumno_ids,
      codigo,
      codigo_expira_at: expiraAt.toISOString(),
      intentos: 0,
      email_destino: emailDestino,
      persona_nombre: persona_nombre || null,
      persona_rut: persona_rut || null,
      persona_parentesco: persona_parentesco || null,
      registrado_por: user.id,
    })

    // Enviar email con código
    await enviarEmail({
      to: emailDestino,
      subject: `AR School — Código de autorización para retiro`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:450px;margin:0 auto;padding:30px 20px;text-align:center;">
          <strong style="font-size:15px;color:#1B3A5C;">AR SCHOOL</strong>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px;">Control de Retiro</div>
          <h2 style="color:#1B3A5C;font-size:17px;margin:20px 0 8px;">Código de autorización</h2>
          <p style="color:#6b7280;font-size:13px;margin-bottom:6px;">
            Se solicita el retiro de: <strong>${nombresAlumnos}</strong>
          </p>
          ${persona_nombre ? `<p style="color:#6b7280;font-size:12px;margin-bottom:16px;">Persona que retira: <strong>${persona_nombre}</strong>${persona_parentesco ? ` (${persona_parentesco})` : ''}</p>` : ''}
          <p style="color:#4b5563;font-size:13px;margin-bottom:20px;">
            Comunique este código al personal del establecimiento para autorizar el retiro:
          </p>
          <div style="background:#f0f4f8;border-radius:12px;padding:20px;margin:16px 0;">
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1B3A5C;font-family:monospace;">${codigo}</div>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin-top:16px;">Este código expira en 10 minutos.</p>
          <div style="background:#FEF3EC;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-top:20px;text-align:left;">
            <p style="margin:0;font-size:11px;color:#9a3412;line-height:1.5;">
              <strong>Importante:</strong> Si usted no autorizó este retiro, comuníquese inmediatamente con el establecimiento.
            </p>
          </div>
          <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;">
            Fundación ARM Global · www.arschoolglobal.com
          </div>
        </div>
      `,
    })

    const emailOculto = emailDestino.replace(/(.{3}).*(@.*)/, '$1***$2')

    return NextResponse.json({
      ok: true,
      mensaje: `Código enviado a ${emailOculto}`,
      email_parcial: emailOculto,
      expira_en_minutos: 10,
    })
  }

  // === ACCIÓN: VERIFICAR Y REGISTRAR RETIRO ===
  if (accion === 'verificar') {
    const { codigo, firma_nombre } = body

    if (!codigo || !firma_nombre) {
      return NextResponse.json({ error: 'Código y nombre completo son requeridos' }, { status: 400 })
    }

    // Buscar código más reciente para estos alumnos
    const { data: codigoRegistro } = await admin
      .from('codigos_retiro')
      .select('*')
      .eq('colegio_id', usuario.colegio_id)
      .contains('alumno_ids', alumno_ids)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!codigoRegistro) {
      return NextResponse.json({ error: 'Debe solicitar un código primero' }, { status: 400 })
    }

    const cr = codigoRegistro as any

    // Verificar expiración
    if (new Date(cr.codigo_expira_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado. Solicite uno nuevo.' }, { status: 400 })
    }

    // Verificar intentos
    if (cr.intentos >= 5) {
      return NextResponse.json({ error: 'Demasiados intentos. Solicite un nuevo código.' }, { status: 400 })
    }

    // Verificar código
    if (cr.codigo !== codigo) {
      await admin.from('codigos_retiro').update({ intentos: cr.intentos + 1 }).eq('id', cr.id)
      const restantes = 4 - cr.intentos
      return NextResponse.json({ error: `Código incorrecto. ${restantes} intento${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}.` }, { status: 400 })
    }

    // Código válido — registrar retiro para todos los alumnos
    const ahora = new Date()
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
    const horaEsperada = body.hora_esperada || '16:00'

    const [hEsp, mEsp] = horaEsperada.split(':').map(Number)
    const [hAct, mAct] = horaActual.split(':').map(Number)
    const minutosDiferencia = (hAct * 60 + mAct) - (hEsp * 60 + mEsp)
    const esAnticipado = minutosDiferencia < -5

    // Hash de auditoría
    const timestamp = new Date().toISOString()
    const firmaTexto = `RETIRO|${firma_nombre}|${cr.persona_rut || ''}|${timestamp}|${alumno_ids.join(',')}`
    const firmaHash = createHash('sha256').update(firmaTexto).digest('hex')

    const firmaCompleta = `FIRMA ELECTRÓNICA: ${firma_nombre} | Código verificado | ${timestamp} | Hash: ${firmaHash.slice(0, 12)}`

    // Crear registros
    const registros = alumno_ids.map((id: string) => ({
      colegio_id: usuario.colegio_id,
      alumno_id: id,
      tipo: 'retiro',
      hora_registro: horaActual,
      hora_esperada: horaEsperada,
      es_atraso: false,
      es_anticipado: esAnticipado,
      minutos_diferencia: minutosDiferencia,
      justificado: !!body.motivo,
      motivo: body.motivo || null,
      persona_retiro_nombre: cr.persona_nombre || persona_nombre,
      persona_retiro_rut: cr.persona_rut || persona_rut || null,
      persona_retiro_parentesco: cr.persona_parentesco || persona_parentesco || null,
      es_autorizada: true, // Código verificado = autorizado
      firma_retiro: firmaCompleta,
      firma_retiro_at: timestamp,
      registrado_por: user.id,
      observaciones: body.observaciones || null,
    }))

    const { data, error } = await admin.from('registros_control').insert(registros).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Marcar código como usado
    await admin.from('codigos_retiro').update({ usado: true, usado_at: timestamp }).eq('id', cr.id)

    return NextResponse.json({
      ok: true,
      registros: data,
      count: data?.length ?? 0,
      firma_hash: firmaHash.slice(0, 12),
    }, { status: 201 })
  }

  return NextResponse.json({ error: 'Acción no válida. Use enviar_codigo o verificar.' }, { status: 400 })
}
