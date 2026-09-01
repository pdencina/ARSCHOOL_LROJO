'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import BotonPagarWebpay from '@/components/shared/BotonPagarWebpay'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Props { cobros: any[] }

export default function PortalPagosClient({ cobros }: Props) {
  const searchParams = useSearchParams()
  const resultado = searchParams.get('resultado')

  const [reportandoId, setReportandoId] = useState<string | null>(null)
  const [comprobante, setComprobante] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [pagandoWebpay, setPagandoWebpay] = useState<string | null>(null)
  const [qrCobroId, setQrCobroId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  async function pagarConWebpay(cobroId: string) {
    setPagandoWebpay(cobroId)
    try {
      const res = await fetch('/api/pagos/webpay/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cobro_id: cobroId }),
      })
      const data = await res.json()
      if (res.ok && data.url && data.token) {
        // Redirigir a Transbank
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = data.url
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'token_ws'
        input.value = data.token
        form.appendChild(input)
        document.body.appendChild(form)
        form.submit()
      } else {
        toast.error(data.error || 'Error al iniciar pago')
        setPagandoWebpay(null)
      }
    } catch {
      toast.error('Error de conexión')
      setPagandoWebpay(null)
    }
  }

  async function generarQR(cobroId: string) {
    setQrCobroId(cobroId)
    setQrLoading(true)
    setQrDataUrl(null)
    try {
      const res = await fetch('/api/pagos/webpay/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cobro_id: cobroId }),
      })
      const data = await res.json()
      if (res.ok && data.url && data.token) {
        const paymentUrl = `${data.url}?token_ws=${data.token}`
        // Generar QR dinámicamente
        const QRCode = (await import('qrcode')).default
        const qrImg = await QRCode.toDataURL(paymentUrl, { width: 280, margin: 2 })
        setQrDataUrl(qrImg)
      } else {
        toast.error(data.error || 'Error al generar QR')
        setQrCobroId(null)
      }
    } catch {
      toast.error('Error de conexión')
      setQrCobroId(null)
    }
    setQrLoading(false)
  }

  const pendientes = cobros.filter(c => c.estado !== 'pagado')
  const pagados = cobros.filter(c => c.estado === 'pagado')
  const totalPendiente = pendientes.reduce((a, c) => a + (c.monto - (c.monto_pagado ?? 0)), 0)

  function comprimirImagen(file: File, maxDim = 1200, calidad = 0.6): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
      reader.onload = () => {
        const img = new Image()
        img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
        img.onload = () => {
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            const escala = maxDim / Math.max(width, height)
            width = Math.round(width * escala)
            height = Math.round(height * escala)
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) { reject(new Error('Canvas no soportado')); return }
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', calidad))
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // PDFs: rechazar si es muy grande, aceptar si es chico
    if (file.type === 'application/pdf') {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('PDF muy pesado. Por favor haga un screenshot del comprobante y suba la imagen.')
        return
      }
      const reader = new FileReader()
      reader.onload = () => setComprobante(reader.result as string)
      reader.readAsDataURL(file)
      return
    }
    try {
      const dataUrl = await comprimirImagen(file)
      setComprobante(dataUrl)
    } catch {
      toast.error('No se pudo procesar la imagen. Intenta con otra foto.')
    }
  }

  async function enviarComprobante(cobroId: string) {
    if (!comprobante) { toast.error('Sube una foto del comprobante'); return }
    // Verificar tamaño del base64 (Vercel limit ~4MB)
    const tamanoMB = (comprobante.length * 0.75) / (1024 * 1024)
    if (tamanoMB > 3.5) {
      toast.error(`Imagen muy pesada (${tamanoMB.toFixed(1)}MB). Use una foto más liviana o haga screenshot.`)
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cobro_id: cobroId, comprobante_url: comprobante, metodo: 'transferencia' }),
      })
      if (res.ok) {
        toast.success('Comprobante enviado. Quedará por validar hasta que el equipo lo apruebe.')
        setReportandoId(null)
        setComprobante('')
        window.location.reload()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ? `Error: ${data.error}` : 'Error al enviar comprobante. Intente con una imagen más liviana.')
      }
    } catch {
      toast.error('Error de conexión al enviar comprobante')
    }
    setEnviando(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="page-title">Estado de aportes</h1>
        <p className="page-subtitle">Detalle de aportes mensuales y opciones de pago</p>
      </div>

      {/* Link de pago Webpay — visible para todos los programas */}
      <div className="mb-6">
        <BotonPagarWebpay variante="banner"/>
      </div>

      {/* Resultado del pago */}
      {resultado === 'exito' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <i className="ti ti-circle-check text-emerald-600 text-xl" aria-hidden="true"/>
          <div>
            <div className="text-[13px] font-bold text-emerald-800">Pago realizado con éxito</div>
            <div className="text-[11px] text-emerald-700">Tu pago fue procesado correctamente por Webpay.</div>
          </div>
        </div>
      )}
      {resultado === 'rechazado' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <i className="ti ti-x text-red-600 text-xl" aria-hidden="true"/>
          <div>
            <div className="text-[13px] font-bold text-red-800">Pago rechazado</div>
            <div className="text-[11px] text-red-700">Tu banco rechazó la transacción. Intenta con otra tarjeta o contacta a tu banco.</div>
          </div>
        </div>
      )}
      {resultado === 'cancelado' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <i className="ti ti-alert-circle text-amber-600 text-xl" aria-hidden="true"/>
          <div>
            <div className="text-[13px] font-bold text-amber-800">Pago cancelado</div>
            <div className="text-[11px] text-amber-700">Cancelaste el pago. Puedes intentar nuevamente cuando quieras.</div>
          </div>
        </div>
      )}

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
                      {c._voucherPendiente ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded uppercase">Por validar</span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded uppercase">Pendiente</span>
                      )}
                    </div>
                    {c._voucherPendiente ? (
                      <div className="text-[10px] text-blue-600 max-w-[180px] flex items-center gap-1.5">
                        <i className="ti ti-clock-hour-4 text-sm" aria-hidden="true"/>
                        <span>Comprobante enviado. En revisión por el equipo.</span>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => { setReportandoId(c.id); setComprobante('') }} className="btn-secondary text-[11px] py-2 px-3">
                          <i className="ti ti-upload text-xs" aria-hidden="true"/> Transferencia
                        </button>
                        <button onClick={() => generarQR(c.id)} className="btn-secondary text-[11px] py-2 px-3">
                          <i className="ti ti-qrcode text-xs" aria-hidden="true"/> QR
                        </button>
                        <button onClick={() => pagarConWebpay(c.id)} disabled={pagandoWebpay === c.id} className="btn-primary text-[11px] py-2 px-3 disabled:opacity-60">
                          {pagandoWebpay === c.id ? (
                            <><i className="ti ti-loader text-xs animate-spin" aria-hidden="true"/> Procesando...</>
                          ) : (
                            <><i className="ti ti-credit-card text-xs" aria-hidden="true"/> Pagar con tarjeta</>
                          )}
                        </button>
                      </>
                    )}
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
          <div className="flex flex-col items-center gap-2 p-4 border border-[var(--ar-border)] rounded-lg bg-emerald-50/30">
            <i className="ti ti-credit-card text-emerald-600 text-xl" aria-hidden="true"/>
            <span className="text-[11px] font-semibold text-[#1B3A5C]">Pagar con Webpay</span>
            <span className="text-[9px] text-[#9ca3af] text-center">Tarjeta débito, crédito o prepago. Haz clic en "Pagar con tarjeta" en cada cobro.</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border border-[var(--ar-border)] rounded-lg">
            <i className="ti ti-building-bank text-[#5B8FA8] text-xl" aria-hidden="true"/>
            <span className="text-[11px] font-semibold text-[#1B3A5C]">Transferencia bancaria</span>
            <span className="text-[9px] text-[#9ca3af] text-center">BancoEstado · Cta. Cte. 291-0-008051-4<br/>RUT: 65.168.392-0 · adm@arschoolglobal.com</span>
          </div>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden"/>

      {/* Modal QR */}
      {qrCobroId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setQrCobroId(null); setQrDataUrl(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1a2332] px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-[14px]">Pagar con QR</h3>
              <button onClick={() => { setQrCobroId(null); setQrDataUrl(null) }} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>
            <div className="p-6 text-center">
              {qrLoading ? (
                <div className="py-10">
                  <i className="ti ti-loader text-3xl text-[#1a2332] animate-spin block mb-3" aria-hidden="true"/>
                  <p className="text-[13px] text-[#6b7280]">Generando código QR...</p>
                </div>
              ) : qrDataUrl ? (
                <>
                  <p className="text-[12px] text-[#6b7280] mb-4">Escanea este código con tu celular para pagar desde tu app bancaria</p>
                  <img src={qrDataUrl} alt="QR de pago" className="mx-auto rounded-xl border border-slate-200 shadow-sm"/>
                  <p className="text-[11px] text-[#9ca3af] mt-4">Al escanear se abrirá Webpay en tu celular.<br/>El QR expira en 5 minutos.</p>
                </>
              ) : (
                <p className="text-[13px] text-red-500 py-10">Error al generar QR</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
