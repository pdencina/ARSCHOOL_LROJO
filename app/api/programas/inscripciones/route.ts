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

// Lista de colegio_ids que puede ver el usuario (incluye sedes_ids de coordinador multi-sede).
function sedesDelUsuario(usuario: any): string[] {
  const propio = usuario?.colegio_id ? [usuario.colegio_id] : []
  const extra = Array.isArray(usuario?.sedes_ids) ? usuario.sedes_ids : []
  const ids = Array.from(new Set([...propio, ...extra]))
  return ids.length ? ids : ['__none__']
}

// Deriva atributos estructurados desde el texto de `nivel`.
// Ejemplos: "Ciclo 1 - Guitarra" | "Sub-12" | "Music and Play (0-4 años)"
function parsearNivel(nivel: string): { instrumento?: string; ciclo?: string; categoria?: string; rango_edad?: string } {
  const out: { instrumento?: string; ciclo?: string; categoria?: string; rango_edad?: string } = {}
  if (!nivel) return out

  // AR Worship: "Ciclo 1 - Guitarra"
  const cicloMatch = nivel.match(/Ciclo\s*(\d)/i)
  if (cicloMatch) out.ciclo = `Ciclo ${cicloMatch[1]}`
  const instrumentos = ['Guitarra', 'Bajo', 'Teclado', 'Batería', 'Bateria', 'Canto', 'Saxophone', 'Saxofón', 'Violín', 'Violin']
  const instr = instrumentos.find(i => nivel.toLowerCase().includes(i.toLowerCase()))
  if (instr) out.instrumento = instr

  // Lions Soccer: "Sub-12", "Juvenil"
  const subMatch = nivel.match(/Sub-?\s*(\d{1,2})/i)
  if (subMatch) out.categoria = `Sub-${subMatch[1]}`
  else if (/juvenil/i.test(nivel)) out.categoria = 'Juvenil'

  // Music and Play: "(0-4 años)" / "(4-7 años)"
  const edadMatch = nivel.match(/(\d\s*-\s*\d)\s*años/i)
  if (edadMatch) out.rango_edad = `${edadMatch[1].replace(/\s/g, '')} años`

  return out
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

  const base: Record<string, any> = {
    alumno_id,
    programa_id,
    colegio_id: usuario.colegio_id,
    horario: horario || null,
    nivel: nivel || null,
    observaciones: observaciones || null,
    estado: body.estado || 'activa',
    fecha_prueba: body.estado === 'prueba' ? new Date().toISOString().split('T')[0] : null,
  }
  // Atributos estructurados (migración 046). Opcionales y resilientes si faltan columnas.
  // Si no vienen explícitos, se intentan derivar del texto de `nivel`
  // (ej: "Ciclo 1 - Guitarra", "Sub-12", "Music and Play (0-4 años)").
  const parsed = parsearNivel(nivel || '')
  const atributos: Record<string, any> = {
    instrumento: body.instrumento || parsed.instrumento || null,
    ciclo: body.ciclo || parsed.ciclo || null,
    categoria: body.categoria || parsed.categoria || null,
    posicion: body.posicion || null,
    rango_edad: body.rango_edad || parsed.rango_edad || null,
  }

  let { data, error } = await admin.from('inscripciones_programa')
    .upsert({ ...base, ...atributos }, { onConflict: 'alumno_id,programa_id' }).select().single()
  // Reintento sin atributos si la instancia aún no aplicó la migración 046
  if (error && /(instrumento|ciclo|categoria|posicion|rango_edad)/.test(error.message)) {
    const retry = await admin.from('inscripciones_programa')
      .upsert(base, { onConflict: 'alumno_id,programa_id' }).select().single()
    data = retry.data; error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET /api/programas/inscripciones?programa_id=xxx — Listar inscritos
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any

  const { searchParams } = new URL(request.url)
  const programaId = searchParams.get('programa_id')

  let query = admin
    .from('inscripciones_programa')
    .select('*, alumno:alumnos(id, nombre, apellido, rut, curso, fecha_nacimiento, sexo), programa:programas(nombre, codigo, color, icono)')
    .in('colegio_id', sedesDelUsuario(usuario))
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

// PATCH /api/programas/inscripciones — Convertir prueba -> activa (u otros cambios de estado)
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { inscripcion_id, alumno_id, programa_id, accion } = body // accion: 'convertir' | 'suspender' | 'reactivar'

  // Localizar inscripción
  let query = admin.from('inscripciones_programa').select('id, alumno_id, programa_id, estado').in('colegio_id', sedesDelUsuario(usuario))
  if (inscripcion_id) query = query.eq('id', inscripcion_id)
  else if (alumno_id && programa_id) query = query.eq('alumno_id', alumno_id).eq('programa_id', programa_id)
  else return NextResponse.json({ error: 'Se requiere inscripcion_id o alumno_id+programa_id' }, { status: 400 })

  const { data: inscripcion } = await query.single()
  if (!inscripcion) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
  const ins = inscripcion as any

  // Coordinador solo su programa
  if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0 && !usuario.programa_ids.includes(ins.programa_id)) {
    return NextResponse.json({ error: 'No tiene acceso a este programa' }, { status: 403 })
  }

  let update: Record<string, any> = {}
  if (accion === 'convertir') {
    // Prueba -> Activa, dejando registro de conversión
    update = { estado: 'activa', convertida_at: new Date().toISOString() }
  } else if (accion === 'suspender') {
    update = { estado: 'suspendida' }
  } else if (accion === 'reactivar') {
    update = { estado: 'activa' }
  } else {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const { error } = await admin.from('inscripciones_programa').update(update).eq('id', ins.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, estado: update.estado })
}

// DELETE /api/programas/inscripciones — Dar de baja inscripción
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
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
  let query = admin.from('inscripciones_programa').select('id, alumno_id, programa_id').in('colegio_id', sedesDelUsuario(usuario))
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
