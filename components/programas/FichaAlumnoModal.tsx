'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Props {
  alumno: any
  programaId: string
  onClose: () => void
}

const TIPOS_NOTA = [
  { value: 'general', label: 'General', icon: 'ti-note', color: 'text-gray-600' },
  { value: 'conducta', label: 'Conducta', icon: 'ti-mood-neutral', color: 'text-amber-600' },
  { value: 'rendimiento', label: 'Rendimiento', icon: 'ti-chart-line', color: 'text-blue-600' },
  { value: 'salud', label: 'Salud', icon: 'ti-heart', color: 'text-red-600' },
  { value: 'apoderado', label: 'Contacto apoderado', icon: 'ti-phone', color: 'text-purple-600' },
  { value: 'logro', label: 'Logro', icon: 'ti-trophy', color: 'text-[#2D5A3F]' },
]

export default function FichaAlumnoModal({ alumno, programaId, onClose }: Props) {
  const [tab, setTab] = useState<'ficha' | 'notas' | 'asistencia'>('ficha')
  const [notas, setNotas] = useState<any[]>([])
  const [asistencias, setAsistencias] = useState<any[]>([])
  const [nuevaNota, setNuevaNota] = useState({ tipo: 'general', contenido: '' })
  const [saving, setSaving] = useState(false)
  const [editando, setEditando] = useState(false)
  const [fichaForm, setFichaForm] = useState({
    dificultades_aprendizaje: alumno.dificultades_aprendizaje || '',
    condiciones_especiales: alumno.condiciones_especiales || '',
    notas_coordinador: alumno.notas_coordinador || '',
  })

  useEffect(() => {
    // Cargar notas
    fetch(`/api/alumnos/notas?alumno_id=${alumno.id}`)
      .then(r => r.json()).then(setNotas).catch(() => {})
    // Cargar asistencia
    fetch(`/api/asistencias-sesion?programa_id=${programaId}&alumno_id=${alumno.id}`)
      .then(r => r.ok ? r.json() : []).then(setAsistencias).catch(() => {})
  }, [alumno.id, programaId])

  async function guardarNota() {
    if (!nuevaNota.contenido.trim()) { toast.error('Escribe una nota'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/alumnos/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: alumno.id, programa_id: programaId, ...nuevaNota }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNotas([data, ...notas])
      setNuevaNota({ tipo: 'general', contenido: '' })
      toast.success('Nota guardada')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function guardarFicha() {
    setSaving(true)
    try {
      const res = await fetch(`/api/alumnos/${alumno.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fichaForm),
      })
      if (!res.ok) throw new Error('Error al guardar')
      toast.success('Ficha actualizada')
      setEditando(false)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const edad = alumno.fecha_nacimiento ? (() => {
    const hoy = new Date()
    const nac = new Date(alumno.fecha_nacimiento + 'T12:00')
    let a = hoy.getFullYear() - nac.getFullYear()
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) a--
    return a
  })() : null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[550px] bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 z-10">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {alumno.foto_url ? (
              <img src={alumno.foto_url} alt="" className="w-full h-full object-cover"/>
            ) : (
              <span className="text-lg font-bold text-gray-400">{alumno.nombre?.[0]}{alumno.apellido?.[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-[var(--ar-text)]">{alumno.nombre} {alumno.apellido}</h2>
            <p className="text-[10px] text-[var(--ar-muted)]">{alumno.curso}{edad ? ` · ${edad} años` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {[
            { key: 'ficha', label: 'Ficha', icon: 'ti-id' },
            { key: 'notas', label: 'Notas', icon: 'ti-notes' },
            { key: 'asistencia', label: 'Asistencia', icon: 'ti-clipboard-check' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === t.key ? 'border-[#1B3A5C] text-[#1B3A5C]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <i className={`ti ${t.icon} text-sm`} aria-hidden="true"/>{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* TAB: Ficha */}
          {tab === 'ficha' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">RUT:</span> <span className="font-medium">{alumno.rut || '—'}</span></div>
                <div><span className="text-gray-500">Sexo:</span> <span className="font-medium">{alumno.sexo || '—'}</span></div>
                <div><span className="text-gray-500">Fecha nac.:</span> <span className="font-medium">{alumno.fecha_nacimiento || '—'}</span></div>
                <div><span className="text-gray-500">Jornada:</span> <span className="font-medium">{alumno.jornada || '—'}</span></div>
              </div>

              <hr className="border-gray-100"/>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider">Dificultades de aprendizaje</label>
                  {!editando && <button onClick={() => setEditando(true)} className="text-[10px] text-blue-600 hover:underline">Editar</button>}
                </div>
                {editando ? (
                  <textarea value={fichaForm.dificultades_aprendizaje} onChange={e => setFichaForm(p => ({...p, dificultades_aprendizaje: e.target.value}))} rows={2} className="input-base resize-none text-xs" placeholder="Ej: Dificultad en lectoescritura, requiere apoyo visual"/>
                ) : (
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{fichaForm.dificultades_aprendizaje || 'Sin registro'}</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1 block">Condiciones especiales</label>
                {editando ? (
                  <textarea value={fichaForm.condiciones_especiales} onChange={e => setFichaForm(p => ({...p, condiciones_especiales: e.target.value}))} rows={2} className="input-base resize-none text-xs" placeholder="Ej: TEA, TDAH, requiere acompañamiento"/>
                ) : (
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{fichaForm.condiciones_especiales || 'Sin registro'}</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1 block">Notas del coordinador</label>
                {editando ? (
                  <textarea value={fichaForm.notas_coordinador} onChange={e => setFichaForm(p => ({...p, notas_coordinador: e.target.value}))} rows={3} className="input-base resize-none text-xs" placeholder="Observaciones generales sobre el alumno..."/>
                ) : (
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{fichaForm.notas_coordinador || 'Sin notas'}</p>
                )}
              </div>

              {editando && (
                <div className="flex gap-2">
                  <button onClick={() => setEditando(false)} className="flex-1 btn-secondary py-2 text-xs">Cancelar</button>
                  <button onClick={guardarFicha} disabled={saving} className="flex-1 py-2 bg-[#1B3A5C] text-white text-xs font-semibold rounded-lg disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Notas */}
          {tab === 'notas' && (
            <div className="space-y-4">
              {/* Nueva nota */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <select value={nuevaNota.tipo} onChange={e => setNuevaNota(p => ({...p, tipo: e.target.value}))} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] outline-none">
                    {TIPOS_NOTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input value={nuevaNota.contenido} onChange={e => setNuevaNota(p => ({...p, contenido: e.target.value}))} onKeyDown={e => e.key === 'Enter' && guardarNota()} className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A5C]" placeholder="Escribir nota..."/>
                  <button onClick={guardarNota} disabled={saving} className="px-3 py-1.5 bg-[#1B3A5C] text-white text-[10px] font-semibold rounded-lg disabled:opacity-50">+</button>
                </div>
              </div>

              {/* Timeline de notas */}
              <div className="space-y-2">
                {notas.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-6">Sin notas registradas</p>
                ) : notas.map((n: any) => {
                  const tipoConfig = TIPOS_NOTA.find(t => t.value === n.tipo) || TIPOS_NOTA[0]
                  return (
                    <div key={n.id} className="flex gap-2 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <i className={`ti ${tipoConfig.icon} text-sm ${tipoConfig.color} mt-0.5`} aria-hidden="true"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">{n.contenido}</p>
                        <div className="text-[9px] text-gray-400 mt-1">
                          {n.registrado?.nombre} · {new Date(n.created_at).toLocaleDateString('es-CL')} {new Date(n.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB: Asistencia */}
          {tab === 'asistencia' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--ar-text)]">Historial de asistencia</h3>
                <span className="text-[10px] text-[var(--ar-muted)]">{asistencias.length} sesiones</span>
              </div>
              {asistencias.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">Sin registros de asistencia</p>
              ) : (
                <div className="space-y-1.5">
                  {asistencias.slice(0, 20).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <div className={`w-2 h-2 rounded-full ${a.estado === 'presente' ? 'bg-[#2D5A3F]' : a.estado === 'ausente' ? 'bg-red-500' : 'bg-amber-500'}`}/>
                      <span className="text-xs text-gray-600 flex-1">{new Date(a.fecha + 'T12:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className={`text-[10px] font-semibold ${a.estado === 'presente' ? 'text-[#2D5A3F]' : a.estado === 'ausente' ? 'text-red-600' : 'text-amber-600'}`}>{a.estado}</span>
                    </div>
                  ))}
                </div>
              )}
              {asistencias.length > 0 && (
                <div className="bg-[#EDF5F0] rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#2D5A3F]">{Math.round(asistencias.filter((a: any) => a.estado === 'presente').length / asistencias.length * 100)}%</div>
                  <div className="text-[10px] text-[#2D5A3F]">Asistencia general</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
