'use client'

const NOMBRE_PROGRAMA: Record<string, string> = {
  ar_school: 'AR School',
  play_group: 'AR School Play Group',
  lions_soccer: 'Lions Soccer School',
  ar_worship: 'AR Worship School',
}

// Número para wa.me: solo dígitos, con código de país (Chile por defecto para móviles de 9 dígitos).
function numeroWhatsapp(tel?: string | null): string | null {
  const d = (tel || '').replace(/\D/g, '')
  if (!d) return null
  if (d.length === 9 && d.startsWith('9')) return `56${d}`
  if (d.length === 8) return `569${d}`
  return d
}

function mensajeWhatsapp(pa: any, programa: string): string {
  const nombre = NOMBRE_PROGRAMA[programa] ?? 'AR School'
  const base = `Hola ${pa.apoderado_nombre ?? ''}, le saludamos de ${nombre}. Le escribimos por la solicitud de admisión de ${pa.alumno_nombre ?? ''} ${pa.alumno_apellido ?? ''} (${pa.codigo_seguimiento}).`
  const origen = typeof window !== 'undefined' ? window.location.origin : ''
  if (pa.estado === 'observada') {
    return `${base} Su solicitud tiene observaciones pendientes; puede revisarlas y corregirlas aquí: ${origen}/admision/subsanar/${pa.codigo_seguimiento}`
  }
  if (pa.estado === 'aprobada') {
    return `${base} Su solicitud fue aprobada y queremos coordinar con usted la matrícula.`
  }
  return base
}

/**
 * Botones de contacto con el apoderado (WhatsApp, llamada, email).
 * Detienen la propagación para poder usarse dentro de una fila clickeable.
 */
export default function ContactoRapido({ pa, programa, tamano = 'sm' }: { pa: any; programa: string; tamano?: 'sm' | 'md' }) {
  const wa = numeroWhatsapp(pa.apoderado_telefono)
  const tel = (pa.apoderado_telefono || '').replace(/[^\d+]/g, '')
  const email = pa.apoderado_email
  if (!wa && !tel && !email) return null

  const cls = tamano === 'md'
    ? 'h-8 px-3 gap-1.5 text-[11px] font-semibold'
    : 'w-7 h-7 justify-center'
  const base = `inline-flex items-center rounded-lg border border-[var(--ar-border)] bg-white hover:bg-slate-50 transition-colors ${cls}`
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div className="flex items-center gap-1 flex-shrink-0" onClick={stop}>
      {wa && (
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(mensajeWhatsapp(pa, programa))}`} target="_blank" rel="noopener noreferrer"
          className={base} title={`WhatsApp a ${pa.apoderado_nombre ?? 'apoderado'}`} aria-label="Escribir por WhatsApp">
          <i className="ti ti-brand-whatsapp text-[14px] text-[#25a244]" aria-hidden="true"/>
          {tamano === 'md' && 'WhatsApp'}
        </a>
      )}
      {tel && (
        <a href={`tel:${tel}`} className={base} title={`Llamar: ${pa.apoderado_telefono}`} aria-label="Llamar al apoderado">
          <i className="ti ti-phone text-[14px] text-[#1B3A5C]" aria-hidden="true"/>
          {tamano === 'md' && 'Llamar'}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}?subject=${encodeURIComponent(`Solicitud de admisión ${pa.codigo_seguimiento}`)}`} className={base} title={email} aria-label="Enviar email al apoderado">
          <i className="ti ti-mail text-[14px] text-[#1B3A5C]" aria-hidden="true"/>
          {tamano === 'md' && 'Email'}
        </a>
      )}
    </div>
  )
}
