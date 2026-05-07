'use client'

import { useState, useMemo } from 'react'
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

const ESTADO_STYLE: Record<string, string> = {
  presente:   'bg-verde-claro text-verde',
  ausente:    'bg-rojo-claro text-rojo',
  tardanza:   'bg-amarillo-claro text-yellow-800',
  justificado:'bg-azul-claro text-azul',
}
const ESTADO_LABEL: Record<string, string> = {
  presente: 'Presente', ausente: 'Ausente', tardanza: 'Tardanza', justificado: 'Justificado'
}

export default function AsistenciasClient({ alumnos, asistenciasHoy, cursos, colegioId, fecha }: Props) {
  const [cursoSel, setCursoSel] = useState(cursos[0] ?? '')
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia>>(() => {
    const init: Record<string, EstadoAsistencia> = {}
    asistenciasHoy.forEach(a => { init[a.alumno_id] = a.estado })
    return init
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const alumnosCurso = useMemo(() =>
    alumnos.filter(a => a.curso === cursoSel),
    [alumnos, cursoSel]
  )

  const presentes = Object.values(estados).filter(e => e === 'presente').length
  const ausentes = Object.values(estados).filter(e => e === 'ausente').length
  const tardanzas = Object.values(estados).filter(e => e === 'tardanza').length
  const pct = alumnos.length ? Math.round((presentes / alumnos.length) * 100) : 0

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
        estado: estados[a.id] ?? 'presente',
        registrado_por: user?.id,
      }))

    const { error } = await supabase.from('asistencias').upsert(upserts, { onConflict: 'alumno_id,fecha' })
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success('Asistencia guardada correctamente')
    setSaving(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-tinta">Asistencias</h1>
          <p className="text-sm text-tinta-s italic mt-0.5">
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={cursoSel} onChange={e => setCursoSel(e.target.value)} className="select-base">
            {cursos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={setTodosPresentes} className="btn-secondary">Todos presentes</button>
          <button onClick={handleGuardar} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar asistencia'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Asistencia total', val: `${pct}%`, sub: `${presentes} de ${alumnos.length} alumnos`, color: pct >= 90 ? 'text-verde' : pct >= 75 ? 'text-yellow-700' : 'text-rojo' },
          { label: 'Presentes', val: presentes, sub: 'hoy', color: 'text-verde' },
          { label: 'Ausentes', val: ausentes, sub: 'sin justificar', color: 'text-rojo' },
          { label: 'Tardanzas', val: tardanzas, sub: 'registradas', color: 'text-yellow-700' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-sm p-4">
            <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1">{k.label}</div>
            <div className={`font-playfair text-2xl font-bold ${k.color}`}>{k.val}</div>
            <div className="font-mono text-xs text-tinta-s mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-papel">
          <span className="font-playfair text-base font-bold">{cursoSel}</span>
          <span className="font-mono text-xs text-tinta-s ml-2">— {alumnosCurso.length} alumnos</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-4 py-2 text-left font-normal">Alumno</th>
              <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-4 py-2 text-left font-normal">Estado</th>
              <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-4 py-2 text-left font-normal">Observacion</th>
            </tr>
          </thead>
          <tbody>
            {alumnosCurso.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-tinta-s italic font-lora">No hay alumnos en este curso.</td></tr>
            ) : alumnosCurso.map((alumno: any) => {
              const estadoActual = estados[alumno.id] ?? 'presente'
              return (
                <tr key={alumno.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-azul-claro flex items-center justify-center font-mono text-xs font-semibold text-azul flex-shrink-0">
                        {alumno.nombre?.[0]}{alumno.apellido?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-tinta">{alumno.nombre} {alumno.apellido}</div>
                        <div className="font-mono text-xs text-tinta-s">{alumno.rut ?? 'Sin RUT'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(['presente', 'tardanza', 'ausente', 'justificado'] as EstadoAsistencia[]).map(e => (
                        <button
                          key={e}
                          onClick={() => setEstado(alumno.id, e)}
                          className={`text-xs font-mono px-2 py-1 rounded-sm border transition-all ${
                            estadoActual === e
                              ? `${ESTADO_STYLE[e]} border-transparent font-semibold`
                              : 'bg-white border-gray-200 text-tinta-s hover:border-gray-400'
                          }`}
                        >
                          {ESTADO_LABEL[e]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Observacion opcional..."
                      className="input-base text-xs py-1"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}