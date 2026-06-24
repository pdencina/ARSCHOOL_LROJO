import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET: Retorna los módulos habilitados para el usuario actual
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null)

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = (ur as any)?.rol

  if (!rol || rol === 'super_admin') return NextResponse.json(null) // null = ver todo

  const { data: permisos } = await admin
    .from('permisos_rol')
    .select('modulo, habilitado')
    .is('colegio_id', null)
    .eq('rol', rol)

  if (!permisos || permisos.length === 0) return NextResponse.json(null)

  const habilitados = permisos.filter((p: any) => p.habilitado).map((p: any) => p.modulo)
  return NextResponse.json(habilitados)
}
