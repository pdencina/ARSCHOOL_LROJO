export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import GestionarColegioClient from '@/components/admin/GestionarColegioClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function GestionarColegioPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/inicio')

  const [{ data: colegio }, { data: usuarios }, { data: alumnos }] = await Promise.all([
    admin.from('colegios').select('*').eq('id', params.id).single(),
    admin.from('usuarios').select('*').eq('colegio_id', params.id).order('rol'),
    admin.from('alumnos').select('id, nombre, apellido, curso, activo').eq('colegio_id', params.id).eq('activo', true).order('apellido'),
  ])

  if (!colegio) redirect('/super-admin')

  return (
    <GestionarColegioClient
      colegio={colegio as any}
      usuarios={(usuarios as any[]) ?? []}
      alumnos={(alumnos as any[]) ?? []}
    />
  )
}
