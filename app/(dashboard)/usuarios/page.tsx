export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import UsuariosColegioClient from '@/components/usuarios/UsuariosColegioClient'

export const metadata = { title: 'Usuarios — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function UsuariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus'].includes(usuario?.rol)) redirect('/inicio')

  const { data: usuarios } = await admin
    .from('usuarios')
    .select('*')
    .eq('colegio_id', usuario.colegio_id)
    .order('rol')
    .order('apellido')

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, curso')
    .eq('colegio_id', usuario.colegio_id)
    .eq('activo', true)
    .order('apellido')

  return (
    <UsuariosColegioClient
      usuarios={(usuarios as any[]) ?? []}
      alumnos={(alumnos as any[]) ?? []}
      colegioId={usuario.colegio_id}
    />
  )
}
