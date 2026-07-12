export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PlanificacionClient from '@/components/planificacion/PlanificacionClient'
import HorarioTutorView from '@/components/planificacion/HorarioTutorView'

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
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, nombre, apellido').eq('id', user.id).single()
  const usuario = ur as any
  const colegioId = usuario?.colegio_id
  const rol = usuario?.rol

  // --- VISTA TUTOR: solo ve su horario personal publicado ---
  if (rol === 'tutor') {
    const nombreTutor = `${usuario.nombre} ${usuario.apellido}`

    // Buscar la propuesta publicada más reciente del colegio
    const { data: publicada } = await admin
      .from('propuestas_horario')
      .select('*')
      .eq('colegio_id', colegioId)
      .eq('estado', 'publicado')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return (
      <HorarioTutorView
        propuesta={(publicada as any)?.propuesta ?? null}
        nombreTutor={nombreTutor}
      />
    )
  }

  // --- VISTA ADMIN: generador + publicación ---
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
