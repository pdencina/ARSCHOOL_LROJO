'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  alumnos: any[]
  asistenciasHoy: any[]
  cursos: string[]
  colegioId: string
  fecha: string
}

type EstadoAsistencia = 'presente' | 'ausente' | 'tardanza' | 'justificado'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  presente:    { label: 'Presente',    color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ausente:     { label: 'Ausente',     color: 'text-red-700',     bg: 'bg-red-50' },
  tardanza:    { label: 'Tardanza',    color: 'text-amber-700',   bg: 'bg-amber-50' },
  justificado: { label: 'Justificado', color: 'text-sky-700',     bg: 'bg-sky-50' },
}

export default function AsistenciasClient({ alumnos, asistenciasHoy, cursos, colegioId, fecha: fechaInicial }: Props) {
  const [vista, setVista] = useState<'registro' | 'historial'>('registro')
  const [cursoSel, setCursoSel] = useState(cursos[0] ?? '')
  const [fecha, setFecha] = useState(fechaInicial)
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>(() => {
    const init: Record<string, EstadoAsistencia> = {}
    asistenciasHoy.forEach(a => { init[a.alumno_id] = a.estado })
    return init
  })
  const [observaciones, setObservaciones] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  const supabase = createClient()

  const alumnosCurso = useMemo(() =>
    alumnos.filter(a => a.curso === cursoSel),
    [alumnos, cursoSel]
  )

  // Cargar asistencias cuando cambia la fecha
  useEffect(() => {
    if (fecha === fechaInicial) {
      // Usar los datos iniciales del server
      const init: Record<string, EstadoAsistencia> = {}
      asistenciasHoy.forEach(a => { init[a.alumno_id] = a.estado })
      setEstados(init)
    } else {
      // Fetch del día seleccionado
      fetchAsistenciasFecha(fecha)
    }
  }, [fecha])

  async function fetchAsistenciasFecha(f: string) {
    const { data } = await supabase
      .from('asistencias')
      .select('alumno_id, estado, observacion')
      .eq('colegio_id', colegioId)
      .eq('fecha', f)

    const init: Record<string, EstadoAsistencia> = {}
    const obs: Record<string, string> = {}
    ;(data ?? []).forEach((a: any) => {
      init[a.alumno_id] = a.estado
      if (a.observacion) obs[a.alumno_id] = a.observacion
    })
    setEstados(init)
    setObservaciones(obs)
  }

  // Cargar historial mensual
  useEffect(() => {
    if (vista === 'historial') fetchHistorial()
  }, [vista, cursoSel])

  async function fetchHistorial() {
    setLoadingHist(true)
    const ahora = new Date()
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

    const alumnoIds = alumnosCurso.map(a => a.id)
    if (alumnoIds.length === 0) { setLoadingHist(false); return }

    const { data } = await supabase
      .from('asistencias')
      .select('alumno_id, fecha, estado')
      .in('alumno_id', alumnoIds)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)
      .order('fecha')

    setHistorial(data ?? [])
    setLoadingHist(false)
  }

  const presentes = alumnosCurso.filter(a => estados[a.id] === 'presente').length
  const ausentes = alumnosCurso.filter(a => estados[a.id] === 'ausente').length
  const tardanzas = alumnosCurso.filter(a => estados[a.id] === 'tardanza').length
  const total = alumnosCurso.length
  const pct = total ? Math.round((presentes / total) * 100) : 0

  function setEstado(alumnoId: string, estado: EstadoAsistencia) {
    setEstados(prev => ({ ...prev, [alumnoId]: estado }))
  }

  function setTodosPresentes() {
    const nuevo: Record<string, EstadoAsistencia> = {}
    alumnosCurso.forEach(a => { nuevo[a.id] = 'presente' })
    setEstados(prev => ({ ...prev, ...nuevo }))
  }

  async function handleGuardar() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const upserts = alumnosCurso
      .filter(a => estados[a.id])
      .map(a => ({
        colegio_id: colegioId,
        alumno_id: a.id,
        fecha,
        estado: estados[a.id],
        observacion: observaciones[a.id] || null,
        registrado_por: user?.id,
      }))

    const { error } = await supabase.from('asistencias').upsert(upserts, { onConflict: 'alumno_id,fecha' })
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success('Asistencia guardada')
    setSaving(false)
  }

  // Historial: obtener días únicos del mes
  const diasMes = useMemo(() => {
    const dias = [...new Set(historial.map(h => h.fecha))].sort()
    return dias
  }, [historial])

  function getEstadoHistorial(alumnoId: string, dia: string) {
    return historial.find(h => h.alumno_id === alumnoId && h.fecha === dia)?.estado
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Asistencias</h1>
          <p className="page-subtitle">
            {new Date(fecha + 'T12:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Tabs */}
          <div className="flex bg-[#f3f4f6] rounded-lg p-0.5 mr-2">
            <button onClick={() => setVista('registro')} className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${vista === 'registro' ? 'bg-white shadow-sm text-[#1a2332]' : 'text-[#6b7280]'}`}>
              Registro
            </button>
            <button onClick={() => setVista('historial')} className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${vista === 'historial' ? 'bg-white shadow-sm text-[#1a2332]' : 'text-[#6b7280]'}`}>
              Historial
            </button>
          </div>
          <select value={cursoSel} onChange={e => setCursoSel(e.target.value)} className="select-base text-[13px]">
            {cursos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {vista === 'registro' && (
            <>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input-base w-auto text-[13px]"/>
              <button onClick={setTodosPresentes} className="btn-secondary text-xs">Todos presentes</button>
              <button onClick={handleGuardar} disabled={saving} className="btn-primary text-xs disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      {vista === 'registro' && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Asistencia total', val: `${pct}%`, sub: `${presentes} de ${total} alumnos`, color: pct >= 85 ? 'text-[#1a7a4c]' : pct >= 70 ? 'text-[#b7791f]' : 'text-[#c53030]' },
            { label: 'Presentes', val: presentes, sub: 'hoy', color: 'text-[#1a7a4c]' },
            { label: 'Ausentes', val: ausentes, sub: 'sin justificar', color: 'text-[#c53030]' },
            { label: 'Tardanzas', val: tardanzas, sub: 'registradas', color: 'text-[#b7791f]' },
          ].map((k, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className={`kpi-value ${k.color}`}>{k.val}</div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Vista: Registro diario */}
      {vista === 'registro' && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3 border-b border-[var(--ar-border)] bg-[#f9fafb]">
            <span className="font-semibold text-[#1a2332] text-[14px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{cursoSel}</span>
            <span className="text-[12px] text-[#9ca3af] ml-2">— {alumnosCurso.length} alumnos</span>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--ar-border)]">
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-2.5 text-left">Alumno</th>
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-2.5 text-left">Estado</th>
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-2.5 text-left">Observación</th>
              </tr>
            </thead>
            <tbody>
              {alumnosCurso.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[#9ca3af] text-sm">No hay alumnos en este curso.</td></tr>
              ) : alumnosCurso.map((alumno: any) => {
                const estadoActual = estados[alumno.id]
                return (
                  <tr key={alumno.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f0f4f8] flex items-center justify-center text-[11px] font-bold text-[#2c4a6e] flex-shrink-0">
                          {alumno.nombre?.[0]}{alumno.apellido?.[0]}
                        </div>
                        <div>
                          <div className="font-medium text-[#1a2332]">{alumno.nombre} {alumno.apellido}</div>
                          {alumno.rut && <div className="text-[10px] text-[#b0b7c3]">{alumno.rut}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(['presente', 'tardanza', 'ausente', 'justificado'] as EstadoAsistencia[]).map(e => {
                          const cfg = ESTADO_CONFIG[e]
                          const selected = estadoActual === e
                          return (
                            <button key={e} onClick={() => setEstado(alumno.id, e)}
                              className={`text-[11px] font-medium px-2.5 py-1.5 rounded-md border transition-all ${
                                selected ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white border-[#e8eaed] text-[#9ca3af] hover:border-[#d1d5db]'
                              }`}>
                              {cfg.label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input type="text" value={observaciones[alumno.id] ?? ''} onChange={e => setObservaciones(prev => ({...prev, [alumno.id]: e.target.value}))}
                        placeholder="Observación opcional..." className="input-base text-[12px] py-1.5"/>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista: Historial mensual */}
      {vista === 'historial' && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3 border-b border-[var(--ar-border)] bg-[#f9fafb] flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#1a2332] text-[14px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Historial — {cursoSel}</span>
              <span className="text-[12px] text-[#9ca3af] ml-2">{new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200"/> Presente</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200"/> Ausente</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200"/> Tardanza</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-sky-100 border border-sky-200"/> Justificado</span>
            </div>
          </div>

          {loadingHist ? (
            <div className="p-8 text-center text-[#9ca3af] text-sm">Cargando historial...</div>
          ) : diasMes.length === 0 ? (
            <div className="p-8 text-center text-[#9ca3af] text-sm">Sin registros este mes para {cursoSel}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--ar-border)]">
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider sticky left-0 bg-[#f9fafb] min-w-[140px]">Alumno</th>
                    {diasMes.map(dia => (
                      <th key={dia} className="px-1 py-2.5 text-center text-[10px] font-medium text-[#6b7280] min-w-[28px]">
                        {new Date(dia + 'T12:00').getDate()}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-[#9ca3af] uppercase">Asist.</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnosCurso.map(alumno => {
                    const registros = diasMes.map(dia => getEstadoHistorial(alumno.id, dia))
                    const totalDias = registros.filter(Boolean).length
                    const diasPresente = registros.filter(e => e === 'presente').length
                    const pctAlumno = totalDias > 0 ? Math.round((diasPresente / totalDias) * 100) : 0
                    return (
                      <tr key={alumno.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc]">
                        <td className="px-3 py-2 sticky left-0 bg-white font-medium text-[#1a2332] text-[12px]">
                          {alumno.nombre} {alumno.apellido}
                        </td>
                        {diasMes.map(dia => {
                          const estado = getEstadoHistorial(alumno.id, dia)
                          const bgColor = estado === 'presente' ? 'bg-emerald-100' :
                            estado === 'ausente' ? 'bg-red-100' :
                            estado === 'tardanza' ? 'bg-amber-100' :
                            estado === 'justificado' ? 'bg-sky-100' : 'bg-[#f9fafb]'
                          return (
                            <td key={dia} className="px-0.5 py-2 text-center">
                              <div className={`w-5 h-5 rounded-sm mx-auto ${bgColor}`} title={`${dia}: ${estado ?? 'Sin registro'}`}/>
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center">
                          <span className={`font-bold text-[12px] ${pctAlumno >= 85 ? 'text-[#1a7a4c]' : pctAlumno >= 70 ? 'text-[#b7791f]' : 'text-[#c53030]'}`}>
                            {pctAlumno}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
