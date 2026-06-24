export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PermisosClient from '@/components/admin/PermisosClient'

export const metadata = { title: 'Permisos — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function PermisosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/inicio')

  const { data: permisos } = await admin.from('permisos_rol').select('*').is('colegio_id', null).order('rol').order('modulo')

  return <PermisosClient permisos={(permisos as any[]) ?? []} />
}
