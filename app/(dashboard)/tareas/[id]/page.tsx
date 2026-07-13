export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import EntregasClient from '@/components/tareas/EntregasClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function TareaDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any
  if (!['super_admin', 'admin', 'tutor'].includes(u?.rol)) redirect('/inicio')

  // Obtener tarea
  const { data: tarea } = await admin
    .from('tareas')
    .select('*')
    .eq('id', params.id)
    .eq('colegio_id', u.colegio_id)
    .single()

  if (!tarea) redirect('/tareas')

  // Obtener entregas de esta tarea
  const { data: entregas } = await admin
    .from('entregas_tarea')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .eq('tarea_id', params.id)
    .order('created_at', { ascending: true })

  // Obtener alumnos del curso para saber quién no entregó
  const { data: alumnosCurso } = await admin
    .from('alumnos')
    .select('id, nombre, apellido')
    .eq('colegio_id', u.colegio_id)
    .eq('curso', (tarea as any).curso)
    .eq('activo', true)
    .order('apellido')

  return (
    <EntregasClient
      tarea={tarea as any}
      entregas={(entregas as any[]) ?? []}
      alumnosCurso={(alumnosCurso as any[]) ?? []}
    />
  )
}
