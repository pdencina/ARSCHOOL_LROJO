/** Reglas de tiempo de espera de las solicitudes de admisión (bandeja e indicadores). */

export const DIA_MS = 86400000

/** Estados que requieren alguna acción (equipo o apoderado). */
export const ESTADOS_ABIERTOS = ['pendiente', 'en_revision', 'observada', 'aprobada']

// Pendiente que ya había sido revisada y luego se actualizó => el apoderado envió
// correcciones. (Una nota o asignación no toca revisado_at; un cambio de estado del
// gestor sí, pero en el mismo instante que updated_at, por eso se exige un margen.)
export function esCorregida(pa: any): boolean {
  if (pa.estado !== 'pendiente' || !pa.revisado_at || !pa.updated_at) return false
  return new Date(pa.updated_at).getTime() - new Date(pa.revisado_at).getTime() > 60_000
}

// Fecha desde la que corre la espera, según el estado:
// pendiente => envío (o última corrección del apoderado); resto => última revisión.
export function fechaEspera(pa: any): Date {
  const f = pa.estado === 'pendiente'
    ? (esCorregida(pa) ? pa.updated_at : pa.created_at)
    : (pa.revisado_at ?? pa.updated_at ?? pa.created_at)
  return new Date(f)
}

export function diasEspera(pa: any): number {
  return Math.max(0, Math.floor((Date.now() - fechaEspera(pa).getTime()) / DIA_MS))
}
