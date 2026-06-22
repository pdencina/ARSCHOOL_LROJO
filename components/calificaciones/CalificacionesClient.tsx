'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  evaluaciones: any[]
  alumnos: any[]
  cursos: string[]
  colegioId: string
}

const MATERIAS = ['Lenguaje','Matematicas','Ciencias Naturales','Historia','Ingles','Artes','Ed. Fisica']

const MATERIA_COLOR: Record<string, { bg: string; text: string }> = {
  'Lenguaje':           { bg: 'bg-red-50',     text: 'text-red-700' },
  'Matematicas':        { bg: 'bg-blue-50',    text: 'text-blue-700' },
  'Ciencias Naturales': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Historia':           { bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  'Ingles':             { bg: 'bg-violet-50',  text: 'text-violet-700' },
  'Artes':              { bg: 'bg-orange-50',  text: 'text-orange-700' },
  'Ed. Fisica':         { bg: 'bg-teal-50',    text: 'text-teal-700' },
}

function logroColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function logroTag(pct: number) {
  if (pct >= 80) return { label: 'Destacado', className: 'tag-ok' }
  if (pct >= 60) return { label: 'Logrado', className: 'tag-blue' }
  if (pct >= 40) return { label: 'En desarrollo', className: 'tag-pend' }
  return { label: 'Inicial', className: 'tag-mora' }
}

