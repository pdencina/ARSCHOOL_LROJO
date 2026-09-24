/** Roles que pueden hacerse cargo de una solicitud de admisión en su sede. */
export const ROLES_EQUIPO_ADMISION = ['admin', 'pastor_campus', 'gestor_admision', 'coordinador']

export interface MiembroEquipo {
  id: string
  nombre: string | null
  apellido: string | null
  rol: string
  colegio_id: string | null
}

/**
 * Equipo de admisión de una o varias sedes: usuarios activos con rol de admisión
 * cuyo colegio es una de esas sedes (o coordinadores con la sede en sedes_ids).
 */
export async function obtenerEquipoAdmision(admin: any, colegioIds: string[]): Promise<MiembroEquipo[]> {
  const ids = colegioIds.filter(id => id && id !== '__none__')
  if (!ids.length) return []
  const lista = ids.join(',')
  const { data, error } = await admin
    .from('usuarios')
    .select('id, nombre, apellido, rol, colegio_id')
    .in('rol', ROLES_EQUIPO_ADMISION)
    .eq('activo', true)
    .or(`colegio_id.in.(${lista}),sedes_ids.ov.{${lista}}`)
    .order('nombre')
  if (error) {
    // Instancias sin sedes_ids: solo por colegio
    const retry = await admin
      .from('usuarios')
      .select('id, nombre, apellido, rol, colegio_id')
      .in('rol', ROLES_EQUIPO_ADMISION)
      .eq('activo', true)
      .in('colegio_id', ids)
      .order('nombre')
    return (retry.data ?? []) as MiembroEquipo[]
  }
  return (data ?? []) as MiembroEquipo[]
}

export function nombreMiembro(m: { nombre?: string | null; apellido?: string | null } | null | undefined): string {
  if (!m) return ''
  return `${m.nombre ?? ''} ${m.apellido ?? ''}`.trim()
}
