export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import PortalTareasClient from '@/components/portal/PortalTareasClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function PortalTareasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const u = ur as any
  if (u?.rol !== 'alumno') redirect('/portal')

  const { data: va } = await admin.from('usuario_alumno').select('alumno_id, alumno:alumnos(curso)').eq('usuario_id', user.id).single()
  const alumnoId = (va as any)?.alumno_id ?? ''
  const curso = (va as any)?.alumno?.curso ?? ''

  // Obtener tareas del curso
  const { data: tareas } = await admin
    .from('tareas')
    .select('*')
    .eq('colegio_id', u.colegio_id)
    .eq('curso', curso)
    .order('fecha_entrega', { ascending: true })

  // Obtener entregas del alumno
  const { data: entregas } = await admin
    .from('entregas_tarea')
    .select('*')
    .eq('alumno_id', alumnoId)

  return (
    <PortalTareasClient
      tareas={(tareas as any[]) ?? []}
      entregas={(entregas as any[]) ?? []}
      alumnoId={alumnoId}
      curso={curso}
    />
  )
}
