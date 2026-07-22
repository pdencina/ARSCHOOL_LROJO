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

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { nombre, rut, direccion, telefono } = body

  if (!usuario.colegio_id) {
    return NextResponse.json({ error: 'No hay colegio asociado' }, { status: 400 })
  }

  const { data, error } = await admin.from('colegios').update({
    nombre: nombre?.trim() || undefined,
    rut: rut?.trim() || undefined,
    direccion: direccion?.trim() || undefined,
    telefono: telefono?.trim() || undefined,
  }).eq('id', usuario.colegio_id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
