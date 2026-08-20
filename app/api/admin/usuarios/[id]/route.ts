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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  const miRol = (ur as any)?.rol
  if (miRol !== 'super_admin' && miRol !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const updates: any = {}
  if (body.nombre) updates.nombre = body.nombre.trim()
  if (body.apellido !== undefined) updates.apellido = body.apellido.trim()
  if (body.rol) updates.rol = body.rol
  if (body.colegio_id && miRol === 'super_admin') updates.colegio_id = body.colegio_id
  if (body.activo !== undefined) updates.activo = body.activo

  const { data, error } = await admin
    .from('usuarios')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // No permitir eliminarse a sí mismo
  if (params.id === user.id) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })

  // Eliminar de tabla usuarios
  await admin.from('tutor_alumnos').delete().eq('tutor_id', params.id)
  await admin.from('usuarios').delete().eq('id', params.id)

  // Eliminar de Supabase Auth
  await admin.auth.admin.deleteUser(params.id)

  return NextResponse.json({ ok: true })
}
