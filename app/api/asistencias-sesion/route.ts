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

// POST /api/asistencias-sesion — Registrar asistencia por sesión
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador', 'tutor'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { alumno_id, programa_id, estado = 'presente', sesion_tipo, observacion } = body

  if (!alumno_id || !programa_id) {
    return NextResponse.json({ error: 'alumno_id y programa_id requeridos' }, { status: 400 })
  }

  const { data, error } = await admin.from('asistencias_sesion').insert({
    alumno_id,
    programa_id,
    colegio_id: usuario.colegio_id,
    fecha: new Date().toISOString().split('T')[0],
    estado,
    sesion_tipo: sesion_tipo || 'clase',
    observacion: observacion || null,
    registrado_por: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// GET /api/asistencias-sesion?programa_id=xxx&fecha=2027-08-20
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  const { searchParams } = new URL(request.url)
  const programaId = searchParams.get('programa_id')
  const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]

  let query = admin
    .from('asistencias_sesion')
    .select('*, alumno:alumnos(nombre, apellido)')
    .eq('colegio_id', usuario.colegio_id)
    .eq('fecha', fecha)
    .order('created_at', { ascending: false })

  if (programaId) query = query.eq('programa_id', programaId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
