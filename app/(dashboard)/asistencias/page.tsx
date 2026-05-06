export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import AsistenciasClient from '@/components/asistencias/AsistenciasClient'

export const metadata = { title: 'Asistencias — AR School' }

export default async function AsistenciasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuarioRaw } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (usuarioRaw as any)?.colegio_id ?? ''

  const hoy = new Date().toISOString().split('T')[0]

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('*, asistencia_hoy:asistencias!inner(estado, hora_ingreso, observacion)')
    .eq('colegio_id', colegioId)
    .eq('activo', true)
    .eq('asistencias.fecha', hoy)
    .order('apellido')

  const { data: alumnosSinAsistencia } = await supabase
    .from('alumnos')
    .select('*')
    .eq('colegio_id', colegioId)
    .eq('activo', true)
    .order('apellido')

  const { data: asistenciasHoy } = await supabase
    .from('asistencias')
    .select('*, alumno:alumnos(*)')
    .eq('colegio_id', colegioId)
    .eq('fecha', hoy)

  const cursos = [...new Set((alumnosSinAsistencia ?? []).map((a: any) => a.curso))].sort()

  return (
    <AsistenciasClient
      alumnos={(alumnosSinAsistencia as any[]) ?? []}
      asistenciasHoy={(asistenciasHoy as any[]) ?? []}
      cursos={cursos}
      colegioId={colegioId}
      fecha={hoy}
    />
  )
}