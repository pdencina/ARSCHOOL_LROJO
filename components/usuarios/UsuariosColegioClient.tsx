'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { usuarios: any[]; alumnos: any[]; colegioId: string }

const ROL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  admin:     { label: 'Admin',     color: 'text-blue-700',    bg: 'bg-blue-50',    icon: 'ti-briefcase' },
  tutor:     { label: 'Profesor',  color: 'text-violet-700',  bg: 'bg-violet-50',  icon: 'ti-school' },
  apoderado: { label: 'Apoderado', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'ti-heart-handshake' },
  alumno:    { label: 'Alumno',    color: 'text-amber-700',   bg: 'bg-amber-50',   icon: 'ti-backpack' },
}

export default function UsuariosColegioClient({ usuarios, alumnos, colegioId }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [showVincular, setShowVincular] = useState<any>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', rol: 'tutor' })
  const [alumnoVinc, setAlumnoVinc] = useState('')
  const [parentesco, setParentesco] = useState('apoderado')

  const filtrados = useMemo(() =>
    usuarios.filter(u => {
      if (filtroRol && u.rol !== filtroRol) return false
      if (busqueda && !`${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    }),
    [usuarios, filtroRol, busqueda]
  )

  async function handleCrear() {
    if (!form.nombre || !form.email || !form.password) { toast.error('Nombre, email y contraseña son requeridos'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Si es apoderado o alumno y se seleccionó un alumno para vincular
      if (form.rol === 'apoderado' && alumnoVinc) {
        await fetch('/api/usuarios/vincular', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: data.id, alumno_id: alumnoVinc, tipo: 'apoderado', parentesco }),
        })
      }
      if (form.rol === 'alumno' && alumnoVinc) {
        await fetch('/api/usuarios/vincular', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: data.id, alumno_id: alumnoVinc, tipo: 'alumno' }),
        })
      }

      toast.success('Usuario creado correctamente')
      setShowModal(false)
      setForm({ nombre: '', apellido: '', email: '', password: '', rol: 'tutor' })
      setAlumnoVinc('')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  async function handleVincular() {
    if (!showVincular || !alumnoVinc) { toast.error('Selecciona un alumno'); return }
    setLoading(true)
    try {
      const tipo = showVincular.rol === 'alumno' ? 'alumno' : 'apoderado'
      const res = await fetch('/api/usuarios/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: showVincular.id, alumno_id: alumnoVinc, tipo, parentesco }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Vinculación realizada')
      setShowVincular(null); setAlumnoVinc(''); router.refresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleDesactivar(id: string) {
    if (!confirm('¿Desactivar este usuario?')) return
    const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Usuario desactivado'); router.refresh() }
    else toast.error('Error al desactivar')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Usuarios del colegio</h1>
          <p className="text-sm text-slate-500 mt-0.5">{usuarios.length} usuarios · Gestiona profesores, apoderados y alumnos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nuevo usuario
        </button>
      </div>

      {/* Filtros por rol */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setFiltroRol('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!filtroRol ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
          Todos ({usuarios.length})
        </button>
        {Object.entries(ROL_CONFIG).map(([rol, cfg]) => {
          const count = usuarios.filter(u => u.rol === rol).length
          if (!count) return null
          return (
            <button key={rol} onClick={() => setFiltroRol(filtroRol === rol ? '' : rol)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filtroRol === rol ? `${cfg.bg} ${cfg.color} border-current` : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <i className={`ti ${cfg.icon} mr-1`} aria-hidden="true"/>{cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm mb-4">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input-base pl-9" placeholder="Buscar por nombre o email..."/>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Usuario', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">No hay usuarios.</td></tr>
            ) : filtrados.map((u: any) => {
              const cfg = ROL_CONFIG[u.rol] ?? ROL_CONFIG.tutor
              return (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center font-bold text-xs ${cfg.color}`}>
                        {u.nombre?.[0]}{u.apellido?.[0]}
                      </div>
                      <div className="font-semibold text-slate-800">{u.nombre} {u.apellido}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`tag ${cfg.bg} ${cfg.color}`}>
                      <i className={`ti ${cfg.icon} mr-1 text-xs`} aria-hidden="true"/>{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`tag ${u.activo ? 'tag-ok' : 'tag-gray'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {(u.rol === 'apoderado' || u.rol === 'alumno') && (
                      <button onClick={() => { setShowVincular(u); setAlumnoVinc('') }} className="text-xs text-violet-600 hover:underline">Vincular</button>
                    )}
                    {u.activo && (
                      <button onClick={() => handleDesactivar(u.id)} className="text-xs text-red-500 hover:underline">Desactivar</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal crear usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nuevo usuario</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Apellido</label>
                  <input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: e.target.value}))} className="input-base"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="input-base" placeholder="correo@email.com"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contraseña *</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} className="input-base" placeholder="Mínimo 6 caracteres"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Rol *</label>
                <select value={form.rol} onChange={e => setForm(p => ({...p, rol: e.target.value}))} className="select-base w-full">
                  {Object.entries(ROL_CONFIG).filter(([r]) => r !== 'admin').map(([r, c]) => (
                    <option key={r} value={r}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Vinculación para apoderado/alumno */}
              {(form.rol === 'apoderado' || form.rol === 'alumno') && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vincular a alumno {form.rol === 'apoderado' ? '(opcional)' : '(recomendado)'}
                  </div>
                  <select value={alumnoVinc} onChange={e => setAlumnoVinc(e.target.value)} className="select-base w-full">
                    <option value="">— Seleccionar alumno —</option>
                    {alumnos.map(a => <option key={a.id} value={a.id}>{a.apellido} {a.nombre} · {a.curso}</option>)}
                  </select>
                  {form.rol === 'apoderado' && alumnoVinc && (
                    <select value={parentesco} onChange={e => setParentesco(e.target.value)} className="select-base w-full">
                      {['apoderado','madre','padre','abuelo/a','tutor legal','otro'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCrear} disabled={loading} className="btn-primary disabled:opacity-60">
                {loading ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal vincular */}
      {showVincular && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Vincular a alumno</h3>
              <button onClick={() => setShowVincular(null)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Vincular <strong>{showVincular.nombre} {showVincular.apellido}</strong> ({showVincular.rol}) con un alumno:
              </p>
              <select value={alumnoVinc} onChange={e => setAlumnoVinc(e.target.value)} className="select-base w-full">
                <option value="">— Seleccionar alumno —</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.apellido} {a.nombre} · {a.curso}</option>)}
              </select>
              {showVincular.rol === 'apoderado' && (
                <select value={parentesco} onChange={e => setParentesco(e.target.value)} className="select-base w-full">
                  {['apoderado','madre','padre','abuelo/a','tutor legal','otro'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button onClick={() => setShowVincular(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleVincular} disabled={loading} className="btn-primary disabled:opacity-60">
                {loading ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
