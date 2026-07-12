export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PlanificacionClient from '@/components/planificacion/PlanificacionClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function PlanificacionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id

  // Obtener propuestas existentes
  const { data: propuestas } = await admin
    .from('propuestas_horario')
    .select('*')
    .eq('colegio_id', colegioId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Resumen de alumnos por curso
  const { data: alumnos } = await admin.from('alumnos').select('curso').eq('colegio_id', colegioId).eq('activo', true)
  const resumenCursos: Record<string, number> = {}
  ;(alumnos ?? []).forEach((a: any) => { resumenCursos[a.curso] = (resumenCursos[a.curso] || 0) + 1 })

  return (
    <PlanificacionClient
      propuestas={(propuestas as any[]) ?? []}
      resumenCursos={resumenCursos}
    />
  )
}
