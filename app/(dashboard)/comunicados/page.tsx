export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ComunicadosClient from '@/components/comunicados/ComunicadosClient'

export const metadata = { title: 'Comunicados — AR School' }

export default async function ComunicadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const [{ data: comunicados }, { data: alumnos }] = await Promise.all([
    supabase.from('comunicados')
      .select('*, recepciones:comunicado_recepciones(estado, familia_id)')
      .eq('colegio_id', colegioId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('alumnos').select('curso').eq('colegio_id', colegioId).eq('activo', true),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return (
    <ComunicadosClient
      comunicados={(comunicados as any[]) ?? []}
      colegioId={colegioId}
      cursos={cursos}
    />
  )
}