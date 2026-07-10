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
  const [{ data: planes }, { data: matriculas }, { data: aportes }] = await Promise.all([
    admin.from('planes_cobro').select('*').eq('colegio_id', colegioId).eq('activo', true),
    admin.from('matriculas').select('*, alumno:alumnos(nombre, apellido, curso)').eq('colegio_id', colegioId).eq('anio_escolar', new Date().getFullYear()).order('created_at', { ascending: false }),
    admin.from('tabla_aportes').select('*').eq('activo', true).eq('anio', new Date().getFullYear()),
  ])

  const cursos = [
    'Play Group (2-3 años)',
    'Pre School (3-4 años)',
    'Kinder (Ciclo 0)',
    'Elementary 1 (Ciclo 1)',
    'Elementary 2 (Ciclo 2)',
    'Elementary 3 (Ciclo 3)',
    'Elementary 4 (Ciclo 4)',
    'Middle School 5 (Ciclo 5)',
    'Middle School 6 (Ciclo 6)',
    'Middle School 7 (Ciclo 7)',
    'Middle School 8 (Ciclo 8)',
    'High School (1° Medio)',
    'High School (2° Medio)',
    'High School (3° Medio)',
    'High School (4° Medio)',
  ]

  return (
    <MatriculaClient
      planes={(planes as any[]) ?? []}
      matriculas={(matriculas as any[]) ?? []}
      cursos={cursos}
      aportes={(aportes as any[]) ?? []}
    />
  )
}
