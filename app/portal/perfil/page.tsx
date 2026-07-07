export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PortalPerfilClient from '@/components/portal/PortalPerfilClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function PortalPerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('*, colegio:colegios(nombre)').eq('id', user.id).single()
  const usuario = ur as any

  // Obtener hijos vinculados
  const { data: vinculos } = await admin.from('tutor_alumnos').select('alumno_id, parentesco').eq('tutor_id', user.id)
  const alumnoIds = (vinculos ?? []).map((v: any) => v.alumno_id)

  let alumnos: any[] = []
  if (alumnoIds.length > 0) {
    const { data: als } = await admin.from('alumnos').select('id, nombre, apellido, curso, rut').in('id', alumnoIds)
    alumnos = (als ?? []) as any[]
  }

  return (
    <PortalPerfilClient
      usuario={usuario}
      alumnos={alumnos}
    />
  )
}
