'use client'

/**
 * Desglose del aporte mensual cuando hay beca: valor del contrato (natural), descuento y
 * valor final. El final es el que se cobra en cada cuota y el que figura en el contrato.
 */
export default function ResumenBeca({ montoMensual, porcentaje }: { montoMensual: number; porcentaje: number }) {
  const base = Number(montoMensual) || 0
  const pct = Math.max(0, Math.min(100, Number(porcentaje) || 0))
  if (base <= 0 || pct <= 0) return null
  const final = Math.round(base * (1 - pct / 100))
  const descuento = base - final
  const $ = (v: number) => `$${v.toLocaleString('es-CL')}`
  return (
    <div className="rounded-xl border border-[#2D5A3F]/20 bg-[#EDF5F0] px-3 py-2.5 text-[12px]">
      <div className="flex justify-between text-slate-600">
        <span>Aporte mensual (valor del contrato)</span>
        <span className="tabular-nums">{$(base)}</span>
      </div>
      <div className="flex justify-between text-[#b45309]">
        <span>Beca {pct}%</span>
        <span className="tabular-nums">−{$(descuento)}</span>
      </div>
      <div className="flex justify-between font-bold text-[#2D5A3F] border-t border-[#2D5A3F]/15 mt-1 pt-1">
        <span>Aporte mensual a pagar</span>
        <span className="tabular-nums">{$(final)}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1">Este valor final va en el contrato y en cada cuota; el contrato indica la beca aplicada.</p>
    </div>
  )
}
