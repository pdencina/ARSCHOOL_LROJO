import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdminClient()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data } = await admin.from('usuarios').select('*, colegio:colegios(nombre)').order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdminClient()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { nombre, apellido, email, password, rol, colegio_id } = await request.json()
  if (!email || !password || !nombre || !colegio_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Verificar si ya existe en public.usuarios
  const { data: existente } = await admin.from('usuarios').select('id').eq('email', email).single()
  if (existente) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
  }

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    // Si ya existe en auth pero no en usuarios, recuperar el ID
    if (authError.message?.includes('already been registered')) {
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find((u: any) => u.email === email)
      if (existing) {
        const { data: nuevoUsuario, error: dbError } = await admin.from('usuarios').upsert({
          id: existing.id, email, nombre: nombre.trim(), apellido: apellido?.trim() ?? '',
          rol, colegio_id, activo: true,
        }, { onConflict: 'id' }).select().single()
        if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
        return NextResponse.json(nuevoUsuario, { status: 201 })
      }
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. Insertar en tabla usuarios
  const { data: nuevoUsuario, error: dbError } = await admin.from('usuarios').upsert({
    id: authData.user.id,
    email,
    nombre: nombre.trim(),
    apellido: apellido?.trim() ?? '',
    rol,
    colegio_id,
    activo: true,
  }, { onConflict: 'id' }).select().single()

  if (dbError) {
    // Rollback: eliminar usuario de auth
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(nuevoUsuario, { status: 201 })
}