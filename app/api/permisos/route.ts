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

// GET: Obtener matriz de permisos
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data } = await admin.from('permisos_rol').select('*').is('colegio_id', null).order('rol').order('modulo')
  return NextResponse.json(data ?? [])
}

// PATCH: Actualizar un permiso
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { rol, modulo, habilitado } = await request.json()
  if (!rol || !modulo || habilitado === undefined) {
    return NextResponse.json({ error: 'rol, modulo y habilitado son requeridos' }, { status: 400 })
  }

  // Buscar si ya existe
  const { data: existing } = await admin
    .from('permisos_rol')
    .select('id')
    .is('colegio_id', null)
    .eq('rol', rol)
    .eq('modulo', modulo)
    .single()

  let data, error
  if (existing) {
    // Update
    const result = await admin.from('permisos_rol').update({ habilitado }).eq('id', existing.id).select().single()
    data = result.data
    error = result.error
  } else {
    // Insert
    const result = await admin.from('permisos_rol').insert({
      colegio_id: null, rol, modulo, habilitado,
    }).select().single()
    data = result.data
    error = result.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
