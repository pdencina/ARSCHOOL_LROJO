'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Aporte {
  id: string
  nivel: string
  modalidad: string
  jornada: string | null
  tipo: string
  anio: number
  sede: string | null
  monto: number
}

interface Props {
  aportes: Aporte[]
}

const NIVELES = ['Playgroup', 'Preschool a High School']
const MODALIDADES = ['presencial', 'online']
const JORNADAS = ['completa', 'media']
const TIPOS = ['inicial', 'mensual']
const SEDES = ['santiago', 'punta_arenas', 'puente_alto']

const SEDE_LABEL: Record<string, string> = {
  santiago: 'Santiago', punta_arenas: 'Punta Arenas', puente_alto: 'Puente Alto',
}

function formatMonto(monto: number) {
  return '$' + monto.toLocaleString('es-CL')
}

const EMPTY_FORM = {
  nivel: 'Playgroup',
  modalidad: 'presencial',
  jornada: '',
  tipo: 'mensual',
  anio: new Date().getFullYear(),
  sede: '',
  monto: 0,
}

export default function AportesClient({ aportes }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filtroAnio, setFiltroAnio] = useState<number>(new Date().getFullYear())
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const router = useRouter()

  const aniosDisponibles = useMemo(() => {
    const set = new Set(aportes.map(a => a.anio))
    return Array.from(set).sort((a, b) => b - a)
  }, [aportes])

  const aportesFiltrados = useMemo(() =>
    aportes.filter(a =>
      (!filtroAnio || a.anio === filtroAnio) &&
      (!filtroTipo || a.tipo === filtroTipo) &&
      (!filtroSede || a.sede === filtroSede || (!a.sede && filtroSede === 'todas'))
    ),
    [aportes, filtroAnio, filtroTipo, filtroSede]
  )

  function openNuevo() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  function openEditar(a: Aporte) {
    setEditingId(a.id)
    setForm({
      nivel: a.nivel,
      modalidad: a.modalidad,
      jornada: a.jornada ?? '',
      tipo: a.tipo,
      anio: a.anio,
      sede: a.sede ?? '',
      monto: a.monto,
    })
    setShowModal(true)
  }

  async function handleGuardar() {
    if (!form.monto || form.monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    setSaving(true)

    const payload = {
      ...form,
      jornada: form.jornada || null,
      sede: form.sede || null,
    }

    if (editingId) {
      const res = await fetch('/api/aportes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload }),
      })
      if (res.ok) {
        toast.success('Aporte actualizado')
        setShowModal(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al actualizar')
      }
    } else {
      const res = await fetch('/api/aportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Aporte creado')
        setShowModal(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al crear')
      }
    }
    setSaving(false)
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este registro de aportes?')) return
    const res = await fetch(`/api/aportes?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Registro eliminado')
      router.refresh()
    } else {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Tabla de aportes</h1>
          <p className="page-subtitle">Montos de matrícula y mensualidad por nivel, modalidad y sede</p>
        </div>
        <button onClick={openNuevo} className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nuevo aporte
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5">
        <select value={filtroAnio} onChange={e => setFiltroAnio(Number(e.target.value))} className="select-base text-[12px]">
          {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-base text-[12px]">
          <option value="">Inicial + Mensual</option>
          <option value="inicial">Solo inicial</option>
          <option value="mensual">Solo mensual</option>
        </select>
        <select value={filtroSede} onChange={e => setFiltroSede(e.target.value)} className="select-base text-[12px]">
          <option value="">Todas las sedes</option>
          <option value="todas">General (sin sede)</option>
          {SEDES.map(s => <option key={s} value={s}>{SEDE_LABEL[s]}</option>)}
        </select>
        <span className="text-[11px] text-slate-400 ml-auto">{aportesFiltrados.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Nivel</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Modalidad</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Jornada</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Sede</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Monto</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {aportesFiltrados.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.nivel}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{a.modalidad}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{a.jornada ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      a.tipo === 'inicial' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {a.tipo === 'inicial' ? 'Matrícula' : 'Mensual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{a.sede ? SEDE_LABEL[a.sede] ?? a.sede : 'Todas'}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatMonto(a.monto)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEditar(a)}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                        title="Editar"
                      >
                        <i className="ti ti-edit text-sm" aria-hidden="true"/>
                      </button>
                      <button
                        onClick={() => handleEliminar(a.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Eliminar"
                      >
                        <i className="ti ti-trash text-sm" aria-hidden="true"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {aportesFiltrados.length === 0 && (
          <div className="p-10 text-center">
            <i className="ti ti-table text-4xl text-slate-300 block mb-2" aria-hidden="true"/>
            <p className="text-slate-400 text-sm">No hay registros para estos filtros</p>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-[#0F1B2D] px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">
                {editingId ? 'Editar aporte' : 'Nuevo aporte'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Nivel *</label>
                  <select value={form.nivel} onChange={e => setForm(p => ({...p, nivel: e.target.value}))} className="select-base w-full">
                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Modalidad *</label>
                  <select value={form.modalidad} onChange={e => setForm(p => ({...p, modalidad: e.target.value}))} className="select-base w-full">
                    {MODALIDADES.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Jornada</label>
                  <select value={form.jornada} onChange={e => setForm(p => ({...p, jornada: e.target.value}))} className="select-base w-full">
                    <option value="">Todas</option>
                    {JORNADAS.map(j => <option key={j} value={j} className="capitalize">{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({...p, tipo: e.target.value}))} className="select-base w-full">
                    {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Año *</label>
                  <input
                    type="number"
                    value={form.anio}
                    onChange={e => setForm(p => ({...p, anio: parseInt(e.target.value) || new Date().getFullYear()}))}
                    className="input-base"
                    min={2024}
                    max={2030}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Sede</label>
                  <select value={form.sede} onChange={e => setForm(p => ({...p, sede: e.target.value}))} className="select-base w-full">
                    <option value="">Todas las sedes</option>
                    {SEDES.map(s => <option key={s} value={s}>{SEDE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Monto (CLP) *</label>
                  <input
                    type="number"
                    value={form.monto}
                    onChange={e => setForm(p => ({...p, monto: parseInt(e.target.value) || 0}))}
                    className="input-base"
                    min={0}
                    step={1000}
                    placeholder="250000"
                  />
                </div>
              </div>
              {form.monto > 0 && (
                <div className="text-right text-[12px] text-slate-500">
                  Valor: <span className="font-mono font-bold text-slate-800">{formatMonto(form.monto)}</span>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear aporte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
