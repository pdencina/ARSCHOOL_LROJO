export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ConfiguracionClient from '@/components/configuracion/ConfiguracionClient'

export const metadata = { title: 'Configuración — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ConfiguracionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('*, colegio:colegios(*)').eq('id', user!.id).single()
  const usuario = ur as any

  // Stats del colegio
  const colegioId = usuario?.colegio_id
  let stats = { alumnos: 0, usuarios: 0, cursos: 0 }

  if (colegioId) {
    const [{ data: als }, { data: usrs }] = await Promise.all([
      admin.from('alumnos').select('curso').eq('colegio_id', colegioId).eq('activo', true),
      admin.from('usuarios').select('id').eq('colegio_id', colegioId).eq('activo', true),
    ])
    stats.alumnos = als?.length ?? 0
    stats.usuarios = usrs?.length ?? 0
    stats.cursos = [...new Set((als ?? []).map((a: any) => a.curso))].length
  }

  return <ConfiguracionClient usuario={usuario} stats={stats} />
}