export default function CalificacionesClient({ evaluaciones, alumnos, cursos, colegioId }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'lista' | 'nueva' | 'cargar'>('lista')
  const [evalSel, setEvalSel] = useState<any>(null)
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [filtroMateria, setFiltroMateria] = useState('')
  const [filtroCurso, setFiltroCurso] = useState('')
  const [nuevaEval, setNuevaEval] = useState({
    nombre: '', materia: 'Lenguaje', curso: cursos[0] ?? '', fecha: new Date().toISOString().split('T')[0]
  })
  const supabase = createClient()

  const evalsFiltradas = useMemo(() =>
    evaluaciones.filter(e =>
      (!filtroMateria || e.materia === filtroMateria) &&
      (!filtroCurso || e.curso === filtroCurso)
    ),
    [evaluaciones, filtroMateria, filtroCurso]
  )

  const alumnosCurso = useMemo(() =>
    evalSel ? alumnos.filter(a => a.curso === evalSel.curso) : [],
    [alumnos, evalSel]
  )

  function promedioEval(ev: any) {
    const ns = (ev.calificaciones ?? []).map((c: any) => c.nota).filter((n: any) => n != null)
    if (!ns.length) return null
    return Math.round(ns.reduce((a: number, b: number) => a + b, 0) / ns.length)
  }

  const promGeneral = evaluaciones.length
    ? Math.round(
        evaluaciones.map(e => promedioEval(e)).filter(Boolean)
          .reduce((a, b) => a + (b as number), 0) /
        evaluaciones.filter(e => promedioEval(e)).length
      )
    : null

  async function handleCrearEval() {
    if (!nuevaEval.nombre || !nuevaEval.curso) { toast.error('Completa todos los campos'); return }
    setSaving(true)
    const { data, error } = await supabase.from('evaluaciones').insert({
      colegio_id: colegioId, ...nuevaEval, ponderacion: 100
    }).select().single()
    if (error) { toast.error('Error al crear evaluación'); setSaving(false); return }
    toast.success('Evaluación creada')
    setEvalSel(data)
    setVista('cargar')
    setSaving(false)
  }

  async function handleGuardarNotas() {
    if (!evalSel) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const upserts = Object.entries(notas)
      .filter(([_, nota]) => nota !== '')
      .map(([alumno_id, nota]) => ({
        evaluacion_id: evalSel.id,
        alumno_id,
        nota: parseInt(nota),
        colegio_id: colegioId,
        registrado_por: user?.id,
      }))
    if (upserts.length === 0) { toast.error('No hay porcentajes para guardar'); setSaving(false); return }
    const { error } = await supabase.from('calificaciones').upsert(upserts, { onConflict: 'evaluacion_id,alumno_id' })
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success(`${upserts.length} resultados guardados`)
    setSaving(false)
    setVista('lista')
    router.refresh()
  }

  const matConfig = evalSel ? (MATERIA_COLOR[evalSel.materia] ?? { bg: 'bg-slate-50', text: 'text-slate-700' }) : null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Evaluaciones</h1>
          <p className="page-subtitle">Registro de logro por alumno (escala 0–100%)</p>
        </div>
        {vista === 'lista' && (
          <button onClick={() => setVista('nueva')} className="btn-primary">
            <i className="ti ti-plus text-sm" aria-hidden="true"/> Nueva evaluación
          </button>
        )}
        {vista !== 'lista' && (
          <button onClick={() => { setVista('lista'); setEvalSel(null); setNotas({}) }} className="btn-secondary">
            <i className="ti ti-arrow-left text-sm" aria-hidden="true"/> Volver
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Logro promedio', val: promGeneral ? `${promGeneral}%` : '—', sub: 'todas las materias', color: promGeneral ? logroColor(promGeneral) : 'text-[#1a2332]' },
          { label: 'Evaluaciones', val: evaluaciones.length, sub: 'registradas', color: 'text-[#2c4a6e]' },
          { label: 'Resultados', val: evaluaciones.reduce((a, e) => a + (e.calificaciones?.length ?? 0), 0), sub: 'cargados', color: 'text-[#1a2332]' },
          { label: 'Pendientes', val: evaluaciones.filter(e => (e.calificaciones?.length ?? 0) === 0).length, sub: 'sin resultados', color: 'text-[#b7791f]' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-value ${k.color}`}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Vista: Lista evaluaciones */}
      {vista === 'lista' && (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} className="select-base text-sm">
              <option value="">Todas las materias</option>
              {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)} className="select-base text-sm">
              <option value="">Todos los cursos</option>
              {cursos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(filtroMateria || filtroCurso) && (
              <button onClick={() => { setFiltroMateria(''); setFiltroCurso('') }} className="text-xs text-[#6b7280] hover:text-[#1a2332]">
                Limpiar filtros
              </button>
            )}
            <span className="text-[11px] text-[#9ca3af] ml-auto">{evalsFiltradas.length} evaluación{evalsFiltradas.length !== 1 ? 'es' : ''}</span>
          </div>

          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                  {['Evaluación','Materia','Curso','Fecha','Logro promedio','Alumnos',''].map(h => (
                    <th key={h} className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evalsFiltradas.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center">
                    <i className="ti ti-chart-bar text-3xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
                    <p className="text-[#9ca3af] text-sm">No hay evaluaciones todavía.</p>
                  </td></tr>
                ) : evalsFiltradas.map((ev: any) => {
                  const prom = promedioEval(ev)
                  const mc = MATERIA_COLOR[ev.materia] ?? { bg: 'bg-slate-100', text: 'text-slate-600' }
                  return (
                    <tr key={ev.id} className="border-b border-[#f3f4f6] hover:bg-[#fafbfc] transition-colors">
                      <td className="px-4 py-3.5 font-medium text-[#1a2332]">{ev.nombre}</td>
                      <td className="px-4 py-3.5"><span className={`tag ${mc.bg} ${mc.text}`}>{ev.materia}</span></td>
                      <td className="px-4 py-3.5 text-[#6b7280] text-xs font-mono">{ev.curso}</td>
                      <td className="px-4 py-3.5 text-xs text-[#6b7280]">{new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-3.5">
                        {prom != null ? (
                          <span className={`font-bold text-lg ${logroColor(prom)}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>{prom}%</span>
                        ) : <span className="text-[#9ca3af] text-xs">Sin datos</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#6b7280]">{ev.calificaciones?.length ?? 0}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => { setEvalSel(ev); setNotas({}); setVista('cargar') }} className="btn-secondary text-xs py-1.5 px-3">
                          Cargar resultados
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Vista: Nueva evaluación */}
      {vista === 'nueva' && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-6 max-w-lg">
          <h2 className="text-lg font-bold text-[#1a2332] mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Nueva evaluación</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Nombre de la evaluación</label>
              <input value={nuevaEval.nombre} onChange={e => setNuevaEval(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Ej: Evaluación diagnóstica unidad 1"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Materia</label>
                <select value={nuevaEval.materia} onChange={e => setNuevaEval(p => ({...p, materia: e.target.value}))} className="select-base w-full">
                  {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Curso</label>
                <select value={nuevaEval.curso} onChange={e => setNuevaEval(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                  {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">Fecha</label>
              <input type="date" value={nuevaEval.fecha} onChange={e => setNuevaEval(p => ({...p, fecha: e.target.value}))} className="input-base"/>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setVista('lista')} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCrearEval} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? 'Creando...' : 'Crear evaluación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista: Cargar resultados */}
      {vista === 'cargar' && evalSel && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-[#f9fafb] border-b border-[var(--ar-border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${matConfig?.bg} ${matConfig?.text}`}>
                {evalSel.materia}
              </div>
              <span className="font-bold text-[#1a2332]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{evalSel.nombre}</span>
              <span className="text-xs text-[#9ca3af]">{evalSel.curso} · {new Date(evalSel.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</span>
            </div>
            <button onClick={handleGuardarNotas} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
              {saving ? 'Guardando...' : `Guardar ${Object.values(notas).filter(n => n !== '').length} resultados`}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--ar-border)]">
                <th className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5 text-left">#</th>
                <th className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5 text-left">Alumno</th>
                <th className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5 text-left">% de logro (0–100)</th>
                <th className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider px-4 py-2.5 text-left">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {alumnosCurso.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#9ca3af] text-sm">No hay alumnos en {evalSel.curso}.</td></tr>
              ) : alumnosCurso.map((a: any, idx: number) => {
                const notaExistente = evalSel.calificaciones?.find((c: any) => c.alumno?.nombre === a.nombre)?.nota
                const notaActual = notas[a.id] ?? (notaExistente?.toString() ?? '')
                const notaNum = parseInt(notaActual)
                const tag = notaActual ? logroTag(notaNum) : null
                return (
                  <tr key={a.id} className="border-b border-[#f3f4f6] hover:bg-[#fafbfc] transition-colors">
                    <td className="px-4 py-3 text-[#9ca3af] text-xs font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f0f4f8] flex items-center justify-center text-[11px] font-bold text-[#2c4a6e] flex-shrink-0">
                          {a.nombre?.[0]}{a.apellido?.[0]}
                        </div>
                        <span className="font-medium text-[#1a2332]">{a.nombre} {a.apellido}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0" max="100" step="1"
                          value={notaActual}
                          onChange={e => setNotas(prev => ({...prev, [a.id]: e.target.value}))}
                          placeholder="—"
                          className="input-base w-20 text-center font-mono"
                        />
                        <span className="text-[#9ca3af] text-xs">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {tag ? (
                        <span className={`tag ${tag.className}`}>{tag.label}</span>
                      ) : <span className="text-[#d1d5db] text-xs">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
