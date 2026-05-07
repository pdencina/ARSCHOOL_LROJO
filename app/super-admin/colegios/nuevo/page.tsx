export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NuevoColegioClient from '@/components/admin/NuevoColegioClient'

export const metadata = { title: 'Nuevo Colegio — AR School' }

export default async function NuevoColegioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/super-admin')

  return <NuevoColegioClient />
}