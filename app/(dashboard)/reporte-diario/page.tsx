export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ReporteDiarioClient from '@/components/preschool/ReporteDiarioClient'

export const metadata = { title: 'Reporte Diario — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ReporteDiarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const hoy = new Date().toISOString().split('T')[0]

  const [{ data: alumnos }, { data: reportesHoy }] = await Promise.all([
    admin.from('alumnos').select('*').eq('colegio_id', colegioId).eq('activo', true).order('apellido'),
    admin.from('reportes_diarios').select('*, alumno:alumnos(nombre, apellido, curso)')
      .eq('colegio_id', colegioId).eq('fecha', hoy),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()
  // Filtrar solo cursos de preescolar
  const cursosPreschool = cursos.filter(c =>
    c.toLowerCase().includes('pre') || c.toLowerCase().includes('play') ||
    c.toLowerCase().includes('nursery') || c.toLowerCase().includes('kinder') ||
    c.toLowerCase().includes('jardín') || c.toLowerCase().includes('sala')
  )
  const cursosDisponibles = cursosPreschool.length > 0 ? cursosPreschool : cursos

  return (
    <ReporteDiarioClient
      alumnos={(alumnos as any[]) ?? []}
      reportesHoy={(reportesHoy as any[]) ?? []}
      cursos={cursosDisponibles}
      colegioId={colegioId}
      fecha={hoy}
    />
  )
}
