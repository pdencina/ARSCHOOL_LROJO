export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { formatMonto, formatFecha } from '@/lib/utils'

export default async function PortalPagosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ta } = await supabase.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user!.id)
  const alumnoIds = (ta ?? []).map((r: any) => r.alumno_id)

  const { data: cobros } = await supabase
    .from('cobros').select('*, concepto:conceptos_cobro(nombre), alumno:alumnos(nombre,apellido,curso)')
    .in('alumno_id', alumnoIds).order('fecha_vencimiento', { ascending: false })

  const pendiente = (cobros ?? []).filter((c: any) => c.estado !== 'pagado').reduce((a: number, c: any) => a + (c.monto - c.monto_pagado), 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Estado de pagos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Cobros y mensualidades de tu familia</p>
      </div>

      {pendiente > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="ti ti-alert-circle text-red-500 text-xl" aria-hidden="true"/>
            <div>
              <div className="font-semibold text-red-800 text-sm">Saldo pendiente</div>
              <div className="text-xs text-red-600">Tienes pagos sin regularizar</div>
            </div>
          </div>
          <div className="font-display text-xl font-bold text-red-600">{formatMonto(pendiente)}</div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Alumno','Concepto','Monto','Vencimiento','Estado'].map(h => (
                <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!cobros || cobros.length === 0) ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">Sin cobros registrados.</td></tr>
            ) : (cobros as any[]).map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.alumno?.nombre} {c.alumno?.apellido}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{c.concepto?.nombre ?? 'Mensualidad'}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${c.estado === 'pagado' ? 'text-emerald-600' : 'text-red-600'}`}>{formatMonto(c.monto)}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(c.fecha_vencimiento)}</td>
                <td className="px-4 py-3">
                  <span className={`tag ${c.estado === 'pagado' ? 'tag-ok' : c.estado === 'mora' ? 'tag-mora' : 'tag-pend'}`}>{c.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}