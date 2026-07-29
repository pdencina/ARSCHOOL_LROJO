export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import CobranzaClient from '@/components/cobranza/CobranzaClient'

export const metadata = { title: 'Cobranza — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function CobranzaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) redirect('/inicio')

  const colegioId = (ur as any)?.colegio_id
  const anio = new Date().getFullYear()

  // Cargar cobros con alumno y familia
  const { data: cobros } = await admin
    .from('cobros')
    .select('*, alumno:alumnos(nombre, apellido, curso), familia:familias(nombre_apoderado, apellido_apoderado, email, telefono)')
    .eq('colegio_id', colegioId)
    .eq('anio', anio)
    .order('fecha_vencimiento', { ascending: true })

  // Log reciente de cobranza
  const { data: logReciente } = await admin
    .from('log_cobranza')
    .select('*')
    .eq('colegio_id', colegioId)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <CobranzaClient
      cobros={(cobros as any[]) ?? []}
      logReciente={(logReciente as any[]) ?? []}
      anio={anio}
    />
  )
}
