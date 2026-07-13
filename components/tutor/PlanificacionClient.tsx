'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAutoSave } from '@/lib/useAutoSave'

interface Props {
  planificaciones: any[]
  cursos: string[]
  colegioId: string
  tutorId: string
}

const MATERIAS = ['Lenguaje','Matemáticas','Ciencias Naturales','Historia','Inglés','Artes','Ed. Física','Música','Tecnología']

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  borrador:   { label: 'Borrador',   color: 'text-slate-600',  bg: 'bg-slate-100',  icon: 'ti-pencil' },
  publicado:  { label: 'Publicado',  color: 'text-blue-700',   bg: 'bg-blue-50',    icon: 'ti-send' },
  ejecutado:  { label: 'Ejecutado',  color: 'text-emerald-700',bg: 'bg-emerald-50', icon: 'ti-check' },
}

const EMPTY_FORM = {
  titulo: '', descripcion: '', materia: 'Lenguaje', curso: '',
  fecha: new Date().toISOString().split('T')[0],
  hora_inicio: '08:00', hora_fin: '09:30',
  objetivos: [''], recursos: [''], estado: 'borrador',
}

export default function PlanificacionClient({ planificaciones, cursos, colegioId, tutorId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [filtroCurso, setFiltroCurso] = useState('')
  const [filtroMateria, setFiltroMateria] = useState('')
  const [vista, setVista] = useState<'lista'|'calendario'>('lista')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, curso: cursos[0] ?? '' })
  const supabase = createClient()
  const router = useRouter()

  // Auto-guardado del formulario
  const { hasDraft, lastSaved, restoreDraft, clearDraft } = useAutoSave(
    `planificacion-clase-${tutorId}`,
    form,
    setForm,
    { enabled: showModal }
  )

  const plansFiltradas = useMemo(() =>
    planificaciones.filter(p =>
      (!filtroCurso   || p.curso   === filtroCurso) &&
      (!filtroMateria || p.materia === filtroMateria)
    ),
    [planificaciones, filtroCurso, filtroMateria]
  )

  function setObj(i: number, val: string) {
    setForm(p => { const o = [...p.objetivos]; o[i] = val; return { ...p, objetivos: o } })
  }
  function addObj() { setForm(p => ({ ...p, objetivos: [...p.objetivos, ''] })) }
  function removeObj(i: number) { setForm(p => ({ ...p, objetivos: p.objetivos.filter((_, j) => j !== i) })) }

  function openNueva() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, curso: cursos[0] ?? '' })
    setShowModal(true)
  }

  function openEditar(p: any) {
    setEditId(p.id)
    setForm({
      titulo: p.titulo, descripcion: p.descripcion ?? '',
      materia: p.materia, curso: p.curso, fecha: p.fecha,
      hora_inicio: p.hora_inicio ?? '08:00', hora_fin: p.hora_fin ?? '09:30',
      objetivos: p.objetivos?.length ? p.objetivos : [''],
      recursos: p.recursos?.length ? p.recursos : [''],
      estado: p.estado,
    })
    setShowModal(true)
  }

  async function handleGuardar() {
    if (!form.titulo || !form.curso || !form.materia) {
      toast.error('Título, curso y materia son requeridos'); return
    }
    setSaving(true)
    const payload = {
      colegio_id: colegioId, tutor_id: tutorId,
      titulo: form.titulo, descripcion: form.descripcion || null,
      materia: form.materia, curso: form.curso, fecha: form.fecha,
      hora_inicio: form.hora_inicio || null, hora_fin: form.hora_fin || null,
      objetivos: form.objetivos.filter(Boolean),
      recursos: form.recursos.filter(Boolean),
      estado: form.estado,
    }
    const { error } = editId
      ? await supabase.from('planificaciones').update(payload).eq('id', editId)
      : await supabase.from('planificaciones').insert(payload)

    if (error) { toast.error('Error al guardar: ' + error.message); setSaving(false); return }
    toast.success(editId ? 'Planificación actualizada' : 'Planificación creada')
    clearDraft()
    setSaving(false); setShowModal(false)
    router.refresh()
  }

  async function handleCambiarEstado(id: string, estado: string) {
    await supabase.from('planificaciones').update({ estado }).eq('id', id)
    toast.success(`Estado actualizado a ${ESTADO_CONFIG[estado]?.label}`)
    router.refresh()
  }

  const stats = {
    total: planificaciones.length,
    borradores: planificaciones.filter(p => p.estado === 'borrador').length,
    publicadas: planificaciones.filter(p => p.estado === 'publicado').length,
    ejecutadas: planificaciones.filter(p => p.estado === 'ejecutado').length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Planificación de clases</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organiza tus clases, objetivos y recursos por curso</p>
        </div>
        <button onClick={openNueva} className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nueva planificación
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',      val: stats.total,      color: 'text-slate-700',   bg: 'bg-slate-50',    icon: 'ti-layout-board' },
          { label: 'Borradores', val: stats.borradores, color: 'text-slate-600',   bg: 'bg-slate-100',   icon: 'ti-pencil' },
          { label: 'Publicadas', val: stats.publicadas, color: 'text-blue-700',    bg: 'bg-blue-50',     icon: 'ti-send' },
          { label: 'Ejecutadas', val: stats.ejecutadas, color: 'text-emerald-700', bg: 'bg-emerald-50',  icon: 'ti-check' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${k.icon} ${k.color} text-base`} aria-hidden="true"/>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5">
        <select value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)} className="select-base">
          <option value="">Todos los cursos</option>
          {cursos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} className="select-base">
          <option value="">Todas las materias</option>
          {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{plansFiltradas.length} planificación{plansFiltradas.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Lista */}
      {plansFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-14 text-center">
          <i className="ti ti-layout-board text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-500 font-medium mb-1">No hay planificaciones todavía</p>
          <p className="text-slate-400 text-sm mb-4">Crea tu primera planificación de clase</p>
          <button onClick={openNueva} className="btn-primary">
            <i className="ti ti-plus text-sm" aria-hidden="true"/> Nueva planificación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plansFiltradas.map((p: any) => {
            const cfg = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.borrador
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{p.titulo}</span>
                      <span className={`tag text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <i className={`ti ${cfg.icon} text-xs mr-1`} aria-hidden="true"/>{cfg.label}
                      </span>
                      <span className="tag tag-blue text-xs">{p.curso}</span>
                      <span className="tag tag-gray text-xs">{p.materia}</span>
                    </div>
                    {p.descripcion && <p className="text-sm text-slate-500 mb-2 line-clamp-1">{p.descripcion}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span><i className="ti ti-calendar text-xs mr-1" aria-hidden="true"/>
                        {new Date(p.fecha + 'T12:00').toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' })}
                      </span>
                      {p.hora_inicio && <span><i className="ti ti-clock text-xs mr-1" aria-hidden="true"/>{p.hora_inicio} – {p.hora_fin}</span>}
                      {p.objetivos?.length > 0 && <span><i className="ti ti-target text-xs mr-1" aria-hidden="true"/>{p.objetivos.length} objetivo{p.objetivos.length > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.estado === 'borrador' && (
                      <button onClick={() => handleCambiarEstado(p.id, 'publicado')} className="btn-secondary text-xs py-1 px-2.5">
                        <i className="ti ti-send text-xs" aria-hidden="true"/> Publicar
                      </button>
                    )}
                    {p.estado === 'publicado' && (
                      <button onClick={() => handleCambiarEstado(p.id, 'ejecutado')} className="btn-secondary text-xs py-1 px-2.5">
                        <i className="ti ti-check text-xs" aria-hidden="true"/> Ejecutar
                      </button>
                    )}
                    <button onClick={() => openEditar(p)} className="btn-secondary text-xs py-1 px-2.5">
                      <i className="ti ti-edit text-xs" aria-hidden="true"/> Editar
                    </button>
                  </div>
                </div>

                {/* Objetivos expandidos */}
                {p.objetivos?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Objetivos</div>
                    <ul className="space-y-1">
                      {p.objetivos.map((obj: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <i className="ti ti-circle-check text-emerald-500 text-sm flex-shrink-0 mt-0.5" aria-hidden="true"/>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-display font-semibold text-white">
                {editId ? 'Editar planificación' : 'Nueva planificación de clase'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Banner de borrador recuperable */}
              {hasDraft && !editId && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <i className="ti ti-device-floppy text-blue-600" aria-hidden="true"/>
                  <span className="text-[12px] text-blue-800 flex-1">Tienes un borrador guardado automáticamente</span>
                  <button onClick={restoreDraft} className="text-[11px] font-bold text-blue-700 hover:underline">Restaurar</button>
                  <button onClick={clearDraft} className="text-[11px] text-slate-400 hover:text-red-500">Descartar</button>
                </div>
              )}
              {lastSaved && (
                <div className="text-[10px] text-slate-400 text-right -mt-3">
                  <i className="ti ti-cloud-check text-xs mr-0.5" aria-hidden="true"/>
                  Borrador guardado {lastSaved.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Título de la clase *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({...p, titulo: e.target.value}))} className="input-base" placeholder="Ej: Introducción a las fracciones"/>
              </div>

              {/* Materia, Curso, Fecha */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Materia *</label>
                  <select value={form.materia} onChange={e => setForm(p => ({...p, materia: e.target.value}))} className="select-base w-full">
                    {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso *</label>
                  <select value={form.curso} onChange={e => setForm(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                    {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({...p, fecha: e.target.value}))} className="input-base"/>
                </div>
              </div>

              {/* Horario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hora inicio</label>
                  <input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({...p, hora_inicio: e.target.value}))} className="input-base"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hora fin</label>
                  <input type="time" value={form.hora_fin} onChange={e => setForm(p => ({...p, hora_fin: e.target.value}))} className="input-base"/>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción / Metodología</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} className="input-base resize-none" rows={3} placeholder="Describe brevemente cómo se desarrollará la clase..."/>
              </div>

              {/* Objetivos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objetivos de la clase</label>
                  <button onClick={addObj} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <i className="ti ti-plus text-xs" aria-hidden="true"/> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.objetivos.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <i className="ti ti-circle-check text-emerald-400 text-base flex-shrink-0" aria-hidden="true"/>
                      <input value={obj} onChange={e => setObj(i, e.target.value)} className="input-base flex-1" placeholder={`Objetivo ${i+1}...`}/>
                      {form.objetivos.length > 1 && (
                        <button onClick={() => removeObj(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <i className="ti ti-x text-sm" aria-hidden="true"/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
                <div className="flex gap-2">
                  {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setForm(p => ({...p, estado: key}))}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                        form.estado === key ? `${cfg.bg} ${cfg.color} border-current` : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>
                      <i className={`ti ${cfg.icon} block text-lg mb-0.5 mx-auto`} aria-hidden="true"/>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-2 justify-end border-t border-slate-100 pt-4 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear planificación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}