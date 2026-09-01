// Link de pago oficial Webpay (Transbank) — válido para todos los programas:
// AR School, Play and Group, AR Worship School y Lions Soccer School.
export const LINK_PAGO_WEBPAY = 'https://www.webpay.cl/company/41244?utm_source=transbank&utm_medium=portal3.0&utm_campaign=link_portal'

interface Props {
  /** 'banner' = destacado ancho completo | 'boton' = botón compacto | 'card' = tarjeta */
  variante?: 'banner' | 'boton' | 'card'
  /** Tema oscuro para formularios públicos con fondo oscuro */
  oscuro?: boolean
  className?: string
}

/**
 * Botón/banner "Pagar aquí" que abre el portal de pago Webpay en una pestaña nueva.
 * Sirve para cualquier programa: matrícula, aporte inicial o mensualidades.
 */
export default function BotonPagarWebpay({ variante = 'banner', oscuro = false, className = '' }: Props) {
  const href = LINK_PAGO_WEBPAY

  if (variante === 'boton') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2D5A3F] text-white text-[12px] font-bold rounded-lg hover:bg-[#245234] transition-colors ${className}`}
      >
        <i className="ti ti-credit-card text-sm" aria-hidden="true"/> Pagar aquí
      </a>
    )
  }

  if (variante === 'card') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`block bg-white border border-[var(--ar-border)] rounded-xl p-4 hover:border-[#2D5A3F]/40 transition-colors ${className}`}
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDF5F0] flex items-center justify-center flex-shrink-0">
            <i className="ti ti-credit-card text-lg text-[#2D5A3F]" aria-hidden="true"/>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-[var(--ar-text)]">Pagar aquí</div>
            <div className="text-[11px] text-[var(--ar-muted)]">Paga con tarjeta de forma segura vía Webpay</div>
          </div>
          <i className="ti ti-external-link text-sm text-[var(--ar-muted)]" aria-hidden="true"/>
        </div>
      </a>
    )
  }

  // banner (default)
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-xl p-4 transition-all hover:scale-[1.005] ${
        oscuro
          ? 'bg-gradient-to-r from-[#2D5A3F] to-[#1f4530] border border-white/10'
          : 'bg-gradient-to-r from-[#2D5A3F] to-[#245234]'
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <i className="ti ti-credit-card text-xl text-white" aria-hidden="true"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-white">Pagar aquí</div>
          <div className="text-[11px] text-white/75 leading-snug">
            Matrícula, aporte inicial o mensualidad · Tarjeta de crédito o débito vía Webpay
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-white text-[#2D5A3F] text-[11px] font-bold rounded-lg flex-shrink-0">
          Ir a pagar <i className="ti ti-arrow-right text-xs" aria-hidden="true"/>
        </span>
      </div>
    </a>
  )
}
