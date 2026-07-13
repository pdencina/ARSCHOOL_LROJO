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

// GET: Obtener entregas (tutor ve todas de una tarea, alumno ve las suyas)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any

  const { searchParams } = new URL(request.url)
  const tareaId = searchParams.get('tarea_id')
  const alumnoId = searchParams.get('alumno_id')

  let query = admin.from('entregas_tarea').select('*, alumno:alumnos(nombre, apellido, curso)')

  if (tareaId) query = query.eq('tarea_id', tareaId)
  if (alumnoId) query = query.eq('alumno_id', alumnoId)

  // Alumnos solo ven sus propias entregas
  if (u?.rol === 'alumno') {
    query = query.eq('usuario_id', user.id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: Alumno entrega una tarea
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any

  if (u?.rol !== 'alumno') {
    return NextResponse.json({ error: 'Solo alumnos pueden entregar tareas' }, { status: 403 })
  }

  const body = await request.json()
  const { tarea_id, archivo_url, archivo_nombre, comentario_alumno } = body

  if (!tarea_id) {
    return NextResponse.json({ error: 'tarea_id es requerido' }, { status: 400 })
  }

  // Obtener alumno_id del usuario
  const { data: va } = await admin
    .from('usuario_alumno')
    .select('alumno_id')
    .eq('usuario_id', user.id)
    .single()

  if (!va) {
    return NextResponse.json({ error: 'No hay alumno vinculado a este usuario' }, { status: 400 })
  }

  const alumnoId = (va as any).alumno_id

  // Verificar que la tarea existe y está activa
  const { data: tarea } = await admin
    .from('tareas')
    .select('id, estado, colegio_id')
    .eq('id', tarea_id)
    .single()

  if (!tarea) {
    return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
  }

  // Insertar o actualizar entrega (upsert por unique constraint)
  const { data, error } = await admin.from('entregas_tarea').upsert({
    tarea_id,
    alumno_id: alumnoId,
    usuario_id: user.id,
    archivo_url: archivo_url || null,
    archivo_nombre: archivo_nombre || null,
    comentario_alumno: comentario_alumno?.trim() || null,
    estado: 'entregada',
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'tarea_id,alumno_id',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PUT: Tutor califica una entrega
export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any

  if (!['super_admin', 'admin', 'tutor'].includes(u?.rol)) {
    return NextResponse.json({ error: 'Sin permisos para calificar' }, { status: 403 })
  }

  const body = await request.json()
  const { id, puntaje, comentario_tutor, estado } = body

  if (!id) return NextResponse.json({ error: 'ID de entrega requerido' }, { status: 400 })

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    calificado_por: user.id,
    calificado_at: new Date().toISOString(),
  }

  if (puntaje !== undefined) payload.puntaje = puntaje
  if (comentario_tutor !== undefined) payload.comentario_tutor = comentario_tutor?.trim() || null
  if (estado) payload.estado = estado
  else payload.estado = 'calificada'

  const { data, error } = await admin
    .from('entregas_tarea')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
