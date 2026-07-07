export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PortalDocumentosClient from '@/components/portal/PortalDocumentosClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function PortalDocumentosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('*, colegio:colegios(nombre)').eq('id', user.id).single()
  const usuario = ur as any
  if (!['apoderado'].includes(usuario?.rol)) redirect('/portal')

  // Obtener alumnos vinculados
  const { data: vinculos } = await admin.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id)
  const alumnoIds = (vinculos ?? []).map((v: any) => v.alumno_id)

  // Obtener matrículas de los alumnos
  let matriculas: any[] = []
  if (alumnoIds.length > 0) {
    const { data: mats } = await admin
      .from('matriculas')
      .select('*, alumno:alumnos(nombre, apellido, curso)')
      .in('alumno_id', alumnoIds)
      .order('created_at', { ascending: false })
    matriculas = (mats ?? []) as any[]
  }

  // Obtener documentos compartidos con apoderados
  let documentos: any[] = []
  if (usuario.colegio_id) {
    const { data: docs } = await admin
      .from('documentos')
      .select('*')
      .eq('colegio_id', usuario.colegio_id)
      .or('visibilidad.eq.todos,visibilidad.eq.apoderados')
      .order('created_at', { ascending: false })
    documentos = (docs ?? []) as any[]
  }

  return (
    <PortalDocumentosClient
      matriculas={matriculas}
      documentos={documentos}
      usuario={usuario}
    />
  )
}
