'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { capitalizarNombre, formatearRut, validarRut, formatearTelefono, validarEmail, formatearFecha, fechaISOaDisplay, formatearMontoInput } from '@/lib/validaciones'
import CapturaDocumento from '@/components/ui/CapturaDocumento'
import CapturaMovilSection from '@/components/matricula/CapturaMovilSection'
import SelectorRegionComuna from '@/components/ui/SelectorRegionComuna'

interface Props { planes: any[]; matriculas: any[]; cursos: string[]; aportes: any[]; becasAprobadas: any[] }

export default function MatriculaClient({ planes, matriculas, cursos, aportes, becasAprobadas }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista')
  const [saving, setSaving] = useState(false)
  const [fechaDisplay, setFechaDisplay] = useState('')
  const [montoMatDisplay, setMontoMatDisplay] = useState('')
  const [montoMensDisplay, setMontoMensDisplay] = useState('')
  const [apoderadoExiste, setApoderadoExiste] = useState<any>(null)
  const [buscandoApoderado, setBuscandoApoderado] = useState(false)
  const [documentos, setDocumentos] = useState<Record<string, string>>({})
  const [rutDuplicado, setRutDuplicado] = useState<any>(null)
  const [camposError, setCamposError] = useState<string[]>([])

  function esError(campo: string) {
    return camposError.includes(campo) ? 'border-red-400 ring-1 ring-red-200' : ''
  }

  function handleDocumento(dataUrl: string, tipo: string) {
    setDocumentos(prev => ({ ...prev, [tipo]: dataUrl }))
  }

  async function verificarRutDuplicado(rut: string) {
    if (!rut || !validarRut(rut)) { setRutDuplicado(null); return }
    try {
      const res = await fetch(`/api/alumnos/check-rut?rut=${encodeURIComponent(rut)}`)
      if (res.ok) {
        const data = await res.json()
        setRutDuplicado(data.existe ? data.alumno : null)
      }
    } catch { /* silently fail */ }
  }

  // Auto-completar montos desde tabla de aportes
  function calcularMontos(curso: string, jornada: string, sede: string) {
    const anioActual = new Date().getFullYear()
    const esPlaygroup = curso.toLowerCase().includes('play group') || curso.toLowerCase().includes('pre school')
    const nivel = esPlaygroup ? 'Playgroup' : 'Preschool a High School'
    const jornadaTipo = jornada === 'completa' ? 'completa' : 'media'
    const sedeKey = sede || null

    // Buscar aporte inicial
    let inicial = aportes.find(a => a.tipo === 'inicial' && a.nivel === nivel && a.anio === anioActual && (a.sede === sedeKey || (!sedeKey && !a.sede)))
    if (!inicial) inicial = aportes.find(a => a.tipo === 'inicial' && a.nivel === nivel && a.anio === anioActual && !a.sede)

    // Buscar aporte mensual
    let mensual = aportes.find(a => a.tipo === 'mensual' && a.nivel === nivel && a.anio === anioActual && (a.jornada === jornadaTipo || !a.jornada) && (a.sede === sedeKey || (!sedeKey && !a.sede)))
    if (!mensual) mensual = aportes.find(a => a.tipo === 'mensual' && a.nivel === nivel && a.anio === anioActual && (a.jornada === jornadaTipo || !a.jornada) && !a.sede)

    const montoInicial = inicial?.monto ?? 0
    const montoMensual = mensual?.monto ?? 0

    setForm(p => ({ ...p, monto_matricula: montoInicial, monto_mensual: montoMensual }))
    setMontoMatDisplay(montoInicial > 0 ? montoInicial.toLocaleString('es-CL') : '')
    setMontoMensDisplay(montoMensual > 0 ? montoMensual.toLocaleString('es-CL') : '')
  }
  const [form, setForm] = useState({
    // Alumno
    nombre: '', apellido: '', rut: '', curso: cursos[0] ?? '', fecha_nacimiento: '',
    sexo: '', direccion: '', comuna: '', region: '', nacionalidad: 'Chilena', necesidades_especiales: '',
    prevision_salud: '', contacto_emergencia: '', telefono_emergencia: '',
    tipo_ingreso: 'nuevo', pais_natal: 'Chile',
    // Salud
    alergia_alimentaria: '', alergia_medicamento: '', enfermedad_cronica: '', centro_salud_emergencia: '',
    // Antecedentes educativos
    jardin_previo: '', ultimo_anio_aprobado: '', ha_reprobado: false, curso_reprobado: '',
    diagnostico: '', contacto_especialista: '', modalidad: 'presencial',
    // Jornada y sede
    jornada: 'completa', sede: '',
    // Apoderado (madre/principal)
    nombre_apoderado: '', apellido_apoderado: '', email_apoderado: '', telefono_apoderado: '',
    rut_apoderado: '', direccion_apoderado: '', parentesco: 'apoderado', telefono_trabajo_apoderado: '',
    // Padre
    nombre_padre: '', apellido_padre: '', rut_padre: '', telefono_padre: '',
    email_padre: '', direccion_padre: '', telefono_trabajo_padre: '',
    // Persona autorizada retiro
    retiro_nombre: '', retiro_parentesco: '', retiro_rut: '', retiro_telefono: '',
    // Cobros
    plan_cobro_id: '', monto_matricula: 0, monto_mensual: 0, meses_cobro: 10, porcentaje_beca: 0,
    medio_pago_matricula: '' as '' | 'transferencia' | 'tarjeta' | 'cheque' | 'pagare',
    // Config
    crear_cuenta_apoderado: true, password_apoderado: '',
    observaciones: '', firma_apoderado: '',
  })

  async function buscarApoderado(email: string) {
    if (!validarEmail(email)) { setApoderadoExiste(null); return }
    setBuscandoApoderado(true)
    try {
      const res = await fetch(`/api/usuarios?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        if (data && data.id) {
          setApoderadoExiste(data)
          // Auto-rellenar datos del apoderado
          setForm(p => ({
            ...p,
            nombre_apoderado: data.nombre || p.nombre_apoderado,
            apellido_apoderado: data.apellido || p.apellido_apoderado,
          }))
        } else {
          setApoderadoExiste(null)
        }
      } else {
        setApoderadoExiste(null)
      }
    } catch { setApoderadoExiste(null) }
    setBuscandoApoderado(false)
  }

  async function handleMatricular() {
    // Validar campos requeridos y marcar en rojo los que faltan
    const errores: string[] = []
    if (!form.nombre) errores.push('nombre')
    if (!form.apellido) errores.push('apellido')
    if (!form.curso) errores.push('curso')
    if (!form.nombre_apoderado) errores.push('nombre_apoderado')
    if (!form.email_apoderado) errores.push('email_apoderado')
    if (form.rut && !validarRut(form.rut)) errores.push('rut')
    if (form.rut_apoderado && !validarRut(form.rut_apoderado)) errores.push('rut_apoderado')
    if (form.email_apoderado && !validarEmail(form.email_apoderado)) errores.push('email_apoderado')

    if (errores.length > 0) {
      setCamposError(errores)
      const mensajes: string[] = []
      if (!form.nombre || !form.apellido) mensajes.push('Nombres del alumno')
      if (!form.nombre_apoderado) mensajes.push('Nombre del apoderado')
      if (!form.email_apoderado) mensajes.push('Email del apoderado')
      if (errores.includes('rut')) mensajes.push('RUT del alumno inválido')
      if (errores.includes('rut_apoderado')) mensajes.push('RUT del apoderado inválido')
      toast.error(`Campos requeridos: ${mensajes.join(', ')}`)
      return
    }
    setCamposError([])
    setSaving(true)

    const res = await fetch('/api/matriculas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        documentos,
        // Medio de pago se selecciona post-firma, no en matrícula
        descuento_contado: 0,
        monto_mensual_final: null,
        pagare_confirmado: false,
      }),
    })

    const data = await res.json()
    if (res.ok) {
      toast.success('Matrícula completada exitosamente')
      // Abrir contrato en nueva pestaña
      if (data.matricula?.id) {
        window.open(`/api/contratos?matricula_id=${data.matricula.id}`, '_blank')
      }
      setVista('lista')
      router.refresh()
    } else if (res.status === 409 && data.duplicado) {
      // Alumno ya existe con ese RUT
      const al = data.alumno_existente
      toast.error(
        `⚠️ ${data.error}`,
        { duration: 8000, style: { maxWidth: '500px' } }
      )
    } else {
      toast.error(data.error ?? 'Error al matricular')
    }
    setSaving(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Matrícula {new Date().getFullYear()}</h1>
          <p className="page-subtitle">Ingreso de nuevos alumnos con trazabilidad completa</p>
        </div>
        {vista === 'lista' ? (
          <button onClick={() => setVista('nueva')} className="btn-primary">
            <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nueva matrícula
          </button>
        ) : (
          <button onClick={() => setVista('lista')} className="btn-secondary">
            <i className="ti ti-arrow-left text-sm" aria-hidden="true"/> Volver
          </button>
        )}
      </div>

      {/* Lista de matrículas */}
      {vista === 'lista' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="kpi-card"><div className="kpi-label">Matriculados {new Date().getFullYear()}</div><div className="kpi-value">{matriculas.length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Activas</div><div className="kpi-value text-[#1a7a4c]">{matriculas.filter(m => m.estado === 'activa').length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Pendientes</div><div className="kpi-value text-[#b7791f]">{matriculas.filter(m => m.estado === 'pendiente').length}</div></div>
          </div>

          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                  {['Alumno', 'Curso', 'Estado', 'Fecha', 'Monto matrícula', ''].map(h => (
                    <th key={h} className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriculas.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center">
                    <i className="ti ti-user-plus text-3xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
                    <p className="text-[#9ca3af] text-sm">No hay matrículas este año. Registra la primera.</p>
                  </td></tr>
                ) : matriculas.map((m: any) => (
                  <tr key={m.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc]">
                    <td className="px-4 py-3.5 font-medium text-[#1a2332]">{m.alumno?.nombre} {m.alumno?.apellido}</td>
                    <td className="px-4 py-3.5 text-[#6b7280]">{m.alumno?.curso}</td>
                    <td className="px-4 py-3.5"><span className={`tag ${m.estado === 'activa' ? 'tag-ok' : 'tag-pend'}`}>{m.estado}</span></td>
                    <td className="px-4 py-3.5 text-[#6b7280] text-[12px]">{new Date(m.fecha_matricula).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3.5 text-[#1a2332] font-medium">${(m.monto_matricula ?? 0).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <a href={`/api/contratos?matricula_id=${m.id}`} target="_blank" className="text-[11px] text-[var(--ar-accent)] hover:underline font-medium">
                          Contrato
                        </a>
                        <a href={`/api/contratos?matricula_id=${m.id}&tipo=pagare`} target="_blank" className="text-[11px] text-[#5B8FA8] hover:underline font-medium">
                          Pagaré
                        </a>
                        <a href={`/matricula/firmar/${m.id}`} className={`text-[11px] font-medium hover:underline ${m.firma_apoderado && m.firma_pagare ? 'text-emerald-600' : 'text-[#1B3A5C]'}`}>
                          {m.firma_apoderado && m.firma_pagare
                            ? '✓ Firmado'
                            : m.firma_apoderado
                              ? '⚠ Falta pagaré'
                              : 'Firmar'}
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Formulario nueva matrícula */}
      {vista === 'nueva' && (
        <div className="max-w-3xl space-y-6">
          {/* Paso 1: Datos del alumno */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">1</div>
              <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Datos del alumno</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombres *</label><input value={form.nombre} onChange={e => { setForm(p => ({...p, nombre: capitalizarNombre(e.target.value)})); setCamposError(prev => prev.filter(c => c !== 'nombre')) }} className={`input-base ${esError('nombre')}`} placeholder="Nombres completos"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Apellidos *</label><input value={form.apellido} onChange={e => { setForm(p => ({...p, apellido: capitalizarNombre(e.target.value)})); setCamposError(prev => prev.filter(c => c !== 'apellido')) }} className={`input-base ${esError('apellido')}`} placeholder="Apellidos completos"/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">RUT / Pasaporte</label>
                <input value={form.rut} onChange={e => { setForm(p => ({...p, rut: formatearRut(e.target.value)})); setRutDuplicado(null) }} onBlur={() => verificarRutDuplicado(form.rut)} className={`input-base ${form.rut && !validarRut(form.rut) ? 'border-red-300 focus:ring-red-200' : rutDuplicado ? 'border-amber-300 focus:ring-amber-200' : ''}`} placeholder="12.345.678-9" maxLength={12}/>
                {form.rut && !validarRut(form.rut) && <span className="text-[10px] text-[#c53030] mt-0.5 block">RUT inválido</span>}
                {rutDuplicado && (
                  <div className="mt-1.5 bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800">
                    <i className="ti ti-alert-triangle text-xs mr-1" aria-hidden="true"/>
                    <strong>Alumno ya registrado:</strong> {rutDuplicado.nombre} {rutDuplicado.apellido} ({rutDuplicado.curso}){!rutDuplicado.activo && ' [inactivo]'}
                  </div>
                )}
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Sexo</label>
                <select value={form.sexo} onChange={e => setForm(p => ({...p, sexo: e.target.value}))} className="select-base w-full">
                  <option value="">Seleccionar</option>
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Fecha nacimiento</label>
                <input value={fechaDisplay} onChange={e => { const f = formatearFecha(e.target.value); setFechaDisplay(f.display); if(f.value) setForm(p => ({...p, fecha_nacimiento: f.value})) }} className="input-base" placeholder="DD-MM-AAAA" maxLength={10}/>
                {form.fecha_nacimiento && (() => {
                  const nacimiento = new Date(form.fecha_nacimiento + 'T12:00')
                  const hoy = new Date()
                  let edad = hoy.getFullYear() - nacimiento.getFullYear()
                  const mesActual = hoy.getMonth() - nacimiento.getMonth()
                  if (mesActual < 0 || (mesActual === 0 && hoy.getDate() < nacimiento.getDate())) edad--
                  const meses = (hoy.getMonth() - nacimiento.getMonth() + 12) % 12
                  return (
                    <div className="mt-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <i className="ti ti-cake text-blue-500 text-sm" aria-hidden="true"/>
                      <span className="text-[12px] text-blue-800 font-medium">Edad: <strong>{edad} años{meses > 0 ? ` y ${meses} meses` : ''}</strong></span>
                    </div>
                  )
                })()}
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nacionalidad</label><input value={form.nacionalidad} onChange={e => setForm(p => ({...p, nacionalidad: capitalizarNombre(e.target.value)}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">País natal</label><input value={form.pais_natal} onChange={e => setForm(p => ({...p, pais_natal: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Chile"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Curso *</label>
                <select value={form.curso} onChange={e => { setForm(p => ({...p, curso: e.target.value})); calcularMontos(e.target.value, form.jornada, form.sede) }} className="select-base w-full">
                  {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Jornada</label>
                <select value={form.jornada} onChange={e => { setForm(p => ({...p, jornada: e.target.value})); calcularMontos(form.curso, e.target.value, form.sede) }} className="select-base w-full">
                  {(() => {
                    const cursoLower = form.curso.toLowerCase()
                    const esHighSchool = cursoLower.includes('high school') || cursoLower.includes('medio')
                    const esMiddleSchool = cursoLower.includes('middle school')
                    const soloCompleta = esHighSchool || esMiddleSchool
                    const esPuntaArenas = form.sede === 'punta_arenas'
                    const horaInicio = esPuntaArenas ? '07:45' : '08:00'
                    const horaFinLJ = '18:00'
                    const horaFinV = '17:00'

                    if (soloCompleta) {
                      return <option value="completa">Jornada Completa (Lun-Jue {horaInicio}-{horaFinLJ}, Vie {horaInicio}-{horaFinV})</option>
                    }
                    return (
                      <>
                        <option value="completa">Jornada Completa (Lun-Jue {horaInicio}-{horaFinLJ}, Vie {horaInicio}-{horaFinV})</option>
                        <option value="am">Media Jornada AM (Lun-Vie {horaInicio}-13:00)</option>
                        <option value="pm">Media Jornada PM (Lun-Jue 13:00-{horaFinLJ}, Vie 13:00-{horaFinV})</option>
                        <option value="especial">Jornada Especial (1 a 4 días por semana)</option>
                      </>
                    )
                  })()}
                </select>
                {(() => {
                  const cursoLower = form.curso.toLowerCase()
                  const soloCompleta = cursoLower.includes('high school') || cursoLower.includes('medio') || cursoLower.includes('middle school')
                  if (soloCompleta && form.jornada !== 'completa') {
                    // Auto-corregir si cambió de curso
                    setTimeout(() => setForm(p => ({...p, jornada: 'completa'})), 0)
                  }
                  return soloCompleta ? (
                    <span className="text-[10px] text-[#6b7280] mt-1 block">Middle y High School solo admiten jornada completa</span>
                  ) : null
                })()}
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Sede</label>
                <select value={form.sede} onChange={e => { setForm(p => ({...p, sede: e.target.value})); calcularMontos(form.curso, form.jornada, e.target.value) }} className="select-base w-full">
                  <option value="">Según colegio asignado</option>
                  <option value="santiago">Santiago (Victoria 52)</option>
                  <option value="puente_alto">Puente Alto (Irarrázaval 0565)</option>
                  <option value="punta_arenas">Punta Arenas (Chiloé 862)</option>
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Tipo de ingreso</label>
                <select value={form.tipo_ingreso} onChange={e => setForm(p => ({...p, tipo_ingreso: e.target.value}))} className="select-base w-full">
                  <option value="nuevo">Nuevo ingreso</option>
                  <option value="continuidad">Continuidad</option>
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Previsión de salud</label>
                <select value={form.prevision_salud} onChange={e => setForm(p => ({...p, prevision_salud: e.target.value}))} className="select-base w-full">
                  <option value="">Seleccionar</option>
                  <option value="fonasa">FONASA</option>
                  <option value="isapre">ISAPRE</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Domicilio</label>
                <input value={form.direccion} onChange={e => setForm(p => ({...p, direccion: e.target.value}))} className="input-base" placeholder="Av. Ejemplo 1234"/>
              </div>
              <SelectorRegionComuna
                region={form.region}
                comuna={form.comuna}
                onRegionChange={r => setForm(p => ({...p, region: r, comuna: ''}))}
                onComunaChange={c => setForm(p => ({...p, comuna: c}))}
              />
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Contacto emergencia</label><input value={form.contacto_emergencia} onChange={e => setForm(p => ({...p, contacto_emergencia: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Nombre completo"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono emergencia</label><input value={form.telefono_emergencia} onChange={e => setForm(p => ({...p, telefono_emergencia: formatearTelefono(e.target.value)}))} className="input-base" placeholder="+56 9 1234 5678 o +1 305 123 4567" maxLength={20}/></div>
            </div>
          </div>

          {/* Información de salud */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <i className="ti ti-first-aid-kit text-[#1a2332] text-sm" aria-hidden="true"/>
              <h3 className="text-[13px] font-semibold text-[#1a2332]">Información de salud</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">¿Alergia alimentaria o de otro tipo?</label><input value={form.alergia_alimentaria} onChange={e => setForm(p => ({...p, alergia_alimentaria: e.target.value}))} className="input-base" placeholder="No / Indicar cuál"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">¿Alérgico a algún medicamento?</label><input value={form.alergia_medicamento} onChange={e => setForm(p => ({...p, alergia_medicamento: e.target.value}))} className="input-base" placeholder="No / Indicar cuál"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">¿Antecedente crónico o enfermedad?</label><input value={form.enfermedad_cronica} onChange={e => setForm(p => ({...p, enfermedad_cronica: e.target.value}))} className="input-base" placeholder="No / Indicar cuál"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Centro de salud de emergencia</label><input value={form.centro_salud_emergencia} onChange={e => setForm(p => ({...p, centro_salud_emergencia: e.target.value}))} className="input-base" placeholder="Hospital, clínica o CESFAM"/></div>
            </div>
          </div>

          {/* Antecedentes educativos */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <i className="ti ti-school text-[#1a2332] text-sm" aria-hidden="true"/>
              <h3 className="text-[13px] font-semibold text-[#1a2332]">Antecedentes educativos</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">¿Ha estado en otro jardín/colegio?</label><input value={form.jardin_previo} onChange={e => setForm(p => ({...p, jardin_previo: e.target.value}))} className="input-base" placeholder="No / Nombre del establecimiento"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Último año escolar aprobado</label><input value={form.ultimo_anio_aprobado} onChange={e => setForm(p => ({...p, ultimo_anio_aprobado: e.target.value}))} className="input-base" placeholder="Ej: 3° Básico"/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">¿Ha reprobado algún curso?</label>
                <div className="flex gap-3 items-center">
                  <select value={form.ha_reprobado ? 'si' : 'no'} onChange={e => setForm(p => ({...p, ha_reprobado: e.target.value === 'si'}))} className="select-base w-20">
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                  {form.ha_reprobado && <input value={form.curso_reprobado} onChange={e => setForm(p => ({...p, curso_reprobado: e.target.value}))} className="input-base flex-1" placeholder="¿Cuál curso?"/>}
                </div>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Modalidad de estudio</label>
                <select value={form.modalidad} onChange={e => setForm(p => ({...p, modalidad: e.target.value}))} className="select-base w-full">
                  <option value="presencial">Presencial</option>
                  {form.tipo_ingreso === 'continuidad' ? (
                    <option value="online">Online</option>
                  ) : (
                    <option value="online" disabled>Online (no disponible para nuevo ingreso 2027)</option>
                  )}
                </select>
                {form.modalidad === 'online' && form.tipo_ingreso === 'nuevo' && (() => {
                  setTimeout(() => setForm(p => ({...p, modalidad: 'presencial'})), 0)
                  return null
                })()}
                {form.tipo_ingreso === 'nuevo' && (
                  <p className="text-[10px] text-[#9ca3af] mt-1">La modalidad online no está disponible para nuevos postulantes 2027.</p>
                )}
              </div>
              <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">¿Dificultad de aprendizaje o diagnóstico?</label><input value={form.diagnostico} onChange={e => setForm(p => ({...p, diagnostico: e.target.value}))} className="input-base" placeholder="No / Describir diagnóstico"/></div>
              {form.diagnostico && form.diagnostico.toLowerCase() !== 'no' && form.diagnostico.length > 2 && (
                <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono del especialista tratante</label><input value={form.contacto_especialista} onChange={e => setForm(p => ({...p, contacto_especialista: formatearTelefono(e.target.value)}))} className="input-base" placeholder="+56 9 1234 5678" maxLength={20}/></div>
              )}
            </div>
          </div>

          {/* Paso 2: Datos del apoderado */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">2</div>
              <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Datos del apoderado</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre_apoderado} onChange={e => { setForm(p => ({...p, nombre_apoderado: capitalizarNombre(e.target.value)})); setCamposError(prev => prev.filter(c => c !== 'nombre_apoderado')) }} className={`input-base ${esError('nombre_apoderado')}`} placeholder="Nombre"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Apellido</label><input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Apellido"/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Email *</label>
                <input type="email" value={form.email_apoderado} onChange={e => { setForm(p => ({...p, email_apoderado: e.target.value.toLowerCase()})); setCamposError(prev => prev.filter(c => c !== 'email_apoderado')) }} onBlur={e => buscarApoderado(e.target.value)} className={`input-base ${form.email_apoderado && !validarEmail(form.email_apoderado) ? 'border-red-300 focus:ring-red-200' : esError('email_apoderado')}`} placeholder="correo@email.com"/>
                {form.email_apoderado && !validarEmail(form.email_apoderado) && <span className="text-[10px] text-[#c53030] mt-0.5 block">Email inválido</span>}
                {buscandoApoderado && <span className="text-[10px] text-[#6b7280] mt-0.5 block">Verificando...</span>}
                {apoderadoExiste && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
                    <i className="ti ti-info-circle text-blue-500 text-sm mt-0.5 flex-shrink-0" aria-hidden="true"/>
                    <div>
                      <span className="text-[11px] text-blue-800 font-medium block">Apoderado existente: {apoderadoExiste.nombre} {apoderadoExiste.apellido}</span>
                      <span className="text-[10px] text-blue-600">El nuevo alumno se vinculará a esta misma cuenta.</span>
                    </div>
                  </div>
                )}
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono</label><input value={form.telefono_apoderado} onChange={e => setForm(p => ({...p, telefono_apoderado: formatearTelefono(e.target.value)}))} className="input-base" placeholder="+56 9 1234 5678 o +1 305 123 4567" maxLength={20}/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">RUT apoderado</label>
                <input value={form.rut_apoderado} onChange={e => setForm(p => ({...p, rut_apoderado: formatearRut(e.target.value)}))} className={`input-base ${form.rut_apoderado && !validarRut(form.rut_apoderado) ? 'border-red-300 focus:ring-red-200' : ''}`} placeholder="12.345.678-9" maxLength={12}/>
                {form.rut_apoderado && !validarRut(form.rut_apoderado) && <span className="text-[10px] text-[#c53030] mt-0.5 block">RUT inválido</span>}
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Parentesco</label>
                <select value={form.parentesco} onChange={e => setForm(p => ({...p, parentesco: e.target.value}))} className="select-base w-full">
                  {['apoderado','madre','padre','abuelo/a','tutor legal','otro'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Dirección del apoderado</label>
              <input value={form.direccion_apoderado} onChange={e => setForm(p => ({...p, direccion_apoderado: e.target.value}))} className="input-base w-full" placeholder="Av. Ejemplo 1234, Comuna, Ciudad"/>
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono del trabajo</label>
              <input value={form.telefono_trabajo_apoderado} onChange={e => setForm(p => ({...p, telefono_trabajo_apoderado: formatearTelefono(e.target.value)}))} className="input-base w-full" placeholder="+56 2 2345 6789" maxLength={20}/>
            </div>

            {/* Datos del padre */}
            <details className="mt-4 border border-slate-200 rounded-lg">
              <summary className="px-4 py-3 text-[12px] font-semibold text-[#4b5563] cursor-pointer hover:bg-slate-50 select-none">
                <span className="ml-1">Datos del padre (si aplica)</span>
              </summary>
              <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-2">
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombre</label><input value={form.nombre_padre} onChange={e => setForm(p => ({...p, nombre_padre: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Nombre"/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Apellido</label><input value={form.apellido_padre} onChange={e => setForm(p => ({...p, apellido_padre: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Apellido"/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">RUT / Pasaporte</label><input value={form.rut_padre} onChange={e => setForm(p => ({...p, rut_padre: formatearRut(e.target.value)}))} className="input-base" placeholder="12.345.678-9" maxLength={12}/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono</label><input value={form.telefono_padre} onChange={e => setForm(p => ({...p, telefono_padre: formatearTelefono(e.target.value)}))} className="input-base" placeholder="+56 9 1234 5678" maxLength={20}/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Email</label><input type="email" value={form.email_padre} onChange={e => setForm(p => ({...p, email_padre: e.target.value.toLowerCase()}))} className="input-base" placeholder="correo@email.com"/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono trabajo</label><input value={form.telefono_trabajo_padre} onChange={e => setForm(p => ({...p, telefono_trabajo_padre: formatearTelefono(e.target.value)}))} className="input-base" placeholder="+56 2 2345 6789" maxLength={20}/></div>
                <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Dirección</label><input value={form.direccion_padre} onChange={e => setForm(p => ({...p, direccion_padre: e.target.value}))} className="input-base" placeholder="Av. Ejemplo 1234, Comuna"/></div>
              </div>
            </details>

            {/* Persona autorizada para retiro */}
            <details className="mt-3 border border-slate-200 rounded-lg">
              <summary className="px-4 py-3 text-[12px] font-semibold text-[#4b5563] cursor-pointer hover:bg-slate-50 select-none">
                <span className="ml-1">Persona autorizada para retiro (adicional a los padres)</span>
              </summary>
              <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-2">
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombre completo</label><input value={form.retiro_nombre} onChange={e => setForm(p => ({...p, retiro_nombre: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Nombre completo"/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Parentesco</label><input value={form.retiro_parentesco} onChange={e => setForm(p => ({...p, retiro_parentesco: e.target.value}))} className="input-base" placeholder="Ej: Abuela, Tía, Nana"/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">RUT / Pasaporte</label><input value={form.retiro_rut} onChange={e => setForm(p => ({...p, retiro_rut: formatearRut(e.target.value)}))} className="input-base" placeholder="12.345.678-9" maxLength={12}/></div>
                <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono</label><input value={form.retiro_telefono} onChange={e => setForm(p => ({...p, retiro_telefono: formatearTelefono(e.target.value)}))} className="input-base" placeholder="+56 9 1234 5678" maxLength={20}/></div>
              </div>
            </details>

            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input type="checkbox" checked={form.crear_cuenta_apoderado} onChange={e => setForm(p => ({...p, crear_cuenta_apoderado: e.target.checked}))} className="rounded"/>
              <span className="text-[13px] text-[#4b5563]">Crear cuenta de acceso al portal para el apoderado</span>
            </label>
          </div>

          {/* Paso 3: Plan de aportes */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">3</div>
              <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Plan de aportes</h2>
              {form.monto_matricula > 0 && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">Auto-calculado desde tabla de aportes</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Aporte inicial ($)</label>
                <div className="w-full px-3.5 py-2.5 bg-[#f9fafb] border border-[var(--ar-border)] rounded-lg text-[13px] text-[#1B3A5C] font-medium">
                  {form.monto_matricula > 0 ? `$${form.monto_matricula.toLocaleString('es-CL')}` : <span className="text-[#9ca3af]">Seleccione curso y sede</span>}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Aporte mensual ($)</label>
                <div className="w-full px-3.5 py-2.5 bg-[#f9fafb] border border-[var(--ar-border)] rounded-lg text-[13px] text-[#1B3A5C] font-medium">
                  {form.monto_mensual > 0 ? `$${form.monto_mensual.toLocaleString('es-CL')}` : <span className="text-[#9ca3af]">Seleccione curso y sede</span>}
                </div>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Meses</label><input type="number" min="1" max="12" value={form.meses_cobro} onChange={e => setForm(p => ({...p, meses_cobro: parseInt(e.target.value) || 10}))} className="input-base"/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Beca / Descuento (%)</label>
                <input type="number" min="0" max="100" value={form.porcentaje_beca || ''} onChange={e => setForm(p => ({...p, porcentaje_beca: parseInt(e.target.value) || 0}))} className="input-base" placeholder="0"/>
                {becasAprobadas.length > 0 && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    <i className="ti ti-info-circle text-[10px] mr-0.5" aria-hidden="true"/>
                    {becasAprobadas.length} beca{becasAprobadas.length > 1 ? 's' : ''} aprobada{becasAprobadas.length > 1 ? 's' : ''} este año. Si el alumno tiene beca, ingrese el porcentaje asignado.
                  </p>
                )}
              </div>
            </div>

            {/* Cálculo automático con beca */}
            {form.monto_mensual > 0 && (
              <div className="mt-3 bg-[#f9fafb] rounded-lg p-4 text-[12px] text-[#4b5563] space-y-2">
                {form.porcentaje_beca > 0 && (
                  <div className="flex items-center gap-2 text-[var(--ar-accent)] font-medium">
                    <i className="ti ti-discount-2 text-sm" aria-hidden="true"/>
                    Beca aplicada: {form.porcentaje_beca}% de descuento
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  <div>Aporte inicial:</div>
                  <div className="font-medium text-right">
                    {form.porcentaje_beca > 0 && <span className="line-through text-[#9ca3af] mr-2">${form.monto_matricula.toLocaleString('es-CL')}</span>}
                    <span className="text-[#1a2332]">${Math.round(form.monto_matricula * (1 - form.porcentaje_beca / 100)).toLocaleString('es-CL')}</span>
                  </div>
                  <div>Aporte mensual:</div>
                  <div className="font-medium text-right">
                    {form.porcentaje_beca > 0 && <span className="line-through text-[#9ca3af] mr-2">${form.monto_mensual.toLocaleString('es-CL')}</span>}
                    <span className="text-[#1a2332]">${Math.round(form.monto_mensual * (1 - form.porcentaje_beca / 100)).toLocaleString('es-CL')}</span>
                  </div>
                  <div className="border-t border-[#e8eaed] pt-2 mt-1 font-semibold">Total año ({form.meses_cobro} meses):</div>
                  <div className="border-t border-[#e8eaed] pt-2 mt-1 font-bold text-[#1a2332] text-right">
                    ${Math.round((form.monto_matricula + form.monto_mensual * form.meses_cobro) * (1 - form.porcentaje_beca / 100)).toLocaleString('es-CL')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Paso 4: Documentos */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">4</div>
              <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Documentos adjuntos</h2>
            </div>

            {/* Opción: Captura móvil */}
            <CapturaMovilSection documentos={documentos} onDocumentos={setDocumentos}/>

            {/* Opción manual: upload directo */}
            <details className="mt-4">
              <summary className="text-[11px] text-[#6b7280] cursor-pointer hover:text-[#1a2332]">O subir archivos manualmente desde este dispositivo</summary>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <CapturaDocumento label="CI Alumno (frente)" tipo="ci_frente" onCaptura={handleDocumento} valor={documentos.ci_frente}/>
                <CapturaDocumento label="CI Alumno (reverso)" tipo="ci_reverso" onCaptura={handleDocumento} valor={documentos.ci_reverso}/>
                <CapturaDocumento label="Foto del alumno" tipo="foto_alumno" onCaptura={handleDocumento} valor={documentos.foto_alumno}/>
                <CapturaDocumento label="CI Apoderado (frente)" tipo="ci_apoderado_frente" onCaptura={handleDocumento} valor={documentos.ci_apoderado_frente}/>
                <CapturaDocumento label="CI Apoderado (reverso)" tipo="ci_apoderado_reverso" onCaptura={handleDocumento} valor={documentos.ci_apoderado_reverso}/>
                <CapturaDocumento label="Certificado nacimiento" tipo="certificado_nacimiento" onCaptura={handleDocumento} valor={documentos.certificado_nacimiento}/>
                <CapturaDocumento label="Cert. estudios último año" tipo="certificado_estudios" onCaptura={handleDocumento} valor={documentos.certificado_estudios}/>
                <CapturaDocumento label="Cuenta servicio básico" tipo="cuenta_servicios" onCaptura={handleDocumento} valor={documentos.cuenta_servicios}/>
                <CapturaDocumento label="Certificado médico" tipo="certificado_medico" onCaptura={handleDocumento} valor={documentos.certificado_medico}/>
              </div>
              <p className="text-[10px] text-[#9ca3af] mt-3">El certificado de estudios no es requerido para postulantes a Ciclo 0 (Kinder) y Ciclo 1. El certificado médico aplica solo si el alumno tiene un diagnóstico.</p>
            </details>
          </div>

          {/* Observaciones */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={e => setForm(p => ({...p, observaciones: e.target.value}))} className="input-base min-h-[60px] resize-none text-[12px]" placeholder="Notas adicionales sobre la matrícula..."/>
          </div>

          {/* Botón */}
          <div className="flex gap-3">
            <button onClick={() => setVista('lista')} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleMatricular} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Procesando matrícula...' : 'Completar matrícula'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
