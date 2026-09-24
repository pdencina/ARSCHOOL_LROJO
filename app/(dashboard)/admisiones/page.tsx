import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdmisionSeguimientoClient from '@/components/admision/AdmisionSeguimientoClient'
import { getColegioScope } from '@/lib/colegioScope'
import { obtenerEquipoAdmision } from '@/lib/admisionEquipo'
import { COLUMNAS_LISTA_ADMISION } from '@/lib/admisionDocs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admisiones — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdmisionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador'].includes(usuario?.rol)) {
    redirect('/inicio')
  }

  // Alcance de sedes (super_admin: todas o elegida; coordinador: sus sedes; resto: su sede)
  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : [usuario.colegio_id ?? '__none__']

  // La lista no trae los documentos (base64): solo qué documentos hay (docs_presentes).
  const consultar = (columnas: string) => {
    let query = admin
      .from('pre_admisiones')
      .select(`${columnas}, programa:programas(id, codigo, nombre, nombre_corto, color, icono)`)
      .order('created_at', { ascending: false })

    // super_admin con "Todas las sedes" ve TODO (sin filtro de colegio, incluso
    // solicitudes con colegio_id nulo). El resto se acota a su(s) sede(s).
    if (!scope.all) {
      query = query.in('colegio_id', colegioIdsSafe)
    }

    // Coordinador: acotar a las admisiones de sus programas
    if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0) {
      query = query.in('programa_id', usuario.programa_ids)
    }
    return query
  }

  let { data: preAdmisiones, error: errLista } = await consultar(COLUMNAS_LISTA_ADMISION)
  // Si falta alguna columna nueva (migraciones 055/056 sin ejecutar), consulta completa
  if (errLista) ({ data: preAdmisiones } = await consultar('*'))

  // Equipo de admisión de las sedes visibles (responsables y filtro "Mías")
  const idsSedes = scope.all ? scope.colegioIds : colegioIdsSafe
  const equipo = await obtenerEquipoAdmision(admin, idsSedes)

  // Primera respuesta del equipo por solicitud (para "tiempo de primera respuesta").
  // Si la migración 054 no se ha ejecutado, queda vacío y se usa revisado_at.
  const ACCIONES_RESPUESTA = ['en_revision', 'observada', 'aprobada', 'rechazada', 'matricula_iniciada', 'matriculada', 'desistida']
  const haceUnAnio = new Date(Date.now() - 400 * 86400000).toISOString()
  let qEv = admin
    .from('pre_admision_eventos')
    .select('pre_admision_id, created_at')
    .not('usuario_id', 'is', null)
    .in('accion', ACCIONES_RESPUESTA)
    .gte('created_at', haceUnAnio)
    .order('created_at', { ascending: true })
    .limit(5000)
  if (!scope.all) qEv = qEv.in('colegio_id', colegioIdsSafe)
  const { data: evs } = await qEv
  const primeraRespuesta: Record<string, string> = {}
  for (const e of (evs as any[]) ?? []) {
    if (!primeraRespuesta[e.pre_admision_id]) primeraRespuesta[e.pre_admision_id] = e.created_at
  }

  // Eliminar es destructivo: solo roles de administración y coordinador (de su programa)
  const puedeEliminar = ['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario.rol)

  return (
    <AdmisionSeguimientoClient
      preAdmisiones={(preAdmisiones as any[]) ?? []}
      puedeEliminar={puedeEliminar}
      usuarioId={user.id}
      equipo={equipo}
      primeraRespuesta={primeraRespuesta}
    />
  )
}
