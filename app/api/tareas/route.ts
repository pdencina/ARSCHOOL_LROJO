import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notificarNuevaTarea } from '@/lib/notificaciones'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET: Listar tareas del colegio (filtrable por curso, estado)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any
  if (!['super_admin', 'admin', 'tutor'].includes(u?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const curso = searchParams.get('curso')
  const estado = searchParams.get('estado')

  let query = admin
    .from('tareas')
    .select('*')
    .eq('colegio_id', u.colegio_id)
    .order('fecha_entrega', { ascending: true })

  if (curso) query = query.eq('curso', curso)
  if (estado) query = query.eq('estado', estado)

  // Tutores solo ven sus propias tareas
  if (u.rol === 'tutor') {
    query = query.eq('tutor_id', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: Crear nueva tarea
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any
  if (!['super_admin', 'admin', 'tutor'].includes(u?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { titulo, descripcion, materia, curso, fecha_entrega, puntaje_max } = body

  if (!titulo || !curso) {
    return NextResponse.json({ error: 'Título y curso son requeridos' }, { status: 400 })
  }

  const { data, error } = await admin.from('tareas').insert({
    colegio_id: u.colegio_id,
    titulo: titulo.trim(),
    descripcion: descripcion?.trim() || null,
    materia: materia || null,
    curso,
    fecha_entrega: fecha_entrega || null,
    puntaje_max: puntaje_max || null,
    tutor_id: user.id,
    creado_por: user.id,
    estado: 'activa',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar apoderados del curso (fire and forget)
  notificarNuevaTarea(u.colegio_id, titulo.trim(), curso, materia || null, fecha_entrega || null).catch(console.error)

  return NextResponse.json(data, { status: 201 })
}

// PUT: Actualizar tarea existente
export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any
  if (!['super_admin', 'admin', 'tutor'].includes(u?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  // Limpiar campos
  const payload: Record<string, any> = { updated_at: new Date().toISOString() }
  if (updates.titulo !== undefined) payload.titulo = updates.titulo.trim()
  if (updates.descripcion !== undefined) payload.descripcion = updates.descripcion?.trim() || null
  if (updates.materia !== undefined) payload.materia = updates.materia || null
  if (updates.curso !== undefined) payload.curso = updates.curso
  if (updates.fecha_entrega !== undefined) payload.fecha_entrega = updates.fecha_entrega || null
  if (updates.puntaje_max !== undefined) payload.puntaje_max = updates.puntaje_max || null
  if (updates.estado !== undefined) payload.estado = updates.estado

  const { data, error } = await admin
    .from('tareas')
    .update(payload)
    .eq('id', id)
    .eq('colegio_id', u.colegio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: Eliminar tarea
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any
  if (!['super_admin', 'admin', 'tutor'].includes(u?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { error } = await admin
    .from('tareas')
    .delete()
    .eq('id', id)
    .eq('colegio_id', u.colegio_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
