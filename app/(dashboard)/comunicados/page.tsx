export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ComunicadosClient from '@/components/comunicados/ComunicadosClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ComunicadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const [{ data: comunicados }, { data: alumnos }] = await Promise.all([
    admin.from('comunicados')
      .select('*, recepciones:comunicado_recepciones(estado, familia_id)')
      .eq('colegio_id', colegioId)
      .order('created_at', { ascending: false })
      .limit(30),
    admin.from('alumnos').select('curso').eq('colegio_id', colegioId).eq('activo', true),
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
