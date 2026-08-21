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

  // Multi-retiro: lista de alumnos a retirar
  const [alumnosRetiro, setAlumnosRetiro] = useState<any[]>([])
  const [busquedaRetiro, setBusquedaRetiro] = useState('')

  // Form retiro
  const [retiroForm, setRetiroForm] = useState({
    persona_nombre: '', persona_rut: '', persona_parentesco: '',
    firma: '', motivo: '', observaciones: '', email_override: '',
  })

  // Form ingreso
  const [ingresoForm, setIngresoForm] = useState({ motivo: '', observaciones: '' })

  const alumnosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return alumnos.slice(0, 20)
    const q = busqueda.toLowerCase()
    return alumnos.filter(a => `${a.nombre} ${a.apellido} ${a.curso}`.toLowerCase().includes(q)).slice(0, 20)
  }, [alumnos, busqueda])

  // Búsqueda para agregar más alumnos al retiro
  const alumnosFiltradosRetiro = useMemo(() => {
    if (!busquedaRetiro.trim()) return []
    const q = busquedaRetiro.toLowerCase()
    const idsYaAgregados = alumnosRetiro.map(a => a.id)
    return alumnos
      .filter(a => !idsYaAgregados.includes(a.id) && `${a.nombre} ${a.apellido} ${a.curso}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [alumnos, busquedaRetiro, alumnosRetiro])

  const horaActual = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  const ingresosHoy = registrosHoy.filter(r => r.tipo === 'ingreso')
  const retirosHoy = registrosHoy.filter(r => r.tipo === 'retiro')
  const atrasosHoy = registrosHoy.filter(r => r.es_atraso)

  function getHoraEsperada(alumno: any, tipo: string): string {
    const dia = new Date().getDay()
    if (tipo === 'ingreso') return '08:30'
    if (dia === 3 || dia === 5) return '13:40'
    return '16:00'
  }

  function iniciarRetiro(alumno: any) {
    setAlumnosRetiro([alumno])
    setVista('retiro')
    setBusquedaRetiro('')
    setRetiroStep('datos')
    setCodigoEnviado(false)
    setCodigoInput('')
    setRetiroForm({ persona_nombre: '', persona_rut: '', persona_parentesco: '', firma: '', motivo: '', observaciones: '', email_override: '' })
    // Auto-buscar hermanos y agregarlos
    cargarHermanosYAgregar(alumno)
  }

  async function cargarHermanosYAgregar(alumno: any) {
    try {
      const res = await fetch(`/api/control/hermanos?alumno_id=${alumno.id}`)
      if (res.ok) {
        const hermanos = await res.json()
        if (hermanos.length > 0) {
          setAlumnosRetiro(prev => [...prev, ...hermanos])
          toast(`${hermanos.length} hermano${hermanos.length > 1 ? 's' : ''} agregado${hermanos.length > 1 ? 's' : ''} automáticamente`, { icon: '👨‍👩‍👧‍👦' })
        }
      }
    } catch {}
  }

  function agregarAlumnoRetiro(alumno: any) {
    if (!alumnosRetiro.find(a => a.id === alumno.id)) {
      setAlumnosRetiro(prev => [...prev, alumno])
      setBusquedaRetiro('')
    }
  }

  function quitarAlumnoRetiro(alumnoId: string) {
    setAlumnosRetiro(prev => prev.filter(a => a.id !== alumnoId))
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

  // Retiro step state
  const [retiroStep, setRetiroStep] = useState<'datos' | 'codigo' | 'firma'>('datos')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')
  const [emailParcial, setEmailParcial] = useState('')

  async function enviarCodigoRetiro() {
    if (!retiroForm.persona_nombre.trim()) { toast.error('Nombre de quien retira es obligatorio'); return }
    if (alumnosRetiro.length === 0) { toast.error('Agregue al menos un alumno'); return }
    setLoading(true)
    try {
      const alumnoIds = alumnosRetiro.map(a => a.id)
      const res = await fetch('/api/control/verificar-retiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'enviar_codigo',
          alumno_ids: alumnoIds,
          persona_nombre: retiroForm.persona_nombre,
          persona_rut: retiroForm.persona_rut || null,
          persona_parentesco: retiroForm.persona_parentesco || null,
          email_override: retiroForm.email_override || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.mensaje)
      setEmailParcial(data.email_parcial)
      setCodigoEnviado(true)
      setRetiroStep('codigo')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function verificarCodigoRetiro() {
    if (!codigoInput.trim() || codigoInput.length < 6) { toast.error('Ingrese el código de 6 dígitos'); return }
    if (!retiroForm.firma.trim()) { toast.error('La firma (nombre completo) es obligatoria'); return }
    setLoading(true)
    try {
      const alumnoIds = alumnosRetiro.map(a => a.id)
      const res = await fetch('/api/control/verificar-retiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'verificar',
          alumno_ids: alumnoIds,
          codigo: codigoInput,
          firma_nombre: retiroForm.firma,
          persona_nombre: retiroForm.persona_nombre,
          persona_rut: retiroForm.persona_rut || null,
          persona_parentesco: retiroForm.persona_parentesco || null,
          hora_esperada: getHoraEsperada(alumnosRetiro[0], 'retiro'),
          motivo: retiroForm.motivo || null,
          observaciones: retiroForm.observaciones || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Retiro confirmado: ${data.count} alumno${data.count > 1 ? 's' : ''}`)
      setVista('panel')
      setAlumnosRetiro([])
      setRetiroForm({ persona_nombre: '', persona_rut: '', persona_parentesco: '', firma: '', motivo: '', observaciones: '', email_override: '' })
      setRetiroStep('datos')
      setCodigoEnviado(false)
      setCodigoInput('')
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
                      <button onClick={() => iniciarRetiro(a)} className="px-3 py-1.5 bg-[#1B3A5C] text-white text-[10px] font-semibold rounded-lg">Retiro</button>
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
      {vista === 'retiro' && alumnosRetiro.length > 0 && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#EDF6FA] rounded-full flex items-center justify-center">
                <i className="ti ti-logout text-[#1B3A5C] text-lg" aria-hidden="true"/>
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--ar-text)]">Registrar retiro</h2>
                <p className="text-xs text-[var(--ar-muted)]">{alumnosRetiro.length} alumno{alumnosRetiro.length > 1 ? 's' : ''} seleccionado{alumnosRetiro.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 mb-5">
              {[{ key: 'datos', label: '1. Datos' }, { key: 'codigo', label: '2. Código' }, { key: 'firma', label: '3. Firma' }].map((s, i) => (
                <div key={s.key} className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-semibold ${retiroStep === s.key ? 'bg-[#1B3A5C] text-white' : i < ['datos', 'codigo', 'firma'].indexOf(retiroStep) ? 'bg-[#2D5A3F] text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s.label}
                </div>
              ))}
            </div>

            {/* STEP 1: Datos */}
            {retiroStep === 'datos' && (
              <>
                {/* Alumnos a retirar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider">Alumnos a retirar</label>
                    <button
                      onClick={() => setBusquedaRetiro(busquedaRetiro ? '' : ' ')}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#1B3A5C] text-white text-[10px] font-semibold rounded-lg hover:bg-[#152d4a] transition-colors"
                    >
                      <i className="ti ti-user-plus text-xs" aria-hidden="true"/>
                      Agregar alumno
                    </button>
                  </div>
                  <div className="space-y-1.5 mb-2">
                    {alumnosRetiro.map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#EDF6FA] border border-[#1B3A5C]/10">
                        <i className="ti ti-user text-[#1B3A5C] text-sm" aria-hidden="true"/>
                        <span className="flex-1 text-xs font-semibold text-[var(--ar-text)]">{a.nombre} {a.apellido}</span>
                        <span className="text-[9px] text-[var(--ar-muted)]">{a.curso}</span>
                        {alumnosRetiro.length > 1 && (
                          <button onClick={() => quitarAlumnoRetiro(a.id)} className="text-red-400 hover:text-red-600 text-xs ml-1" title="Quitar">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Buscar y agregar más */}
                  {busquedaRetiro !== '' && (
                    <div className="relative">
                      <input
                        value={busquedaRetiro.trim() ? busquedaRetiro : ''}
                        onChange={e => setBusquedaRetiro(e.target.value)}
                        className="input-base text-xs"
                        placeholder="Buscar por nombre o apellido..."
                        autoFocus
                      />
                      {busquedaRetiro.trim() && alumnosFiltradosRetiro.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-[var(--ar-border)] rounded-lg shadow-lg max-h-[150px] overflow-y-auto">
                          {alumnosFiltradosRetiro.map(a => (
                            <button key={a.id} onClick={() => agregarAlumnoRetiro(a)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                              <i className="ti ti-plus text-[#2D5A3F] text-xs" aria-hidden="true"/>
                              <span className="text-xs font-medium text-[var(--ar-text)]">{a.nombre} {a.apellido}</span>
                              <span className="text-[9px] text-[var(--ar-muted)]">{a.curso}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {busquedaRetiro.trim() && alumnosFiltradosRetiro.length === 0 && (
                        <p className="text-[10px] text-[var(--ar-muted)] mt-1">No se encontraron alumnos.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Personas autorizadas */}
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-2">Personas autorizadas</label>
                  <AutorizadosList alumnoId={alumnosRetiro[0].id} onSelect={(persona) => setRetiroForm(p => ({...p, persona_nombre: persona.nombre, persona_rut: persona.rut || '', persona_parentesco: persona.parentesco || '', firma: persona.nombre, email_override: ''}))} />
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
                        <option value="Hermana/o mayor">Hermana/o mayor</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  {/* Email para código — si no es apoderado */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">
                      Email para el código {retiroForm.email_override ? '' : '(se envía al apoderado)'}
                    </label>
                    <input
                      type="email"
                      value={retiroForm.email_override}
                      onChange={e => setRetiroForm(p => ({...p, email_override: e.target.value}))}
                      className="input-base"
                      placeholder="Dejar vacío para usar email del apoderado"
                    />
                    <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Si quien retira no es el apoderado, ingrese su email para recibir el código.</p>
                  </div>

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
                  <button onClick={() => { setVista('panel'); setAlumnosRetiro([]); setRetiroStep('datos') }} className="flex-1 btn-secondary py-3">Cancelar</button>
                  <button onClick={enviarCodigoRetiro} disabled={loading || !retiroForm.persona_nombre.trim()} className="flex-1 py-3 bg-[#1B3A5C] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                    {loading ? 'Enviando...' : `Enviar código (${alumnosRetiro.length})`}
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Ingresar código */}
            {retiroStep === 'codigo' && (
              <>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-[#EDF6FA] rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="ti ti-mail-forward text-[#1B3A5C] text-2xl" aria-hidden="true"/>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--ar-text)] mb-1">Código enviado</h3>
                  <p className="text-xs text-[var(--ar-muted)]">Se envió un código de 6 dígitos a <strong>{emailParcial}</strong></p>
                  <p className="text-[10px] text-[var(--ar-muted)] mt-1">Solicite el código e ingréselo a continuación.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-2 text-center">Código de verificación</label>
                    <input
                      value={codigoInput}
                      onChange={e => setCodigoInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full text-center text-2xl font-mono font-bold tracking-[8px] px-4 py-4 bg-gray-50 border-2 border-[var(--ar-border)] rounded-xl outline-none focus:border-[#1B3A5C]"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <button onClick={() => setRetiroStep('firma')} disabled={codigoInput.length < 6} className="w-full py-3 bg-[#1B3A5C] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                    Continuar
                  </button>

                  <div className="flex items-center justify-between">
                    <button onClick={() => { setRetiroStep('datos'); setCodigoEnviado(false) }} className="text-[10px] text-[var(--ar-muted)] hover:underline">← Volver</button>
                    <button onClick={enviarCodigoRetiro} disabled={loading} className="text-[10px] text-[var(--ar-accent)] hover:underline">Reenviar código</button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 3: Firma */}
            {retiroStep === 'firma' && (
              <>
                <div className="text-center mb-4">
                  <div className="w-14 h-14 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="ti ti-pencil text-[#2D5A3F] text-2xl" aria-hidden="true"/>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--ar-text)] mb-1">Firmar retiro</h3>
                  <p className="text-xs text-[var(--ar-muted)]">
                    {retiroForm.persona_nombre} retira a: <strong>{alumnosRetiro.map(a => a.nombre).join(', ')}</strong>
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-1">Nombre completo (firma) *</label>
                    <input
                      value={retiroForm.firma}
                      onChange={e => setRetiroForm(p => ({...p, firma: e.target.value}))}
                      className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400"
                      placeholder="Escriba su nombre completo"
                    />
                  </div>
                  <p className="text-[9px] text-amber-700 leading-relaxed">
                    Al firmar, declaro bajo juramento ser la persona autorizada para retirar al/los alumno(s) del establecimiento.
                    Esta firma electrónica simple tiene validez conforme a la Ley 19.799.
                  </p>
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={() => setRetiroStep('codigo')} className="flex-1 btn-secondary py-3">← Volver</button>
                  <button onClick={verificarCodigoRetiro} disabled={loading || !retiroForm.firma.trim()} className="flex-1 py-3 bg-[#2D5A3F] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                    {loading ? 'Verificando...' : `Confirmar retiro (${alumnosRetiro.length})`}
                  </button>
                </div>
              </>
            )}
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
