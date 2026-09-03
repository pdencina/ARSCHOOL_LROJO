'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props { cobro: any; onClose: () => void }

export default function ModalEditarCobro({ cobro, onClose }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [monto, setMonto] = useState(cobro.monto ?? 0)
  const [vencimiento, setVencimiento] = useState(cobro.fecha_vencimiento ? String(cobro.fecha_vencimiento).split('T')[0] : '')
  const [observaciones, setObservaciones] = useState(cobro.observaciones || '')
  const [motivoAnular, setMotivoAnular] = useState('')
  const [modoAnular, setModoAnular] = useState(false)

  const tienePagos = (cobro.monto_pagado ?? 0) > 0 || cobro.estado === 'pagado'
  const anulado = cobro.estado === 'anulado'

  async function llamar(payload: any, msgOk: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/cobros/${cobro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Error')
      toast.success(msgOk)
      onClose()
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#1B3A5C]">Editar cobro</h3>
            <p className="text-[11px] text-gray-400">{cobro.concepto?.nombre ?? 'Aporte'} · {cobro.mes}/{cobro.anio}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {anulado ? (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[12px] text-slate-600">
              Este cobro está <strong>anulado</strong>. Puedes reactivarlo si fue un error.
            </div>
            <button onClick={() => llamar({ accion: 'reactivar' }, 'Cobro reactivado')} disabled={saving}
              className="w-full py-2.5 bg-[#1B3A5C] text-white text-xs font-bold rounded-lg hover:bg-[#143050] disabled:opacity-50">
              Reactivar cobro
            </button>
          </div>
        ) : modoAnular ? (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-[12px] text-red-700">
              Anular este cobro lo deja fuera del cálculo de deuda. No se puede anular si ya tiene pagos.
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Motivo (opcional)</label>
              <input value={motivoAnular} onChange={e => setMotivoAnular(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A5C]"
                placeholder="Ej: cobro duplicado"/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModoAnular(false)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg">Volver</button>
              <button onClick={() => llamar({ accion: 'anular', motivo: motivoAnular }, 'Cobro anulado')} disabled={saving || tienePagos}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                Confirmar anulación
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Monto ($)</label>
              <input type="number" value={monto} onChange={e => setMonto(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B3A5C]"/>
              {tienePagos && <p className="text-[10px] text-amber-600 mt-1">Ya pagado ${(cobro.monto_pagado ?? 0).toLocaleString('es-CL')}. El estado se recalcula según el nuevo monto.</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Fecha de vencimiento</label>
              <input type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B3A5C]"/>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Observaciones</label>
              <input value={observaciones} onChange={e => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A5C]"
                placeholder="Nota interna del cobro"/>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModoAnular(true)} disabled={tienePagos}
                className="px-3 py-2.5 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-40"
                title={tienePagos ? 'No se puede anular un cobro con pagos' : 'Anular cobro'}>
                Anular
              </button>
              <button onClick={() => llamar({ accion: 'editar', monto, fecha_vencimiento: vencimiento, observaciones }, 'Cobro actualizado')} disabled={saving}
                className="flex-1 py-2.5 bg-[#2D5A3F] text-white text-xs font-bold rounded-lg hover:bg-[#245234] disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
