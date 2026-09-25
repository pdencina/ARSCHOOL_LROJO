export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AlumnosClient from '@/components/alumnos/AlumnosClient'
import { getColegioScope } from '@/lib/colegioScope'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AlumnosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol, sedes_ids, programa_ids').eq('id', user.id).single()
  const usuario = ur as any

  // Alcance de sedes (super_admin: todas o una elegida)
  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : ['__none__']
  const colegioId = scope.colegioId ?? usuario?.colegio_id ?? (colegioIds[0] ?? '')

  // Coordinador: los alumnos de sus programas, incluidos los dados de baja
  // (inscripción finalizada), para poder verlos en "Ver retirados" y reactivarlos.
  let alumnoIdsCoord: string[] | null = null
  let activosEnPrograma: Set<string> | null = null
  if (usuario?.rol === 'coordinador' && usuario.programa_ids?.length > 0) {
    const { data: insc } = await admin
      .from('inscripciones_programa')
      .select('alumno_id, estado')
      .in('programa_id', usuario.programa_ids)
      .in('colegio_id', colegioIdsSafe)
      .in('estado', ['activa', 'prueba', 'finalizada'])
    const filas = (insc as any[]) ?? []
    activosEnPrograma = new Set(filas.filter(i => i.estado !== 'finalizada').map(i => i.alumno_id))
    alumnoIdsCoord = Array.from(new Set(filas.map(i => i.alumno_id)))
    if (alumnoIdsCoord.length === 0) alumnoIdsCoord = ['__none__']
  }

  let alumnosQuery = admin
    .from('alumnos')
    .select('*, familias(nombre_apoderado, apellido_apoderado, email, telefono)')
    .in('colegio_id', colegioIdsSafe)
    .order('apellido')
  if (alumnoIdsCoord) alumnosQuery = alumnosQuery.in('id', alumnoIdsCoord)

  const { data: alumnosRaw } = await alumnosQuery
  // Para el coordinador, "activo" = activo en SUS programas (si lo dieron de baja de su
  // programa aparece en "Ver retirados" aunque siga activo en otro programa)
  const alumnos = activosEnPrograma
    ? ((alumnosRaw as any[]) ?? []).map(a => ({ ...a, activo: a.activo && activosEnPrograma!.has(a.id) }))
    : alumnosRaw

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return <AlumnosClient alumnos={(alumnos as any[]) ?? []} cursos={cursos} colegioId={colegioId} />
}
