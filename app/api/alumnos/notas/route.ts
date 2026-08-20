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

// POST /api/alumnos/notas — Agregar nota al alumno
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  const body = await request.json()
  const { alumno_id, programa_id, tipo, titulo, contenido } = body

  if (!alumno_id || !contenido) {
    return NextResponse.json({ error: 'alumno_id y contenido son requeridos' }, { status: 400 })
  }

  const { data, error } = await admin.from('notas_alumno').insert({
    alumno_id,
    programa_id: programa_id || null,
    colegio_id: usuario.colegio_id,
    tipo: tipo || 'general',
    titulo: titulo || null,
    contenido,
    registrado_por: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET /api/alumnos/notas?alumno_id=xxx
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')

  if (!alumnoId) return NextResponse.json({ error: 'alumno_id requerido' }, { status: 400 })

  const { data, error } = await admin
    .from('notas_alumno')
    .select('*, registrado:usuarios(nombre, apellido)')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
