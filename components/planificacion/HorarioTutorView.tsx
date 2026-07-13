'use client'

import { useMemo } from 'react'
import { exportarHorarioTutor } from '@/lib/horario-pdf'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes',
}

interface BloqueHorario {
  hora: string
  grupo: string
  experiencia: string
  tutor: string
  espacio: string
}

interface Props {
  propuesta: any // la propuesta publicada completa
  nombreTutor: string // "Nombre Apellido" del tutor actual
}

export default function HorarioTutorView({ propuesta, nombreTutor }: Props) {
  // Filtrar bloques del horario donde el tutor coincide
  const horarioFiltrado = useMemo(() => {
    if (!propuesta?.horario) return null

    const resultado: Record<string, BloqueHorario[]> = {}
    let totalBloques = 0

    DIAS.forEach(dia => {
      const bloques = (propuesta.horario[dia] ?? []) as BloqueHorario[]
      const misBloques = bloques.filter(b =>
        b.tutor.toLowerCase().trim() === nombreTutor.toLowerCase().trim()
      )
      if (misBloques.length > 0) {
        resultado[dia] = misBloques
        totalBloques += misBloques.length
      }
    })

    return totalBloques > 0 ? resultado : null
  }, [propuesta, nombreTutor])

  // Obtener grupo(s) asignados al tutor
  const misGrupos = useMemo(() => {
    if (!propuesta?.grupos) return []
    return propuesta.grupos.filter((g: any) =>
      g.tutor.toLowerCase().trim() === nombreTutor.toLowerCase().trim()
    )
  }, [propuesta, nombreTutor])

  if (!propuesta) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">Mi horario</h1>
            <p className="page-subtitle">Tu horario semanal asignado</p>
          </div>
        </div>
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-14 text-center">
          <i className="ti ti-calendar-off text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-500 font-medium mb-1">No hay horario publicado</p>
          <p className="text-slate-400 text-sm">El administrador aún no ha publicado un horario para este período.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Mi horario</h1>
          <p className="page-subtitle">{propuesta.titulo ?? 'Horario semanal asignado'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportarHorarioTutor(propuesta, nombreTutor)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <i className="ti ti-file-type-pdf text-sm mr-1" aria-hidden="true"/>
            Exportar PDF
          </button>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            Publicado
          </span>
        </div>
      </div>

      {/* Info del tutor */}
      {misGrupos.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="kpi-card">
            <div className="kpi-label">Tutor</div>
            <div className="kpi-value text-[14px]">{nombreTutor}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Grupo(s) asignado(s)</div>
            <div className="kpi-value text-[14px]">{misGrupos.map((g: any) => g.nombre).join(', ')}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Alumnos a cargo</div>
            <div className="kpi-value">{misGrupos.reduce((acc: number, g: any) => acc + g.alumnos, 0)}</div>
          </div>
        </div>
      )}

      {/* Horario filtrado */}
      {horarioFiltrado ? (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="space-y-5">
            {DIAS.map(dia => {
              const bloques = horarioFiltrado[dia]
              if (!bloques) return null
              return (
                <div key={dia}>
                  <div className="text-[11px] font-bold text-[var(--ar-accent)] uppercase mb-2 flex items-center gap-2">
                    <i className="ti ti-calendar-event text-sm" aria-hidden="true"/>
                    {DIAS_LABEL[dia]}
                  </div>
                  <div className="space-y-1.5">
                    {bloques.map((b, i) => (
                      <div key={i} className="flex items-center gap-3 bg-[#f9fafb] border border-slate-100 rounded-lg px-4 py-3 text-[12px]">
                        <span className="font-mono font-bold text-[#1B3A5C] w-[100px]">{b.hora}</span>
                        <span className="font-semibold text-[var(--ar-accent)] w-[80px]">{b.grupo}</span>
                        <span className="text-[#4b5563] flex-1 font-medium">{b.experiencia}</span>
                        <span className="text-[#9ca3af] flex items-center gap-1">
                          <i className="ti ti-map-pin text-xs" aria-hidden="true"/>
                          {b.espacio}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-14 text-center">
          <i className="ti ti-calendar-x text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-500 font-medium mb-1">No tienes bloques asignados</p>
          <p className="text-slate-400 text-sm">El horario publicado no contiene bloques asignados a tu nombre ({nombreTutor}).</p>
        </div>
      )}

      {/* Notas */}
      {propuesta.notas && propuesta.notas.length > 0 && (
        <div className="mt-4 bg-[#FEF3EC] border border-[#E8722A]/20 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-[#E8722A] uppercase mb-1">Notas generales</div>
          <ul className="text-[11px] text-[#6b4d3a] space-y-0.5">
            {propuesta.notas.map((n: string, i: number) => <li key={i}>• {n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
