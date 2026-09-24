/**
 * Historial de solicitudes de admisión (tabla pre_admision_eventos, migración 054).
 * Registrar un evento nunca debe romper la acción principal: si la tabla aún no
 * existe o el insert falla, se registra en consola y se sigue.
 */
export interface EventoAdmision {
  preAdmisionId: string
  colegioId?: string | null
  /** null/undefined = apoderado o sistema */
  usuarioId?: string | null
  accion: string
  estadoAnterior?: string | null
  estadoNuevo?: string | null
  comentario?: string | null
}

export async function registrarEventoAdmision(admin: any, ev: EventoAdmision) {
  try {
    const { error } = await admin.from('pre_admision_eventos').insert({
      pre_admision_id: ev.preAdmisionId,
      colegio_id: ev.colegioId ?? null,
      usuario_id: ev.usuarioId ?? null,
      accion: ev.accion,
      estado_anterior: ev.estadoAnterior ?? null,
      estado_nuevo: ev.estadoNuevo ?? null,
      comentario: ev.comentario?.trim() || null,
    })
    if (error) console.error('Historial admisión:', error.message)
  } catch (e) {
    console.error('Historial admisión:', e)
  }
}
