'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { capitalizarNombre, formatearRut, validarRut, formatearTelefono, validarEmail, formatearFecha, fechaISOaDisplay, formatearMontoInput } from '@/lib/validaciones'

interface Props { planes: any[]; matriculas: any[]; cursos: string[] }

export default function MatriculaClient({ planes, matriculas, cursos }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista')
  const [saving, setSaving] = useState(false)
  const [fechaDisplay, setFechaDisplay] = useState('')
  const [montoMatDisplay, setMontoMatDisplay] = useState('')
  const [montoMensDisplay, setMontoMensDisplay] = useState('')
  const [apoderadoExiste, setApoderadoExiste] = useState<any>(null)
  const [buscandoApoderado, setBuscandoApoderado] = useState(false)
  const [form, setForm] = useState({
    // Alumno
    nombre: '', apellido: '', rut: '', curso: cursos[0] ?? '', fecha_nacimiento: '',
    direccion: '', nacionalidad: 'Chilena', necesidades_especiales: '',
    // Jornada
    jornada: 'completa',
    // Apoderado
    nombre_apoderado: '', apellido_apoderado: '', email_apoderado: '', telefono_apoderado: '',
    rut_apoderado: '', direccion_apoderado: '', parentesco: 'apoderado',
    // Cobros
    plan_cobro_id: '', monto_matricula: 0, monto_mensual: 0, meses_cobro: 10,
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
    if (!form.nombre || !form.apellido || !form.curso) { toast.error('Datos del alumno incompletos'); return }
    if (!form.nombre_apoderado || !form.email_apoderado) { toast.error('Datos del apoderado incompletos'); return }
    if (form.rut && !validarRut(form.rut)) { toast.error('RUT del alumno es inválido'); return }
    if (form.rut_apoderado && !validarRut(form.rut_apoderado)) { toast.error('RUT del apoderado es inválido'); return }
    if (!validarEmail(form.email_apoderado)) { toast.error('Email del apoderado es inválido'); return }
    setSaving(true)

    const res = await fetch('/api/matriculas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (res.ok) {
      toast.success(`Matrícula completada — ${data.cobros_generados} cobros generados`)
      // Abrir contrato en nueva pestaña
      if (data.matricula?.id) {
        window.open(`/api/contratos?matricula_id=${data.matricula.id}`, '_blank')
      }
      setVista('lista')
      router.refresh()
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
                        <a href={`/matricula/firmar/${m.id}`} className="text-[11px] text-[#2c4a6e] hover:underline font-medium">
                          {m.firma_apoderado ? '✓ Firmado' : 'Firmar'}
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
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Nombre"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Apellido *</label><input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Apellido"/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">RUT</label>
                <input value={form.rut} onChange={e => setForm(p => ({...p, rut: formatearRut(e.target.value)}))} className={`input-base ${form.rut && !validarRut(form.rut) ? 'border-red-300 focus:ring-red-200' : ''}`} placeholder="12.345.678-9" maxLength={12}/>
                {form.rut && !validarRut(form.rut) && <span className="text-[10px] text-[#c53030] mt-0.5 block">RUT inválido</span>}
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Curso *</label>
                <select value={form.curso} onChange={e => setForm(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                  {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Jornada</label>
                <select value={form.jornada} onChange={e => setForm(p => ({...p, jornada: e.target.value}))} className="select-base w-full">
                  <option value="completa">Jornada Completa</option>
                  <option value="am">Media Jornada AM (08:00 - 13:00)</option>
                  <option value="pm">Media Jornada PM (13:00 - 18:00)</option>
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Fecha nacimiento</label><input value={fechaDisplay} onChange={e => { const f = formatearFecha(e.target.value); setFechaDisplay(f.display); if(f.value) setForm(p => ({...p, fecha_nacimiento: f.value})) }} className="input-base" placeholder="DD-MM-AAAA" maxLength={10}/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nacionalidad</label><input value={form.nacionalidad} onChange={e => setForm(p => ({...p, nacionalidad: capitalizarNombre(e.target.value)}))} className="input-base"/></div>
            </div>
          </div>

          {/* Paso 2: Datos del apoderado */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">2</div>
              <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Datos del apoderado</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre_apoderado} onChange={e => setForm(p => ({...p, nombre_apoderado: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Nombre"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Apellido</label><input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: capitalizarNombre(e.target.value)}))} className="input-base" placeholder="Apellido"/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Email *</label>
                <input type="email" value={form.email_apoderado} onChange={e => setForm(p => ({...p, email_apoderado: e.target.value.toLowerCase()}))} onBlur={e => buscarApoderado(e.target.value)} className={`input-base ${form.email_apoderado && !validarEmail(form.email_apoderado) ? 'border-red-300 focus:ring-red-200' : ''}`} placeholder="correo@email.com"/>
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
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono</label><input value={form.telefono_apoderado} onChange={e => setForm(p => ({...p, telefono_apoderado: formatearTelefono(e.target.value)}))} className="input-base" placeholder="+56 9 1234 5678" maxLength={16}/></div>
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
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input type="checkbox" checked={form.crear_cuenta_apoderado} onChange={e => setForm(p => ({...p, crear_cuenta_apoderado: e.target.checked}))} className="rounded"/>
              <span className="text-[13px] text-[#4b5563]">Crear cuenta de acceso al portal para el apoderado</span>
            </label>
          </div>

          {/* Paso 3: Plan de cobro */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">3</div>
              <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Plan de cobro</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Monto matrícula ($)</label><input value={montoMatDisplay} onChange={e => { const m = formatearMontoInput(e.target.value); setMontoMatDisplay(m.display); setForm(p => ({...p, monto_matricula: m.value})) }} className="input-base" placeholder="0"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Mensualidad ($)</label><input value={montoMensDisplay} onChange={e => { const m = formatearMontoInput(e.target.value); setMontoMensDisplay(m.display); setForm(p => ({...p, monto_mensual: m.value})) }} className="input-base" placeholder="0"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Meses a cobrar</label><input type="number" min="1" max="12" value={form.meses_cobro} onChange={e => setForm(p => ({...p, meses_cobro: parseInt(e.target.value) || 10}))} className="input-base"/></div>
            </div>
            {form.monto_mensual > 0 && (
              <div className="mt-3 bg-[#f9fafb] rounded-lg p-3 text-[12px] text-[#4b5563]">
                <strong>Resumen:</strong> Matrícula ${form.monto_matricula.toLocaleString('es-CL')} + {form.meses_cobro} cuotas de ${form.monto_mensual.toLocaleString('es-CL')} = <strong className="text-[#1a2332]">${(form.monto_matricula + form.monto_mensual * form.meses_cobro).toLocaleString('es-CL')} total año</strong>
              </div>
            )}
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
