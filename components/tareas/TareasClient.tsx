'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  materia: string | null
  curso: string
  fecha_entrega: string | null
  puntaje_max: number | null
  estado: string
  created_at: string
}

interface Props {
  tareas: Tarea[]
  cursos: string[]
}

const MATERIAS = ['Lenguaje', 'Matemáticas', 'Ciencias Naturales', 'Historia', 'Inglés', 'Artes', 'Ed. Física', 'Música', 'Tecnología']

const ESTADO_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  activa:   { label: 'Activa',   color: 'bg-blue-50 text-blue-700',      icon: 'ti-clock' },
  cerrada:  { label: 'Cerrada',  color: 'bg-slate-100 text-slate-600',   icon: 'ti-lock' },
  revisada: { label: 'Revisada', color: 'bg-emerald-50 text-emerald-700', icon: 'ti-check' },
}

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  materia: 'Lenguaje',
  curso: '',
  fecha_entrega: '',
  puntaje_max: '',
}

export default function TareasClient({ tareas, cursos }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, curso: cursos[0] ?? '' })
  const [saving, setSaving] = useState(false)
  const [filtroCurso, setFiltroCurso] = useState('')
  const [filtroMateria, setFiltroMateria] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const router = useRouter()

  const hoy = new Date().toISOString().split('T')[0]

  const tareasFiltradas = useMemo(() =>
    tareas.filter(t =>
      (!filtroCurso || t.curso === filtroCurso) &&
      (!filtroMateria || t.materia === filtroMateria) &&
      (!filtroEstado || t.estado === filtroEstado)
    ),
    [tareas, filtroCurso, filtroMateria, filtroEstado]
  )

  const stats = useMemo(() => ({
    total: tareas.length,
    activas: tareas.filter(t => t.estado === 'activa').length,
    vencidas: tareas.filter(t => t.estado === 'activa' && t.fecha_entrega && t.fecha_entrega < hoy).length,
    revisadas: tareas.filter(t => t.estado === 'revisada').length,
  }), [tareas, hoy])

  function openNueva() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, curso: cursos[0] ?? '' })
    setShowModal(true)
  }

  function openEditar(t: Tarea) {
    setEditingId(t.id)
    setForm({
      titulo: t.titulo,
      descripcion: t.descripcion ?? '',
      materia: t.materia ?? 'Lenguaje',
      curso: t.curso,
      fecha_entrega: t.fecha_entrega ?? '',
      puntaje_max: t.puntaje_max?.toString() ?? '',
    })
    setShowModal(true)
  }

  async function handleGuardar() {
    if (!form.titulo.trim() || !form.curso) {
      toast.error('Título y curso son requeridos')
      return
    }
    setSaving(true)

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      materia: form.materia || null,
      curso: form.curso,
      fecha_entrega: form.fecha_entrega || null,
      puntaje_max: form.puntaje_max ? parseInt(form.puntaje_max) : null,
    }

    if (editingId) {
      const res = await fetch('/api/tareas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload }),
      })
      if (res.ok) {
        toast.success('Tarea actualizada')
        setShowModal(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al actualizar')
      }
    } else {
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Tarea creada — visible para los alumnos del curso')
        setShowModal(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al crear')
      }
    }
    setSaving(false)
  }

  async function handleCambiarEstado(id: string, estado: string) {
    const res = await fetch('/api/tareas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    })
    if (res.ok) {
      toast.success(`Tarea marcada como ${ESTADO_BADGE[estado]?.label ?? estado}`)
      router.refresh()
    } else {
      toast.error('Error al cambiar estado')
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar esta tarea? Los alumnos ya no la verán.')) return
    const res = await fetch(`/api/tareas?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Tarea eliminada')
      router.refresh()
    } else {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">Asigna trabajos y actividades a tus cursos</p>
        </div>
        <button onClick={openNueva} className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nueva tarea
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Activas</div>
          <div className="kpi-value text-blue-700">{stats.activas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vencidas</div>
          <div className="kpi-value text-red-600">{stats.vencidas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Revisadas</div>
          <div className="kpi-value text-emerald-700">{stats.revisadas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5">
        <select value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)} className="select-base text-[12px]">
          <option value="">Todos los cursos</option>
          {cursos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} className="select-base text-[12px]">
          <option value="">Todas las materias</option>
          {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="select-base text-[12px]">
          <option value="">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="cerrada">Cerradas</option>
          <option value="revisada">Revisadas</option>
        </select>
        <span className="text-[11px] text-slate-400 ml-auto">
          {tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      {tareasFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-14 text-center">
          <i className="ti ti-checklist text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-500 font-medium mb-1">No hay tareas</p>
          <p className="text-slate-400 text-sm mb-4">Crea una tarea para asignarla a un curso</p>
          <button onClick={openNueva} className="btn-primary">
            <i className="ti ti-plus text-sm" aria-hidden="true"/> Nueva tarea
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tareasFiltradas.map((t) => {
            const badge = ESTADO_BADGE[t.estado] ?? ESTADO_BADGE.activa
            const vencida = t.estado === 'activa' && t.fecha_entrega && t.fecha_entrega < hoy
            return (
              <div key={t.id} className={`bg-white border rounded-xl p-4 hover:border-blue-200 transition-colors ${vencida ? 'border-red-200' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    vencida ? 'bg-red-50' : t.estado === 'revisada' ? 'bg-emerald-50' : 'bg-blue-50'
                  }`}>
                    <i className={`ti ${vencida ? 'ti-alert-triangle text-red-600' : badge.icon + (t.estado === 'revisada' ? ' text-emerald-600' : ' text-blue-600')} text-base`} aria-hidden="true"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{t.titulo}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="tag tag-blue text-xs">{t.curso}</span>
                      {t.materia && <span className="tag tag-gray text-xs">{t.materia}</span>}
                      {vencida && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">Vencida</span>}
                    </div>
                    {t.descripcion && <p className="text-sm text-slate-500 mb-2 line-clamp-2">{t.descripcion}</p>}
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      {t.fecha_entrega && (
                        <span>
                          <i className="ti ti-calendar text-xs mr-1" aria-hidden="true"/>
                          Entrega: {new Date(t.fecha_entrega + 'T12:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {t.puntaje_max && (
                        <span><i className="ti ti-star text-xs mr-1" aria-hidden="true"/>Puntaje máx: {t.puntaje_max}</span>
                      )}
                      <span>
                        <i className="ti ti-clock text-xs mr-1" aria-hidden="true"/>
                        Creada {new Date(t.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {t.estado === 'activa' && (
                      <>
                        <button
                          onClick={() => handleCambiarEstado(t.id, 'cerrada')}
                          className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                          title="Cerrar tarea"
                        >
                          <i className="ti ti-lock text-sm" aria-hidden="true"/>
                        </button>
                        <button
                          onClick={() => handleCambiarEstado(t.id, 'revisada')}
                          className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                          title="Marcar como revisada"
                        >
                          <i className="ti ti-check text-sm" aria-hidden="true"/>
                        </button>
                      </>
                    )}
                    {t.estado === 'cerrada' && (
                      <button
                        onClick={() => handleCambiarEstado(t.id, 'activa')}
                        className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Reabrir tarea"
                      >
                        <i className="ti ti-refresh text-sm" aria-hidden="true"/>
                      </button>
                    )}
                    <button
                      onClick={() => openEditar(t)}
                      className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <i className="ti ti-edit text-sm" aria-hidden="true"/>
                    </button>
                    <button
                      onClick={() => handleEliminar(t.id)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <i className="ti ti-trash text-sm" aria-hidden="true"/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="bg-[#0F1B2D] px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">
                {editingId ? 'Editar tarea' : 'Nueva tarea'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  className="input-base"
                  placeholder="Ej: Guía de comprensión lectora cap. 3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Curso *</label>
                  <select value={form.curso} onChange={e => setForm(p => ({ ...p, curso: e.target.value }))} className="select-base w-full">
                    {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Materia</label>
                  <select value={form.materia} onChange={e => setForm(p => ({ ...p, materia: e.target.value }))} className="select-base w-full">
                    <option value="">Sin materia</option>
                    {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Descripción / Instrucciones</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  className="input-base resize-none"
                  rows={3}
                  placeholder="Describe lo que deben hacer los alumnos..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Fecha de entrega</label>
                  <input
                    type="date"
                    value={form.fecha_entrega}
                    onChange={e => setForm(p => ({ ...p, fecha_entrega: e.target.value }))}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Puntaje máximo</label>
                  <input
                    type="number"
                    value={form.puntaje_max}
                    onChange={e => setForm(p => ({ ...p, puntaje_max: e.target.value }))}
                    className="input-base"
                    placeholder="Ej: 100"
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
