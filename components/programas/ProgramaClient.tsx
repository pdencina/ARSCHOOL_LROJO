'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { PROGRAMA_CONFIG } from '@/lib/programas'

interface Props {
  programa: any
  inscripciones: any[]
  matriculas: any[]
  colegioId: string
}

export default function ProgramaClient({ programa, inscripciones, matriculas, colegioId }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista')
  const [saving, setSaving] = useState(false)
  const [esPrueba, setEsPrueba] = useState(false)
  const config = PROGRAMA_CONFIG[programa.codigo] || PROGRAMA_CONFIG.ar_school

  const [form, setForm] = useState({
    nombre: '', apellido: '', rut: '', fecha_nacimiento: '', sexo: '',
    nombre_apoderado: '', apellido_apoderado: '', email_apoderado: '', telefono_apoderado: '',
    horario: '', nivel: '', observaciones: '', sede: 'santiago',
  })

  async function handleInscribir() {
    if (!form.nombre || !form.apellido || !form.email_apoderado) {
      toast.error('Nombre, apellido y email del apoderado son requeridos')
      return
    }
    setSaving(true)
    try {
      // Crear alumno + familia + inscripción
      const res = await fetch('/api/matriculas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          curso: `${programa.nombre_corto} - ${form.nivel || 'General'}`,
          jornada: 'completa',
          sede: form.sede,
          tipo_ingreso: 'nuevo',
          nacionalidad: 'Chilena',
          pais_natal: 'Chile',
          crear_cuenta_apoderado: true,
          monto_matricula: 0,
          monto_mensual: 0,
          meses_cobro: programa.meses_cobro_default || 10,
          programa_id: programa.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Inscribir en el programa
      if (data.alumno?.id) {
        await fetch('/api/programas/inscripciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alumno_id: data.alumno.id,
            programa_id: programa.id,
            horario: form.horario,
            nivel: form.nivel,
            observaciones: form.observaciones,
            estado: esPrueba ? 'prueba' : 'activa',
          }),
        })
      }

      toast.success(esPrueba ? 'Clase de prueba registrada' : 'Inscripción completada')
      setVista('lista')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
            <i className={`ti ${config.icon} text-lg ${config.color}`} aria-hidden="true"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--ar-text)]" style={{ fontFamily: 'DM Sans' }}>{programa.nombre}</h1>
            <p className="text-xs text-[var(--ar-muted)]">{programa.descripcion}</p>
          </div>
        </div>
        {vista === 'lista' ? (
          <button onClick={() => setVista('nueva')} className="btn-primary">
            <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nueva inscripción
          </button>
        ) : (
          <button onClick={() => setVista('lista')} className="btn-secondary">
            <i className="ti ti-arrow-left text-sm" aria-hidden="true"/> Volver
          </button>
        )}
      </div>

      {/* KPIs */}
      {vista === 'lista' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="kpi-card"><div className="kpi-label">Inscritos activos</div><div className="kpi-value">{inscripciones.length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Matrículas</div><div className="kpi-value">{matriculas.length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Contratos firmados</div><div className="kpi-value text-[#2D5A3F]">{matriculas.filter(m => m.firma_apoderado).length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Pendientes firma</div><div className="kpi-value text-amber-600">{matriculas.filter(m => !m.firma_apoderado).length}</div></div>
          </div>

          {/* Tabla de inscritos */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                  {['Alumno', 'Nivel', 'Horario', 'Inscrito', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-[10px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inscripciones.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center">
                    <i className={`ti ${config.icon} text-3xl text-[#d1d5db] block mb-3`} aria-hidden="true"/>
                    <p className="text-[var(--ar-muted)] text-sm">No hay inscritos en {programa.nombre_corto}. Registra el primero.</p>
                  </td></tr>
                ) : inscripciones.map((ins: any) => (
                  <tr key={ins.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc]">
                    <td className="px-4 py-3.5 font-medium text-[var(--ar-text)]">{ins.alumno?.nombre} {ins.alumno?.apellido}</td>
                    <td className="px-4 py-3.5 text-[var(--ar-muted)]">{ins.nivel || '—'}</td>
                    <td className="px-4 py-3.5 text-[var(--ar-muted)] text-xs">{ins.horario || '—'}</td>
                    <td className="px-4 py-3.5 text-[var(--ar-muted)] text-xs">{new Date(ins.created_at).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3.5">
                      {ins.estado === 'prueba' ? (
                        <span className="tag tag-pend">Prueba</span>
                      ) : (
                        <span className="tag tag-ok">Activo</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/asistencias-sesion', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ alumno_id: ins.alumno?.id, programa_id: programa.id, estado: 'presente' }),
                              })
                              if (res.ok) toast.success(`Asistencia registrada: ${ins.alumno?.nombre}`)
                              else toast.error('Error al registrar')
                            } catch { toast.error('Error') }
                          }}
                          className="text-[10px] text-emerald-600 hover:underline font-medium"
                        >✓ Presente</button>
                        {matriculas.find((m: any) => m.alumno_id === ins.alumno?.id) ? (
                          <a href={`/api/contratos?alumno_id=${ins.alumno?.id}`} target="_blank" className="text-[10px] text-[var(--ar-accent)] hover:underline font-medium">Contrato</a>
                        ) : (
                          <span className="text-[10px] text-gray-400">Sin contrato</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Formulario nueva inscripción */}
      {vista === 'nueva' && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-bold text-[var(--ar-text)] mb-4">Datos del alumno</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Nombres completos"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Apellido *</label><input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: e.target.value}))} className="input-base" placeholder="Apellidos completos"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">RUT</label><input value={form.rut} onChange={e => setForm(p => ({...p, rut: e.target.value}))} className="input-base" placeholder="12.345.678-9"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Fecha nacimiento</label><input type="date" value={form.fecha_nacimiento} onChange={e => setForm(p => ({...p, fecha_nacimiento: e.target.value}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Sexo</label>
                <select value={form.sexo} onChange={e => setForm(p => ({...p, sexo: e.target.value}))} className="select-base w-full">
                  <option value="">Seleccionar</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option>
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nivel / Categoría</label>
                <select value={form.nivel} onChange={e => setForm(p => ({...p, nivel: e.target.value}))} className="select-base w-full">
                  <option value="">Seleccionar...</option>
                  {programa.codigo === 'lions_soccer' ? (
                    <>
                      <option value="Sub-6">Sub-6 (5-6 años)</option>
                      <option value="Sub-8">Sub-8 (7-8 años)</option>
                      <option value="Sub-10">Sub-10 (9-10 años)</option>
                      <option value="Sub-12">Sub-12 (11-12 años)</option>
                      <option value="Sub-14">Sub-14 (13-14 años)</option>
                      <option value="Sub-16">Sub-16 (15-16 años)</option>
                      <option value="Juvenil">Juvenil (17+)</option>
                    </>
                  ) : programa.codigo === 'ar_worship' ? (
                    <>
                      <optgroup label="Music and Play">
                        <option value="Music and Play (0-4 años)">Music and Play (0-4 años)</option>
                        <option value="Music and Play (4-7 años)">Music and Play (4-7 años)</option>
                      </optgroup>
                      <optgroup label="AR Worship School">
                        <option value="Ciclo 1 - Guitarra">Ciclo 1 — Guitarra (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Bajo">Ciclo 1 — Bajo (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Teclado">Ciclo 1 — Teclado (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Batería">Ciclo 1 — Batería (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Canto">Ciclo 1 — Canto (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Saxophone">Ciclo 1 — Saxophone (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Violín">Ciclo 1 — Violín (Sáb 09:30)</option>
                        <option value="Ciclo 2 - Guitarra">Ciclo 2 — Guitarra (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Bajo">Ciclo 2 — Bajo (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Teclado">Ciclo 2 — Teclado (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Batería">Ciclo 2 — Batería (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Canto">Ciclo 2 — Canto (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Saxophone">Ciclo 2 — Saxophone (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Violín">Ciclo 2 — Violín (Sáb 11:20)</option>
                      </optgroup>
                    </>
                  ) : (
                    <>
                      <option value="Iniciación">Iniciación (5-7 años)</option>
                      <option value="Básico">Básico (8-10 años)</option>
                      <option value="Intermedio">Intermedio (11-13 años)</option>
                      <option value="Avanzado">Avanzado (14-17 años)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Horario preferido</label>
              <input value={form.horario} onChange={e => setForm(p => ({...p, horario: e.target.value}))} className="input-base" placeholder="Ej: Martes y Jueves 16:00-17:30"/>
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Sede *</label>
              <select value={form.sede} onChange={e => setForm(p => ({...p, sede: e.target.value}))} className="select-base w-full">
                <option value="santiago">Sede Santiago</option>
                <option value="puente_alto">Sede Puente Alto</option>
                <option value="punta_arenas">Sede Punta Arenas</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-bold text-[var(--ar-text)] mb-4">Datos del apoderado</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre_apoderado} onChange={e => setForm(p => ({...p, nombre_apoderado: e.target.value}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Apellido</label><input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: e.target.value}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Email *</label><input type="email" value={form.email_apoderado} onChange={e => setForm(p => ({...p, email_apoderado: e.target.value}))} className="input-base" placeholder="correo@email.com"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Teléfono</label><input value={form.telefono_apoderado} onChange={e => setForm(p => ({...p, telefono_apoderado: e.target.value}))} className="input-base" placeholder="+56 9..."/></div>
            </div>
          </div>

          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={e => setForm(p => ({...p, observaciones: e.target.value}))} rows={3} className="input-base resize-none" placeholder="Notas adicionales..."/>
          </div>

          {/* Toggle clase de prueba */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div className="text-xs font-semibold text-[var(--ar-text)]">Clase de prueba</div>
              <div className="text-[10px] text-[var(--ar-muted)]">Registrar como prueba (no genera cobro, puede convertirse después)</div>
            </div>
            <button onClick={() => setEsPrueba(!esPrueba)} className={`w-10 h-5 rounded-full transition-colors ${esPrueba ? 'bg-[#2D5A3F]' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${esPrueba ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </button>
          </div>

          <button onClick={handleInscribir} disabled={saving} className="btn-primary w-full py-3">
            {saving ? 'Procesando...' : esPrueba ? `Registrar clase de prueba` : `Inscribir en ${programa.nombre_corto}`}
          </button>
        </div>
      )}
    </div>
  )
}
