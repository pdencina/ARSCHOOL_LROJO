'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { planes: any[]; matriculas: any[]; cursos: string[] }

export default function MatriculaClient({ planes, matriculas, cursos }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    // Alumno
    nombre: '', apellido: '', rut: '', curso: cursos[0] ?? '', fecha_nacimiento: '',
    direccion: '', nacionalidad: 'Chilena', necesidades_especiales: '',
    // Apoderado
    nombre_apoderado: '', apellido_apoderado: '', email_apoderado: '', telefono_apoderado: '',
    rut_apoderado: '', direccion_apoderado: '', parentesco: 'apoderado',
    // Cobros
    plan_cobro_id: '', monto_matricula: 0, monto_mensual: 0, meses_cobro: 10,
    // Config
    crear_cuenta_apoderado: true, password_apoderado: '',
    observaciones: '',
  })

  async function handleMatricular() {
    if (!form.nombre || !form.apellido || !form.curso) { toast.error('Datos del alumno incompletos'); return }
    if (!form.nombre_apoderado || !form.email_apoderado) { toast.error('Datos del apoderado incompletos'); return }
    setSaving(true)

    const res = await fetch('/api/matriculas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (res.ok) {
      toast.success(`Matrícula completada — ${data.cobros_generados} cobros generados`)
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
                  {['Alumno', 'Curso', 'Estado', 'Fecha', 'Monto matrícula'].map(h => (
                    <th key={h} className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriculas.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center">
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
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Nombre"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Apellido *</label><input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: e.target.value}))} className="input-base" placeholder="Apellido"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">RUT</label><input value={form.rut} onChange={e => setForm(p => ({...p, rut: e.target.value}))} className="input-base" placeholder="12.345.678-9"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Curso *</label>
                <select value={form.curso} onChange={e => setForm(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                  {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Fecha nacimiento</label><input type="date" value={form.fecha_nacimiento} onChange={e => setForm(p => ({...p, fecha_nacimiento: e.target.value}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nacionalidad</label><input value={form.nacionalidad} onChange={e => setForm(p => ({...p, nacionalidad: e.target.value}))} className="input-base"/></div>
            </div>
          </div>

          {/* Paso 2: Datos del apoderado */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">2</div>
              <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Datos del apoderado</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre_apoderado} onChange={e => setForm(p => ({...p, nombre_apoderado: e.target.value}))} className="input-base" placeholder="Nombre"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Apellido</label><input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: e.target.value}))} className="input-base" placeholder="Apellido"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Email *</label><input type="email" value={form.email_apoderado} onChange={e => setForm(p => ({...p, email_apoderado: e.target.value}))} className="input-base" placeholder="correo@email.com"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Teléfono</label><input value={form.telefono_apoderado} onChange={e => setForm(p => ({...p, telefono_apoderado: e.target.value}))} className="input-base" placeholder="+56 9 1234 5678"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">RUT apoderado</label><input value={form.rut_apoderado} onChange={e => setForm(p => ({...p, rut_apoderado: e.target.value}))} className="input-base" placeholder="12.345.678-9"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Parentesco</label>
                <select value={form.parentesco} onChange={e => setForm(p => ({...p, parentesco: e.target.value}))} className="select-base w-full">
                  {['apoderado','madre','padre','abuelo/a','tutor legal','otro'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
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
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Monto matrícula ($)</label><input type="number" value={form.monto_matricula} onChange={e => setForm(p => ({...p, monto_matricula: parseInt(e.target.value) || 0}))} className="input-base" placeholder="0"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Mensualidad ($)</label><input type="number" value={form.monto_mensual} onChange={e => setForm(p => ({...p, monto_mensual: parseInt(e.target.value) || 0}))} className="input-base" placeholder="0"/></div>
              <div><label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Meses a cobrar</label><input type="number" min="1" max="12" value={form.meses_cobro} onChange={e => setForm(p => ({...p, meses_cobro: parseInt(e.target.value) || 10}))} className="input-base"/></div>
            </div>
            {form.monto_mensual > 0 && (
              <div className="mt-3 bg-[#f9fafb] rounded-lg p-3 text-[12px] text-[#4b5563]">
                <strong>Resumen:</strong> Matrícula ${form.monto_matricula.toLocaleString('es-CL')} + {form.meses_cobro} cuotas de ${form.monto_mensual.toLocaleString('es-CL')} = <strong>${(form.monto_matricula + form.monto_mensual * form.meses_cobro).toLocaleString('es-CL')} total año</strong>
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
