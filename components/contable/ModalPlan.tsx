'use client'
import { useState } from 'react'

interface Props { onClose: () => void; onGuardar: (plan: any) => Promise<void> }

const CURSOS = ['1° Básico','2° Básico','3° Básico','4° Básico','5° Básico','6° Básico','7° Básico','8° Básico','I° Medio','II° Medio','III° Medio','IV° Medio']

export default function ModalPlan({ onClose, onGuardar }: Props) {
  const [form, setForm] = useState({ nombre: '', monto: '', periodicidad: 'mensual', descripcion: '', cursos: [] as string[] })
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!form.nombre || !form.monto) return
    setSaving(true)
    await onGuardar({ ...form, monto: parseInt(form.monto), cursos: form.cursos.length > 0 ? form.cursos : null })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#0F1B2D] px-5 py-4 flex items-center justify-between">
          <h3 className="font-display font-semibold text-white">Nuevo plan de cobro</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del plan *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Ej: Mensualidad 2025"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Monto (CLP) *</label>
              <input type="number" value={form.monto} onChange={e => setForm(p => ({...p, monto: e.target.value}))} className="input-base" placeholder="95000"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Periodicidad</label>
              <select value={form.periodicidad} onChange={e => setForm(p => ({...p, periodicidad: e.target.value}))} className="select-base w-full">
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
                <option value="unico">Pago único</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
            <input value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} className="input-base" placeholder="Opcional"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cursos (vacío = todos)</label>
            <div className="flex flex-wrap gap-1.5">
              {CURSOS.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, cursos: p.cursos.includes(c) ? p.cursos.filter(x => x !== c) : [...p.cursos, c] }))}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.cursos.includes(c) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end border-t border-slate-100 pt-4">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || !form.nombre || !form.monto} className="btn-primary disabled:opacity-60">
            {saving ? 'Guardando...' : 'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  )
}