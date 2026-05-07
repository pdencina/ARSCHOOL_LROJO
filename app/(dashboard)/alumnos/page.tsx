export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import AlumnosClient from '@/components/alumnos/AlumnosClient'
export const metadata = { title: 'Alumnos — AR School' }

export default async function AlumnosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('*, familias(nombre_apoderado, apellido_apoderado, email, telefono)')
    .eq('colegio_id', colegioId)
    .order('apellido')

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return <AlumnosClient alumnos={(alumnos as any[]) ?? []} cursos={cursos} colegioId={colegioId} />
}