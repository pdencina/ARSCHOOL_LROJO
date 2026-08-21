'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  matricula: any
  onClose: () => void
  onSave: () => void
}

export default function EditarMatriculaModal({ matricula, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [form, setForm] = useState({
    monto_matricula: matricula.monto_matricula ?? 0,
    monto_mensual: matricula.monto_mensual ?? 0,
    fecha_inicio_contrato: matricula.fecha_inicio_contrato || matricula.fecha_matricula || '',
    porcentaje_beca: matricula.porcentaje_beca ?? 0,
    proporcional_primer_mes: 0,
    observaciones: matricula.observaciones || '',
  })

  async function guardar() {
    setSaving(true)
    try {
      const payload: any = {
        monto_matricula: form.monto_matricula,
        monto_mensual: form.monto_mensual,
      }
      if (form.observaciones) payload.observaciones = form.observaciones
      if (form.fecha_inicio_contrato) payload.fecha_inicio_contrato = form.fecha_inicio_contrato
      if (form.porcentaje_beca > 0) payload.porcentaje_beca = form.porcentaje_beca

      // 1. Guardar matrícula
      const res = await fetch(`/api/matriculas/${matricula.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text ? JSON.parse(text).error || 'Error al guardar' : 'Error al guardar')
      }

      // 2. Recalcular cobros automáticamente
      const res2 = await fetch(`/api/matriculas/${matricula.id}/recalcular-cobros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_mensual: form.monto_mensual,
          monto_matricula: form.monto_matricula,
          fecha_inicio_contrato: form.fecha_inicio_contrato,
          porcentaje_beca: form.porcentaje_beca,
          proporcional_primer_mes: form.proporcional_primer_mes || 0,
        }),
      })
      if (res2.ok) {
        const data2 = await res2.json()
        toast.success(`Matrícula guardada y cobros recalculados (${data2.generados} generados)`)
      } else {
        toast.success('Matrícula guardada. Cobros no se recalcularon (revise manualmente).')
      }

      onSave()
    } catch (e: any) { toast.error(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function recalcularCobros() {
    if (!confirm('¿Recalcular cobros? Se eliminarán los cobros PENDIENTES y se generarán nuevos con los montos actuales. Los cobros ya pagados no se tocan.')) return
    setRecalculando(true)
    try {
      const res = await fetch(`/api/matriculas/${matricula.id}/recalcular-cobros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_mensual: form.monto_mensual,
          monto_matricula: form.monto_matricula,
          fecha_inicio_contrato: form.fecha_inicio_contrato,
          porcentaje_beca: form.porcentaje_beca,
          proporcional_primer_mes: form.proporcional_primer_mes || 0,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text ? JSON.parse(text).error || 'Error' : 'Error al recalcular')
      }
      const data = await res.json()
      toast.success(`Cobros recalculados: ${data.eliminados} eliminados, ${data.generados} generados`)
      onSave()
    } catch (e: any) { toast.error(e.message || 'Error al recalcular') }
    finally { setRecalculando(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-[var(--ar-text)]">Editar matrícula</h2>
              <p className="text-[10px] text-[var(--ar-muted)]">{matricula.alumno?.nombre} {matricula.alumno?.apellido}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Aporte inicial ($)</label>
                <input
                  type="number"
                  value={form.monto_matricula}
                  onChange={e => setForm(p => ({...p, monto_matricula: parseInt(e.target.value) || 0}))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Aporte mensual ($)</label>
                <input
                  type="number"
                  value={form.monto_mensual}
                  onChange={e => setForm(p => ({...p, monto_mensual: parseInt(e.target.value) || 0}))}
                  className="input-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Fecha inicio contrato</label>
              <input
                type="date"
                value={form.fecha_inicio_contrato}
                onChange={e => setForm(p => ({...p, fecha_inicio_contrato: e.target.value}))}
                className="input-base"
              />
              <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Desde cuándo rigen los cobros. Afecta la tabla del contrato.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Proporcional 1er mes ($)</label>
                <input
                  type="number"
                  value={form.proporcional_primer_mes || ''}
                  onChange={e => setForm(p => ({...p, proporcional_primer_mes: parseInt(e.target.value) || 0}))}
                  className="input-base"
                  placeholder="0"
                />
                <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Días fraccionados del primer mes</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Beca (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.porcentaje_beca || ''}
                  onChange={e => setForm(p => ({...p, porcentaje_beca: parseInt(e.target.value) || 0}))}
                  className="input-base"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm(p => ({...p, observaciones: e.target.value}))}
                rows={2}
                className="input-base resize-none"
                placeholder="Notas internas..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 btn-secondary py-2.5">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 bg-[#1B3A5C] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar y recalcular'}
            </button>
          </div>

          <p className="text-[9px] text-[var(--ar-muted)] text-center mt-3">
            Al guardar, se actualizan los datos y se regeneran los cobros pendientes automáticamente.
          </p>
        </div>
      </div>
    </>
  )
}
