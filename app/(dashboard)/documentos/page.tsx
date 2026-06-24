export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import DocumentosClient from '@/components/documentos/DocumentosClient'

export const metadata = { title: 'Documentos — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function DocumentosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const usuario = ur as any

  const [{ data: documentos }, { data: recursos }] = await Promise.all([
    admin.from('documentos').select('*').eq('colegio_id', usuario.colegio_id).order('created_at', { ascending: false }),
    admin.from('recursos_externos').select('*').eq('colegio_id', usuario.colegio_id).eq('activo', true).order('orden'),
  ])

  // Filtrar por visibilidad
  const docsVisibles = (documentos ?? []).filter((d: any) =>
    d.visible_para?.includes(usuario.rol) || usuario.rol === 'super_admin'
  )

  return (
    <DocumentosClient
      documentos={docsVisibles as any[]}
      recursos={(recursos as any[]) ?? []}
      rol={usuario.rol}
      colegioId={usuario.colegio_id}
    />
  )
}
