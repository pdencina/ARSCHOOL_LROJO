'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { documentos: any[]; recursos: any[]; rol: string; colegioId: string }

const CATEGORIAS = [
  { value: 'institucional', label: 'Institucional', icon: 'ti-building', color: 'text-blue-700', bg: 'bg-blue-50' },
  { value: 'planificacion', label: 'Planificación', icon: 'ti-calendar', color: 'text-violet-700', bg: 'bg-violet-50' },
  { value: 'material', label: 'Material', icon: 'ti-book', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { value: 'administrativo', label: 'Administrativo', icon: 'ti-file-text', color: 'text-amber-700', bg: 'bg-amber-50' },
  { value: 'protocolo', label: 'Protocolo', icon: 'ti-shield', color: 'text-red-700', bg: 'bg-red-50' },
  { value: 'acta', label: 'Acta', icon: 'ti-clipboard', color: 'text-slate-700', bg: 'bg-slate-50' },
  { value: 'otro', label: 'Otro', icon: 'ti-file', color: 'text-gray-600', bg: 'bg-gray-50' },
]

export default function DocumentosClient({ documentos, recursos, rol, colegioId }: Props) {
  const router = useRouter()
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showRecurso, setShowRecurso] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', categoria: 'material', archivo_url: '', archivo_nombre: '', visible_para: ['admin', 'tutor'] })
  const [formRecurso, setFormRecurso] = useState({ nombre: '', url: '', descripcion: '', materia: '' })

  const isAdmin = ['super_admin', 'admin'].includes(rol)

  const docsFiltrados = useMemo(() =>
    documentos.filter(d => {
      if (filtroCategoria && d.categoria !== filtroCategoria) return false
      if (busqueda && !`${d.titulo} ${d.descripcion ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    }),
    [documentos, filtroCategoria, busqueda]
  )

  const conteoPorCat = CATEGORIAS.map(c => ({
    ...c, count: documentos.filter(d => d.categoria === c.value).length
  }))

  async function handleCrearDoc() {
    if (!form.titulo) { toast.error('Título requerido'); return }
    setSaving(true)
    const res = await fetch('/api/documentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { toast.success('Documento creado'); setShowModal(false); router.refresh() }
    else { const d = await res.json(); toast.error(d.error ?? 'Error') }
    setSaving(false)
  }

  async function handleCrearRecurso() {
    if (!formRecurso.nombre || !formRecurso.url) { toast.error('Nombre y URL requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/documentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formRecurso, categoria: 'otro', titulo: formRecurso.nombre, archivo_url: formRecurso.url }),
    })
    // Usar tabla recursos_externos directamente
    const adminRes = await fetch('/api/recursos-externos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formRecurso),
    })
    if (adminRes.ok || res.ok) { toast.success('Recurso agregado'); setShowRecurso(false); router.refresh() }
    setSaving(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">Repositorio centralizado del colegio</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowRecurso(true)} className="btn-secondary text-xs">
              <i className="ti ti-link text-sm" aria-hidden="true"/> Recurso externo
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <i className="ti ti-upload text-sm" aria-hidden="true"/> Nuevo documento
            </button>
          </div>
        )}
      </div>

      {/* Recursos externos */}
      {recursos.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Plataformas y recursos externos</div>
          <div className="flex gap-3 flex-wrap">
            {recursos.map((r: any) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                className="bg-white border border-[var(--ar-border)] rounded-xl px-4 py-3 flex items-center gap-3 hover:border-[var(--ar-accent)]/30 hover:shadow-sm transition-all group">
                <div className="w-9 h-9 rounded-lg bg-[#fdf8ee] flex items-center justify-center">
                  <i className="ti ti-external-link text-[var(--ar-accent)]" aria-hidden="true"/>
                </div>
                <div>
                  <div className="text-[13px] font-medium text-[#1a2332] group-hover:text-[var(--ar-accent)] transition-colors">{r.nombre}</div>
                  {r.descripcion && <div className="text-[11px] text-[#9ca3af]">{r.descripcion}</div>}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFiltroCategoria('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!filtroCategoria ? 'bg-[#1a2332] text-white border-[#1a2332]' : 'border-[var(--ar-border)] text-[#4b5563] hover:border-[#d1d5db]'}`}>
          Todos ({documentos.length})
        </button>
        {conteoPorCat.filter(c => c.count > 0).map(c => (
          <button key={c.value} onClick={() => setFiltroCategoria(filtroCategoria === c.value ? '' : c.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              filtroCategoria === c.value ? `${c.bg} ${c.color} border-current` : 'border-[var(--ar-border)] text-[#4b5563] hover:border-[#d1d5db]'
            }`}>
            <i className={`ti ${c.icon} text-[11px]`} aria-hidden="true"/> {c.label} ({c.count})
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm mb-4">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] text-sm" aria-hidden="true"/>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input-base pl-9" placeholder="Buscar documento..."/>
      </div>

      {/* Grid de documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {docsFiltrados.length === 0 ? (
          <div className="col-span-3 bg-white border border-[var(--ar-border)] rounded-xl p-12 text-center">
            <i className="ti ti-folder-open text-3xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
            <p className="text-[#9ca3af] text-sm">No hay documentos{filtroCategoria ? ' en esta categoría' : ''}.</p>
          </div>
        ) : docsFiltrados.map(doc => {
          const cat = CATEGORIAS.find(c => c.value === doc.categoria) ?? CATEGORIAS[6]
          return (
            <div key={doc.id} className="bg-white border border-[var(--ar-border)] rounded-xl p-4 hover:border-[#d1d5db] transition-all group">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                  <i className={`ti ${cat.icon} ${cat.color}`} aria-hidden="true"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1a2332] text-[13px] truncate group-hover:text-[var(--ar-accent)] transition-colors">{doc.titulo}</div>
                  {doc.descripcion && <p className="text-[11px] text-[#9ca3af] mt-0.5 line-clamp-2">{doc.descripcion}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`tag ${cat.bg} ${cat.color}`}>{cat.label}</span>
                    <span className="text-[10px] text-[#b0b7c3]">{new Date(doc.created_at).toLocaleDateString('es-CL')}</span>
                  </div>
                </div>
              </div>
              {doc.archivo_url && (
                <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 text-[11px] text-[var(--ar-accent)] hover:underline">
                  <i className="ti ti-download text-xs" aria-hidden="true"/> {doc.archivo_nombre ?? 'Descargar'}
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal nuevo documento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-[#1a2332] px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-[14px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Nuevo documento</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({...p, titulo: e.target.value}))} className="input-base" placeholder="Nombre del documento"/>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} className="input-base min-h-[60px] resize-none text-xs" placeholder="Descripción opcional"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Categoría</label>
                  <select value={form.categoria} onChange={e => setForm(p => ({...p, categoria: e.target.value}))} className="select-base w-full">
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">URL del archivo</label>
                  <input value={form.archivo_url} onChange={e => setForm(p => ({...p, archivo_url: e.target.value}))} className="input-base" placeholder="https://..."/>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end border-t border-[#f3f4f6] pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCrearDoc} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : 'Crear documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal recurso externo */}
      {showRecurso && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-[#1a2332] px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-[14px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Recurso externo</h3>
              <button onClick={() => setShowRecurso(false)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Nombre *</label>
                <input value={formRecurso.nombre} onChange={e => setFormRecurso(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Ej: Santillana, Cambridge"/>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">URL *</label>
                <input value={formRecurso.url} onChange={e => setFormRecurso(p => ({...p, url: e.target.value}))} className="input-base" placeholder="https://plataforma.com"/>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Descripción</label>
                <input value={formRecurso.descripcion} onChange={e => setFormRecurso(p => ({...p, descripcion: e.target.value}))} className="input-base" placeholder="Breve descripción"/>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end border-t border-[#f3f4f6] pt-4">
              <button onClick={() => setShowRecurso(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCrearRecurso} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
