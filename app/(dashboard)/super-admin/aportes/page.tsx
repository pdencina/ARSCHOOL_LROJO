export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import SuperAdminAportesClient from '@/components/super-admin/AportesClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SuperAdminAportesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/inicio')

  const { data: aportes } = await admin
    .from('tabla_aportes')
    .select('*')
    .eq('activo', true)
    .order('anio', { ascending: false })
    .order('nivel')
    .order('tipo')
    .order('sede')

  return (
    <SuperAdminAportesClient aportes={(aportes as any[]) ?? []} />
  )
}
