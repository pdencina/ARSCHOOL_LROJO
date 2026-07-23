export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import LibroClasesClient from '@/components/tutor/LibroClasesClient'

export const metadata = { title: 'Libro de Clases — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function LibroClasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const u = ur as any
  if (!['tutor','admin','super_admin','pastor_campus'].includes(u?.rol)) redirect('/inicio')

  const colegioId = u.colegio_id ?? ''

  const [{ data: registros }, { data: alumnos }] = await Promise.all([
    admin.from('libro_clases')
      .select('*')
      .eq('colegio_id', colegioId)
      .order('fecha', { ascending: false })
      .limit(50),
    admin.from('alumnos')
      .select('id, nombre, apellido, curso')
      .eq('colegio_id', colegioId)
      .eq('activo', true)
      .order('apellido'),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return (
    <LibroClasesClient
      registros={(registros as any[]) ?? []}
      cursos={cursos}
      colegioId={colegioId}
      tutorId={user.id}
    />
  )
}