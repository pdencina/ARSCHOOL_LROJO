'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  becas: any[]
  alumnos: any[]
  anioEscolar: number
  rol: string
}

const ESTADOS: Record<string, { label: string; color: string }> = {
  postulada:   { label: 'Postulada',   color: 'bg-blue-100 text-blue-700' },
  en_revision: { label: 'En revisión', color: 'bg-amber-100 text-amber-700' },
  aprobada:    { label: 'Aprobada',    color: 'bg-emerald-100 text-emerald-700' },
  rechazada:   { label: 'Rechazada',   color: 'bg-red-100 text-red-700' },
  vigente:     { label: 'Vigente',     color: 'bg-emerald-200 text-emerald-800' },
  vencida:     { label: 'Vencida',     color: 'bg-slate-100 text-slate-500' },
  revocada:    { label: 'Revocada',    color: 'bg-red-200 text-red-800' },
}

export default function BecasClient({ becas, alumnos, anioEscolar, rol }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista')
  const [saving, setSaving] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [form, setForm] = useState({
    alumno_id: '',
    tipo: 'socioeconomica' as 'socioeconomica' | 'especial',
    porcentaje: 0,
    observaciones: '',
  })

  const becasFiltradas = filtroEstado ? becas.filter(b => b.estado === filtroEstado) : becas
  const puedeGestionar = ['super_admin', 'admin', 'pastor_campus'].includes(rol)

  // KPIs
  const totalBecas = becas.length
  const aprobadas = becas.filter(b => ['aprobada', 'vigente'].includes(b.estado)).length
  const pendientes = becas.filter(b => ['postulada', 'en_revision'].includes(b.estado)).length

  async function handleCrear() {
    if (!form.alumno_id) { toast.error('Seleccione un alumno'); return }
    if (!form.porcentaje || form.porcentaje <= 0 || form.porcentaje > 100) { toast.error('Porcentaje debe ser entre 1 y 100'); return }
    setSaving(true)

    const res = await fetch('/api/becas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, anio_escolar: anioEscolar }),
    })

    if (res.ok) {
      toast.success(form.tipo === 'especial' ? 'Beca especial asignada' : 'Postulación registrada')
      setVista('lista')
      setForm({ alumno_id: '', tipo: 'socioeconomica', porcentaje: 0, observaciones: '' })
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al crear beca')
    }
    setSaving(false)
  }

  async function handleAccion(becaId: string, accion: string, motivo?: string) {
    const res = await fetch('/api/becas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beca_id: becaId, accion, motivo }),
    })
    if (res.ok) {
      toast.success(`Beca ${accion === 'aprobar' ? 'aprobada' : accion === 'rechazar' ? 'rechazada' : accion === 'activar' ? 'activada' : accion === 'revocar' ? 'revocada' : 'actualizada'}`)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Becas {anioEscolar}</h1>
          <p className="page-subtitle">Gestión de becas y beneficios educacionales</p>
        </div>
        {vista === 'lista' ? (
          <button onClick={() => setVista('nueva')} className="btn-primary">
            <i className="ti ti-plus text-sm" aria-hidden="true"/> Nueva beca
          </button>
        ) : (
          <button onClick={() => setVista('lista')} className="btn-secondary">
            <i className="ti ti-arrow-left text-sm" aria-hidden="true"/> Volver
          </button>
        )}
      </div>

      {vista === 'lista' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="kpi-card"><div className="kpi-label">Total postulaciones</div><div className="kpi-value">{totalBecas}</div></div>
            <div className="kpi-card"><div className="kpi-label">Aprobadas / Vigentes</div><div className="kpi-value text-emerald-600">{aprobadas}</div></div>
            <div className="kpi-card"><div className="kpi-label">Pendientes de revisión</div><div className="kpi-value text-amber-600">{pendientes}</div></div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setFiltroEstado('')} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${!filtroEstado ? 'bg-[#1a2332] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todas</button>
            <button onClick={() => setFiltroEstado('postulada')} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${filtroEstado === 'postulada' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Postuladas</button>
            <button onClick={() => setFiltroEstado('en_revision')} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${filtroEstado === 'en_revision' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>En revisión</button>
            <button onClick={() => setFiltroEstado('aprobada')} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${filtroEstado === 'aprobada' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Aprobadas</button>
            <button onClick={() => setFiltroEstado('vigente')} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${filtroEstado === 'vigente' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Vigentes</button>
          </div>

          {/* Tabla */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                  {['Alumno', 'Curso', 'Tipo', 'Porcentaje', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {becasFiltradas.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center">
                    <i className="ti ti-school text-3xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
                    <p className="text-[#9ca3af] text-sm">No hay becas {filtroEstado ? `en estado "${filtroEstado}"` : `para ${anioEscolar}`}</p>
                  </td></tr>
                ) : becasFiltradas.map((b: any) => (
                  <tr key={b.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc]">
                    <td className="px-4 py-3.5 font-medium text-[#1a2332]">{b.alumno?.nombre} {b.alumno?.apellido}</td>
                    <td className="px-4 py-3.5 text-[#6b7280]">{b.alumno?.curso}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${b.tipo === 'especial' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {b.tipo === 'especial' ? 'Especial' : 'Socioeconómica'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#1a2332]">{b.porcentaje}%</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${ESTADOS[b.estado]?.color ?? 'bg-slate-100 text-slate-500'}`}>
                        {ESTADOS[b.estado]?.label ?? b.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {puedeGestionar && (
                        <div className="flex gap-1.5">
                          {b.estado === 'postulada' && (
                            <>
                              <button onClick={() => handleAccion(b.id, 'revisar')} className="text-[10px] text-amber-600 hover:underline font-medium">Revisar</button>
                              <button onClick={() => handleAccion(b.id, 'aprobar')} className="text-[10px] text-emerald-600 hover:underline font-medium">Aprobar</button>
                              <button onClick={() => handleAccion(b.id, 'rechazar', 'No cumple requisitos')} className="text-[10px] text-red-600 hover:underline font-medium">Rechazar</button>
                            </>
                          )}
                          {b.estado === 'en_revision' && (
                            <>
                              <button onClick={() => handleAccion(b.id, 'aprobar')} className="text-[10px] text-emerald-600 hover:underline font-medium">Aprobar</button>
                              <button onClick={() => handleAccion(b.id, 'rechazar', 'No cumple requisitos')} className="text-[10px] text-red-600 hover:underline font-medium">Rechazar</button>
                            </>
                          )}
                          {b.estado === 'aprobada' && (
                            <button onClick={() => handleAccion(b.id, 'activar')} className="text-[10px] text-emerald-700 hover:underline font-medium">Activar</button>
                          )}
                          {b.estado === 'vigente' && (
                            <button onClick={() => handleAccion(b.id, 'revocar', 'Incumplimiento de pagos')} className="text-[10px] text-red-600 hover:underline font-medium">Revocar</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Formulario nueva beca */}
      {vista === 'nueva' && (
        <div className="max-w-lg">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-[14px] font-semibold text-[#1a2332]">Registrar beca {anioEscolar}</h2>

            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Alumno *</label>
              <select value={form.alumno_id} onChange={e => setForm(p => ({...p, alumno_id: e.target.value}))} className="select-base w-full">
                <option value="">Seleccionar alumno</option>
                {alumnos.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.apellido}, {a.nombre} — {a.curso}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Tipo de beca *</label>
              <select value={form.tipo} onChange={e => setForm(p => ({...p, tipo: e.target.value as any}))} className="select-base w-full">
                <option value="socioeconomica">Socioeconómica (con documentación)</option>
                <option value="especial">Especial (asignada por equipo directivo)</option>
              </select>
              {form.tipo === 'especial' && (
                <p className="text-[10px] text-purple-600 mt-1">Las becas especiales se aprueban automáticamente al registrar.</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Porcentaje de descuento (%) *</label>
              <input type="number" min="1" max="100" value={form.porcentaje || ''} onChange={e => setForm(p => ({...p, porcentaje: parseInt(e.target.value) || 0}))} className="input-base" placeholder="Ej: 30"/>
              <p className="text-[10px] text-[#9ca3af] mt-1">Aplica solo al aporte mensual. La matrícula se excluye siempre.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => setForm(p => ({...p, observaciones: e.target.value}))} className="input-base min-h-[60px] resize-none text-[12px]" placeholder="Motivo, contexto familiar, etc."/>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setVista('lista')} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCrear} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? 'Guardando...' : form.tipo === 'especial' ? 'Asignar beca' : 'Registrar postulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
