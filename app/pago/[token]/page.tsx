'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function PagoLinkPage({ params }: { params: { token: string } }) {
  const searchParams = useSearchParams()
  const cobroId = searchParams.get('id')
  const token = params.token
  const [cobro, setCobro] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    async function cargar() {
      if (!cobroId || !token) { setError('Link inválido'); setLoading(false); return }
      const res = await fetch(`/api/pagos/link?id=${cobroId}&token=${token}`)
      if (res.ok) {
        const data = await res.json()
        setCobro(data)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Link inválido o expirado')
      }
      setLoading(false)
    }
    cargar()
  }, [cobroId, token])

  async function handlePagar() {
    setPagando(true)
    const res = await fetch('/api/pagos/webpay/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cobro_id: cobroId, token }),
    })
    const data = await res.json()
    if (res.ok && data.url && data.token) {
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
      setPagando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center">
          <i className="ti ti-loader text-3xl text-[#1a2332] animate-spin block mb-3" aria-hidden="true"/>
          <p className="text-[#6b7280] text-sm">Cargando información de pago...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <i className="ti ti-alert-circle text-4xl text-red-500 block mb-3" aria-hidden="true"/>
          <h2 className="text-lg font-bold text-[#1a2332] mb-2">Link no válido</h2>
          <p className="text-[#6b7280] text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (cobro?.estado === 'pagado') {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <i className="ti ti-circle-check text-4xl text-emerald-500 block mb-3" aria-hidden="true"/>
          <h2 className="text-lg font-bold text-[#1a2332] mb-2">Ya está pagado</h2>
          <p className="text-[#6b7280] text-sm">Este cobro ya fue cancelado exitosamente.</p>
        </div>
      </div>
    )
  }

  const montoPendiente = (cobro?.monto ?? 0) - (cobro?.monto_pagado ?? 0)

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <Toaster position="top-center"/>
      {/* Header */}
      <div className="bg-white border-b border-[#e8eaed] py-4 px-6">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a2332] rounded-lg flex items-center justify-center text-white font-bold text-sm">AR</div>
          <div>
            <div className="font-bold text-[#1a2332] text-[14px]">AR SCHOOL GLOBAL</div>
            <div className="text-[10px] text-[#9ca3af]">Pago en línea seguro</div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-md mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Monto */}
          <div className="bg-[#1a2332] px-6 py-6 text-center">
            <p className="text-white/60 text-[11px] uppercase tracking-wider mb-1">Monto a pagar</p>
            <p className="text-white text-3xl font-bold" style={{ fontFamily: 'DM Sans' }}>${montoPendiente.toLocaleString('es-CL')}</p>
          </div>

          {/* Detalle */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#6b7280]">Concepto</span>
              <span className="font-medium text-[#1a2332]">Aporte {MESES[(cobro?.mes ?? 1) - 1]} {cobro?.anio}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#6b7280]">Alumno</span>
              <span className="font-medium text-[#1a2332]">{cobro?.alumno?.nombre} {cobro?.alumno?.apellido}</span>
            </div>
            {cobro?.alumno?.curso && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Curso</span>
                <span className="font-medium text-[#1a2332]">{cobro.alumno.curso}</span>
              </div>
            )}
          </div>

          {/* Botón de pago */}
          <div className="px-6 pb-6">
            <button
              onClick={handlePagar}
              disabled={pagando}
              className="w-full bg-[#1a2332] text-white py-4 rounded-xl font-semibold text-[14px] hover:bg-[#2a3a52] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pagando ? (
                <><i className="ti ti-loader animate-spin text-sm" aria-hidden="true"/> Procesando...</>
              ) : (
                <><i className="ti ti-credit-card text-sm" aria-hidden="true"/> Pagar con tarjeta</>
              )}
            </button>

            {/* Transferencia como alternativa */}
            <details className="mt-4">
              <summary className="text-[11px] text-[#6b7280] cursor-pointer hover:text-[#1a2332] text-center">También puedes pagar por transferencia</summary>
              <div className="mt-3 bg-[#f9fafb] rounded-lg p-3 text-[11px] text-[#4b5563] space-y-0.5">
                <div><strong>Banco:</strong> BancoEstado · Cta. Cte. 291-0-008051-4</div>
                <div><strong>RUT:</strong> 65.168.392-0</div>
                <div><strong>Nombre:</strong> Fund. Educacional AR Ministries</div>
                <div><strong>Email:</strong> adm@arschoolglobal.com</div>
              </div>
            </details>
          </div>
        </div>

        {/* Seguridad */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#9ca3af]">
            <i className="ti ti-lock text-[10px]" aria-hidden="true"/>
            Pago seguro procesado por Transbank Webpay Plus
          </div>
        </div>
      </div>
    </div>
  )
}
