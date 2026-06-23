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

function generarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  for (let i = 0; i < 8; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)]
  }
  return codigo
}

// GET: Listar invitaciones del colegio
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data } = await admin
    .from('invitaciones')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .eq('colegio_id', (ur as any).colegio_id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

// POST: Crear invitación para un alumno
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { alumno_id, parentesco } = await request.json()
  if (!alumno_id) return NextResponse.json({ error: 'alumno_id requerido' }, { status: 400 })

  const codigo = generarCodigo()

  const { data, error } = await admin.from('invitaciones').insert({
    colegio_id: (ur as any).colegio_id,
    alumno_id,
    codigo,
    parentesco: parentesco ?? 'apoderado',
  }).select('*, alumno:alumnos(nombre, apellido, curso)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
