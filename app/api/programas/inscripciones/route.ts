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

// POST /api/programas/inscripciones — Inscribir alumno en un programa
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes(usuario?.rol)) {
    // Check if coordinador with access
    if (!usuario?.programa_ids || usuario.programa_ids.length === 0) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
  }

  const body = await request.json()
  const { alumno_id, programa_id, horario, nivel, observaciones } = body

  if (!alumno_id || !programa_id) {
    return NextResponse.json({ error: 'alumno_id y programa_id son requeridos' }, { status: 400 })
  }

  // Verificar acceso al programa
  if (usuario.programa_ids && usuario.programa_ids.length > 0 && !usuario.programa_ids.includes(programa_id)) {
    return NextResponse.json({ error: 'No tiene acceso a este programa' }, { status: 403 })
  }

  const { data, error } = await admin.from('inscripciones_programa').upsert({
    alumno_id,
    programa_id,
    colegio_id: usuario.colegio_id,
    horario: horario || null,
    nivel: nivel || null,
    observaciones: observaciones || null,
    estado: body.estado || 'activa',
    fecha_prueba: body.estado === 'prueba' ? new Date().toISOString().split('T')[0] : null,
  }, { onConflict: 'alumno_id,programa_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET /api/programas/inscripciones?programa_id=xxx — Listar inscritos
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids').eq('id', user.id).single()
  const usuario = ur as any

  const { searchParams } = new URL(request.url)
  const programaId = searchParams.get('programa_id')

  let query = admin
    .from('inscripciones_programa')
    .select('*, alumno:alumnos(id, nombre, apellido, rut, curso, fecha_nacimiento, sexo), programa:programas(nombre, codigo, color, icono)')
    .eq('colegio_id', usuario.colegio_id)
    .in('estado', ['activa', 'prueba'])
    .order('created_at', { ascending: false })

  if (programaId) {
    query = query.eq('programa_id', programaId)
  } else if (usuario.programa_ids && usuario.programa_ids.length > 0) {
    query = query.in('programa_id', usuario.programa_ids)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// DELETE /api/programas/inscripciones — Dar de baja inscripción
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const inscripcionId = searchParams.get('id')
  const alumnoId = searchParams.get('alumno_id')
  const programaId = searchParams.get('programa_id')

  if (!inscripcionId && !(alumnoId && programaId)) {
    return NextResponse.json({ error: 'Se requiere id o alumno_id+programa_id' }, { status: 400 })
  }

  // Buscar la inscripción
  let query = admin.from('inscripciones_programa').select('id, alumno_id, programa_id').eq('colegio_id', usuario.colegio_id)
  if (inscripcionId) {
    query = query.eq('id', inscripcionId)
  } else {
    query = query.eq('alumno_id', alumnoId!).eq('programa_id', programaId!)
  }
  const { data: inscripcion } = await query.single()
  if (!inscripcion) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })

  const ins = inscripcion as any

  // Verificar acceso al programa (coordinadores solo su programa)
  if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0 && !usuario.programa_ids.includes(ins.programa_id)) {
    return NextResponse.json({ error: 'No tiene acceso a este programa' }, { status: 403 })
  }

  // Marcar inscripción como finalizada
  await admin.from('inscripciones_programa').update({ estado: 'finalizada', fecha_fin: new Date().toISOString().split('T')[0] }).eq('id', ins.id)

  // Desactivar alumno si no tiene otras inscripciones activas
  const { data: otrasInscripciones } = await admin
    .from('inscripciones_programa')
    .select('id')
    .eq('alumno_id', ins.alumno_id)
    .in('estado', ['activa', 'prueba'])
    .neq('id', ins.id)

  if (!otrasInscripciones || otrasInscripciones.length === 0) {
    await admin.from('alumnos').update({ activo: false }).eq('id', ins.alumno_id)
  }

  return NextResponse.json({ ok: true, alumno_desactivado: !otrasInscripciones || otrasInscripciones.length === 0 })
}
