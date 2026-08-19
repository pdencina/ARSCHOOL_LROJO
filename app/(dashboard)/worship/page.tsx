export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProgramaClient from '@/components/programas/ProgramaClient'

export const metadata = { title: 'AR Worship School — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function WorshipPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('*, colegio:colegios(nombre)').eq('id', user.id).single()
  const usuario = ur as any
  if (!usuario) redirect('/login')

  // Obtener programa Worship
  const { data: programa } = await admin.from('programas').select('*').eq('codigo', 'ar_worship').single()
  if (!programa) redirect('/inicio')

  const programaId = (programa as any).id

  // Verificar acceso
  if (usuario.programa_ids && usuario.programa_ids.length > 0 && !usuario.programa_ids.includes(programaId)) {
    if (!['super_admin', 'admin', 'pastor_campus'].includes(usuario.rol)) redirect('/inicio')
  }

  // Obtener inscripciones del programa
  const { data: inscripciones } = await admin
    .from('inscripciones_programa')
    .select('*, alumno:alumnos(id, nombre, apellido, rut, curso, fecha_nacimiento, sexo)')
    .eq('programa_id', programaId)
    .eq('colegio_id', usuario.colegio_id)
    .in('estado', ['activa', 'prueba'])
    .order('created_at', { ascending: false })

  // Obtener matrículas del programa
  const { data: matriculas } = await admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .eq('programa_id', programaId)
    .eq('colegio_id', usuario.colegio_id)
    .order('created_at', { ascending: false })

  return (
    <ProgramaClient
      programa={programa as any}
      inscripciones={(inscripciones as any[]) ?? []}
      matriculas={(matriculas as any[]) ?? []}
      colegioId={usuario.colegio_id}
    />
  )
}
