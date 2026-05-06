export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CalificacionesClient from '@/components/calificaciones/CalificacionesClient'

export const metadata = { title: 'Calificaciones — AR School' }

export default async function CalificacionesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuarioRaw } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (usuarioRaw as any)?.colegio_id ?? ''

  const { data: evaluaciones } = await supabase
    .from('evaluaciones')
    .select('*, calificaciones(nota, alumno:alumnos(nombre, apellido))')
    .eq('colegio_id', colegioId)
    .order('fecha', { ascending: false })
    .limit(20)

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('*')
    .eq('colegio_id', colegioId)
    .eq('activo', true)
    .order('apellido')

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