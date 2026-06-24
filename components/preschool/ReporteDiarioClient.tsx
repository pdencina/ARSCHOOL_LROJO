'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  alumnos: any[]
  reportesHoy: any[]
  cursos: string[]
  colegioId: string
  fecha: string
}

const ALIMENTACION_OPTS = [
  { value: 'todo', label: 'Todo', color: 'tag-ok' },
  { value: 'casi_todo', label: 'Casi todo', color: 'tag-blue' },
  { value: 'poco', label: 'Poco', color: 'tag-pend' },
  { value: 'nada', label: 'Nada', color: 'tag-mora' },
  { value: 'no_aplica', label: 'N/A', color: 'tag-gray' },
]

const ESTADO_ANIMO_OPTS = [
  { value: 'feliz', label: 'Feliz', icon: '😊' },
  { value: 'tranquilo', label: 'Tranquilo', icon: '😌' },
  { value: 'irritable', label: 'Irritable', icon: '😤' },
  { value: 'lloron', label: 'Llorón', icon: '😢' },
  { value: 'variable', label: 'Variable', icon: '🔄' },
]

const ACTIVIDADES_OPTS = [
  'Música', 'Arte', 'Motricidad', 'Lectura', 'Juego libre',
  'Números', 'Letras', 'Ciencias', 'Cocina', 'Yoga', 'Baile',
]

