/** Acceso a una matrícula y datos asociados (compartido por las rutas /api/matriculas/[id]/...). */

export const ROLES_GESTION_MATRICULA = ['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador']

/**
 * Rol de gestión + (coordinador) su programa y sede.
 * Devuelve { usuario } o { error, status }.
 */
export async function autorizarMatricula(admin: any, userId: string, matriculaId: string): Promise<{ usuario: any } | { error: string; status: number }> {
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', userId).single()
  const usuario = ur as any
  if (!ROLES_GESTION_MATRICULA.includes(usuario?.rol)) return { error: 'Sin permisos', status: 403 }
  if (usuario.rol === 'coordinador') {
    const { data: matPerm } = await admin.from('matriculas').select('programa_id, colegio_id').eq('id', matriculaId).single()
    const mp = matPerm as any
    if (!mp) return { error: 'Matrícula no encontrada', status: 404 }
    const progOk = !usuario.programa_ids?.length || (mp.programa_id && usuario.programa_ids.includes(mp.programa_id))
    const sedes = [usuario.colegio_id, ...(usuario.sedes_ids || [])].filter(Boolean)
    const sedeOk = sedes.length === 0 || sedes.includes(mp.colegio_id)
    if (!progOk || !sedeOk) return { error: 'Sin acceso a esta matrícula', status: 403 }
  }
  return { usuario }
}

/**
 * Familia de la matrícula: la enlazada por familia_id o, si no hay, la más reciente
 * del alumno. Es la misma regla que usa el contrato.
 */
export async function familiaDeMatricula(admin: any, m: any) {
  if (m?.familia_id) {
    const { data } = await admin.from('familias').select('*').eq('id', m.familia_id).maybeSingle()
    if (data) return data as any
  }
  if (m?.alumno_id) {
    const { data } = await admin.from('familias').select('*').eq('alumno_id', m.alumno_id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    return (data as any) ?? null
  }
  return null
}
