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
  bloquesDelDia: any[]
  rol: string
}

type EstadoAsistencia = 'presente' | 'ausente' | 'tardanza' | 'justificado'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  presente:    { label: 'Presente',    color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ausente:     { label: 'Ausente',     color: 'text-red-700',     bg: 'bg-red-50' },
  tardanza:    { label: 'Tardanza',    color: 'text-amber-700',   bg: 'bg-amber-50' },
  justificado: { label: 'Justificado', color: 'text-sky-700',     bg: 'bg-sky-50' },
}

export default function AsistenciasClient({ alumnos, asistenciasHoy, cursos, colegioId, fecha: fechaInicial, bloquesDelDia, rol }: Props) {
  const [vista, setVista] = useState<'registro' | 'historial'>('registro')
  const [cursoSel, setCursoSel] = useState(cursos[0] ?? '')
  const [fecha, setFecha] = useState(fechaInicial)
  const [bloqueSel, setBloqueSel] = useState<string>('')
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>({})
  const [observaciones, setObservaciones] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  const supabase = createClient()

  // Bloques únicos del día (deduplicar por hora)
  const bloquesUnicos = useMemo(() => {
    const vistos = new Set<string>()
    return bloquesDelDia.filter(b => {
      if (vistos.has(b.hora)) return false
      vistos.add(b.hora)
      return true
    })
  }, [bloquesDelDia])

  // Info del bloque seleccionado
  const bloqueActual = useMemo(() => {
    if (!bloqueSel) return null
    return bloquesDelDia.find(b => b.hora === bloqueSel)
  }, [bloqueSel, bloquesDelDia])

  // Alumnos filtrados por curso (o por grupo del bloque si hay)
  const alumnosCurso = useMemo(() => {
    if (bloqueActual?.grupo) {
      // Filtrar por grupo si está en la info del bloque (para cuando haya mapping)
      return alumnos.filter(a => a.curso === cursoSel)
    }
    return alumnos.filter(a => a.curso === cursoSel)
  }, [alumnos, cursoSel, bloqueActual])

  // Inicializar estados desde asistencias del server
  useEffect(() => {
    const init: Record<string, EstadoAsistencia> = {}
    const obs: Record<string, string> = {}
    asistenciasHoy.forEach((a: any) => {
      // Si hay bloque seleccionado, solo cargar esas asistencias
      if (bloqueSel) {
        if (a.bloque_horario === bloqueSel) {
          init[a.alumno_id] = a.estado
          if (a.observacion) obs[a.alumno_id] = a.observacion
        }
      } else {
        // Sin bloque = asistencia general (legacy)
        if (!a.bloque_horario) {
          init[a.alumno_id] = a.estado
          if (a.observacion) obs[a.alumno_id] = a.observacion
        }
      }
    })
    setEstados(init)
    setObservaciones(obs)
  }, [bloqueSel, asistenciasHoy])

  // Cuando cambia fecha, recargar
  useEffect(() => {
    if (fecha !== fechaInicial) {
      fetchAsistenciasFecha(fecha)
    }
  }, [fecha])

  async function fetchAsistenciasFecha(f: string) {
    const { data } = await supabase
      .from('asistencias')
      .select('alumno_id, estado, observacion, bloque_horario')
      .eq('colegio_id', colegioId)
      .eq('fecha', f)

    const init: Record<string, EstadoAsistencia> = {}
    const obs: Record<string, string> = {}
    ;(data ?? []).forEach((a: any) => {
      if (bloqueSel) {
        if (a.bloque_horario === bloqueSel) {
          init[a.alumno_id] = a.estado
          if (a.observacion) obs[a.alumno_id] = a.observacion
        }
      } else {
        if (!a.bloque_horario) {
          init[a.alumno_id] = a.estado
          if (a.observacion) obs[a.alumno_id] = a.observacion
        }
      }
    })
    setEstados(init)
    setObservaciones(obs)
  }

  // Historial
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
      .select('alumno_id, fecha, estado, bloque_horario')
      .in('alumno_id', alumnoIds)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)
      .order('fecha')

    setHistorial(data ?? [])
    setLoadingHist(false)
  }

  // KPIs
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
        bloque_horario: bloqueSel || null,
        experiencia_nombre: bloqueActual?.experiencia || null,
        grupo: bloqueActual?.grupo || null,
      }))

    const { error } = await supabase
      .from('asistencias')
      .upsert(upserts, { onConflict: 'alumno_id,fecha,bloque_horario' })

    if (error) {
      // Fallback: intentar sin onConflict (insertar/actualizar uno por uno)
      let errCount = 0
      for (const u of upserts) {
        const { error: e } = await supabase.from('asistencias').upsert(u)
        if (e) errCount++
      }
      if (errCount > 0) toast.error(`Error en ${errCount} registros`)
      else toast.success('Asistencia guardada')
    } else {
      toast.success('Asistencia guardada')
    }
    setSaving(false)
  }

  // Historial: días únicos
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
            {bloqueSel && <span className="ml-2 text-[var(--ar-accent)] font-medium">· {bloqueSel}</span>}
          </p>
        </div>
        <div className="flex gap-2 items-center">
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

      {/* Selector de bloque */}
      {vista === 'registro' && bloquesUnicos.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Bloque / Experiencia</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setBloqueSel('')}
              className={`text-[11px] px-3 py-2 rounded-lg font-medium border transition-all ${!bloqueSel ? 'bg-[#1a2332] text-white border-[#1a2332]' : 'bg-white text-[#6b7280] border-[var(--ar-border)] hover:border-slate-300'}`}
            >
              General (día completo)
            </button>
            {bloquesUnicos.map(b => {
              const selected = bloqueSel === b.hora
              return (
                <button
                  key={b.hora}
                  onClick={() => setBloqueSel(b.hora)}
                  className={`text-[11px] px-3 py-2 rounded-lg font-medium border transition-all ${selected ? 'bg-[var(--ar-accent)] text-white border-[var(--ar-accent)]' : 'bg-white text-[#4b5563] border-[var(--ar-border)] hover:border-slate-300'}`}
                >
                  <span className="font-bold">{b.hora}</span>
                  {b.experiencia && <span className="ml-1.5 opacity-80">· {b.experiencia}</span>}
                </button>
              )
            })}
          </div>
          {bloqueActual && (
            <div className="mt-2 text-[11px] text-[#6b7280]">
              <i className="ti ti-info-circle text-[11px] mr-1" aria-hidden="true"/>
              {bloqueActual.experiencia} — {bloqueActual.grupo} — {bloqueActual.tutor}
              {bloqueActual.espacio && ` · ${bloqueActual.espacio}`}
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      {vista === 'registro' && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Asistencia', val: `${pct}%`, sub: `${presentes} de ${total}`, color: pct >= 85 ? 'text-[#1a7a4c]' : pct >= 70 ? 'text-[#b7791f]' : 'text-[#c53030]' },
            { label: 'Presentes', val: presentes, sub: bloqueSel || 'hoy', color: 'text-[#1a7a4c]' },
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

      {/* Vista: Registro */}
      {vista === 'registro' && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3 border-b border-[var(--ar-border)] bg-[#f9fafb]">
            <span className="font-semibold text-[#1a2332] text-[14px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{cursoSel}</span>
            <span className="text-[12px] text-[#9ca3af] ml-2">— {alumnosCurso.length} alumnos</span>
            {bloqueSel && <span className="text-[12px] text-[var(--ar-accent)] ml-2 font-medium">· {bloqueActual?.experiencia ?? bloqueSel}</span>}
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

      {/* Vista: Historial */}
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
                    <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-[#9ca3af] uppercase">%</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnosCurso.map(alumno => {
                    const registros = historial.filter(h => h.alumno_id === alumno.id)
                    const presAlumno = registros.filter(r => r.estado === 'presente').length
                    const totalAlumno = registros.length
                    const pctAlumno = totalAlumno > 0 ? Math.round(presAlumno / totalAlumno * 100) : 0
                    return (
                      <tr key={alumno.id} className="border-b border-[#f5f6f7]">
                        <td className="px-3 py-2 sticky left-0 bg-white font-medium text-[#1a2332] truncate max-w-[140px]">{alumno.nombre} {alumno.apellido}</td>
                        {diasMes.map(dia => {
                          const est = getEstadoHistorial(alumno.id, dia)
                          const colors: Record<string, string> = { presente: 'bg-emerald-100', ausente: 'bg-red-100', tardanza: 'bg-amber-100', justificado: 'bg-sky-100' }
                          return (
                            <td key={dia} className="px-1 py-2 text-center">
                              {est ? <span className={`inline-block w-4 h-4 rounded-sm ${colors[est] ?? 'bg-slate-100'}`}/> : <span className="text-[#e8eaed]">·</span>}
                            </td>
                          )
                        })}
                        <td className={`px-3 py-2 text-center font-bold ${pctAlumno >= 85 ? 'text-emerald-600' : pctAlumno >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{pctAlumno}%</td>
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
