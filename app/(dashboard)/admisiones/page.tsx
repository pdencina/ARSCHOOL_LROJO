import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdmisionSeguimientoClient from '@/components/admision/AdmisionSeguimientoClient'
import { getColegioScope } from '@/lib/colegioScope'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admisiones — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdmisionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador'].includes(usuario?.rol)) {
    redirect('/inicio')
  }

  // Alcance de sedes (super_admin: todas o elegida; coordinador: sus sedes; resto: su sede)
  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : [usuario.colegio_id ?? '__none__']

  let query = admin
    .from('pre_admisiones')
    .select('*')
    .in('colegio_id', colegioIdsSafe)
    .order('created_at', { ascending: false })

  // Coordinador: acotar a las admisiones de sus programas
  if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0) {
    query = query.in('programa_id', usuario.programa_ids)
  }

  const { data: preAdmisiones } = await query

  // Eliminar es destructivo: solo roles de administración y coordinador (de su programa)
  const puedeEliminar = ['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario.rol)

  return (
    <AdmisionSeguimientoClient
      preAdmisiones={(preAdmisiones as any[]) ?? []}
      puedeEliminar={puedeEliminar}
    />
  )
}
