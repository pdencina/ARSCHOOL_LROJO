export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AlumnosClient from '@/components/alumnos/AlumnosClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AlumnosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('*, familias(nombre_apoderado, apellido_apoderado, email, telefono)')
    .eq('colegio_id', colegioId)
    .order('apellido')

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return <AlumnosClient alumnos={(alumnos as any[]) ?? []} cursos={cursos} colegioId={colegioId} />
}
