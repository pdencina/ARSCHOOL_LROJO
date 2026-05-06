'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  evaluaciones: any[]
  alumnos: any[]
  cursos: string[]
  colegioId: string
}

const MATERIAS = ['Lenguaje','Matematicas','Ciencias Naturales','Historia','Ingles','Artes','Ed. Fisica']

export default function CalificacionesClient({ evaluaciones, alumnos, cursos, colegioId }: Props) {
  const [vista, setVista] = useState<'lista' | 'nueva' | 'cargar'>('lista')
  const [evalSel, setEvalSel] = useState<any>(null)
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [nuevaEval, setNuevaEval] = useState({ nombre: '', materia: 'Lenguaje', curso: cursos[0] ?? '', fecha: new Date().toISOString().split('T')[0] })
  const supabase = createClient()

  const alumnosCurso = useMemo(() =>
    evalSel ? alumnos.filter(a => a.curso === evalSel.curso) : [],
    [alumnos, evalSel]
  )

  function promedioEval(eval_: any) {
    const ns = (eval_.calificaciones ?? []).map((c: any) => c.nota).filter(Boolean)
    if (!ns.length) return null
    return (ns.reduce((a: number, b: number) => a + b, 0) / ns.length).toFixed(1)
  }

  async function handleCrearEval() {
    if (!nuevaEval.nombre || !nuevaEval.curso) { toast.error('Completa todos los campos'); return }
    setSaving(true)
    const { data, error } = await supabase.from('evaluaciones').insert({
      colegio_id: colegioId, ...nuevaEval, nota_minima: 4.0, nota_maxima: 7.0
    }).select().single()
    if (error) { toast.error('Error al crear'); setSaving(false); return }
    toast.success('Evaluacion creada')
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
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success('Notas guardadas correctamente')
    setSaving(false)
    setVista('lista')
    window.location.reload()
  }

  const promGeneral = evaluaciones.length
    ? evaluaciones.map(e => promedioEval(e)).filter(Boolean).reduce((a, b) => a + parseFloat(b!), 0) / evaluaciones.filter(e => promedioEval(e)).length
    : null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-tinta">Calificaciones</h1>
          <p className="text-sm text-tinta-s italic mt-0.5">Evaluaciones y registro de notas por alumno</p>
        </div>
        {vista === 'lista' && (
          <button onClick={() => setVista('nueva')} className="btn-primary flex items-center gap-2">
            <i className="ti ti-plus text-sm" aria-hidden="true" /> Nueva evaluacion
          </button>
        )}
        {vista !== 'lista' && (
          <button onClick={() => setVista('lista')} className="btn-secondary flex items-center gap-2">
            <i className="ti ti-arrow-left text-sm" aria-hidden="true" /> Volver
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Promedio general', val: promGeneral ? promGeneral.toFixed(1) : '—', sub: 'todas las materias' },
          { label: 'Evaluaciones', val: evaluaciones.length, sub: 'registradas' },
          { label: 'Notas cargadas', val: evaluaciones.reduce((a, e) => a + (e.calificaciones?.length ?? 0), 0), sub: 'total alumnos' },
          { label: 'Sin notas', val: evaluaciones.filter(e => (e.calificaciones?.length ?? 0) === 0).length, sub: 'evaluaciones pendientes' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-sm p-4">
            <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1">{k.label}</div>
            <div className="font-playfair text-2xl font-bold text-tinta">{k.val}</div>
            <div className="font-mono text-xs text-tinta-s mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Vista: Lista evaluaciones */}
      {vista === 'lista' && (
        <div className="bg-white border border-gray-100 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-papel border-b border-gray-100">
                {['Evaluacion','Materia','Curso','Fecha','Promedio','Alumnos',''].map(h => (
                  <th key={h} className="font-mono text-xs tracking-widest uppercase text-tinta-s px-4 py-2 text-left font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evaluaciones.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-tinta-s italic font-lora">No hay evaluaciones todavia.</td></tr>
              ) : evaluaciones.map((ev: any) => {
                const prom = promedioEval(ev)
                return (
                  <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-tinta">{ev.nombre}</td>
                    <td className="px-4 py-3 text-tinta-s">{ev.materia}</td>
                    <td className="px-4 py-3 font-mono text-xs bg-papel rounded-sm px-2">{ev.curso}</td>
                    <td className="px-4 py-3 font-mono text-xs text-tinta-s">{new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3">
                      {prom ? (
                        <span className={`font-playfair text-lg font-bold ${parseFloat(prom) >= 4 ? 'text-verde' : 'text-rojo'}`}>{prom}</span>
                      ) : <span className="text-tinta-s text-xs font-mono">Sin notas</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-tinta-s">{ev.calificaciones?.length ?? 0} alumnos</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setEvalSel(ev); setNotas({}); setVista('cargar') }}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Cargar notas
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista: Nueva evaluacion */}
      {vista === 'nueva' && (
        <div className="bg-white border border-gray-100 rounded-sm p-6 max-w-lg">
          <h2 className="font-playfair text-lg font-bold mb-4">Nueva evaluacion</h2>
          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">Nombre</label>
              <input value={nuevaEval.nombre} onChange={e => setNuevaEval(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Ej: Prueba unidad 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">Materia</label>
                <select value={nuevaEval.materia} onChange={e => setNuevaEval(p => ({...p, materia: e.target.value}))} className="select-base w-full">
                  {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">Curso</label>
                <select value={nuevaEval.curso} onChange={e => setNuevaEval(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                  {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">Fecha</label>
              <input type="date" value={nuevaEval.fecha} onChange={e => setNuevaEval(p => ({...p, fecha: e.target.value}))} className="input-base" />
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
        <div className="bg-white border border-gray-100 rounded-sm overflow-hidden">
          <div className="px-5 py-3 bg-papel border-b border-gray-100 flex items-center justify-between">
            <div>
              <span className="font-playfair font-bold text-tinta">{evalSel.nombre}</span>
              <span className="font-mono text-xs text-tinta-s ml-2">— {evalSel.materia} · {evalSel.curso}</span>
            </div>
            <button onClick={handleGuardarNotas} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar notas'}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-4 py-2 text-left font-normal">Alumno</th>
                <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-4 py-2 text-left font-normal">Nota (1-7)</th>
                <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-4 py-2 text-left font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {alumnosCurso.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-tinta-s italic font-lora">No hay alumnos en {evalSel.curso}.</td></tr>
              ) : alumnosCurso.map((a: any) => {
                const notaExistente = evalSel.calificaciones?.find((c: any) => c.alumno?.nombre === a.nombre)?.nota
                const notaActual = notas[a.id] ?? (notaExistente?.toString() ?? '')
                const notaNum = parseFloat(notaActual)
                return (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-azul-claro flex items-center justify-center font-mono text-xs font-semibold text-azul">
                          {a.nombre?.[0]}{a.apellido?.[0]}
                        </div>
                        <span className="font-semibold text-tinta">{a.nombre} {a.apellido}</span>
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
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${notaNum >= 4 ? 'bg-verde-claro text-verde' : 'bg-rojo-claro text-rojo'}`}>
                          {notaNum >= 4 ? 'Aprobado' : 'Reprobado'}
                        </span>
                      ) : <span className="text-tinta-s text-xs">Sin nota</span>}
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