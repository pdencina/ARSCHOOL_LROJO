'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const DIAS_LABEL: Record<string, string> = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes' }

interface Props {
  propuestas: any[]
  resumenCursos: Record<string, number>
}

export default function PlanificacionClient({ propuestas, resumenCursos }: Props) {
  const [generando, setGenerando] = useState(false)
  const [propuestaActual, setPropuestaActual] = useState<any>(propuestas[0]?.propuesta ?? null)
  const [sede, setSede] = useState('santiago')
  const [restricciones, setRestricciones] = useState('')

  async function generarPropuesta() {
    setGenerando(true)
    const res = await fetch('/api/horarios/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sede, restricciones_extra: restricciones }),
    })
    if (res.ok) {
      const data = await res.json()
      setPropuestaActual(data.propuesta)
      toast.success('Propuesta generada')
    } else {
      toast.error('Error al generar propuesta')
    }
    setGenerando(false)
  }

  const totalAlumnos = Object.values(resumenCursos).reduce((a, b) => a + b, 0)

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
          <div className="kpi-label">Estado</div>
          <div className="kpi-value text-[14px]">{propuestas[0]?.estado ?? 'Sin horario'}</div>
        </div>
      </div>

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
      {propuestaActual && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#1B3A5C]">{propuestaActual.titulo ?? 'Propuesta de horario'}</h2>
            <span className="tag tag-pend">Borrador</span>
          </div>

          {/* Grupos */}
          {propuestaActual.grupos && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase mb-2">Grupos conformados</div>
              <div className="flex flex-wrap gap-2">
                {propuestaActual.grupos.map((g: any, i: number) => (
                  <div key={i} className="bg-[#f9fafb] border border-[var(--ar-border)] rounded-lg px-3 py-2 text-[11px]">
                    <span className="font-bold text-[#1B3A5C]">{g.nombre}</span>
                    <span className="text-[#6b7280] ml-2">{g.curso} · {g.alumnos} alumnos · {g.tutor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horario por día */}
          {propuestaActual.horario && (
            <div className="space-y-4">
              {DIAS.map(dia => {
                const bloques = propuestaActual.horario[dia]
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
          {propuestaActual.notas && propuestaActual.notas.length > 0 && (
            <div className="mt-4 bg-[#FEF3EC] border border-[#E8722A]/20 rounded-lg p-3">
              <div className="text-[10px] font-semibold text-[#E8722A] uppercase mb-1">Notas</div>
              <ul className="text-[11px] text-[#6b4d3a] space-y-0.5">
                {propuestaActual.notas.map((n: string, i: number) => <li key={i}>• {n}</li>)}
              </ul>
            </div>
          )}

          {/* Si es raw (no se parseó bien) */}
          {propuestaActual.raw && (
            <pre className="mt-4 bg-[#f9fafb] rounded-lg p-4 text-[11px] text-[#4b5563] overflow-auto max-h-[400px] whitespace-pre-wrap">{propuestaActual.raw}</pre>
          )}
        </div>
      )}
    </div>
  )
}
