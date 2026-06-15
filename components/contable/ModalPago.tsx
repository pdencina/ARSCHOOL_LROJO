'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { CobroConFamilia } from '@/types'
import { formatMonto } from '@/lib/utils'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

interface Props { cobro: CobroConFamilia; onClose: () => void }

type MedioPago = 'transferencia' | 'webpay' | 'efectivo' | 'cheque' | 'app'

export default function ModalPago({ cobro, onClose }: Props) {
  const [monto, setMonto] = useState(cobro.monto - cobro.monto_pagado)
  const [medio, setMedio] = useState<MedioPago>('transferencia')
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const saldo = cobro.monto - cobro.monto_pagado
  const alumno = cobro.familia?.alumno

  async function handlePago() {
    setLoading(true)
    try {
      const { error: pagoError } = await supabase.from('pagos').insert({
        cobro_id: cobro.id,
        monto,
        medio_pago: medio,
        referencia: obs || null,
        registrado_por: (await supabase.auth.getUser()).data.user!.id,
      })
      if (pagoError) throw pagoError

      const nuevoMontoPagado = cobro.monto_pagado + monto
      const nuevoEstado = nuevoMontoPagado >= cobro.monto ? 'pagado' : 'parcial'
      await supabase.from('cobros').update({
        monto_pagado: nuevoMontoPagado,
        estado: nuevoEstado,
        medio_pago: medio,
        fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', cobro.id)

      toast.success('Pago registrado correctamente')
      onClose()
      router.refresh()
    } catch {
      toast.error('Error al registrar el pago')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-azul/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-azul px-5 py-4 flex items-center justify-between">
          <div>
            <h4 className="font-playfair text-lg font-bold text-white">Registrar pago</h4>
            <p className="font-mono text-xs text-white/60 mt-0.5">
              Fam. {cobro.familia?.apellido_apoderado} — {alumno?.nombre} {alumno?.curso}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={18}/></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-papel p-3 rounded-sm">
              <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1">Concepto</div>
              <div className="font-semibold text-sm">{cobro.concepto?.nombre ?? 'Mensualidad'}</div>
            </div>
            <div className="bg-rojo-claro p-3 rounded-sm">
              <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1">Saldo pendiente</div>
              <div className="font-playfair text-lg font-bold text-rojo">{formatMonto(saldo)}</div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">
                Forma de pago
              </label>
              <select
                value={medio}
                onChange={e => setMedio(e.target.value as MedioPago)}
                className="select-base w-full"
              >
                <option value="transferencia">Transferencia bancaria</option>
                <option value="webpay">Webpay / débito</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="app">App Folio Verde</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">
                Monto a pagar (CLP)
              </label>
              <input
                type="number"
                value={monto}
                onChange={e => setMonto(Number(e.target.value))}
                className="input-base"
                min={1}
                max={saldo}
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">
              Observaciones
            </label>
            <input
              value={obs}
              onChange={e => setObs(e.target.value)}
              className="input-base"
              placeholder="Ej: acordó pago en 2 cuotas…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handlePago}
            disabled={loading || monto <= 0}
            className="btn-primary flex-1 bg-verde hover:bg-verde-oscuro disabled:opacity-60"
          >
            {loading ? 'Registrando…' : '✓ Confirmar y emitir boleta'}
          </button>
        </div>
      </div>
    </div>
  )
}
