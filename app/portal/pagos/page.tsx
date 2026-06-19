export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMonto, formatFecha } from '@/lib/utils'

export default async function PortalPagosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = (ur as any)?.rol

  // Obtener alumno_ids según rol
  let alumnoIds: string[] = []
  if (rol === 'alumno') {
    const { data: va } = await supabase.from('usuario_alumno').select('alumno_id').eq('usuario_id', user.id)
    alumnoIds = (va ?? []).map((r: any) => r.alumno_id)
  } else {
    const { data: ta } = await supabase.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id)
    alumnoIds = (ta ?? []).map((r: any) => r.alumno_id)
  }

  if (alumnoIds.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-[#1a2332]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Estado de pagos</h1>
        <div className="mt-8 bg-white border border-[#e8eaed] rounded-xl p-10 text-center">
          <i className="ti ti-cash text-3xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
          <p className="text-[#9ca3af] text-sm">No hay alumnos vinculados a tu cuenta.</p>
        </div>
      </div>
    )
  }

  const { data: cobros } = await supabase
    .from('cobros').select('*, concepto:conceptos_cobro(nombre), alumno:alumnos(nombre,apellido,curso)')
    .in('alumno_id', alumnoIds).order('fecha_vencimiento', { ascending: false })

  const pendiente = (cobros ?? []).filter((c: any) => c.estado !== 'pagado').reduce((a: number, c: any) => a + (c.monto - c.monto_pagado), 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a2332]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Estado de pagos</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">Cobros y mensualidades</p>
      </div>

      {pendiente > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="ti ti-alert-circle text-[#c53030] text-lg" aria-hidden="true"/>
            <div>
              <div className="font-semibold text-[#c53030] text-sm">Saldo pendiente</div>
              <div className="text-[11px] text-[#c53030]/70">Pagos sin regularizar</div>
            </div>
          </div>
          <div className="text-xl font-bold text-[#c53030]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{formatMonto(pendiente)}</div>
        </div>
      )}

      <div className="bg-white border border-[#e8eaed] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f7f8fa] border-b border-[#e8eaed]">
              {['Alumno','Concepto','Monto','Vencimiento','Estado'].map(h => (
                <th key={h} className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!cobros || cobros.length === 0) ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[#9ca3af] text-sm">Sin cobros registrados.</td></tr>
            ) : (cobros as any[]).map((c: any) => (
              <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                <td className="px-4 py-3.5 font-medium text-[#1a2332]">{c.alumno?.nombre} {c.alumno?.apellido}</td>
                <td className="px-4 py-3.5 text-[#6b7280] text-xs">{c.concepto?.nombre ?? 'Mensualidad'}</td>
                <td className="px-4 py-3.5">
                  <span className={`font-semibold ${c.estado === 'pagado' ? 'text-[#1a7a4c]' : 'text-[#c53030]'}`}>{formatMonto(c.monto)}</span>
                </td>
                <td className="px-4 py-3.5 text-xs text-[#6b7280]">{formatFecha(c.fecha_vencimiento)}</td>
                <td className="px-4 py-3.5">
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
