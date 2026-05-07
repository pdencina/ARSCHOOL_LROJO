export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import UsuariosClient from '@/components/admin/UsuariosClient'

export const metadata = { title: 'Gestión de usuarios — AR School' }

export default async function UsuariosPage({ searchParams }: { searchParams: { colegio?: string } }) {
  const supabase = createClient()

  const [{ data: colegios }, { data: usuarios }] = await Promise.all([
    supabase.from('colegios').select('id, nombre').order('nombre'),
    supabase.from('usuarios')
      .select('*, colegio:colegios(nombre)')
      .order('created_at', { ascending: false }),
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