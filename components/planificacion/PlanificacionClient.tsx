'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import EditorHorario from './EditorHorario'
import { exportarHorarioCompleto } from '@/lib/horario-pdf'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const DIAS_LABEL: Record<string, string> = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes' }

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  borrador:  { label: 'Borrador',   className: 'bg-slate-100 text-slate-600' },
  publicado: { label: 'Publicado',  className: 'bg-emerald-50 text-emerald-700' },
  archivado: { label: 'Archivado',  className: 'bg-gray-100 text-gray-500' },
}

interface Props {
  propuestas: any[]
  resumenCursos: Record<string, number>
}

export default function PlanificacionClient({ propuestas, resumenCursos }: Props) {
  const [generando, setGenerando] = useState(false)
  const [propuestaActual, setPropuestaActual] = useState<any>(propuestas[0] ?? null)
  const [sede, setSede] = useState('santiago')
  const [restricciones, setRestricciones] = useState('')
  const [publicando, setPublicando] = useState(false)
  const [editandoBloques, setEditandoBloques] = useState(false)
  const router = useRouter()

  async function generarPropuesta() {
    setGenerando(true)
    const res = await fetch('/api/horarios/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sede, restricciones_extra: restricciones }),
    })
    if (res.ok) {
      const data = await res.json()
      setPropuestaActual({ propuesta: data.propuesta, id: data.id, estado: 'borrador' })
      toast.success('Propuesta generada')
      router.refresh()
    } else {
      toast.error('Error al generar propuesta')
    }
    setGenerando(false)
  }

  async function publicarPropuesta(id: string) {
    setPublicando(true)
    const res = await fetch(`/api/horarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'publicado' }),
    })
    if (res.ok) {
      toast.success('Horario publicado — ahora los tutores pueden verlo')
      setPropuestaActual((prev: any) => prev ? { ...prev, estado: 'publicado' } : prev)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Error al publicar')
    }
    setPublicando(false)
  }

  async function archivarPropuesta(id: string) {
    const res = await fetch(`/api/horarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'archivado' }),
    })
    if (res.ok) {
      toast.success('Propuesta archivada')
      setPropuestaActual((prev: any) => prev ? { ...prev, estado: 'archivado' } : prev)
      router.refresh()
    } else {
      toast.error('Error al archivar')
    }
  }

  async function guardarEdicionBloques(horarioEditado: Record<string, any[]>) {
    if (!propuestaId) return
    const propuestaActualizada = { ...propuestaData, horario: horarioEditado }
    const res = await fetch(`/api/horarios/${propuestaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propuesta: propuestaActualizada }),
    })
    if (res.ok) {
      toast.success('Horario editado guardado correctamente')
      setPropuestaActual((prev: any) => prev ? { ...prev, propuesta: propuestaActualizada } : prev)
      setEditandoBloques(false)
      router.refresh()
    } else {
      toast.error('Error al guardar edición')
    }
  }

  const totalAlumnos = Object.values(resumenCursos).reduce((a, b) => a + b, 0)
  const propuestaData = propuestaActual?.propuesta ?? null
  const propuestaEstado = propuestaActual?.estado ?? 'borrador'
  const propuestaId = propuestaActual?.id

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Planificación de horarios</h1>
          <p className="page-subtitle">Genera propuestas de distribución basadas en tus alumnos y recursos</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Total alumnos</div>
          <div className="kpi-value">{totalAlumnos}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cursos activos</div>
          <div className="kpi-value">{Object.keys(resumenCursos).length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Propuestas generadas</div>
          <div className="kpi-value">{propuestas.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Estado última</div>
          <div className="kpi-value text-[14px]">{ESTADO_BADGE[propuestas[0]?.estado]?.label ?? 'Sin horario'}</div>
        </div>
      </div>

      {/* Historial de propuestas */}
      {propuestas.length > 1 && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4 mb-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-[10px] font-semibold text-[#9ca3af] uppercase mb-2">Propuestas anteriores</div>
          <div className="flex flex-wrap gap-2">
            {propuestas.map((p: any, i: number) => {
              const badge = ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.borrador
              return (
                <button
                  key={p.id}
                  onClick={() => setPropuestaActual(p)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                    propuestaActual?.id === p.id
                      ? 'border-[var(--ar-accent)] bg-blue-50 text-[var(--ar-accent)]'
                      : 'border-[var(--ar-border)] hover:bg-slate-50 text-[#4b5563]'
                  }`}
                >
                  {p.propuesta?.titulo || `Propuesta ${propuestas.length - i}`}
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.className}`}>
                    {badge.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Generador */}
      <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5 mb-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 mb-4">
          <i className="ti ti-sparkles text-[var(--ar-accent)] text-lg" aria-hidden="true"/>
          <h2 className="text-[14px] font-bold text-[#1B3A5C]">Generar propuesta automática</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Sede</label>
            <select value={sede} onChange={e => setSede(e.target.value)} className="select-base w-full text-[12px]">
              <option value="santiago">Santiago</option>
              <option value="puente_alto">Puente Alto</option>
              <option value="punta_arenas">Punta Arenas</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Restricciones adicionales (opcional)</label>
            <input value={restricciones} onChange={e => setRestricciones(e.target.value)} className="input-base text-[12px]" placeholder="Ej: María no puede los viernes, deportes solo martes y jueves..."/>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-[#9ca3af]">
            La IA considerará {totalAlumnos} alumnos en {Object.keys(resumenCursos).length} cursos
          </div>
          <button onClick={generarPropuesta} disabled={generando} className="btn-accent text-xs disabled:opacity-50">
            <i className={`ti ${generando ? 'ti-loader animate-spin' : 'ti-sparkles'} text-sm`} aria-hidden="true"/>
            {generando ? 'Generando...' : 'Generar propuesta'}
          </button>
        </div>
      </div>

      {/* Propuesta actual */}
      {propuestaData && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#1B3A5C]">{propuestaData.titulo ?? 'Propuesta de horario'}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${ESTADO_BADGE[propuestaEstado]?.className ?? ''}`}>
                {ESTADO_BADGE[propuestaEstado]?.label ?? propuestaEstado}
              </span>
              {propuestaEstado === 'borrador' && propuestaId && (
                <button
                  onClick={() => setEditandoBloques(true)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <i className="ti ti-drag-drop text-sm mr-1" aria-hidden="true"/>
                  Editar bloques
                </button>
              )}
              {propuestaEstado === 'borrador' && propuestaId && (
                <button
                  onClick={() => publicarPropuesta(propuestaId)}
                  disabled={publicando}
                  className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                >
                  <i className={`ti ${publicando ? 'ti-loader animate-spin' : 'ti-send'} text-sm mr-1`} aria-hidden="true"/>
                  {publicando ? 'Publicando...' : 'Publicar'}
                </button>
              )}
              {propuestaEstado === 'publicado' && propuestaId && (
                <button
                  onClick={() => archivarPropuesta(propuestaId)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <i className="ti ti-archive text-sm mr-1" aria-hidden="true"/>
                  Archivar
                </button>
              )}
              {propuestaData && (
                <button
                  onClick={() => exportarHorarioCompleto(propuestaData)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <i className="ti ti-file-type-pdf text-sm mr-1" aria-hidden="true"/>
                  Exportar PDF
                </button>
              )}
            </div>
          </div>

          {/* Grupos */}
          {propuestaData.grupos && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase mb-2">Grupos conformados</div>
              <div className="flex flex-wrap gap-2">
                {propuestaData.grupos.map((g: any, i: number) => (
                  <div key={i} className="bg-[#f9fafb] border border-[var(--ar-border)] rounded-lg px-3 py-2 text-[11px]">
                    <span className="font-bold text-[#1B3A5C]">{g.nombre}</span>
                    <span className="text-[#6b7280] ml-2">{g.curso} · {g.alumnos} alumnos · {g.tutor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horario por día */}
          {propuestaData.horario && (
            <div className="space-y-4">
              {DIAS.map(dia => {
                const bloques = propuestaData.horario[dia]
                if (!bloques || bloques.length === 0) return null
                return (
                  <div key={dia}>
                    <div className="text-[11px] font-bold text-[var(--ar-accent)] uppercase mb-2">{DIAS_LABEL[dia]}</div>
                    <div className="space-y-1">
                      {bloques.map((b: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 bg-[#f9fafb] rounded-lg px-3 py-2 text-[11px]">
                          <span className="font-mono font-bold text-[#1B3A5C] w-[90px]">{b.hora}</span>
                          <span className="font-medium text-[#1B3A5C] w-[80px]">{b.grupo}</span>
                          <span className="text-[#4b5563] flex-1">{b.experiencia}</span>
                          <span className="text-[#6b7280]">{b.tutor}</span>
                          <span className="text-[#9ca3af]">{b.espacio}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Notas */}
          {propuestaData.notas && propuestaData.notas.length > 0 && (
            <div className="mt-4 bg-[#FEF3EC] border border-[#E8722A]/20 rounded-lg p-3">
              <div className="text-[10px] font-semibold text-[#E8722A] uppercase mb-1">Notas</div>
              <ul className="text-[11px] text-[#6b4d3a] space-y-0.5">
                {propuestaData.notas.map((n: string, i: number) => <li key={i}>• {n}</li>)}
              </ul>
            </div>
          )}

          {/* Si es raw (no se parseó bien) */}
          {propuestaData.raw && (
            <pre className="mt-4 bg-[#f9fafb] rounded-lg p-4 text-[11px] text-[#4b5563] overflow-auto max-h-[400px] whitespace-pre-wrap">{propuestaData.raw}</pre>
          )}
        </div>
      )}

      {/* Editor de bloques (modal drag & drop) */}
      {editandoBloques && propuestaData && (
        <EditorHorario
          propuesta={propuestaData}
          onSave={guardarEdicionBloques}
          onCancel={() => setEditandoBloques(false)}
        />
      )}
    </div>
  )
}
