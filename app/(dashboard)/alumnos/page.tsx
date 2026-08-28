export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AlumnosClient from '@/components/alumnos/AlumnosClient'
import { getColegioScope } from '@/lib/colegioScope'

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
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any

  // Alcance de sedes (super_admin: todas o una elegida)
  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : ['__none__']
  const colegioId = scope.colegioId ?? usuario?.colegio_id ?? (colegioIds[0] ?? '')

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('*, familias(nombre_apoderado, apellido_apoderado, email, telefono)')
    .in('colegio_id', colegioIdsSafe)
    .order('apellido')

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return <AlumnosClient alumnos={(alumnos as any[]) ?? []} cursos={cursos} colegioId={colegioId} />
}
