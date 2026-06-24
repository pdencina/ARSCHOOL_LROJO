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

// GET: Listar conversaciones del usuario
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()

  // Obtener conversaciones donde el usuario es participante
  const { data: participaciones } = await admin
    .from('conversacion_participantes')
    .select('conversacion_id, ultimo_leido_at')
    .eq('usuario_id', user.id)

  if (!participaciones || participaciones.length === 0) {
    return NextResponse.json([])
  }

  const convIds = participaciones.map(p => p.conversacion_id)

  const { data: conversaciones } = await admin
    .from('conversaciones')
    .select('*')
    .in('id', convIds)
    .eq('activa', true)
    .order('updated_at', { ascending: false })

  // Obtener último mensaje de cada conversación
  const result = await Promise.all((conversaciones ?? []).map(async (conv: any) => {
    const { data: ultimoMsg } = await admin
      .from('mensajes')
      .select('contenido, created_at, autor_id')
      .eq('conversacion_id', conv.id)
      .eq('eliminado', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { count: noLeidos } = await admin
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('conversacion_id', conv.id)
      .eq('eliminado', false)
      .gt('created_at', participaciones.find(p => p.conversacion_id === conv.id)?.ultimo_leido_at ?? '1970-01-01')

    // Obtener participantes para mostrar nombres
    const { data: parts } = await admin
      .from('conversacion_participantes')
      .select('usuario:usuarios(nombre, apellido, rol)')
      .eq('conversacion_id', conv.id)

    return {
      ...conv,
      ultimo_mensaje: ultimoMsg,
      no_leidos: noLeidos ?? 0,
      participantes: (parts ?? []).map((p: any) => p.usuario),
    }
  }))

  return NextResponse.json(result)
}

// POST: Crear nueva conversación
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'tutor'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Solo staff puede crear conversaciones' }, { status: 403 })
  }

  const { tipo, participante_id, curso, titulo } = await request.json()

  if (tipo === 'individual') {
    if (!participante_id) return NextResponse.json({ error: 'participante_id requerido' }, { status: 400 })

    // Verificar si ya existe una conversación individual entre ambos
    const { data: existentes } = await admin
      .from('conversacion_participantes')
      .select('conversacion_id')
      .eq('usuario_id', user.id)

    if (existentes && existentes.length > 0) {
      for (const e of existentes) {
        const { data: otra } = await admin
          .from('conversacion_participantes')
          .select('conversacion_id')
          .eq('conversacion_id', e.conversacion_id)
          .eq('usuario_id', participante_id)
          .single()

        if (otra) {
          // Ya existe, verificar que sea individual
          const { data: conv } = await admin.from('conversaciones').select('*').eq('id', e.conversacion_id).eq('tipo', 'individual').single()
          if (conv) return NextResponse.json(conv)
        }
      }
    }

    // Crear nueva conversación individual
    const { data: conv, error } = await admin.from('conversaciones').insert({
      colegio_id: usuario.colegio_id,
      tipo: 'individual',
      creado_por: user.id,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Agregar participantes
    await admin.from('conversacion_participantes').insert([
      { conversacion_id: conv.id, usuario_id: user.id, rol_chat: 'admin' },
      { conversacion_id: conv.id, usuario_id: participante_id, rol_chat: 'miembro' },
    ])

    return NextResponse.json(conv, { status: 201 })

  } else if (tipo === 'curso') {
    if (!curso) return NextResponse.json({ error: 'curso requerido' }, { status: 400 })

    // Crear conversación grupal por curso
    const { data: conv, error } = await admin.from('conversaciones').insert({
      colegio_id: usuario.colegio_id,
      tipo: 'curso',
      curso,
      titulo: titulo ?? `Chat ${curso}`,
      creado_por: user.id,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Agregar al creador como admin
    await admin.from('conversacion_participantes').insert({
      conversacion_id: conv.id, usuario_id: user.id, rol_chat: 'admin',
    })

    // Agregar apoderados del curso
    const { data: alumnosCurso } = await admin.from('alumnos').select('id').eq('colegio_id', usuario.colegio_id).eq('curso', curso).eq('activo', true)
    if (alumnosCurso) {
      const alumnoIds = alumnosCurso.map((a: any) => a.id)
      const { data: tutores } = await admin.from('tutor_alumnos').select('tutor_id').in('alumno_id', alumnoIds)
      const tutorIds = [...new Set((tutores ?? []).map((t: any) => t.tutor_id))]

      if (tutorIds.length > 0) {
        const inserts = tutorIds.map(tid => ({
          conversacion_id: conv.id, usuario_id: tid, rol_chat: 'miembro',
        }))
        await admin.from('conversacion_participantes').insert(inserts)
      }
    }

    return NextResponse.json(conv, { status: 201 })
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}
