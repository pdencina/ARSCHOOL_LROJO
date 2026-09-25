/**
 * Encadenar la firma de contrato y pagaré: tras firmar uno, llevar a la familia al
 * que falta; y si abre un enlace reemplazado, llevarla al enlace vigente.
 */

export type TipoDocumento = 'contrato' | 'pagare'
export const ETIQUETA_DOCUMENTO: Record<TipoDocumento, string> = {
  contrato: 'Contrato de Servicios Educacionales',
  pagare: 'Pagaré',
}

/** Token vigente (pendiente o visto, sin expirar) más reciente de un documento. */
export async function tokenVigente(admin: any, matriculaId: string, tipo: TipoDocumento): Promise<string | null> {
  const { data } = await admin
    .from('firma_tokens')
    .select('token, expira_at')
    .eq('matricula_id', matriculaId)
    .eq('tipo', tipo)
    .in('estado', ['pendiente', 'visto'])
    .gt('expira_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
  return ((data as any[]) ?? [])[0]?.token ?? null
}

/**
 * El otro documento de la matrícula, si aún no está firmado.
 * Devuelve su token vigente (si hay) para continuar la firma sin otro correo.
 */
export async function documentoPendiente(admin: any, matriculaId: string, tipoActual: TipoDocumento): Promise<{ tipo: TipoDocumento; etiqueta: string; token: string | null } | null> {
  const otro: TipoDocumento = tipoActual === 'contrato' ? 'pagare' : 'contrato'
  const { data: m } = await admin.from('matriculas').select('firmado_at, firmado_pagare_at').eq('id', matriculaId).maybeSingle()
  const firmado = otro === 'contrato' ? (m as any)?.firmado_at : (m as any)?.firmado_pagare_at
  if (firmado) return null
  return { tipo: otro, etiqueta: ETIQUETA_DOCUMENTO[otro], token: await tokenVigente(admin, matriculaId, otro) }
}
