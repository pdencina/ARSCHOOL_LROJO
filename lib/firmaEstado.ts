/**
 * Estado de firma por documento (contrato y pagaré) de cada matrícula.
 *
 * Fuente de verdad de "firmado": los timestamps de la matrícula (firmado_at /
 * firmado_pagare_at). Si no está firmado, el último envío (firma_tokens) dice si el
 * enlace se envió, se abrió o venció. Así el equipo ve qué documento falta y si la
 * familia abrió el correo.
 */

export type EstadoDocumento = 'firmado' | 'visto' | 'enviado' | 'vencido' | 'sin_enviar'
export interface EstadoFirmas { contrato: EstadoDocumento; pagare: EstadoDocumento }

export async function estadosFirma(admin: any, matriculas: { id: string; firmado_at?: string | null; firmado_pagare_at?: string | null }[]): Promise<Record<string, EstadoFirmas>> {
  const ids = matriculas.map(m => m.id)
  const tokens: any[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await admin
      .from('firma_tokens')
      .select('matricula_id, tipo, estado, expira_at, created_at')
      .in('matricula_id', ids.slice(i, i + 100))
      .order('created_at', { ascending: false })
    tokens.push(...((data as any[]) ?? []))
  }

  // Último envío por matrícula y tipo (vienen ordenados del más nuevo al más antiguo)
  const ultimo: Record<string, any> = {}
  for (const t of tokens) {
    const k = `${t.matricula_id}:${t.tipo}`
    if (!ultimo[k]) ultimo[k] = t
  }

  const ahora = Date.now()
  const desdeToken = (t: any): EstadoDocumento => {
    if (!t) return 'sin_enviar'
    if (t.estado === 'firmado') return 'firmado'
    if (t.estado === 'expirado' || (t.expira_at && new Date(t.expira_at).getTime() < ahora)) return 'vencido'
    if (t.estado === 'visto') return 'visto'
    if (t.estado === 'pendiente') return 'enviado'
    return 'sin_enviar' // cancelado sin reemplazo
  }

  const out: Record<string, EstadoFirmas> = {}
  for (const m of matriculas) {
    out[m.id] = {
      contrato: m.firmado_at ? 'firmado' : desdeToken(ultimo[`${m.id}:contrato`]),
      pagare: m.firmado_pagare_at ? 'firmado' : desdeToken(ultimo[`${m.id}:pagare`]),
    }
  }
  return out
}
