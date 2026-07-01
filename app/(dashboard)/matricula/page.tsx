export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import MatriculaClient from '@/components/matricula/MatriculaClient'

export const metadata = { title: 'Matrícula — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function MatriculaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes((ur as any)?.rol)) redirect('/inicio')

  const colegioId = (ur as any)?.colegio_id
  const [{ data: planes }, { data: matriculas }] = await Promise.all([
    admin.from('planes_cobro').select('*').eq('colegio_id', colegioId).eq('activo', true),
    admin.from('matriculas').select('*, alumno:alumnos(nombre, apellido, curso)').eq('colegio_id', colegioId).eq('anio_escolar', new Date().getFullYear()).order('created_at', { ascending: false }),
  ])

  const cursos = ['Play Group', 'PreSchool A', 'Elementary 1', 'Elementary 2', 'Elementary 3', 'Elementary 4', 'High School 1', 'High School 2', 'Middle 1', 'Middle 2']

  return (
    <MatriculaClient
      planes={(planes as any[]) ?? []}
      matriculas={(matriculas as any[]) ?? []}
      cursos={cursos}
    />
  )
}
