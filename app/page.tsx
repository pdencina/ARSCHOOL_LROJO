export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as { rol: string } | null
  if (usuario?.rol === 'administrativo') redirect('/contable')
  redirect('/fichas')
}