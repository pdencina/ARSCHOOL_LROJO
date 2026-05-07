'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props { evaluaciones: any[]; comunicados: any[]; colegioId: string }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const TIPO_COLOR: Record<string, string> = {
  evaluacion: 'bg-violet-100 text-violet-700 border-violet-200',
  comunicado: 'bg-blue-100 text-blue-700 border-blue-200',
  evento:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  urgente:    'bg-red-100 text-red-700 border-red-200',
}

export default function CalendarioClient({ evaluaciones, comunicados, colegioId }: Props) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', fecha: '', tipo: 'evento', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Construir eventos del mes
  const eventos = useMemo(() => {
    const evs: Record<string, any[]> = {}
    evaluaciones.forEach(e => {
      if (!e.fecha) return
      const d = e.fecha.split('T')[0]
      if (!evs[d]) evs[d] = []
      evs[d].push({ ...e, _tipo: 'evaluacion', _label: `${e.materia} — ${e.nombre}` })
    })
    comunicados.forEach(c => {
      const d = (c.enviado_at ?? '').split('T')[0]
      if (!d) return
      if (!evs[d]) evs[d] = []
      evs[d].push({ ...c, _tipo: c.tipo ?? 'comunicado', _label: c.titulo })
    })
    return evs
  }, [evaluaciones, comunicados])

  // Días del mes
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const celdas = Array.from({ length: primerDia + diasEnMes }, (_, i) =>
    i < primerDia ? null : i - primerDia + 1
  )

  function navMes(dir: number) {
    const nuevo = new Date(anio, mes + dir, 1)
    setMes(nuevo.getMonth())
    setAnio(nuevo.getFullYear())
    setDiaSeleccionado(null)
  }

  function fmtKey(dia: number) {
    return `${anio}-${String(mes + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
  }

  async function handleGuardarEvento() {
    if (!form.titulo || !form.fecha) { toast.error('Título y fecha requeridos'); return }
    setSaving(true)
    const { error } = await supabase.from('comunicados').insert({
      colegio_id: colegioId,
      titulo: form.titulo,
      contenido: form.descripcion || form.titulo,
      tipo: form.tipo,
      enviado_at: new Date(form.fecha + 'T12:00:00').toISOString(),
    })
    if (error) { toast.error('Error al guardar evento'); setSaving(false); return }
    toast.success('Evento agregado al calendario')
    setSaving(false); setShowModal(false)
    window.location.reload()
  }

  const eventosDelDia = diaSeleccionado ? (eventos[diaSeleccionado] ?? []) : []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Calendario</h1>
          <p className="text-sm text-slate-500 mt-0.5">Eventos, evaluaciones y comunicados del colegio</p>
        </div>
        <button onClick={() => { setForm({ titulo: '', fecha: diaSeleccionado ?? '', tipo: 'evento', descripcion: '' }); setShowModal(true) }} className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nuevo evento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendario */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Header mes */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <button onClick={() => navMes(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <i className="ti ti-chevron-left text-slate-600" aria-hidden="true"/>
            </button>
            <h2 className="font-display font-semibold text-slate-800">{MESES[mes]} {anio}</h2>
            <button onClick={() => navMes(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <i className="ti ti-chevron-right text-slate-600" aria-hidden="true"/>
            </button>
          </div>

          {/* Días semana */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7">
            {celdas.map((dia, idx) => {
              if (!dia) return <div key={`empty-${idx}`} className="h-20 border-b border-r border-slate-100"/>
              const key = fmtKey(dia)
              const evsDia = eventos[key] ?? []
              const esHoy = key === hoy.toISOString().split('T')[0]
              const seleccionado = key === diaSeleccionado
              return (
                <div key={key} onClick={() => setDiaSeleccionado(seleccionado ? null : key)}
                  className={`h-20 border-b border-r border-slate-100 p-1.5 cursor-pointer transition-colors ${seleccionado ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${esHoy ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                    {dia}
                  </div>
                  <div className="space-y-0.5">
                    {evsDia.slice(0, 2).map((ev: any, i: number) => (
                      <div key={i} className={`text-xs px-1 py-0.5 rounded truncate border ${TIPO_COLOR[ev._tipo] ?? TIPO_COLOR.evento}`}>
                        {ev._label}
                      </div>
                    ))}
                    {evsDia.length > 2 && <div className="text-xs text-slate-400">+{evsDia.length - 2} más</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div>
          {/* Leyenda */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tipos de evento</div>
            {[
              { tipo: 'evaluacion', label: 'Evaluación' },
              { tipo: 'comunicado', label: 'Comunicado' },
              { tipo: 'evento',     label: 'Evento' },
              { tipo: 'urgente',    label: 'Urgente' },
            ].map(t => (
              <div key={t.tipo} className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-sm border ${TIPO_COLOR[t.tipo]}`}/>
                <span className="text-xs text-slate-600">{t.label}</span>
              </div>
            ))}
          </div>

          {/* Eventos del día seleccionado */}
          {diaSeleccionado && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {new Date(diaSeleccionado + 'T12:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {eventosDelDia.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin eventos este día</p>
              ) : eventosDelDia.map((ev: any, i: number) => (
                <div key={i} className={`p-2.5 rounded-lg border mb-2 ${TIPO_COLOR[ev._tipo] ?? TIPO_COLOR.evento}`}>
                  <div className="text-xs font-semibold">{ev._label}</div>
                  {ev.curso && <div className="text-xs opacity-75 mt-0.5">{ev.curso}</div>}
                </div>
              ))}
              <button onClick={() => { setForm({ titulo: '', fecha: diaSeleccionado, tipo: 'evento', descripcion: '' }); setShowModal(true) }}
                className="btn-secondary w-full text-xs mt-2 justify-center">
                <i className="ti ti-plus text-xs" aria-hidden="true"/> Agregar evento
              </button>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Próximas evaluaciones</div>
            {evaluaciones.filter(e => e.fecha >= hoy.toISOString().split('T')[0]).slice(0, 5).map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-pencil text-violet-600 text-xs" aria-hidden="true"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate">{ev.nombre}</div>
                  <div className="text-xs text-slate-400">{ev.materia} · {ev.curso}</div>
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">
                  {new Date(ev.fecha + 'T12:00').toLocaleDateString('es-CL', { day:'2-digit', month:'short' })}
                </div>
              </div>
            ))}
            {evaluaciones.filter(e => e.fecha >= hoy.toISOString().split('T')[0]).length === 0 && (
              <p className="text-xs text-slate-400 italic">Sin evaluaciones próximas</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal nuevo evento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nuevo evento</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({...p, titulo: e.target.value}))} className="input-base" placeholder="Nombre del evento"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({...p, fecha: e.target.value}))} className="input-base"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({...p, tipo: e.target.value}))} className="select-base w-full">
                    <option value="evento">Evento</option>
                    <option value="urgente">Urgente</option>
                    <option value="cobro">Cobro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} className="input-base resize-none" rows={3} placeholder="Detalles opcionales..."/>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardarEvento} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : 'Agregar evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}