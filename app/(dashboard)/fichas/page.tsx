export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FichasClient from '@/components/fichas/FichasClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function FichasPage({ searchParams }: { searchParams: { materia?: string; grado?: string; tipo?: string; q?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const rol = (ur as any)?.rol ?? 'admin'

  let query = admin.from('fichas').select('*')
    .or(`colegio_id.eq.${colegioId},es_publica.eq.true`)
    .order('descargas', { ascending: false })
    .limit(60)

  if (searchParams.materia) query = query.eq('materia', searchParams.materia)
  if (searchParams.grado)   query = query.eq('grado',   searchParams.grado)
  if (searchParams.tipo)    query = query.eq('tipo',    searchParams.tipo)
  if (searchParams.q)       query = query.ilike('titulo', `%${searchParams.q}%`)

  const { data: fichas } = await query

  const { data: todasFichas } = await admin.from('fichas').select('materia')
    .or(`colegio_id.eq.${colegioId},es_publica.eq.true`)

  const conteosPorMateria: Record<string, number> = {}
  ;(todasFichas ?? []).forEach((f: any) => {
    conteosPorMateria[f.materia] = (conteosPorMateria[f.materia] ?? 0) + 1
  })

  return (
    <FichasClient
      fichas={(fichas as any[]) ?? []}
      conteosPorMateria={conteosPorMateria}
      filtrosActivos={searchParams}
      colegioId={colegioId}
      rol={rol}
      userId={user.id}
    />
  )
}
