export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AsistenciasClient from '@/components/asistencias/AsistenciasClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AsistenciasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const hoy = new Date().toISOString().split('T')[0]

  const [{ data: alumnos }, { data: asistenciasHoy }] = await Promise.all([
    admin.from('alumnos').select('*').eq('colegio_id', colegioId).eq('activo', true).order('apellido'),
    admin.from('asistencias').select('*, alumno:alumnos(*)').eq('colegio_id', colegioId).eq('fecha', hoy),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return (
    <AsistenciasClient
      alumnos={(alumnos as any[]) ?? []}
      asistenciasHoy={(asistenciasHoy as any[]) ?? []}
      cursos={cursos}
      colegioId={colegioId}
      fecha={hoy}
    />
  )
}
