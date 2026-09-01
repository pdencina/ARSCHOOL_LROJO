import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail } from '@/lib/email'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ROLES_ADMISION = ['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador']

// Verifica que el usuario tenga acceso a esta pre-admisión (sede + programa para coordinador).
function puedeAcceder(usuario: any, pa: any): boolean {
  if (['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes(usuario?.rol)) return true
  if (usuario?.rol === 'coordinador') {
    const sedes = [usuario.colegio_id, ...(usuario.sedes_ids || [])].filter(Boolean)
    const sedeOk = sedes.length === 0 || sedes.includes(pa.colegio_id)
    const progOk = !usuario.programa_ids?.length || (pa.programa_id && usuario.programa_ids.includes(pa.programa_id))
    return sedeOk && progOk
  }
  return false
}

// GET /api/admision/[id] — Detalle completo de una pre-admisión
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!ROLES_ADMISION.includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data } = await admin.from('pre_admisiones').select('*').eq('id', params.id).single()
  if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!puedeAcceder(usuario, data)) return NextResponse.json({ error: 'Sin acceso a esta solicitud' }, { status: 403 })

  return NextResponse.json(data)
}

// DELETE /api/admision/[id] — Eliminar definitivamente una solicitud de admisión
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  // Eliminar es destructivo: solo roles de administración (no gestor_admision)
  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })
  }

  const { data: pa } = await admin.from('pre_admisiones').select('id, colegio_id, programa_id').eq('id', params.id).single()
  if (!pa) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!puedeAcceder(usuario, pa)) return NextResponse.json({ error: 'Sin acceso a esta solicitud' }, { status: 403 })

  const { error } = await admin.from('pre_admisiones').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// PUT /api/admision/[id] — Actualizar estado (aprobar, rechazar, observar)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!ROLES_ADMISION.includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Verificar acceso a esta pre-admisión (coordinador: su programa + sede)
  const { data: paActual } = await admin.from('pre_admisiones').select('id, colegio_id, programa_id').eq('id', params.id).single()
  if (!paActual) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!puedeAcceder(usuario, paActual)) return NextResponse.json({ error: 'Sin acceso a esta solicitud' }, { status: 403 })

  const body = await request.json()
  const { accion, observaciones_admin, motivo_rechazo } = body

  const updates: any = {
    revisado_por: user.id,
    revisado_at: new Date().toISOString(),
  }

  if (accion === 'aprobar') {
    updates.estado = 'aprobada'
    updates.observaciones_admin = observaciones_admin || null
  } else if (accion === 'rechazar') {
    updates.estado = 'rechazada'
    updates.motivo_rechazo = motivo_rechazo || 'No cumple requisitos'
    updates.observaciones_admin = observaciones_admin || null
  } else if (accion === 'en_revision') {
    updates.estado = 'en_revision'
    updates.observaciones_admin = observaciones_admin || null
  } else if (accion === 'subsanar') {
    // Enviar observación al apoderado para que corrija
    updates.estado = 'en_revision'
    updates.observaciones_admin = observaciones_admin || null
  } else if (accion === 'observar') {
    updates.observaciones_admin = observaciones_admin
  } else {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const { error } = await admin.from('pre_admisiones').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar al apoderado si se aprobó, rechazó, o pidió subsanación
  if (accion === 'aprobar' || accion === 'rechazar' || accion === 'subsanar') {
    const { data: pa } = await admin.from('pre_admisiones').select('apoderado_email, apoderado_nombre, apoderado_apellido, alumno_nombre, alumno_apellido, codigo_seguimiento').eq('id', params.id).single()
    const p = pa as any
    if (p?.apoderado_email) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

      if (accion === 'subsanar') {
        // Email de subsanación con link para corregir
        const subsanarUrl = `${baseUrl}/admision/subsanar/${p.codigo_seguimiento}`
        await enviarEmail({
          to: p.apoderado_email,
          subject: `AR School — Solicitud requiere correcciones (${p.codigo_seguimiento})`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:550px;margin:0 auto;padding:30px 20px;">
              <div style="text-align:center;margin-bottom:20px;"><strong style="font-size:16px;color:#1B3A5C;">AR SCHOOL</strong></div>
              <h2 style="color:#9A5B00;font-size:18px;text-align:center;">Su solicitud requiere correcciones</h2>
              <p style="color:#4b5563;font-size:13px;">Estimado/a ${p.apoderado_nombre} ${p.apoderado_apellido},</p>
              <p style="color:#4b5563;font-size:13px;line-height:1.6;">
                Hemos revisado la solicitud de admisión de <strong>${p.alumno_nombre} ${p.alumno_apellido}</strong> y necesitamos que corrija o complete lo siguiente:
              </p>
              <div style="background:#FEF3EC;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:20px 0;">
                <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;white-space:pre-wrap;">${observaciones_admin || 'Faltan documentos obligatorios. Por favor adjúntelos.'}</p>
              </div>
              <p style="color:#4b5563;font-size:13px;line-height:1.6;">
                Haga clic en el siguiente botón para completar o corregir su solicitud:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${subsanarUrl}" style="display:inline-block;background:#1B3A5C;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
                  Corregir mi solicitud
                </a>
              </div>
              <p style="font-size:11px;color:#9ca3af;text-align:center;">Código de seguimiento: ${p.codigo_seguimiento}</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
              <p style="font-size:11px;color:#9ca3af;text-align:center;">Fundación Educacional AR Ministries · RUT 65.168.392-0</p>
            </div>
          `,
        })
      } else {
        const esAprobada = accion === 'aprobar'
        await enviarEmail({
          to: p.apoderado_email,
          subject: `AR School — Solicitud ${esAprobada ? 'aprobada' : 'no aprobada'} (${p.codigo_seguimiento})`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:550px;margin:0 auto;padding:30px 20px;">
              <div style="text-align:center;margin-bottom:20px;"><strong style="font-size:16px;color:#1B3A5C;">AR SCHOOL</strong></div>
              <h2 style="color:${esAprobada ? '#2D5A3F' : '#A8432B'};font-size:18px;text-align:center;">
                Solicitud ${esAprobada ? 'aprobada' : 'no aprobada'}
              </h2>
              <p style="color:#4b5563;font-size:13px;">Estimado/a ${p.apoderado_nombre} ${p.apoderado_apellido},</p>
              <p style="color:#4b5563;font-size:13px;line-height:1.6;">
                ${esAprobada
                  ? `La solicitud de admisión de <strong>${p.alumno_nombre} ${p.alumno_apellido}</strong> ha sido <strong>aprobada</strong>. Pronto recibirá instrucciones para completar el proceso de matrícula y firma de contrato.`
                  : `Lamentamos informar que la solicitud de admisión de <strong>${p.alumno_nombre} ${p.alumno_apellido}</strong> no fue aprobada.${motivo_rechazo ? ` Motivo: ${motivo_rechazo}` : ''}`
                }
              </p>
              ${esAprobada ? `<div style="text-align:center;margin:24px 0;"><a href="${baseUrl}/admision/seguimiento?codigo=${p.codigo_seguimiento}" style="display:inline-block;background:#1B3A5C;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:600;">Ver estado</a></div>` : ''}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
              <p style="font-size:11px;color:#9ca3af;text-align:center;">Fundación Educacional AR Ministries · RUT 65.168.392-0</p>
            </div>
          `,
        })
      }
    }
  }

  return NextResponse.json({ ok: true, estado: updates.estado })
}
