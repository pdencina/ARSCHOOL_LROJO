import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail } from '@/lib/email'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generarCodigo(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '0123456789'
  const parte1 = Array.from({ length: 2 }, () => letras[Math.floor(Math.random() * letras.length)]).join('')
  const parte2 = Array.from({ length: 2 }, () => nums[Math.floor(Math.random() * nums.length)]).join('')
  return `ADM-${new Date().getFullYear()}-${parte1}${parte2}`
}

// POST /api/admision/pre-registro — Público, sin auth
// El apoderado envía todos los datos del alumno + familia + documentos
export async function POST(request: NextRequest) {
  const admin = getAdmin()
  const body = await request.json()

  const {
    // Alumno
    alumno_nombre, alumno_apellido, alumno_rut, alumno_fecha_nacimiento,
    alumno_sexo, alumno_nacionalidad, alumno_pais_natal, alumno_direccion, alumno_comuna,
    curso_solicitado, jornada, sede, modalidad,
    // Salud
    prevision_salud, alergia_alimentaria, alergia_medicamento, enfermedad_cronica,
    centro_salud_emergencia, diagnostico, contacto_especialista,
    // Académico
    jardin_previo, ultimo_anio_aprobado, ha_reprobado, curso_reprobado,
    // Emergencia
    contacto_emergencia, telefono_emergencia,
    // Apoderado
    apoderado_nombre, apoderado_apellido, apoderado_rut, apoderado_email,
    apoderado_telefono, apoderado_direccion, apoderado_comuna, apoderado_parentesco,
    // Padre
    padre_nombre, padre_apellido, padre_rut, padre_telefono, padre_email, padre_direccion,
    // Retiro
    retiro_nombre, retiro_parentesco, retiro_rut, retiro_telefono,
    // Documentos
    documentos,
    // Observaciones
    observaciones_apoderado,
    // Colegio destino
    colegio_id,
  } = body

  // Validaciones mínimas
  if (!alumno_nombre || !alumno_apellido || !curso_solicitado) {
    return NextResponse.json({ error: 'Nombre, apellido y curso del alumno son obligatorios' }, { status: 400 })
  }
  if (!apoderado_nombre || !apoderado_apellido || !apoderado_email) {
    return NextResponse.json({ error: 'Nombre, apellido y email del apoderado son obligatorios' }, { status: 400 })
  }

  // Determinar colegio (default Santiago si no se especifica)
  const colegioIdFinal = colegio_id || '11111111-1111-1111-1111-111111111111'

  // Generar código de seguimiento único
  let codigo = generarCodigo()
  let intentos = 0
  while (intentos < 5) {
    const { data: existe } = await admin.from('pre_admisiones').select('id').eq('codigo_seguimiento', codigo).single()
    if (!existe) break
    codigo = generarCodigo()
    intentos++
  }

  // IP y user-agent
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  // Insertar pre-admisión
  const { data: preAdmision, error } = await admin.from('pre_admisiones').insert({
    colegio_id: colegioIdFinal,
    codigo_seguimiento: codigo,
    // Alumno
    alumno_nombre: alumno_nombre.trim(),
    alumno_apellido: alumno_apellido.trim(),
    alumno_rut: alumno_rut || null,
    alumno_fecha_nacimiento: alumno_fecha_nacimiento || null,
    alumno_sexo: alumno_sexo || null,
    alumno_nacionalidad: alumno_nacionalidad || 'Chilena',
    alumno_pais_natal: alumno_pais_natal || 'Chile',
    alumno_direccion: alumno_direccion || null,
    alumno_comuna: alumno_comuna || null,
    curso_solicitado,
    jornada: jornada || 'completa',
    sede: sede || 'santiago',
    modalidad: modalidad || 'presencial',
    // Salud
    prevision_salud: prevision_salud || null,
    alergia_alimentaria: alergia_alimentaria || null,
    alergia_medicamento: alergia_medicamento || null,
    enfermedad_cronica: enfermedad_cronica || null,
    centro_salud_emergencia: centro_salud_emergencia || null,
    diagnostico: diagnostico || null,
    contacto_especialista: contacto_especialista || null,
    // Académico
    jardin_previo: jardin_previo || null,
    ultimo_anio_aprobado: ultimo_anio_aprobado || null,
    ha_reprobado: ha_reprobado || false,
    curso_reprobado: curso_reprobado || null,
    // Emergencia
    contacto_emergencia: contacto_emergencia || null,
    telefono_emergencia: telefono_emergencia || null,
    // Apoderado
    apoderado_nombre: apoderado_nombre.trim(),
    apoderado_apellido: apoderado_apellido.trim(),
    apoderado_rut: apoderado_rut || null,
    apoderado_email: apoderado_email.trim().toLowerCase(),
    apoderado_telefono: apoderado_telefono || null,
    apoderado_direccion: apoderado_direccion || null,
    apoderado_comuna: apoderado_comuna || null,
    apoderado_parentesco: apoderado_parentesco || 'madre/padre',
    // Padre
    padre_nombre: padre_nombre || null,
    padre_apellido: padre_apellido || null,
    padre_rut: padre_rut || null,
    padre_telefono: padre_telefono || null,
    padre_email: padre_email || null,
    padre_direccion: padre_direccion || null,
    // Retiro
    retiro_nombre: retiro_nombre || null,
    retiro_parentesco: retiro_parentesco || null,
    retiro_rut: retiro_rut || null,
    retiro_telefono: retiro_telefono || null,
    // Docs y obs
    documentos: documentos || {},
    observaciones_apoderado: observaciones_apoderado || null,
    ip_envio: ip,
    user_agent_envio: userAgent,
  }).select().single()

  if (error) {
    console.error('Error pre-admisión:', error)
    return NextResponse.json({ error: 'Error al enviar solicitud. Intente nuevamente.' }, { status: 500 })
  }

  // Enviar email de confirmación al apoderado
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const seguimientoUrl = `${baseUrl}/admision/seguimiento?codigo=${codigo}`

  try {
    await enviarEmail({
      to: apoderado_email.trim(),
      subject: `AR School — Solicitud de admisión recibida (${codigo})`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:550px;margin:0 auto;padding:30px 20px;">
          <div style="text-align:center;margin-bottom:24px;">
            <strong style="font-size:16px;color:#1B3A5C;">AR SCHOOL</strong>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Fundación Educacional AR Ministries</div>
          </div>
          <h2 style="color:#1B3A5C;font-size:18px;text-align:center;margin-bottom:16px;">Solicitud recibida</h2>
          <p style="color:#4b5563;font-size:14px;">Estimado/a <strong>${apoderado_nombre} ${apoderado_apellido}</strong>,</p>
          <p style="color:#4b5563;font-size:13px;line-height:1.6;">
            Hemos recibido la solicitud de admisión para <strong>${alumno_nombre} ${alumno_apellido}</strong> al curso <strong>${curso_solicitado}</strong>.
          </p>
          <div style="background:#f0f4f8;border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Código de seguimiento</div>
            <div style="font-size:22px;font-weight:bold;color:#1B3A5C;letter-spacing:2px;font-family:monospace;">${codigo}</div>
          </div>
          <p style="color:#4b5563;font-size:13px;line-height:1.6;">
            Nuestro equipo de admisión revisará su solicitud y se pondrá en contacto con usted. 
            Puede consultar el estado en cualquier momento:
          </p>
          <div style="text-align:center;margin:20px 0;">
            <a href="${seguimientoUrl}" style="display:inline-block;background:#1B3A5C;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:600;">
              Ver estado de mi solicitud
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="font-size:11px;color:#9ca3af;text-align:center;">Fundación Educacional AR Ministries · RUT 65.168.392-0</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Error enviando email confirmación:', e)
  }

  return NextResponse.json({
    ok: true,
    codigo_seguimiento: codigo,
    mensaje: 'Solicitud enviada exitosamente. Revise su correo para el código de seguimiento.',
  }, { status: 201 })
}

// GET /api/admision/pre-registro?codigo=ADM-2026-XX00 — Consultar estado
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const codigo = searchParams.get('codigo')

  if (!codigo) return NextResponse.json({ error: 'Código de seguimiento requerido' }, { status: 400 })

  const admin = getAdmin()
  const { data } = await admin
    .from('pre_admisiones')
    .select('codigo_seguimiento, estado, alumno_nombre, alumno_apellido, curso_solicitado, created_at, observaciones_admin, motivo_rechazo')
    .eq('codigo_seguimiento', codigo.toUpperCase().trim())
    .single()

  if (!data) return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 })

  const d = data as any
  const estadosMensaje: Record<string, string> = {
    pendiente: 'Su solicitud fue recibida y está en espera de revisión.',
    en_revision: 'Su solicitud está siendo revisada por nuestro equipo de admisión.',
    aprobada: 'Su solicitud fue aprobada. Pronto recibirá instrucciones para completar la matrícula.',
    matriculada: 'El proceso de matrícula fue completado exitosamente.',
    rechazada: 'Lamentablemente su solicitud no fue aprobada.',
    desistida: 'La solicitud fue marcada como desistida.',
  }

  return NextResponse.json({
    codigo: d.codigo_seguimiento,
    estado: d.estado,
    mensaje: estadosMensaje[d.estado] || '',
    alumno: `${d.alumno_nombre} ${d.alumno_apellido}`,
    curso: d.curso_solicitado,
    fecha_envio: d.created_at,
    observaciones: d.observaciones_admin || null,
    motivo_rechazo: d.motivo_rechazo || null,
  })
}
