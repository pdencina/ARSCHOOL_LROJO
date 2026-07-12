export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import SuperAdminUsuariosClient from '@/components/super-admin/UsuariosClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SuperAdminUsuariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/inicio')

  const { data: usuarios } = await admin
    .from('usuarios')
    .select('*, colegio:colegios(nombre)')
    .order('created_at', { ascending: false })

  const { data: colegios } = await admin.from('colegios').select('id, nombre').order('nombre')

  return (
    <SuperAdminUsuariosClient
      usuarios={(usuarios as any[]) ?? []}
      colegios={(colegios as any[]) ?? []}
    />
  )
}
