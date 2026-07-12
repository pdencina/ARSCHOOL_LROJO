'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  colegios: any[]
  stats: Record<string, { usuarios: number; alumnos: number }>
}

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  basico:       { label: 'Básico',       color: 'bg-slate-100 text-slate-600' },
  profesional:  { label: 'Profesional',  color: 'bg-blue-50 text-blue-700' },
  enterprise:   { label: 'Enterprise',   color: 'bg-purple-50 text-purple-700' },
}

const EMPTY_FORM = { nombre: '', rut: '', direccion: '', telefono: '', plan: 'profesional' }

export default function ColegiosClient({ colegios, stats }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const router = useRouter()

  const colegiosFiltrados = colegios.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.rut ?? '').includes(busqueda)
  )

  const totalUsuarios = Object.values(stats).reduce((a, b) => a + b.usuarios, 0)
  const totalAlumnos = Object.values(stats).reduce((a, b) => a + b.alumnos, 0)

  async function handleCrear() {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    const res = await fetch('/api/admin/colegios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Colegio creado')
      setShowModal(false)
      setForm({ ...EMPTY_FORM })
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Error al crear colegio')
    }
    setSaving(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Colegios</h1>
          <p className="page-subtitle">Gestión de establecimientos registrados en la plataforma</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-building-plus text-sm" aria-hidden="true"/> Nuevo colegio
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Colegios</div>
          <div className="kpi-value">{colegios.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Usuarios totales</div>
          <div className="kpi-value">{totalUsuarios}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Alumnos totales</div>
          <div className="kpi-value">{totalAlumnos}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Plan más usado</div>
          <div className="kpi-value text-[14px]">
            {(() => {
              const planes = colegios.map(c => c.plan)
              const conteo: Record<string, number> = {}
              planes.forEach(p => { conteo[p] = (conteo[p] || 0) + 1 })
              const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]
              return top ? PLAN_BADGE[top[0]]?.label ?? top[0] : '—'
            })()}
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <div className="relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="input-base pl-9 text-[12px]"
            placeholder="Buscar colegio por nombre o RUT..."
          />
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {colegiosFiltrados.map((c: any) => {
          const st = stats[c.id] ?? { usuarios: 0, alumnos: 0 }
          const plan = PLAN_BADGE[c.plan] ?? PLAN_BADGE.basico
          return (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0F1B2D] flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-building-school text-white text-base" aria-hidden="true"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-semibold text-slate-800">{c.nombre}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${plan.color}`}>{plan.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    {c.rut && <span><i className="ti ti-id text-xs mr-1" aria-hidden="true"/>{c.rut}</span>}
                    {c.direccion && <span><i className="ti ti-map-pin text-xs mr-1" aria-hidden="true"/>{c.direccion}</span>}
                    {c.telefono && <span><i className="ti ti-phone text-xs mr-1" aria-hidden="true"/>{c.telefono}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-center flex-shrink-0">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Usuarios</div>
                    <div className="text-sm font-bold text-slate-700">{st.usuarios}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Alumnos</div>
                    <div className="text-sm font-bold text-slate-700">{st.alumnos}</div>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    {new Date(c.created_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {colegiosFiltrados.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-14 text-center">
            <i className="ti ti-building-school text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
            <p className="text-slate-500">No se encontraron colegios</p>
          </div>
        )}
      </div>

      {/* Modal nuevo colegio */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-[#0F1B2D] px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nuevo colegio</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Ej: AR School Santiago"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">RUT</label>
                  <input value={form.rut} onChange={e => setForm(p => ({...p, rut: e.target.value}))} className="input-base" placeholder="12.345.678-9"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(p => ({...p, telefono: e.target.value}))} className="input-base" placeholder="+56 9 1234 5678"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Dirección</label>
                <input value={form.direccion} onChange={e => setForm(p => ({...p, direccion: e.target.value}))} className="input-base" placeholder="Av. Ejemplo 123, Santiago"/>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Plan</label>
                <select value={form.plan} onChange={e => setForm(p => ({...p, plan: e.target.value}))} className="select-base w-full">
                  <option value="basico">Básico</option>
                  <option value="profesional">Profesional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCrear} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Creando...' : 'Crear colegio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