export default function ReporteDiarioClient({ alumnos, reportesHoy, cursos, colegioId, fecha }: Props) {
  const router = useRouter()
  const [cursoSel, setCursoSel] = useState(cursos[0] ?? '')
  const [alumnoSel, setAlumnoSel] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    desayuno: 'no_aplica', almuerzo: 'no_aplica', snack: 'no_aplica',
    siesta: false, siesta_minutos: 0,
    cambios_panal: 0, deposiciones: 0, idas_bano: 0,
    estado_animo: 'feliz',
    llego_con_golpe: false, fiebre: false, medicamento: false, medicamento_detalle: '',
    actividades: [] as string[],
    observaciones: '',
  })

  const alumnosCurso = useMemo(() =>
    alumnos.filter(a => a.curso === cursoSel),
    [alumnos, cursoSel]
  )

  const reportesPorAlumno = useMemo(() => {
    const map: Record<string, any> = {}
    reportesHoy.forEach(r => { map[r.alumno_id] = r })
    return map
  }, [reportesHoy])

  function seleccionarAlumno(alumno: any) {
    setAlumnoSel(alumno)
    const existente = reportesPorAlumno[alumno.id]
    if (existente) {
      setForm({
        desayuno: existente.desayuno ?? 'no_aplica',
        almuerzo: existente.almuerzo ?? 'no_aplica',
        snack: existente.snack ?? 'no_aplica',
        siesta: existente.siesta ?? false,
        siesta_minutos: existente.siesta_minutos ?? 0,
        cambios_panal: existente.cambios_panal ?? 0,
        deposiciones: existente.deposiciones ?? 0,
        idas_bano: existente.idas_bano ?? 0,
        estado_animo: existente.estado_animo ?? 'feliz',
        llego_con_golpe: existente.llego_con_golpe ?? false,
        fiebre: existente.fiebre ?? false,
        medicamento: existente.medicamento ?? false,
        medicamento_detalle: existente.medicamento_detalle ?? '',
        actividades: existente.actividades ?? [],
        observaciones: existente.observaciones ?? '',
      })
    } else {
      setForm({
        desayuno: 'no_aplica', almuerzo: 'no_aplica', snack: 'no_aplica',
        siesta: false, siesta_minutos: 0,
        cambios_panal: 0, deposiciones: 0, idas_bano: 0,
        estado_animo: 'feliz',
        llego_con_golpe: false, fiebre: false, medicamento: false, medicamento_detalle: '',
        actividades: [],
        observaciones: '',
      })
    }
  }

  async function handleGuardar(publicar = false) {
    if (!alumnoSel) return
    setSaving(true)
    const res = await fetch('/api/reportes-diarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumno_id: alumnoSel.id,
        fecha,
        ...form,
        publicado: publicar,
        publicado_at: publicar ? new Date().toISOString() : null,
      }),
    })
    if (res.ok) {
      toast.success(publicar ? 'Reporte publicado — visible para la familia' : 'Reporte guardado')
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Error al guardar')
    }
    setSaving(false)
  }

  function toggleActividad(act: string) {
    setForm(p => ({
      ...p,
      actividades: p.actividades.includes(act)
        ? p.actividades.filter(a => a !== act)
        : [...p.actividades, act]
    }))
  }

  const completados = alumnosCurso.filter(a => reportesPorAlumno[a.id]?.publicado).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Reporte Diario PreSchool</h1>
          <p className="page-subtitle">{new Date(fecha + 'T12:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={cursoSel} onChange={e => { setCursoSel(e.target.value); setAlumnoSel(null) }} className="select-base">
            {cursos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="text-[11px] text-[#9ca3af]">{completados}/{alumnosCurso.length} publicados</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Lista de alumnos */}
        <div className="col-span-4">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#f9fafb] border-b border-[var(--ar-border)]">
              <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">{cursoSel} · {alumnosCurso.length} alumnos</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {alumnosCurso.map(a => {
                const reporte = reportesPorAlumno[a.id]
                const isSelected = alumnoSel?.id === a.id
                return (
                  <button key={a.id} onClick={() => seleccionarAlumno(a)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] text-left transition-all ${
                      isSelected ? 'bg-[#f0f4f8]' : 'hover:bg-[#f9fafb]'
                    }`}>
                    <div className="w-8 h-8 rounded-full bg-[#f0f4f8] flex items-center justify-center text-[11px] font-bold text-[#2c4a6e] flex-shrink-0">
                      {a.nombre?.[0]}{a.apellido?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#1a2332] truncate">{a.nombre} {a.apellido}</div>
                    </div>
                    {reporte?.publicado && <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"/>}
                    {reporte && !reporte.publicado && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="col-span-8">
          {!alumnoSel ? (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl p-12 text-center">
              <i className="ti ti-clipboard-heart text-3xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
              <p className="text-[#9ca3af] text-sm">Selecciona un alumno para completar su reporte diario</p>
            </div>
          ) : (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-[#f9fafb] border-b border-[var(--ar-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#f0f4f8] flex items-center justify-center text-[12px] font-bold text-[#2c4a6e]">
                    {alumnoSel.nombre?.[0]}{alumnoSel.apellido?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1a2332] text-[13px]">{alumnoSel.nombre} {alumnoSel.apellido}</div>
                    <div className="text-[11px] text-[#9ca3af]">{alumnoSel.curso}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleGuardar(false)} disabled={saving} className="btn-secondary text-xs disabled:opacity-60">
                    Guardar borrador
                  </button>
                  <button onClick={() => handleGuardar(true)} disabled={saving} className="btn-primary text-xs disabled:opacity-60">
                    Publicar reporte
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Alimentación */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="ti ti-soup text-[#9ca3af]" aria-hidden="true"/> Alimentación
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['desayuno', 'almuerzo', 'snack'].map(comida => (
                      <div key={comida}>
                        <label className="block text-[11px] text-[#6b7280] mb-1 capitalize">{comida}</label>
                        <select value={(form as any)[comida]} onChange={e => setForm(p => ({...p, [comida]: e.target.value}))} className="select-base w-full text-xs">
                          {ALIMENTACION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Siesta */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="ti ti-moon text-[#9ca3af]" aria-hidden="true"/> Siesta
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.siesta} onChange={e => setForm(p => ({...p, siesta: e.target.checked}))} className="rounded"/>
                      <span className="text-[13px] text-[#4b5563]">Durmió siesta</span>
                    </label>
                    {form.siesta && (
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="180" value={form.siesta_minutos} onChange={e => setForm(p => ({...p, siesta_minutos: parseInt(e.target.value) || 0}))} className="input-base w-20 text-center text-xs"/>
                        <span className="text-[11px] text-[#9ca3af]">minutos</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Higiene */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="ti ti-droplet text-[#9ca3af]" aria-hidden="true"/> Higiene
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'cambios_panal', label: 'Cambios pañal' },
                      { key: 'deposiciones', label: 'Deposiciones' },
                      { key: 'idas_bano', label: 'Idas al baño' },
                    ].map(h => (
                      <div key={h.key}>
                        <label className="block text-[11px] text-[#6b7280] mb-1">{h.label}</label>
                        <input type="number" min="0" max="10" value={(form as any)[h.key]} onChange={e => setForm(p => ({...p, [h.key]: parseInt(e.target.value) || 0}))} className="input-base w-full text-center text-xs"/>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estado emocional */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="ti ti-mood-smile text-[#9ca3af]" aria-hidden="true"/> Estado emocional
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {ESTADO_ANIMO_OPTS.map(o => (
                      <button key={o.value} onClick={() => setForm(p => ({...p, estado_animo: o.value}))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          form.estado_animo === o.value ? 'bg-[#1a2332] text-white border-[#1a2332]' : 'border-[#e8eaed] text-[#4b5563] hover:border-[#d1d5db]'
                        }`}>
                        <span>{o.icon}</span> {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Salud */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="ti ti-heart-rate-monitor text-[#9ca3af]" aria-hidden="true"/> Salud
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'llego_con_golpe', label: 'Llegó con golpe' },
                      { key: 'fiebre', label: 'Fiebre' },
                      { key: 'medicamento', label: 'Se dio medicamento' },
                    ].map(s => (
                      <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={(form as any)[s.key]} onChange={e => setForm(p => ({...p, [s.key]: e.target.checked}))} className="rounded"/>
                        <span className="text-[13px] text-[#4b5563]">{s.label}</span>
                      </label>
                    ))}
                  </div>
                  {form.medicamento && (
                    <input value={form.medicamento_detalle} onChange={e => setForm(p => ({...p, medicamento_detalle: e.target.value}))} className="input-base mt-2 text-xs" placeholder="¿Qué medicamento? ¿Horario?"/>
                  )}
                </div>

                {/* Actividades */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="ti ti-palette text-[#9ca3af]" aria-hidden="true"/> Actividades del día
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVIDADES_OPTS.map(act => (
                      <button key={act} onClick={() => toggleActividad(act)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          form.actividades.includes(act) ? 'bg-[#fdf8ee] text-[#92400e] border-[#fde68a]' : 'border-[#e8eaed] text-[#6b7280] hover:border-[#d1d5db]'
                        }`}>
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <i className="ti ti-notes text-[#9ca3af]" aria-hidden="true"/> Observaciones
                  </div>
                  <textarea value={form.observaciones} onChange={e => setForm(p => ({...p, observaciones: e.target.value}))}
                    className="input-base text-xs min-h-[80px] resize-none" placeholder="Comentarios adicionales sobre el día del alumno..."/>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
