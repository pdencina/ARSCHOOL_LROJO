export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ComunicadosClient from '@/components/comunicados/ComunicadosClient'

export const metadata = { title: 'Comunicados — AR School' }

export default async function ComunicadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: usuarioRaw } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (usuarioRaw as any)?.colegio_id ?? ''

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*, recepciones:comunicado_recepciones(estado)')
    .eq('colegio_id', colegioId)
    .order('created_at', { ascending: false })
    .limit(20)

  return <ComunicadosClient comunicados={(comunicados as any[]) ?? []} colegioId={colegioId} />
}