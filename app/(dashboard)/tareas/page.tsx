export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import TareasClient from '@/components/tareas/TareasClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function TareasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'tutor'].includes(u?.rol)) redirect('/inicio')

  // Obtener tareas
  let query = admin
    .from('tareas')
    .select('*')
    .eq('colegio_id', u.colegio_id)
    .order('created_at', { ascending: false })

  // Tutores solo ven sus propias tareas
  if (u.rol === 'tutor') {
    query = query.eq('tutor_id', user.id)
  }

  const { data: tareas } = await query

  // Obtener cursos disponibles
  const { data: alumnos } = await admin
    .from('alumnos')
    .select('curso')
    .eq('colegio_id', u.colegio_id)
    .eq('activo', true)

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].filter(Boolean).sort()

  return (
    <TareasClient
      tareas={(tareas as any[]) ?? []}
      cursos={cursos}
    />
  )
}
