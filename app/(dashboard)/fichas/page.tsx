import { createClient } from '@/lib/supabase/server'
import FichasClient from '@/components/fichas/FichasClient'

export const metadata = { title: 'Fichas Pedagógicas — Folio Verde' }

export default async function FichasPage({
  searchParams,
}: {
  searchParams: { materia?: string; grado?: string; tipo?: string; q?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('fichas')
    .select('*')
    .order('descargas', { ascending: false })
    .limit(50)

  if (searchParams.materia) query = query.eq('materia', searchParams.materia)
  if (searchParams.grado)   query = query.eq('grado', searchParams.grado)
  if (searchParams.tipo)    query = query.eq('tipo', searchParams.tipo)
  if (searchParams.q)       query = query.ilike('titulo', `%${searchParams.q}%`)

  const { data: fichas } = await query

  // Conteo por materia para sidebar
  const { data: conteos } = await supabase
    .from('fichas')
    .select('materia')

  const conteosPorMateria: Record<string, number> = {}
  conteos?.forEach(f => {
    conteosPorMateria[f.materia] = (conteosPorMateria[f.materia] ?? 0) + 1
  })

  return (
    <FichasClient
      fichas={fichas ?? []}
      conteosPorMateria={conteosPorMateria}
      filtrosActivos={searchParams}
    />
  )
}
