'use client'

import { calcularEstadoCuenta, type CobroLike } from '@/lib/estado-cuenta'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Props {
  cobros: CobroLike[]
  /** 'apoderado' muestra tono cálido; 'admin' muestra tono neutro para la ficha */
  variante?: 'apoderado' | 'admin'
  titulo?: string
}

function clp(n: number) {
  return `$${(n ?? 0).toLocaleString('es-CL')}`
}

export default function EstadoCuentaResumen({ cobros, variante = 'apoderado', titulo = 'Estado de cuenta' }: Props) {
  const r = calcularEstadoCuenta(cobros)

  if (r.totalAnual === 0) {
    return (
      <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-[13px] font-bold text-[#1B3A5C] mb-1">{titulo}</h3>
        <p className="text-[11px] text-[#9ca3af]">Aún no hay aportes registrados para este alumno.</p>
      </div>
    )
  }

  const prox = r.proximoVencimiento

  return (
    <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
      {/* Encabezado con total y progreso */}
      <div className="bg-gradient-to-br from-[#1B3A5C] to-[#2a4d70] px-5 py-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold">{titulo}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-semibold">
            {r.porcentajePagado}% pagado
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] text-white/60 uppercase tracking-wide">Total del año</div>
            <div className="text-[22px] font-bold leading-tight" style={{ fontFamily: 'DM Sans' }}>{clp(r.totalAnual)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/60 uppercase tracking-wide">Saldo pendiente</div>
            <div className={`text-[18px] font-bold leading-tight ${r.totalPendiente > 0 ? 'text-[#FFB27A]' : 'text-emerald-300'}`} style={{ fontFamily: 'DM Sans' }}>
              {clp(r.totalPendiente)}
            </div>
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="mt-3 h-2 bg-white/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: `${Math.min(100, r.porcentajePagado)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-white/70">
          <span>Pagado: {clp(r.totalPagado)}</span>
          <span>{r.alDia ? '¡Al día!' : `${r.cantidadPendientes} pendiente${r.cantidadPendientes !== 1 ? 's' : ''}`}</span>
        </div>
      </div>

      {/* Desglose */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Aporte inicial */}
        <div className="border border-[var(--ar-border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Aporte inicial</span>
            {r.inicial.estado === 'pagado' && <span className="text-[9px] font-bold text-emerald-600">PAGADO</span>}
            {r.inicial.estado === 'pendiente' && <span className="text-[9px] font-bold text-amber-600">PENDIENTE</span>}
            {r.inicial.estado === 'parcial' && <span className="text-[9px] font-bold text-blue-600">PARCIAL</span>}
            {r.inicial.estado === 'no_aplica' && <span className="text-[9px] font-bold text-[#9ca3af]">—</span>}
          </div>
          <div className="text-[15px] font-bold text-[#1B3A5C]">{r.inicial.estado === 'no_aplica' ? 'No aplica' : clp(r.inicial.monto)}</div>
          {r.inicial.estado === 'parcial' && (
            <div className="text-[10px] text-[#9ca3af]">Pagado {clp(r.inicial.pagado)} · Falta {clp(r.inicial.pendiente)}</div>
          )}
        </div>

        {/* Aportes mensuales */}
        <div className="border border-[var(--ar-border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wide font-semibold">Aportes mensuales</span>
            <span className="text-[9px] font-bold text-[#1B3A5C]">{r.mensual.cuotasPagadas}/{r.mensual.cuotas}</span>
          </div>
          <div className="text-[15px] font-bold text-[#1B3A5C]">{clp(r.mensual.total)}</div>
          <div className="text-[10px] text-[#9ca3af]">
            Pagado {clp(r.mensual.pagado)}
            {r.mensual.pendiente > 0 ? ` · Falta ${clp(r.mensual.pendiente)}` : ''}
          </div>
        </div>
      </div>

      {/* Próximo vencimiento */}
      {prox && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between bg-[#FEF3EC] border border-[#E8722A]/15 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <i className="ti ti-calendar-due text-[#E8722A] text-sm" aria-hidden="true"/>
              <div>
                <div className="text-[11px] font-semibold text-[#1B3A5C]">Próximo: {prox.concepto}</div>
                {prox.fecha_vencimiento && (
                  <div className="text-[10px] text-[#9ca3af]">Vence {prox.fecha_vencimiento}</div>
                )}
              </div>
            </div>
            <div className="text-[14px] font-bold text-[#E8722A]" style={{ fontFamily: 'DM Sans' }}>{clp(prox.monto)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
