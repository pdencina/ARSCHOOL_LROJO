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

// PATCH: actualizar usuario del colegio
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Verificar que el usuario target pertenece al mismo colegio
  const { data: target } = await admin.from('usuarios').select('colegio_id').eq('id', params.id).single()
  if (!target || (usuario.rol !== 'super_admin' && (target as any).colegio_id !== usuario.colegio_id)) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const body = await request.json()
  const updateData: any = {}
  if (body.nombre) updateData.nombre = body.nombre.trim()
  if (body.apellido !== undefined) updateData.apellido = body.apellido.trim()
  if (body.rol) updateData.rol = body.rol
  if (body.activo !== undefined) updateData.activo = body.activo

  const { data, error } = await admin.from('usuarios').update(updateData).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// DELETE: desactivar usuario
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Soft delete
  const { error } = await admin.from('usuarios').update({ activo: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
