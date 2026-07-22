import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET: Obtener mensajes de una conversación
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()

  // Verificar que es participante
  const { data: part } = await admin
    .from('conversacion_participantes')
    .select('id')
    .eq('conversacion_id', params.id)
    .eq('usuario_id', user.id)
    .single()

  if (!part) return NextResponse.json({ error: 'No eres participante' }, { status: 403 })

  // Obtener mensajes
  const { data: mensajes } = await admin
    .from('mensajes')
    .select('*, autor:usuarios(nombre, apellido, rol)')
    .eq('conversacion_id', params.id)
    .eq('eliminado', false)
    .order('created_at', { ascending: true })
    .limit(100)

  // Marcar como leídos
  await admin
    .from('conversacion_participantes')
    .update({ ultimo_leido_at: new Date().toISOString() })
    .eq('conversacion_id', params.id)
    .eq('usuario_id', user.id)

  // Info de la conversación
  const { data: conv } = await admin.from('conversaciones').select('*').eq('id', params.id).single()

  return NextResponse.json({ conversacion: conv, mensajes: mensajes ?? [] })
}

// POST: Enviar mensaje
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()

  // Verificar participación y permisos
  const { data: part } = await admin
    .from('conversacion_participantes')
    .select('puede_escribir')
    .eq('conversacion_id', params.id)
    .eq('usuario_id', user.id)
    .single()

  if (!part) return NextResponse.json({ error: 'No eres participante' }, { status: 403 })
  if (!part.puede_escribir) return NextResponse.json({ error: 'No tienes permisos de escritura' }, { status: 403 })

  // Verificar que el chat está habilitado
  const { data: conv } = await admin.from('conversaciones').select('chat_habilitado').eq('id', params.id).single()
  if (!conv?.chat_habilitado) return NextResponse.json({ error: 'Este chat está deshabilitado' }, { status: 403 })

  const { contenido, tipo_contenido } = await request.json()
  if (!contenido?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  const { data: mensaje, error } = await admin.from('mensajes').insert({
    conversacion_id: params.id,
    autor_id: user.id,
    contenido: contenido.trim(),
    tipo_contenido: tipo_contenido ?? 'texto',
  }).select('*, autor:usuarios(nombre, apellido, rol)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar timestamp de la conversación
  await admin.from('conversaciones').update({ updated_at: new Date().toISOString() }).eq('id', params.id)

  // --- SLA Tracking ---
  const { data: autorData } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  const rolAutor = (autorData as any)?.rol
  const esStaff = ['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'tutor'].includes(rolAutor)
  const esFamilia = ['apoderado', 'alumno'].includes(rolAutor)

  if (esFamilia) {
    // Familia envió mensaje: marcar como pendiente respuesta
    await admin.from('conversaciones').update({
      ultimo_mensaje_familia_at: new Date().toISOString(),
      primera_respuesta_staff_at: null,
      pendiente_respuesta: true,
    }).eq('id', params.id)
  } else if (esStaff) {
    // Staff respondió: registrar tiempo de respuesta si había mensaje pendiente
    const { data: convSla } = await admin.from('conversaciones')
      .select('ultimo_mensaje_familia_at, pendiente_respuesta, colegio_id')
      .eq('id', params.id).single()

    if (convSla && (convSla as any).pendiente_respuesta && (convSla as any).ultimo_mensaje_familia_at) {
      const ahora = new Date()
      const mensajeFamiliaAt = new Date((convSla as any).ultimo_mensaje_familia_at)
      const tiempoMin = Math.round((ahora.getTime() - mensajeFamiliaAt.getTime()) / 60000)

      // Registrar en historial SLA
      await admin.from('sla_respuestas').insert({
        conversacion_id: params.id,
        colegio_id: (convSla as any).colegio_id,
        mensaje_familia_at: (convSla as any).ultimo_mensaje_familia_at,
        respuesta_staff_at: ahora.toISOString(),
        respondido_por: user.id,
        tiempo_respuesta_min: tiempoMin,
      })

      // Marcar conversación como respondida
      await admin.from('conversaciones').update({
        primera_respuesta_staff_at: ahora.toISOString(),
        pendiente_respuesta: false,
      }).eq('id', params.id)
    }
  }

  return NextResponse.json(mensaje, { status: 201 })
}

// PATCH: Habilitar/deshabilitar chat (solo admin)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const updates: any = {}
  if (body.chat_habilitado !== undefined) updates.chat_habilitado = body.chat_habilitado
  if (body.activa !== undefined) updates.activa = body.activa

  const { data, error } = await admin.from('conversaciones').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
