export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanificacionClient from '@/components/tutor/PlanificacionClient'

export const metadata = { title: 'Planificación — AR School' }

export default async function PlanificacionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ur } = await supabase.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const u = ur as any
  if (!['tutor','admin','super_admin'].includes(u?.rol)) redirect('/inicio')

  const colegioId = u.colegio_id ?? ''

  const [{ data: planificaciones }, { data: alumnos }] = await Promise.all([
    supabase.from('planificaciones')
      .select('*')
      .eq('colegio_id', colegioId)
      .order('fecha', { ascending: false })
      .limit(50),
    supabase.from('alumnos')
      .select('curso')
      .eq('colegio_id', colegioId)
      .eq('activo', true),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return (
    <PlanificacionClient
      planificaciones={(planificaciones as any[]) ?? []}
      cursos={cursos}
      colegioId={colegioId}
      tutorId={user.id}
    />
  )
}