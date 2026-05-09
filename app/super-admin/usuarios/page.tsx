export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import UsuariosClient from '@/components/admin/UsuariosClient'

export const metadata = { title: 'Gestión de usuarios — AR School' }

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: { colegio?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/fichas')

  // Usar service role para saltear RLS
  const admin = getAdminClient()

  const [{ data: colegios }, { data: usuarios }] = await Promise.all([
    admin.from('colegios').select('id, nombre').order('nombre'),
    admin.from('usuarios').select('*, colegio:colegios(nombre)').order('created_at', { ascending: false }),
  ])

  const usuariosFiltrados = searchParams.colegio
    ? (usuarios ?? []).filter((u: any) => u.colegio_id === searchParams.colegio)
    : usuarios ?? []

  return (
    <UsuariosClient
      usuarios={usuariosFiltrados as any[]}
      colegios={(colegios as any[]) ?? []}
      colegioFiltro={searchParams.colegio}
    />
  )
}