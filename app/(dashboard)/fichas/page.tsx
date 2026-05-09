export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import FichasClient from '@/components/fichas/FichasClient'

export const metadata = { title: 'Fichas Pedagógicas — AR School' }

export default async function FichasPage({
  searchParams,
}: {
  searchParams: { materia?: string; grado?: string; tipo?: string; q?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id, rol').eq('id', user!.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const rol = (ur as any)?.rol ?? 'admin'

  // Fichas del colegio + públicas
  let query = supabase
    .from('fichas')
    .select('*')
    .or(`colegio_id.eq.${colegioId},es_publica.eq.true`)
    .order('descargas', { ascending: false })
    .limit(60)

  if (searchParams.materia) query = query.eq('materia', searchParams.materia)
  if (searchParams.grado)   query = query.eq('grado',   searchParams.grado)
  if (searchParams.tipo)    query = query.eq('tipo',    searchParams.tipo)
  if (searchParams.q)       query = query.ilike('titulo', `%${searchParams.q}%`)

  const { data: fichas } = await query

  const { data: conteosRaw } = await supabase
    .from('fichas')
    .select('materia')
    .or(`colegio_id.eq.${colegioId},es_publica.eq.true`)

  const conteosPorMateria: Record<string, number> = {}
  ;(conteosRaw ?? []).forEach((f: any) => {
    conteosPorMateria[f.materia] = (conteosPorMateria[f.materia] ?? 0) + 1
  })

  return (
    <FichasClient
      fichas={(fichas as any[]) ?? []}
      conteosPorMateria={conteosPorMateria}
      filtrosActivos={searchParams}
      colegioId={colegioId}
      rol={rol}
      userId={user!.id}
    />
  )
}