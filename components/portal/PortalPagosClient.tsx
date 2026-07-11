'use client'

import { useState, useRef } from 'react'
import toast from 'react-hot-toast'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Props { cobros: any[] }

export default function PortalPagosClient({ cobros }: Props) {
  const [reportandoId, setReportandoId] = useState<string | null>(null)
  const [comprobante, setComprobante] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pendientes = cobros.filter(c => c.estado !== 'pagado')
  const pagados = cobros.filter(c => c.estado === 'pagado')
  const totalPendiente = pendientes.reduce((a, c) => a + (c.monto - (c.monto_pagado ?? 0)), 0)

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setComprobante(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function enviarComprobante(cobroId: string) {
    if (!comprobante) { toast.error('Sube una foto del comprobante'); return }
    setEnviando(true)
    const res = await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cobro_id: cobroId, comprobante_url: comprobante, metodo: 'transferencia' }),
    })
    if (res.ok) {
      toast.success('Comprobante enviado. Se validará en breve.')
      setReportandoId(null)
      setComprobante('')
      // Refresh page
      window.location.reload()
    } else {
      toast.error('Error al enviar comprobante')
    }
    setEnviando(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="page-title">Estado de aportes</h1>
        <p className="page-subtitle">Detalle de aportes mensuales y opciones de pago</p>
      </div>

      {/* Resumen */}
      {totalPendiente > 0 && (
        <div className="bg-[#FEF3EC] border border-[#E8722A]/20 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E8722A]/10 rounded-full flex items-center justify-center">
              <i className="ti ti-alert-circle text-[#E8722A] text-lg" aria-hidden="true"/>
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#E8722A]">Aportes pendientes</div>
              <div className="text-[11px] text-[#E8722A]/70">{pendientes.length} aporte{pendientes.length > 1 ? 's' : ''} sin regularizar</div>
            </div>
          </div>
          <div className="text-[20px] font-bold text-[#E8722A]" style={{ fontFamily: 'DM Sans' }}>${totalPendiente.toLocaleString('es-CL')}</div>
        </div>
      )}

      {totalPendiente === 0 && cobros.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <i className="ti ti-check text-emerald-600 text-lg" aria-hidden="true"/>
          </div>
          <div>
            <div className="text-[13px] font-bold text-emerald-800">¡Estás al día!</div>
            <div className="text-[11px] text-emerald-700">Todos tus aportes están pagados.</div>
          </div>
        </div>
      )}

      {/* Aportes pendientes */}
      {pendientes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[14px] font-bold text-[#1B3A5C] mb-3 flex items-center gap-2">
            <i className="ti ti-clock text-[#E8722A]" aria-hidden="true"/> Pendientes
          </h2>
          <div className="space-y-2">
            {pendientes.map(c => (
              <div key={c.id} className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                      <span className="text-[11px] font-bold text-amber-700">{MESES[(c.mes - 1)]}</span>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-[#1B3A5C]">
                        {c.observaciones || `Aporte ${MESES[(c.mes - 1)]} ${c.anio}`}
                      </div>
                      <div className="text-[11px] text-[#9ca3af]">
                        {c.alumno?.nombre} {c.alumno?.apellido} · Vence: 1 {MESES[(c.mes - 1)].toLowerCase()} {c.anio}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[15px] font-bold text-[#1B3A5C]">${c.monto.toLocaleString('es-CL')}</div>
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded uppercase">Pendiente</span>
                    </div>
                    <button onClick={() => { setReportandoId(c.id); setComprobante('') }} className="btn-primary text-[11px] py-2 px-3">
                      <i className="ti ti-upload text-xs" aria-hidden="true"/> Reportar pago
                    </button>
                  </div>
                </div>

                {/* Modal inline para reportar pago */}
                {reportandoId === c.id && (
                  <div className="mt-4 border-t border-[#f3f4f6] pt-4">
                    <div className="bg-[#f9fafb] rounded-lg p-4">
                      <h4 className="text-[12px] font-semibold text-[#1B3A5C] mb-2">Reportar pago de ${c.monto.toLocaleString('es-CL')}</h4>
                      <p className="text-[11px] text-[#6b7280] mb-3">Sube una foto o screenshot del comprobante de transferencia.</p>
                      
                      <div className="bg-[#f0f4f8] rounded-lg p-3 mb-3 text-[10px] text-[#4b5563]">
                        <strong>Datos para transferir:</strong><br/>
                        Banco: BancoEstado · Cta. Cte. 291-0-008051-4<br/>
                        RUT: 65.168.392-0 · Fundación Educacional AR Ministries<br/>
                        Correo: adm@arschoolglobal.com
                      </div>

                      {comprobante ? (
                        <div className="relative mb-3">
                          <img src={comprobante} alt="Comprobante" className="w-full max-h-[200px] object-contain rounded-lg border border-[var(--ar-border)]"/>
                          <button onClick={() => setComprobante('')} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                            <i className="ti ti-x"/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => inputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-[#d1d5db] rounded-lg text-[12px] text-[#6b7280] hover:border-[#1B3A5C] hover:text-[#1B3A5C] transition-colors mb-3">
                          <i className="ti ti-camera text-lg block mb-1" aria-hidden="true"/>
                          Subir comprobante
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => setReportandoId(null)} className="btn-secondary text-[11px] flex-1">Cancelar</button>
                        <button onClick={() => enviarComprobante(c.id)} disabled={!comprobante || enviando} className="btn-primary text-[11px] flex-1 disabled:opacity-50">
                          {enviando ? 'Enviando...' : 'Enviar comprobante'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aportes pagados */}
      {pagados.length > 0 && (
        <div>
          <h2 className="text-[14px] font-bold text-[#1B3A5C] mb-3 flex items-center gap-2">
            <i className="ti ti-check text-emerald-600" aria-hidden="true"/> Pagados
          </h2>
          <div className="space-y-2">
            {pagados.map(c => (
              <div key={c.id} className="bg-white border border-[var(--ar-border)] rounded-xl p-4 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <i className="ti ti-check text-emerald-600" aria-hidden="true"/>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#1B3A5C]">
                      {c.observaciones || `Aporte ${MESES[(c.mes - 1)]} ${c.anio}`}
                    </div>
                    <div className="text-[11px] text-[#9ca3af]">{c.alumno?.nombre} {c.alumno?.apellido}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-bold text-emerald-700">${c.monto.toLocaleString('es-CL')}</div>
                  <span className="text-[9px] text-emerald-600 font-medium">PAGADO</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opciones de pago */}
      <div className="mt-8 bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-[13px] font-bold text-[#1B3A5C] mb-3">Formas de pago</h3>
        <div className="grid grid-cols-2 gap-3">
          <a href="https://www.webpay.cl/company/41244" target="_blank" className="flex flex-col items-center gap-2 p-4 border border-[var(--ar-border)] rounded-lg hover:border-[#E8722A] hover:bg-[#FEF3EC]/30 transition-colors">
            <i className="ti ti-credit-card text-[#E8722A] text-xl" aria-hidden="true"/>
            <span className="text-[11px] font-semibold text-[#1B3A5C]">Pagar con Webpay</span>
            <span className="text-[9px] text-[#9ca3af]">Tarjeta débito o crédito</span>
          </a>
          <button onClick={() => setReportandoId(pendientes[0]?.id || null)} className="flex flex-col items-center gap-2 p-4 border border-[var(--ar-border)] rounded-lg hover:border-[#5B8FA8] hover:bg-blue-50/30 transition-colors">
            <i className="ti ti-building-bank text-[#5B8FA8] text-xl" aria-hidden="true"/>
            <span className="text-[11px] font-semibold text-[#1B3A5C]">Reportar transferencia</span>
            <span className="text-[9px] text-[#9ca3af]">Subir comprobante</span>
          </button>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden"/>
    </div>
  )
}
