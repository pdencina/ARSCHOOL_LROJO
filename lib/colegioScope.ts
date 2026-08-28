import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const SEDE_COOKIE = 'sede_activa'
export const SEDE_TODAS = 'todas'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface ColegioScope {
  /** true cuando el super_admin está viendo TODAS las sedes agregadas */
  all: boolean
  /** Lista de colegio_ids a incluir cuando all=true (o cuando hay múltiples sedes) */
  colegioIds: string[]
  /** Colegio único cuando se filtra por una sola sede (null si all) */
  colegioId: string | null
}

/**
 * Resuelve el alcance de sedes para el usuario actual.
 * - super_admin sin cookie o cookie='todas' => all=true, con la lista de todos los colegios.
 * - super_admin con una sede elegida => esa sede.
 * - Resto de roles => su propio colegio_id (comportamiento normal).
 *
 * Uso en queries:
 *   const scope = await getColegioScope(usuario)
 *   let q = admin.from('cobros').select('*')
 *   q = aplicarScopeColegio(q, scope)
 */
export async function getColegioScope(usuario: { rol?: string; colegio_id?: string | null; sedes_ids?: string[] | null }): Promise<ColegioScope> {
  const rol = usuario?.rol
  const propio = usuario?.colegio_id ?? null

  if (rol !== 'super_admin') {
    // Coordinador multi-sede: ve todas las sedes en sedes_ids (incluye su colegio_id).
    const sedes = usuario?.sedes_ids
    if (rol === 'coordinador' && Array.isArray(sedes) && sedes.length > 0) {
      const ids = Array.from(new Set([...(propio ? [propio] : []), ...sedes]))
      return { all: ids.length > 1, colegioIds: ids, colegioId: ids.length === 1 ? ids[0] : null }
    }
    // Roles normales: solo su sede
    return { all: false, colegioIds: propio ? [propio] : [], colegioId: propio }
  }

  // super_admin: leer sede activa desde cookie
  const seleccion = cookies().get(SEDE_COOKIE)?.value

  // Todas las sedes (default) o cookie explícita 'todas'
  if (!seleccion || seleccion === SEDE_TODAS) {
    const admin = getAdmin()
    const { data: colegios } = await admin.from('colegios').select('id')
    const ids = (colegios ?? []).map((c: any) => c.id)
    return { all: true, colegioIds: ids, colegioId: null }
  }

  // Sede específica elegida por el super_admin
  return { all: false, colegioIds: [seleccion], colegioId: seleccion }
}

/**
 * Aplica el filtro de colegio a un query builder de Supabase.
 * - all => .in('colegio_id', ids)
 * - una sede => .eq('colegio_id', id)
 */
export function aplicarScopeColegio<T>(query: any, scope: ColegioScope, columna = 'colegio_id'): T {
  if (scope.all) {
    return query.in(columna, scope.colegioIds.length ? scope.colegioIds : ['__none__'])
  }
  return query.eq(columna, scope.colegioId ?? '__none__')
}
