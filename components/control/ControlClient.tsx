'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatearRut, validarRut } from '@/lib/validaciones'

interface Props {
  alumnos: any[]
  registrosHoy: any[]
}

export default function ControlClient({ alumnos, registrosHoy }: Props) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'panel' | 'ingreso' | 'retiro'>('panel')
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Form retiro
  const [retiroForm, setRetiroForm] = useState({
    persona_nombre: '', persona_rut: '', persona_parentesco: '',
    firma: '', motivo: '', observaciones: '',
  })

  // Form ingreso
  const [ingresoForm, setIngresoForm] = useState({ motivo: '', observaciones: '' })

  const alumnosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return alumnos.slice(0, 20)
    const q = busqueda.toLowerCase()
    return alumnos.filter(a => `${a.nombre} ${a.apellido} ${a.curso}`.toLowerCase().includes(q)).slice(0, 20)
  }, [alumnos, busqueda])

  const horaActual = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  const ingresosHoy = registrosHoy.filter(r => r.tipo === 'ingreso')
  const retirosHoy = registrosHoy.filter(r => r.tipo === 'retiro')
  const atrasosHoy = registrosHoy.filter(r => r.es_atraso)

  function getHoraEsperada(alumno: any, tipo: string): string {
    // AR School: ingreso 08:30, retiro 16:00 (lun-mar-jue) o 13:40 (mie-vie)
    const dia = new Date().getDay()
    if (tipo === 'ingreso') return '08:30'
    if (dia === 3 || dia === 5) return '13:40' // mie, vie
    return '16:00'
  }

  async function registrarIngreso() {
    if (!alumnoSeleccionado) return
    setLoading(true)
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: alumnoSeleccionado.id,
          tipo: 'ingreso',
          hora_esperada: getHoraEsperada(alumnoSeleccionado, 'ingreso'),
          motivo: ingresoForm.motivo || null,
          observaciones: ingresoForm.observaciones || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Ingreso registrado: ${alumnoSeleccionado.nombre} ${alumnoSeleccionado.apellido}${data.es_atraso ? ' (ATRASO)' : ''}`)
      setVista('panel')
      setAlumnoSeleccionado(null)
      setIngresoForm({ motivo: '', observaciones: '' })
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function registrarRetiro() {
    if (!alumnoSeleccionado) return
    if (!retiroForm.persona_nombre.trim()) { toast.error('Nombre de quien retira es obligatorio'); return }
    if (!retiroForm.firma.trim()) { toast.error('La firma (nombre completo) es obligatoria'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: alumnoSeleccionado.id,
          tipo: 'retiro',
          hora_esperada: getHoraEsperada(alumnoSeleccionado, 'retiro'),
          persona_retiro_nombre: retiroForm.persona_nombre,
          persona_retiro_rut: retiroForm.persona_rut || null,
          persona_retiro_parentesco: retiroForm.persona_parentesco || null,
          firma_retiro: retiroForm.firma,
          motivo: retiroForm.motivo || null,
          observaciones: retiroForm.observaciones || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.alerta) toast.error(data.alerta, { duration: 8000 })
      else toast.success(`Retiro registrado: ${alumnoSeleccionado.nombre} ${alumnoSeleccionado.apellido}`)
      setVista('panel')
      setAlumnoSeleccionado(null)
      setRetiroForm({ persona_nombre: '', persona_rut: '', persona_parentesco: '', firma: '', motivo: '', observaciones: '' })
      router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--ar-text)]" style={{ fontFamily: 'DM Sans' }}>Control de Ingreso y Retiro</h1>
          <p className="text-xs text-[var(--ar-muted)]">Hora actual: {horaActual}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="kpi-card"><div className="kpi-label">Ingresos hoy</div><div className="kpi-value text-[#2D5A3F]">{ingresosHoy.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Retiros hoy</div><div className="kpi-value">{retirosHoy.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Atrasos hoy</div><div className="kpi-value text-amber-600">{atrasosHoy.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Alumnos activos</div><div className="kpi-value">{alumnos.length}</div></div>
      </div>

      {/* Panel principal */}
      {vista === 'panel' && (
        <>
          {/* Búsqueda de alumno */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5 mb-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-2">Buscar alumno</label>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="input-base text-lg"
              placeholder="Nombre o apellido del alumno..."
              autoFocus
            />

            {busqueda.trim() && (
              <div className="mt-3 space-y-1 max-h-[250px] overflow-y-auto">
                {alumnosFiltrados.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div>
                      <div className="text-sm font-semibold text-[var(--ar-text)]">{a.nombre} {a.apellido}</div>
                      <div className="text-[10px] text-[var(--ar-muted)]">{a.curso}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setAlumnoSeleccionado(a); setVista('ingreso') }} className="px-3 py-1.5 bg-[#2D5A3F] text-white text-[10px] font-semibold rounded-lg">Ingreso</button>
                      <button onClick={() => { setAlumnoSeleccionado(a); setVista('retiro') }} className="px-3 py-1.5 bg-[#1B3A5C] text-white text-[10px] font-semibold rounded-lg">Retiro</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registros del día */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-4 py-3 border-b border-[var(--ar-border)]">
              <h3 className="text-sm font-bold text-[var(--ar-text)]">Registros de hoy</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {registrosHoy.length === 0 ? (
                <div className="p-8 text-center text-[var(--ar-muted)] text-sm">Sin registros hoy</div>
              ) : registrosHoy.map((r: any) => (
                <div key={r.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${r.es_atraso ? 'bg-amber-50/50' : ''} ${!r.es_autorizada ? 'bg-red-50/50' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.tipo === 'ingreso' ? 'bg-[#EDF5F0]' : 'bg-[#EDF6FA]'}`}>
                    <i className={`ti ${r.tipo === 'ingreso' ? 'ti-login text-[#2D5A3F]' : 'ti-logout text-[#1B3A5C]'} text-sm`} aria-hidden="true"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--ar-text)]">{r.alumno?.nombre} {r.alumno?.apellido}</div>
                    <div className="text-[10px] text-[var(--ar-muted)]">
                      {r.tipo === 'ingreso' ? 'Ingreso' : `Retiro por ${r.persona_retiro_nombre || '—'}`}
                      {r.es_atraso && <span className="text-amber-600 font-bold ml-1">· ATRASO ({r.minutos_diferencia} min)</span>}
                      {r.es_anticipado && <span className="text-blue-600 ml-1">· Anticipado</span>}
                      {!r.es_autorizada && <span className="text-red-600 font-bold ml-1">· NO AUTORIZADO</span>}
                      {r.justificado && <span className="text-[#2D5A3F] ml-1">· Justificado</span>}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--ar-muted)] font-mono">{r.hora_registro?.slice(0, 5)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Formulario de INGRESO */}
      {vista === 'ingreso' && alumnoSeleccionado && (
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#EDF5F0] rounded-full flex items-center justify-center">
                <i className="ti ti-login text-[#2D5A3F] text-lg" aria-hidden="true"/>
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--ar-text)]">Registrar ingreso</h2>
                <p className="text-xs text-[var(--ar-muted)]">{alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido} · {alumnoSeleccionado.curso}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center">
              <div className="text-2xl font-bold text-[var(--ar-text)] font-mono">{horaActual}</div>
              <div className="text-[10px] text-[var(--ar-muted)]">Hora esperada: {getHoraEsperada(alumnoSeleccionado, 'ingreso')}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Motivo del atraso (si aplica)</label>
                <select value={ingresoForm.motivo} onChange={e => setIngresoForm(p => ({...p, motivo: e.target.value}))} className="select-base w-full">
                  <option value="">Sin atraso / No justificar</option>
                  <option value="Tráfico">Tráfico</option>
                  <option value="Cita médica">Cita médica</option>
                  <option value="Problema de transporte">Problema de transporte</option>
                  <option value="Emergencia familiar">Emergencia familiar</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Observaciones</label>
                <input value={ingresoForm.observaciones} onChange={e => setIngresoForm(p => ({...p, observaciones: e.target.value}))} className="input-base" placeholder="Opcional"/>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setVista('panel'); setAlumnoSeleccionado(null) }} className="flex-1 btn-secondary py-3">Cancelar</button>
              <button onClick={registrarIngreso} disabled={loading} className="flex-1 py-3 bg-[#2D5A3F] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                {loading ? 'Registrando...' : 'Registrar ingreso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de RETIRO */}
      {vista === 'retiro' && alumnoSeleccionado && (
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#EDF6FA] rounded-full flex items-center justify-center">
                <i className="ti ti-logout text-[#1B3A5C] text-lg" aria-hidden="true"/>
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--ar-text)]">Registrar retiro</h2>
                <p className="text-xs text-[var(--ar-muted)]">{alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido} · {alumnoSeleccionado.curso}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center">
              <div className="text-2xl font-bold text-[var(--ar-text)] font-mono">{horaActual}</div>
              <div className="text-[10px] text-[var(--ar-muted)]">Hora de salida esperada: {getHoraEsperada(alumnoSeleccionado, 'retiro')}</div>
            </div>

            {/* Personas autorizadas */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-2">Personas autorizadas para retiro</label>
              <AutorizadosList alumnoId={alumnoSeleccionado.id} onSelect={(persona) => setRetiroForm(p => ({...p, persona_nombre: persona.nombre, persona_rut: persona.rut || '', persona_parentesco: persona.parentesco || '', firma: persona.nombre}))} />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Persona que retira *</label>
                <input value={retiroForm.persona_nombre} onChange={e => setRetiroForm(p => ({...p, persona_nombre: e.target.value}))} className="input-base" placeholder="Nombre completo"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">RUT</label>
                  <input value={retiroForm.persona_rut} onChange={e => setRetiroForm(p => ({...p, persona_rut: formatearRut(e.target.value)}))} className="input-base" placeholder="12.345.678-9" maxLength={12}/>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Parentesco</label>
                  <select value={retiroForm.persona_parentesco} onChange={e => setRetiroForm(p => ({...p, persona_parentesco: e.target.value}))} className="select-base w-full">
                    <option value="">Seleccionar...</option>
                    <option value="Madre">Madre</option>
                    <option value="Padre">Padre</option>
                    <option value="Abuela/o">Abuela/o</option>
                    <option value="Tía/o">Tía/o</option>
                    <option value="Hermana/o">Hermana/o</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              {retiroForm.persona_nombre && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <label className="block text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-1">Firma de retiro (nombre completo) *</label>
                  <input value={retiroForm.firma} onChange={e => setRetiroForm(p => ({...p, firma: e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400" placeholder="Escriba su nombre completo como firma"/>
                  <p className="text-[9px] text-amber-600 mt-1">Al firmar declaro ser la persona autorizada para retirar al alumno.</p>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Motivo retiro anticipado</label>
                <select value={retiroForm.motivo} onChange={e => setRetiroForm(p => ({...p, motivo: e.target.value}))} className="select-base w-full">
                  <option value="">Retiro en horario normal</option>
                  <option value="Cita médica">Cita médica</option>
                  <option value="Emergencia familiar">Emergencia familiar</option>
                  <option value="Actividad extracurricular">Actividad extracurricular</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setVista('panel'); setAlumnoSeleccionado(null) }} className="flex-1 btn-secondary py-3">Cancelar</button>
              <button onClick={registrarRetiro} disabled={loading} className="flex-1 py-3 bg-[#1B3A5C] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                {loading ? 'Registrando...' : 'Confirmar retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// Sub-componente: Lista de personas autorizadas
function AutorizadosList({ alumnoId, onSelect }: { alumnoId: string; onSelect: (persona: { nombre: string; rut?: string; parentesco?: string }) => void }) {
  const [autorizados, setAutorizados] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useState(() => {
    async function cargar() {
      try {
        const res = await fetch(`/api/control/autorizados?alumno_id=${alumnoId}`)
        if (res.ok) {
          const data = await res.json()
          setAutorizados(data)
        }
      } catch {}
      setCargando(false)
    }
    cargar()
  })

  if (cargando) return <div className="text-[10px] text-[var(--ar-muted)] py-2">Cargando autorizados...</div>

  if (autorizados.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-[10px] text-red-700">
        <i className="ti ti-alert-triangle text-xs mr-1" aria-hidden="true"/>
        No hay personas autorizadas registradas para este alumno. Ingrese manualmente.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {autorizados.map((p: any, i: number) => (
        <button
          key={i}
          onClick={() => onSelect(p)}
          className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:bg-[#EDF5F0] hover:border-[#2D5A3F]/30 transition-colors text-left"
        >
          <div className="w-7 h-7 bg-[#EDF5F0] rounded-full flex items-center justify-center flex-shrink-0">
            <i className="ti ti-user-check text-[#2D5A3F] text-xs" aria-hidden="true"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[var(--ar-text)] truncate">{p.nombre}</div>
            <div className="text-[9px] text-[var(--ar-muted)]">{p.parentesco || 'Apoderado'}{p.rut ? ` · ${p.rut}` : ''}</div>
          </div>
          <span className="text-[9px] text-[#2D5A3F] font-medium">Seleccionar</span>
        </button>
      ))}
      <p className="text-[9px] text-[var(--ar-muted)] mt-1">Seleccione quién retira, o ingrese manualmente si no aparece en la lista.</p>
    </div>
  )
}
