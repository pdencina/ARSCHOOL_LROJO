'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

const SEDES: Record<string, string> = { santiago: 'Santiago', punta_arenas: 'Punta Arenas', puente_alto: 'Puente Alto' }
const TIPOS: Record<string, string> = { inicial: 'Aporte Inicial', mensual: 'Aporte Mensual' }
const MODALIDADES: Record<string, string> = { presencial: 'Presencial', online: 'Online' }
const JORNADAS: Record<string, string> = { completa: 'Completa', media: 'Media jornada' }

interface Aporte {
  id: string; nivel: string; modalidad: string; jornada: string | null; tipo: string; anio: number; sede: string | null; monto: number
}

interface Props { aportes: Aporte[] }

export default function TablaAportesClient({ aportes: initial }: Props) {
  const [aportes, setAportes] = useState<Aporte[]>(initial)
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear() + 1)
  const [editando, setEditando] = useState<string | null>(null)
  const [editMonto, setEditMonto] = useState(0)
  const [showNuevo, setShowNuevo] = useState(false)
  const [nuevo, setNuevo] = useState({ nivel: 'Playgroup', modalidad: 'presencial', jornada: 'completa', tipo: 'mensual', anio: new Date().getFullYear() + 1, sede: '', monto: 0 })
  const [beca, setBeca] = useState(0)

  const filtrados = aportes.filter(a => a.anio === anioFiltro)
  const iniciales = filtrados.filter(a => a.tipo === 'inicial')
  const mensuales = filtrados.filter(a => a.tipo === 'mensual')

  async function guardarEdicion(id: string) {
    const res = await fetch('/api/aportes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, monto: editMonto }) })
    if (res.ok) {
      setAportes(prev => prev.map(a => a.id === id ? { ...a, monto: editMonto } : a))
      setEditando(null)
      toast.success('Monto actualizado')
    } else toast.error('Error al guardar')
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    const res = await fetch(`/api/aportes?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAportes(prev => prev.filter(a => a.id !== id))
      toast.success('Eliminado')
    } else toast.error('Error')
  }

  async function crearNuevo() {
    if (!nuevo.monto) { toast.error('Ingrese un monto'); return }
    const body = { ...nuevo, sede: nuevo.sede || null, jornada: nuevo.jornada || null }
    const res = await fetch('/api/aportes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json()
      setAportes(prev => [...prev, data])
      setShowNuevo(false)
      setNuevo({ nivel: 'Playgroup', modalidad: 'presencial', jornada: 'completa', tipo: 'mensual', anio: anioFiltro, sede: '', monto: 0 })
      toast.success('Aporte creado')
    } else toast.error('Error al crear')
  }

  function renderTabla(items: Aporte[], titulo: string) {
    return (
      <div className="mb-8">
        <h3 className="text-[13px] font-bold text-[#1B3A5C] uppercase tracking-wider mb-3">{titulo}</h3>
        <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-left">Nivel</th>
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-left">Modalidad</th>
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-left">Jornada</th>
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-left">Sede</th>
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-right">Monto</th>
                {beca > 0 && <th className="text-[10px] font-semibold text-[var(--ar-accent)] uppercase tracking-wider px-4 py-3 text-right">Con beca ({beca}%)</th>}
                <th className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-4 py-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={beca > 0 ? 7 : 6} className="px-4 py-8 text-center text-[#9ca3af]">Sin registros para este año</td></tr>
              ) : items.map(a => (
                <tr key={a.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc]">
                  <td className="px-4 py-3 font-medium text-[#1B3A5C]">{a.nivel}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{MODALIDADES[a.modalidad] ?? a.modalidad}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{a.jornada ? JORNADAS[a.jornada] ?? a.jornada : 'Todas'}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{a.sede ? SEDES[a.sede] ?? a.sede : 'Todas'}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#1B3A5C]">
                    {editando === a.id ? (
                      <input type="number" value={editMonto} onChange={e => setEditMonto(parseInt(e.target.value) || 0)} className="w-24 px-2 py-1 border border-[var(--ar-border)] rounded text-right text-[12px]" autoFocus/>
                    ) : (
                      `$${a.monto.toLocaleString('es-CL')}`
                    )}
                  </td>
                  {beca > 0 && (
                    <td className="px-4 py-3 text-right font-bold text-[var(--ar-accent)]">
                      ${Math.round(a.monto * (1 - beca / 100)).toLocaleString('es-CL')}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    {editando === a.id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => guardarEdicion(a.id)} className="text-emerald-600 hover:text-emerald-800"><i className="ti ti-check text-sm"/></button>
                        <button onClick={() => setEditando(null)} className="text-[#9ca3af] hover:text-[#6b7280]"><i className="ti ti-x text-sm"/></button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => { setEditando(a.id); setEditMonto(a.monto) }} className="text-[#5B8FA8] hover:text-[#1B3A5C]"><i className="ti ti-pencil text-sm"/></button>
                        <button onClick={() => eliminar(a.id)} className="text-[#C15A3B] hover:text-red-700"><i className="ti ti-trash text-sm"/></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Tabla de Aportes</h1>
          <p className="page-subtitle">Configuración global de montos por nivel, modalidad y sede</p>
        </div>
        <button onClick={() => setShowNuevo(true)} className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nuevo aporte
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-[#6b7280] uppercase">Año:</label>
          <select value={anioFiltro} onChange={e => setAnioFiltro(parseInt(e.target.value))} className="select-base text-[12px] py-1.5">
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-[#6b7280] uppercase">Simular beca:</label>
          <input type="number" min="0" max="100" value={beca || ''} onChange={e => setBeca(parseInt(e.target.value) || 0)} className="w-16 px-2 py-1.5 border border-[var(--ar-border)] rounded-lg text-[12px] text-center" placeholder="0%"/>
          <span className="text-[11px] text-[#9ca3af]">%</span>
        </div>
      </div>

      {/* Tablas */}
      {renderTabla(iniciales, 'Aporte Inicial')}
      {renderTabla(mensuales, 'Aporte Mensual')}

      {/* Nota */}
      <div className="bg-[#FEF3EC] border border-[#E8722A]/20 rounded-xl p-4 text-[11px] text-[#6b4d3a]">
        <strong>Nota:</strong> Los aportes para niños/as con condición o necesidades educativas especiales se definen posterior a una entrevista con la Coordinadora General. El costo de dicho apoyo tendrá un valor adicional que se sumará al aporte mensual correspondiente.
      </div>

      {/* Modal nuevo */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowNuevo(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} style={{ boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-[15px] font-bold text-[#1B3A5C] mb-4">Nuevo registro de aporte</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Nivel</label>
                <select value={nuevo.nivel} onChange={e => setNuevo(p => ({...p, nivel: e.target.value}))} className="select-base w-full text-[12px]">
                  <option value="Playgroup">Playgroup</option>
                  <option value="Preschool a High School">Preschool a High School</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Tipo</label>
                <select value={nuevo.tipo} onChange={e => setNuevo(p => ({...p, tipo: e.target.value}))} className="select-base w-full text-[12px]">
                  <option value="inicial">Aporte Inicial</option>
                  <option value="mensual">Aporte Mensual</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Modalidad</label>
                <select value={nuevo.modalidad} onChange={e => setNuevo(p => ({...p, modalidad: e.target.value}))} className="select-base w-full text-[12px]">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Jornada</label>
                <select value={nuevo.jornada} onChange={e => setNuevo(p => ({...p, jornada: e.target.value}))} className="select-base w-full text-[12px]">
                  <option value="">Todas</option>
                  <option value="completa">Completa</option>
                  <option value="media">Media jornada</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Año</label>
                <input type="number" value={nuevo.anio} onChange={e => setNuevo(p => ({...p, anio: parseInt(e.target.value)}))} className="input-base text-[12px]"/>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Sede</label>
                <select value={nuevo.sede} onChange={e => setNuevo(p => ({...p, sede: e.target.value}))} className="select-base w-full text-[12px]">
                  <option value="">Todas las sedes</option>
                  <option value="santiago">Santiago</option>
                  <option value="punta_arenas">Punta Arenas</option>
                  <option value="puente_alto">Puente Alto</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Monto ($)</label>
                <input type="number" value={nuevo.monto || ''} onChange={e => setNuevo(p => ({...p, monto: parseInt(e.target.value) || 0}))} className="input-base text-[12px]" placeholder="260000"/>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNuevo(false)} className="btn-secondary flex-1 text-xs">Cancelar</button>
              <button onClick={crearNuevo} className="btn-primary flex-1 text-xs">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
