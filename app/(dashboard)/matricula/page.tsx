export const dynamic = 'force-dynamic'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatriculaClient from '@/components/matricula/MatriculaClient'
import { getColegioScope } from '@/lib/colegioScope'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Cursos/niveles por programa
const CURSOS_AR_SCHOOL = [
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

// Importante: el curso debe incluir el nombre del programa porque /api/contratos
// detecta la plantilla de contrato (Lions / Worship / AR School) desde ese texto.
const CURSOS_LIONS = [
  'Lions Soccer - Categoría 4-6 (4, 5 y 6 años)',
  'Lions Soccer - Categoría 7-9 (7, 8 y 9 años)',
  'Lions Soccer - Categoría 10-12 (10, 11 y 12 años)',
  'Lions Soccer - Categoría 13-16 (13, 14, 15 y 16 años)',
]

const INSTRUMENTOS = ['Guitarra', 'Bajo', 'Teclado', 'Batería', 'Canto', 'Saxophone', 'Violín']
const CURSOS_WORSHIP = [
  'AR Worship - Music and Play (0-4 años)',
  'AR Worship - Music and Play (4-7 años)',
  ...INSTRUMENTOS.map(i => `AR Worship - Ciclo 1 - ${i}`),
  ...INSTRUMENTOS.map(i => `AR Worship - Ciclo 2 - ${i}`),
]

function cursosDePrograma(codigo?: string | null): string[] {
  if (codigo === 'lions_soccer') return CURSOS_LIONS
  if (codigo === 'ar_worship') return CURSOS_WORSHIP
  return CURSOS_AR_SCHOOL
}

export default async function MatriculaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin
    .from('usuarios')
    .select('colegio_id, rol, programa_ids, sedes_ids')
    .eq('id', user.id)
    .single()
  const usuario = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador'].includes(usuario?.rol)) {
    redirect('/inicio')
  }

  // Alcance de sedes (coordinador multi-sede / super_admin con selector)
  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : [usuario.colegio_id ?? '__none__']
  const colegioId = usuario.colegio_id ?? colegioIds[0] ?? ''

  // Coordinador: acotar al programa que gestiona
  const esCoordinador = usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0
  let programaId: string | null = null
  let programaNombre: string | null = null
  let programaCodigo: string | null = null
  if (esCoordinador) {
    const { data: prog } = await admin
      .from('programas')
      .select('id, codigo, nombre_corto, nombre')
      .in('id', usuario.programa_ids)
      .eq('activo', true)
      .order('nombre')
      .limit(1)
      .single()
    if (prog) {
      programaId = (prog as any).id
      programaCodigo = (prog as any).codigo
      programaNombre = (prog as any).nombre_corto || (prog as any).nombre
    }
  }

  const anio = new Date().getFullYear()

  // Matrículas (filtradas por programa si es coordinador)
  // Incluye el año actual y el siguiente (los contratos se firman con anticipación)
  let matriculasQuery = admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido, curso), familia:familias(direccion, comuna)')
    .in('colegio_id', colegioIdsSafe)
    .in('anio_escolar', [anio, anio + 1])
    .order('created_at', { ascending: false })
  if (esCoordinador && usuario.programa_ids?.length > 0) {
    matriculasQuery = matriculasQuery.in('programa_id', usuario.programa_ids)
  }

  // Pre-admisiones pendientes (mismo filtro por programa)
  let preAdmQuery = admin
    .from('pre_admisiones')
    .select('*')
    .in('colegio_id', colegioIdsSafe)
    .in('estado', ['pendiente', 'en_revision', 'aprobada'])
    .order('created_at', { ascending: false })
  if (esCoordinador && usuario.programa_ids?.length > 0) {
    preAdmQuery = preAdmQuery.in('programa_id', usuario.programa_ids)
  }

  const [{ data: planes }, { data: matriculas }, { data: aportes }, { data: becasAprobadas }, { data: preAdmisiones }] = await Promise.all([
    admin.from('planes_cobro').select('*').in('colegio_id', colegioIdsSafe).eq('activo', true),
    matriculasQuery,
    admin.from('tabla_aportes').select('*').eq('activo', true).eq('anio', anio),
    admin.from('becas').select('alumno_id, porcentaje').in('colegio_id', colegioIdsSafe).in('estado', ['aprobada', 'vigente']).in('anio_escolar', [anio, anio + 1]),
    preAdmQuery,
  ])

  return (
    <MatriculaClient
      planes={(planes as any[]) ?? []}
      matriculas={(matriculas as any[]) ?? []}
      cursos={cursosDePrograma(programaCodigo)}
      aportes={(aportes as any[]) ?? []}
      becasAprobadas={(becasAprobadas as any[]) ?? []}
      preAdmisiones={(preAdmisiones as any[]) ?? []}
      puedeEliminar={['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)}
      programaId={programaId}
      programaNombre={programaNombre}
    />
  )
}
