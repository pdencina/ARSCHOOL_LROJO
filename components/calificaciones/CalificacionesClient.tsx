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

function notaColor(nota: number) {
  return nota >= 4 ? 'text-emerald-600' : 'text-red-600'
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
    const ns = (ev.calificaciones ?? []).map((c: any) => c.nota).filter(Boolean)
    if (!ns.length) return null
    return (ns.reduce((a: number, b: number) => a + b, 0) / ns.length).toFixed(1)
  }

  const promGeneral = evaluaciones.length
    ? evaluaciones.map(e => promedioEval(e)).filter(Boolean)
        .reduce((a, b) => a + parseFloat(b!), 0) /
      evaluaciones.filter(e => promedioEval(e)).length
    : null

  async function handleCrearEval() {
    if (!nuevaEval.nombre || !nuevaEval.curso) { toast.error('Completa todos los campos'); return }
    setSaving(true)
    const { data, error } = await supabase.from('evaluaciones').insert({
      colegio_id: colegioId, ...nuevaEval, nota_minima: 4.0, nota_maxima: 7.0
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
        nota: parseFloat(nota),
        registrado_por: user?.id,
      }))
    if (upserts.length === 0) { toast.error('No hay notas para guardar'); setSaving(false); return }
    const { error } = await supabase.from('calificaciones').upsert(upserts, { onConflict: 'evaluacion_id,alumno_id' })
    if (error) { toast.error('Error al guardar notas'); setSaving(false); return }
    toast.success(`${upserts.length} notas guardadas correctamente`)
    setSaving(false)
    setVista('lista')
    router.refresh()
  }

  const matConfig = evalSel ? (MATERIA_COLOR[evalSel.materia] ?? { bg: 'bg-slate-50', text: 'text-slate-700' }) : null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Calificaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">Evaluaciones y registro de notas por alumno</p>
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
          { label: 'Promedio general', val: promGeneral ? promGeneral.toFixed(1) : '—', sub: 'todas las materias', color: promGeneral && promGeneral >= 4 ? 'text-emerald-600' : 'text-slate-800' },
          { label: 'Evaluaciones', val: evaluaciones.length, sub: 'registradas', color: 'text-blue-600' },
          { label: 'Notas cargadas', val: evaluaciones.reduce((a, e) => a + (e.calificaciones?.length ?? 0), 0), sub: 'total alumnos', color: 'text-slate-800' },
          { label: 'Sin notas', val: evaluaciones.filter(e => (e.calificaciones?.length ?? 0) === 0).length, sub: 'evaluaciones pendientes', color: 'text-amber-600' },
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
          {/* Filtros */}
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
              <button onClick={() => { setFiltroMateria(''); setFiltroCurso('') }} className="text-xs text-blue-600 hover:underline">
                Limpiar filtros
              </button>
            )}
            <span className="text-xs text-slate-400 ml-auto">{evalsFiltradas.length} evaluación{evalsFiltradas.length !== 1 ? 'es' : ''}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Evaluación','Materia','Curso','Fecha','Promedio','Alumnos',''].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evalsFiltradas.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center">
                    <i className="ti ti-chart-bar text-4xl text-slate-200 block mb-3" aria-hidden="true"/>
                    <p className="text-slate-400 text-sm">No hay evaluaciones todavía.</p>
                  </td></tr>
                ) : evalsFiltradas.map((ev: any) => {
                  const prom = promedioEval(ev)
                  const mc = MATERIA_COLOR[ev.materia] ?? { bg: 'bg-slate-100', text: 'text-slate-600' }
                  return (
                    <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{ev.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`tag ${mc.bg} ${mc.text}`}>{ev.materia}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{ev.curso}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-3">
                        {prom ? (
                          <span className={`font-display text-lg font-bold ${notaColor(parseFloat(prom))}`}>{prom}</span>
                        ) : <span className="text-slate-400 text-xs">Sin notas</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{ev.calificaciones?.length ?? 0} alumnos</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setEvalSel(ev); setNotas({}); setVista('cargar') }}
                          className="btn-secondary text-xs py-1 px-3"
                        >
                          <i className="ti ti-pencil text-xs" aria-hidden="true"/> Cargar notas
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
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg">
          <h2 className="font-display text-lg font-bold text-slate-800 mb-4">Nueva evaluación</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre</label>
              <input value={nuevaEval.nombre} onChange={e => setNuevaEval(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Ej: Prueba unidad 1"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Materia</label>
                <select value={nuevaEval.materia} onChange={e => setNuevaEval(p => ({...p, materia: e.target.value}))} className="select-base w-full">
                  {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso</label>
                <select value={nuevaEval.curso} onChange={e => setNuevaEval(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                  {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha</label>
              <input type="date" value={nuevaEval.fecha} onChange={e => setNuevaEval(p => ({...p, fecha: e.target.value}))} className="input-base"/>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setVista('lista')} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCrearEval} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? 'Creando...' : 'Crear y cargar notas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista: Cargar notas */}
      {vista === 'cargar' && evalSel && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${matConfig?.bg} ${matConfig?.text}`}>
                {evalSel.materia}
              </div>
              <span className="font-display font-bold text-slate-800">{evalSel.nombre}</span>
              <span className="text-xs text-slate-400">{evalSel.curso} · {new Date(evalSel.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</span>
            </div>
            <button onClick={handleGuardarNotas} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
              {saving ? 'Guardando...' : `Guardar ${Object.values(notas).filter(n => n !== '').length} notas`}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 text-left">#</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 text-left">Alumno</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 text-left">Nota (1–7)</th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {alumnosCurso.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">No hay alumnos en {evalSel.curso}.</td></tr>
              ) : alumnosCurso.map((a: any, idx: number) => {
                const notaExistente = evalSel.calificaciones?.find((c: any) => c.alumno?.nombre === a.nombre)?.nota
                const notaActual = notas[a.id] ?? (notaExistente?.toString() ?? '')
                const notaNum = parseFloat(notaActual)
                return (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {a.nombre?.[0]}{a.apellido?.[0]}
                        </div>
                        <span className="font-medium text-slate-800">{a.nombre} {a.apellido}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1" max="7" step="0.1"
                        value={notaActual}
                        onChange={e => setNotas(prev => ({...prev, [a.id]: e.target.value}))}
                        placeholder="—"
                        className="input-base w-24 text-center font-mono"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {notaActual ? (
                        <span className={`tag ${notaNum >= 4 ? 'tag-ok' : 'tag-mora'}`}>
                          {notaNum >= 4 ? 'Aprobado' : 'Reprobado'}
                        </span>
                      ) : <span className="text-slate-400 text-xs">Sin nota</span>}
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
