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

// GET: admin del colegio ve los usuarios de su colegio
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Búsqueda por email específico (para verificar si apoderado ya existe)
  const { searchParams } = new URL(request.url)
  const emailBuscar = searchParams.get('email')
  if (emailBuscar) {
    const { data: encontrado } = await admin
      .from('usuarios')
      .select('id, nombre, apellido, email, rol')
      .eq('email', emailBuscar)
      .single()
    return NextResponse.json(encontrado ?? null)
  }

  const { data } = await admin
    .from('usuarios')
    .select('*')
    .eq('colegio_id', usuario.colegio_id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

// POST: admin del colegio crea usuario en su colegio
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { nombre, apellido, email, password, rol } = await request.json()

  if (!email || !password || !nombre) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
  }

  // Un admin de colegio solo puede crear: tutor, apoderado, alumno
  const rolesPermitidos = usuario.rol === 'super_admin'
    ? ['admin', 'gestor_admision', 'tutor', 'apoderado', 'alumno']
    : ['tutor', 'apoderado', 'alumno']

  if (!rolesPermitidos.includes(rol)) {
    return NextResponse.json({ error: `No puedes crear usuarios con rol: ${rol}` }, { status: 403 })
  }

  // Crear en Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Insertar en tabla usuarios
  const { data: nuevoUsuario, error: dbError } = await admin.from('usuarios').insert({
    id: authData.user.id,
    email,
    nombre: nombre.trim(),
    apellido: apellido?.trim() ?? '',
    rol,
    colegio_id: usuario.colegio_id,
    activo: true,
  }).select().single()

  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(nuevoUsuario, { status: 201 })
}
