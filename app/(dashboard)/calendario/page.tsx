export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import CalendarioClient from '@/components/calendario/CalendarioClient'
export const metadata = { title: 'Calendario — AR School' }

export default async function CalendarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const { data: evaluaciones } = await supabase
    .from('evaluaciones').select('id, nombre, materia, curso, fecha')
    .eq('colegio_id', colegioId).order('fecha')

  const { data: comunicados } = await supabase
    .from('comunicados').select('id, titulo, tipo, enviado_at')
    .eq('colegio_id', colegioId).not('enviado_at', 'is', null)
    .order('enviado_at', { ascending: false }).limit(20)

  return <CalendarioClient evaluaciones={(evaluaciones as any[]) ?? []} comunicados={(comunicados as any[]) ?? []} colegioId={colegioId}/>
}