'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props {
  tarea: any
  entregas: any[]
  alumnosCurso: { id: string; nombre: string; apellido: string }[]
}

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  entregada:  { label: 'Entregada',  color: 'bg-blue-50 text-blue-700' },
  calificada: { label: 'Calificada', color: 'bg-emerald-50 text-emerald-700' },
  devuelta:   { label: 'Devuelta',   color: 'bg-amber-50 text-amber-700' },
}

export default function EntregasClient({ tarea, entregas, alumnosCurso }: Props) {
  const [calificandoId, setCalificandoId] = useState<string | null>(null)
  const [puntaje, setPuntaje] = useState('')
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Alumnos que no han entregado
  const entregaAlumnoIds = new Set(entregas.map(e => e.alumno_id))
  const sinEntregar = alumnosCurso.filter(a => !entregaAlumnoIds.has(a.id))

  const stats = useMemo(() => ({
    total: alumnosCurso.length,
    entregados: entregas.length,
    calificados: entregas.filter(e => e.estado === 'calificada').length,
    pendientes: entregas.filter(e => e.estado === 'entregada').length,
    sinEntregar: sinEntregar.length,
  }), [entregas, alumnosCurso, sinEntregar])

  function openCalificar(entrega: any) {
    setCalificandoId(entrega.id)
    setPuntaje(entrega.puntaje?.toString() ?? '')
    setComentario(entrega.comentario_tutor ?? '')
  }

  async function handleCalificar(entregaId: string) {
    setSaving(true)
    const res = await fetch('/api/entregas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: entregaId,
        puntaje: puntaje ? parseInt(puntaje) : null,
        comentario_tutor: comentario || null,
        estado: 'calificada',
      }),
    })
    if (res.ok) {
      toast.success('Entrega calificada')
      setCalificandoId(null)
      setPuntaje('')
      setComentario('')
      router.refresh()
    } else {
      toast.error('Error al calificar')
    }
    setSaving(false)
  }

  async function handleDevolver(entregaId: string) {
    const res = await fetch('/api/entregas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: entregaId,
        comentario_tutor: comentario || 'Favor corregir y volver a entregar.',
        estado: 'devuelta',
      }),
    })
    if (res.ok) {
      toast.success('Entrega devuelta al alumno')
      setCalificandoId(null)
      router.refresh()
    } else {
      toast.error('Error al devolver')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tareas" className="text-slate-400 hover:text-slate-600 transition-colors">
          <i className="ti ti-arrow-left text-lg" aria-hidden="true"/>
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{tarea.titulo}</h1>
          <p className="page-subtitle">
            {tarea.curso} · {tarea.materia ?? 'Sin materia'}
            {tarea.fecha_entrega && ` · Entrega: ${new Date(tarea.fecha_entrega + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}`}
          </p>
        </div>
        {tarea.puntaje_max && (
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Puntaje máx</div>
            <div className="text-lg font-bold text-slate-700">{tarea.puntaje_max}</div>
          </div>
        )}
      </div>

      {/* Descripción */}
      {tarea.descripcion && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-sm text-slate-600">
          {tarea.descripcion}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Alumnos</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entregaron</div>
          <div className="kpi-value text-blue-700">{stats.entregados}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Por calificar</div>
          <div className="kpi-value text-amber-600">{stats.pendientes}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Calificados</div>
          <div className="kpi-value text-emerald-700">{stats.calificados}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sin entregar</div>
          <div className="kpi-value text-red-600">{stats.sinEntregar}</div>
        </div>
      </div>

      {/* Entregas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h2 className="text-[12px] font-bold text-slate-700 uppercase">Entregas recibidas ({entregas.length})</h2>
        </div>

        {entregas.length === 0 ? (
          <div className="p-10 text-center">
            <i className="ti ti-inbox text-4xl text-slate-300 block mb-2" aria-hidden="true"/>
            <p className="text-slate-400 text-sm">Aún no hay entregas para esta tarea</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {entregas.map((e: any) => {
              const badge = ESTADO_BADGE[e.estado] ?? ESTADO_BADGE.entregada
              const isCalificando = calificandoId === e.id
              return (
                <div key={e.id} className="p-4 hover:bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-slate-600">
                        {e.alumno?.nombre?.[0]}{e.alumno?.apellido?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-[13px]">
                          {e.alumno?.nombre} {e.alumno?.apellido}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                        {e.puntaje !== null && (
                          <span className="text-[11px] font-bold text-emerald-700">
                            {e.puntaje}{tarea.puntaje_max ? `/${tarea.puntaje_max}` : ''} pts
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span>
                          {new Date(e.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {e.archivo_nombre && (
                          <a href={e.archivo_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline flex items-center gap-1">
                            <i className="ti ti-paperclip text-xs" aria-hidden="true"/>
                            {e.archivo_nombre}
                          </a>
                        )}
                      </div>
                      {e.comentario_alumno && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">"{e.comentario_alumno}"</p>
                      )}
                      {e.comentario_tutor && e.estado === 'calificada' && (
                        <p className="text-[11px] text-emerald-700 mt-1">
                          <i className="ti ti-message text-xs mr-1" aria-hidden="true"/>
                          {e.comentario_tutor}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {e.estado === 'entregada' && (
                        <button
                          onClick={() => openCalificar(e)}
                          className="btn-primary text-xs py-1 px-2.5"
                        >
                          <i className="ti ti-star text-xs mr-1" aria-hidden="true"/>
                          Calificar
                        </button>
                      )}
                      {e.estado === 'calificada' && (
                        <button
                          onClick={() => openCalificar(e)}
                          className="btn-secondary text-xs py-1 px-2.5"
                        >
                          <i className="ti ti-edit text-xs mr-1" aria-hidden="true"/>
                          Editar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Panel calificar */}
                  {isCalificando && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-end gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                            Puntaje {tarea.puntaje_max ? `(máx ${tarea.puntaje_max})` : ''}
                          </label>
                          <input
                            type="number"
                            value={puntaje}
                            onChange={e => setPuntaje(e.target.value)}
                            className="input-base text-[12px]"
                            placeholder="0"
                            min={0}
                            max={tarea.puntaje_max || undefined}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Comentario</label>
                          <input
                            value={comentario}
                            onChange={e => setComentario(e.target.value)}
                            className="input-base text-[12px]"
                            placeholder="Buen trabajo, revisar ortografía..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleDevolver(e.id)}
                          className="btn-secondary text-xs py-1.5 px-2.5"
                          title="Devolver para corrección"
                        >
                          <i className="ti ti-arrow-back-up text-xs" aria-hidden="true"/>
                        </button>
                        <button
                          onClick={() => { setCalificandoId(null); setPuntaje(''); setComentario('') }}
                          className="btn-secondary text-xs py-1.5 px-2.5"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleCalificar(e.id)}
                          disabled={saving}
                          className="btn-primary text-xs py-1.5 px-2.5 disabled:opacity-60"
                        >
                          {saving ? '...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alumnos sin entregar */}
      {sinEntregar.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <h2 className="text-[12px] font-bold text-red-700 uppercase">Sin entregar ({sinEntregar.length})</h2>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {sinEntregar.map(a => (
                <span key={a.id} className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600">
                  {a.nombre} {a.apellido}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
