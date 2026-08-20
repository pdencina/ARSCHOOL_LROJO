export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ControlClient from '@/components/control/ControlClient'

export const metadata = { title: 'Control Ingreso/Retiro — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ControlPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus', 'tutor_supervisor'].includes(usuario?.rol)) redirect('/inicio')

  const hoy = new Date().toISOString().split('T')[0]

  const [{ data: alumnos }, { data: registrosHoy }] = await Promise.all([
    admin.from('alumnos').select('id, nombre, apellido, curso, jornada').eq('colegio_id', usuario.colegio_id).eq('activo', true).order('apellido'),
    admin.from('registros_control').select('*, alumno:alumnos(nombre, apellido, curso)').eq('colegio_id', usuario.colegio_id).eq('fecha', hoy).order('hora_registro', { ascending: false }),
  ])

  return (
    <ControlClient
      alumnos={(alumnos as any[]) ?? []}
      registrosHoy={(registrosHoy as any[]) ?? []}
    />
  )
}
