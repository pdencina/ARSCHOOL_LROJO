'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'

interface Item { id: string; concepto: string; pendiente: number; monto: number; estado: string; vencimiento: string | null }
interface Consulta { alumno: { nombre: string; curso: string }; items: Item[]; totalPendiente: number }

export default function PagoFacilClient() {
  const searchParams = useSearchParams()
  const resultado = searchParams.get('resultado')

  const [rut, setRut] = useState('')
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [loading, setLoading] = useState(false)
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const [montoLibre, setMontoLibre] = useState<Record<string, string>>({})
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')

  // Formatea el RUT mientras escribe: 12.345.678-9
  function formatRut(v: string) {
    const limpio = v.replace(/[^0-9kK]/g, '').toUpperCase()
    if (limpio.length <= 1) return limpio
    const cuerpo = limpio.slice(0, -1)
    const dv = limpio.slice(-1)
    const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${conPuntos}-${dv}`
  }

  async function consultar() {
    if (!rut.trim()) { toast.error('Ingresa el RUT del alumno'); return }
    setLoading(true)
    setConsulta(null)
    try {
      const res = await fetch('/api/pago-facil/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo consultar')
      setConsulta(data)
      if (data.items.length === 0) toast('Este alumno no tiene pagos pendientes', { icon: '✅' })
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function pagar(item: Item) {
    setPagandoId(item.id)
    try {
      const montoTexto = montoLibre[item.id]
      const monto = montoTexto ? Number(montoTexto.replace(/[^0-9]/g, '')) : item.pendiente
      const res = await fetch('/api/pago-facil/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cobro_id: item.id, monto, nombre, email }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo iniciar el pago')
      // Redirigir a Webpay
      if (data.url && data.token) {
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = data.url
        const input = document.createElement('input')
        input.type = 'hidden'; input.name = 'token_ws'; input.value = data.token
        form.appendChild(input)
        document.body.appendChild(form)
        form.submit()
      }
    } catch (e: any) { toast.error(e.message); setPagandoId(null) }
  }

  const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <Toaster position="top-center"/>
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-arschool.png" alt="AR School" width={34} height={34} className="rounded-lg"/>
          <div>
            <div className="text-[15px] font-bold text-[#1B3A5C]">AR School — Pago en línea</div>
            <div className="text-[11px] text-gray-400">Fundación Educacional AR Ministries</div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {/* Mensajes de resultado */}
        {resultado === 'exito' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <i className="ti ti-circle-check text-emerald-600 text-xl" aria-hidden="true"/>
            <div><div className="text-[13px] font-bold text-emerald-800">Pago realizado con éxito</div><div className="text-[11px] text-emerald-700">Gracias, tu pago fue procesado correctamente.</div></div>
          </div>
        )}
        {resultado === 'rechazado' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <i className="ti ti-x text-red-600 text-xl" aria-hidden="true"/>
            <div><div className="text-[13px] font-bold text-red-800">Pago rechazado</div><div className="text-[11px] text-red-700">Tu banco rechazó la transacción. Intenta con otra tarjeta.</div></div>
          </div>
        )}
        {resultado === 'cancelado' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <i className="ti ti-alert-circle text-amber-600 text-xl" aria-hidden="true"/>
            <div><div className="text-[13px] font-bold text-amber-800">Pago cancelado</div><div className="text-[11px] text-amber-700">Cancelaste el pago. Puedes intentar nuevamente.</div></div>
          </div>
        )}

        {/* Consulta por RUT */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h1 className="text-[17px] font-bold text-[#1B3A5C] mb-1">Pago rápido</h1>
          <p className="text-[12px] text-gray-500 mb-4">Ingresa el RUT del alumno para ver tus pagos pendientes.</p>
          <div className="flex gap-2">
            <input
              value={rut}
              onChange={e => setRut(formatRut(e.target.value))}
              onKeyDown={e => { if (e.key === 'Enter') consultar() }}
              placeholder="12.345.678-9"
              maxLength={12}
              className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2D5A3F]"
            />
            <button onClick={consultar} disabled={loading} className="px-5 py-2.5 bg-[#2D5A3F] text-white text-sm font-bold rounded-xl hover:bg-[#245234] disabled:opacity-50 transition-colors">
              {loading ? '...' : 'Consultar'}
            </button>
          </div>
        </div>

        {/* Resultado */}
        {consulta && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="pb-3 mb-3 border-b border-gray-100">
              <div className="text-[14px] font-bold text-[#1B3A5C]">{consulta.alumno.nombre}</div>
              <div className="text-[11px] text-gray-400">{consulta.alumno.curso}</div>
            </div>

            {consulta.items.length === 0 ? (
              <div className="text-center py-8">
                <i className="ti ti-circle-check text-3xl text-emerald-500 block mb-2" aria-hidden="true"/>
                <p className="text-sm text-gray-500">No hay pagos pendientes. ¡Estás al día!</p>
              </div>
            ) : (
              <>
                {/* Datos del pagador (opcional, para el comprobante) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre (opcional)"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#2D5A3F]"/>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Tu email (opcional)"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#2D5A3F]"/>
                </div>

                <div className="space-y-2">
                  {consulta.items.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[13px] font-semibold text-[#1B3A5C]">{item.concepto}</div>
                          {item.estado === 'mora' && <span className="text-[10px] font-bold text-red-600">En mora</span>}
                        </div>
                        <div className="text-[15px] font-bold text-[#1B3A5C]">{fmt(item.pendiente)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={montoLibre[item.id] ?? ''}
                          onChange={e => setMontoLibre(m => ({ ...m, [item.id]: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder={`Otro monto (máx ${fmt(item.pendiente)})`}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#2D5A3F]"
                        />
                        <button onClick={() => pagar(item)} disabled={pagandoId === item.id}
                          className="px-4 py-2 bg-[#2D5A3F] text-white text-xs font-bold rounded-lg hover:bg-[#245234] disabled:opacity-50 transition-colors whitespace-nowrap">
                          {pagandoId === item.id ? 'Redirigiendo...' : 'Pagar ahora'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">Total pendiente</span>
                  <span className="text-[16px] font-bold text-[#E8722A]">{fmt(consulta.totalPendiente)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-3 text-center">
                  <i className="ti ti-lock mr-1" aria-hidden="true"/>
                  Pago seguro procesado por Webpay (Transbank). Puedes pagar cada aporte por separado.
                </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
