'use client'

import { useState, useCallback, useMemo, DragEvent } from 'react'
import toast from 'react-hot-toast'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const
const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie',
}

interface BloqueHorario {
  hora: string
  grupo: string
  experiencia: string
  tutor: string
  espacio: string
}

interface Props {
  propuesta: {
    titulo?: string
    sede?: string
    grupos: { nombre: string; curso: string; alumnos: number; tutor: string }[]
    horario: Record<string, BloqueHorario[]>
    notas: string[]
  }
  onSave: (horarioEditado: Record<string, BloqueHorario[]>) => void
  onCancel: () => void
}

export default function EditorHorario({ propuesta, onSave, onCancel }: Props) {
  // Estado mutable del horario
  const [horario, setHorario] = useState<Record<string, BloqueHorario[]>>(() =>
    JSON.parse(JSON.stringify(propuesta.horario))
  )
  const [dragSource, setDragSource] = useState<{ dia: string; idx: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ dia: string; idx: number } | null>(null)
  const [editingBloque, setEditingBloque] = useState<{ dia: string; idx: number } | null>(null)
  const [editForm, setEditForm] = useState<BloqueHorario | null>(null)
  const [filtroGrupo, setFiltroGrupo] = useState('')

  // Extraer listas únicas para selects
  const opciones = useMemo(() => {
    const tutores = new Set<string>()
    const experiencias = new Set<string>()
    const espacios = new Set<string>()
    const horas = new Set<string>()

    Object.values(horario).forEach(bloques => {
      bloques.forEach(b => {
        tutores.add(b.tutor)
        experiencias.add(b.experiencia)
        espacios.add(b.espacio)
        horas.add(b.hora)
      })
    })

    return {
      tutores: Array.from(tutores).sort(),
      experiencias: Array.from(experiencias).sort(),
      espacios: Array.from(espacios).sort(),
      horas: Array.from(horas).sort(),
    }
  }, [horario])

  // Horas únicas ordenadas (para las filas de la grilla)
  const horasOrdenadas = useMemo(() => opciones.horas, [opciones])

  // Grupos
  const grupos = useMemo(() => propuesta.grupos.map(g => g.nombre), [propuesta])

  // --- DRAG & DROP ---
  function handleDragStart(e: DragEvent, dia: string, idx: number) {
    setDragSource({ dia, idx })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${dia}:${idx}`)
  }

  function handleDragOver(e: DragEvent, dia: string, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ dia, idx })
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  function handleDrop(e: DragEvent, targetDia: string, targetIdx: number) {
    e.preventDefault()
    setDragOver(null)

    if (!dragSource) return
    const { dia: srcDia, idx: srcIdx } = dragSource

    // No swap con sí mismo
    if (srcDia === targetDia && srcIdx === targetIdx) {
      setDragSource(null)
      return
    }

    setHorario(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const srcBloque = next[srcDia][srcIdx]
      const targetBloque = next[targetDia][targetIdx]

      // Swap: intercambiamos experiencia, tutor y espacio (mantienen hora y grupo)
      const tempExp = srcBloque.experiencia
      const tempTutor = srcBloque.tutor
      const tempEspacio = srcBloque.espacio

      next[srcDia][srcIdx].experiencia = targetBloque.experiencia
      next[srcDia][srcIdx].tutor = targetBloque.tutor
      next[srcDia][srcIdx].espacio = targetBloque.espacio

      next[targetDia][targetIdx].experiencia = tempExp
      next[targetDia][targetIdx].tutor = tempTutor
      next[targetDia][targetIdx].espacio = tempEspacio

      return next
    })

    setDragSource(null)
    toast.success('Bloques intercambiados', { duration: 1500 })
  }

  // --- EDICIÓN INLINE ---
  function openEdit(dia: string, idx: number) {
    setEditingBloque({ dia, idx })
    setEditForm({ ...horario[dia][idx] })
  }

  function saveEdit() {
    if (!editingBloque || !editForm) return
    setHorario(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[editingBloque.dia][editingBloque.idx] = { ...editForm }
      return next
    })
    setEditingBloque(null)
    setEditForm(null)
    toast.success('Bloque actualizado', { duration: 1500 })
  }

  // --- GUARDAR ---
  function handleGuardar() {
    onSave(horario)
  }

  // Filtrar bloques por grupo si aplica
  const getBloquesVisibles = useCallback((dia: string) => {
    const bloques = horario[dia] ?? []
    if (!filtroGrupo) return bloques.map((b, i) => ({ ...b, originalIdx: i }))
    return bloques
      .map((b, i) => ({ ...b, originalIdx: i }))
      .filter(b => b.grupo === filtroGrupo)
  }, [horario, filtroGrupo])

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-[1200px] shadow-2xl my-4">
        {/* Header */}
        <div className="bg-[#0F1B2D] px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-white text-[15px]">
              <i className="ti ti-drag-drop mr-2" aria-hidden="true"/>
              Editor de bloques — {propuesta.titulo ?? 'Horario'}
            </h3>
            <p className="text-white/50 text-[11px] mt-0.5">
              Arrastra bloques para intercambiarlos o haz clic para editar
            </p>
          </div>
          <button onClick={onCancel} className="text-white/50 hover:text-white transition-colors">
            <i className="ti ti-x text-xl" aria-hidden="true"/>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Filtrar grupo:</label>
          <select
            value={filtroGrupo}
            onChange={e => setFiltroGrupo(e.target.value)}
            className="select-base text-[11px] py-1 px-2"
          >
            <option value="">Todos los grupos</option>
            {grupos.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <i className="ti ti-drag-drop text-sm text-blue-400" aria-hidden="true"/>
              Arrastra para intercambiar
            </span>
            <span className="flex items-center gap-1 ml-3">
              <i className="ti ti-edit text-sm text-emerald-400" aria-hidden="true"/>
              Clic para editar
            </span>
          </div>
        </div>

        {/* Grilla por día */}
        <div className="p-6 overflow-x-auto">
          <div className="grid grid-cols-5 gap-3 min-w-[900px]">
            {DIAS.map(dia => {
              const bloques = getBloquesVisibles(dia)
              return (
                <div key={dia} className="flex flex-col">
                  {/* Header del día */}
                  <div className="text-center text-[11px] font-bold text-[var(--ar-accent)] uppercase mb-2 pb-2 border-b border-slate-200">
                    {DIAS_LABEL[dia]}
                    <span className="ml-1 text-slate-400 font-normal">({bloques.length})</span>
                  </div>

                  {/* Bloques */}
                  <div className="space-y-1.5 flex-1">
                    {bloques.map((b) => {
                      const isDraggedOver = dragOver?.dia === dia && dragOver.idx === b.originalIdx
                      const isDragging = dragSource?.dia === dia && dragSource.idx === b.originalIdx
                      return (
                        <div
                          key={`${dia}-${b.originalIdx}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, dia, b.originalIdx)}
                          onDragOver={(e) => handleDragOver(e, dia, b.originalIdx)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dia, b.originalIdx)}
                          onClick={() => openEdit(dia, b.originalIdx)}
                          className={`
                            rounded-lg p-2 cursor-grab active:cursor-grabbing border transition-all select-none
                            ${isDragging ? 'opacity-40 scale-95 border-blue-300 bg-blue-50' : ''}
                            ${isDraggedOver ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200 scale-[1.02]' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'}
                          `}
                        >
                          <div className="text-[9px] font-mono font-bold text-slate-400 mb-0.5">{b.hora}</div>
                          <div className="text-[10px] font-semibold text-[#1B3A5C] leading-tight">{b.experiencia}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] text-blue-600 font-medium">{b.grupo}</span>
                            <span className="text-[9px] text-slate-500">{b.tutor.split(' ')[0]}</span>
                          </div>
                          <div className="text-[8px] text-slate-400 mt-0.5">{b.espacio}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <div className="text-[11px] text-slate-400">
            {Object.values(horario).flat().length} bloques totales
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn-secondary text-xs">Cancelar</button>
            <button onClick={handleGuardar} className="btn-primary text-xs">
              <i className="ti ti-check text-sm mr-1" aria-hidden="true"/>
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      {/* Modal edición de bloque individual */}
      {editingBloque && editForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => { setEditingBloque(null); setEditForm(null) }}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-[#1B3A5C]">Editar bloque</h4>
              <button onClick={() => { setEditingBloque(null); setEditForm(null) }} className="text-slate-400 hover:text-slate-600">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Hora */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Hora</label>
                <select
                  value={editForm.hora}
                  onChange={e => setEditForm(prev => prev ? { ...prev, hora: e.target.value } : prev)}
                  className="select-base w-full text-[12px]"
                >
                  {opciones.horas.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Grupo */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Grupo</label>
                <select
                  value={editForm.grupo}
                  onChange={e => setEditForm(prev => prev ? { ...prev, grupo: e.target.value } : prev)}
                  className="select-base w-full text-[12px]"
                >
                  {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Experiencia */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Experiencia</label>
                <select
                  value={editForm.experiencia}
                  onChange={e => setEditForm(prev => prev ? { ...prev, experiencia: e.target.value } : prev)}
                  className="select-base w-full text-[12px]"
                >
                  {opciones.experiencias.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
                <input
                  type="text"
                  value={editForm.experiencia}
                  onChange={e => setEditForm(prev => prev ? { ...prev, experiencia: e.target.value } : prev)}
                  className="input-base text-[11px] mt-1"
                  placeholder="O escribe una nueva..."
                />
              </div>

              {/* Tutor */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Tutor</label>
                <select
                  value={editForm.tutor}
                  onChange={e => setEditForm(prev => prev ? { ...prev, tutor: e.target.value } : prev)}
                  className="select-base w-full text-[12px]"
                >
                  {opciones.tutores.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Espacio */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Espacio</label>
                <select
                  value={editForm.espacio}
                  onChange={e => setEditForm(prev => prev ? { ...prev, espacio: e.target.value } : prev)}
                  className="select-base w-full text-[12px]"
                >
                  {opciones.espacios.map(es => <option key={es} value={es}>{es}</option>)}
                </select>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => { setEditingBloque(null); setEditForm(null) }} className="btn-secondary text-xs">Cancelar</button>
              <button onClick={saveEdit} className="btn-primary text-xs">
                <i className="ti ti-check text-sm mr-1" aria-hidden="true"/>Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
