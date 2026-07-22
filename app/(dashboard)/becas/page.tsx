export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import BecasClient from '@/components/becas/BecasClient'

export const metadata = { title: 'Becas — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function BecasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) redirect('/inicio')

  const colegioId = (ur as any)?.colegio_id
  const anioActual = new Date().getFullYear()
  const anioEscolar = new Date().getMonth() >= 6 ? anioActual + 1 : anioActual

  const [{ data: becas }, { data: alumnos }] = await Promise.all([
    admin.from('becas')
      .select('*, alumno:alumnos(nombre, apellido, curso, rut), familia:familias(nombre_apoderado, apellido_apoderado, email)')
      .eq('colegio_id', colegioId)
      .eq('anio_escolar', anioEscolar)
      .order('created_at', { ascending: false }),
    admin.from('alumnos')
      .select('id, nombre, apellido, curso, rut')
      .eq('colegio_id', colegioId)
      .eq('activo', true)
      .order('apellido'),
  ])

  return (
    <BecasClient
      becas={(becas as any[]) ?? []}
      alumnos={(alumnos as any[]) ?? []}
      anioEscolar={anioEscolar}
      rol={(ur as any)?.rol}
    />
  )
}
