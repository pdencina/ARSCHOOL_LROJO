export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalificacionesClient from '@/components/calificaciones/CalificacionesClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function CalificacionesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const [{ data: evaluaciones }, { data: alumnos }] = await Promise.all([
    admin.from('evaluaciones')
      .select('*, calificaciones(nota, alumno:alumnos(nombre, apellido))')
      .eq('colegio_id', colegioId)
      .order('fecha', { ascending: false })
      .limit(20),
    admin.from('alumnos').select('*').eq('colegio_id', colegioId).eq('activo', true).order('apellido'),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return (
    <CalificacionesClient
      evaluaciones={(evaluaciones as any[]) ?? []}
      alumnos={(alumnos as any[]) ?? []}
      cursos={cursos}
      colegioId={colegioId}
    />
  )
}
