'use client'

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'

interface Props {
  usuarios: any[]
  colegios: any[]
  colegioFiltro?: string
}

const ROL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-red-700',     bg: 'bg-red-50',     icon: 'ti-shield-check' },
  admin:       { label: 'Admin',       color: 'text-blue-700',    bg: 'bg-blue-50',    icon: 'ti-user-cog' },
  docente:     { label: 'Docente',     color: 'text-violet-700',  bg: 'bg-violet-50',  icon: 'ti-school' },
  tutor:       { label: 'Apoderado',   color: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'ti-heart-handshake' },
  alumno:      { label: 'Alumno',      color: 'text-amber-700',   bg: 'bg-amber-50',   icon: 'ti-backpack' },
}

const ROLES = ['admin', 'docente', 'tutor', 'alumno']

export default function UsuariosClient({ usuarios, colegios, colegioFiltro }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editUsuario, setEditUsuario] = useState<any>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroColegio, setFiltroColegio] = useState(colegioFiltro ?? '')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '',
    rol: 'admin', colegio_id: colegioFiltro ?? colegios[0]?.id ?? '',
  })

  const usuariosFiltrados = useMemo(() =>
    usuarios.filter(u => {
      const matchBusq = !busqueda || `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
      const matchRol = !filtroRol || u.rol === filtroRol
      const matchColegio = !filtroColegio || u.colegio_id === filtroColegio
      return matchBusq && matchRol && matchColegio
    }),
    [usuarios, busqueda, filtroRol, filtroColegio]
  )

  function openNuevo() {
    setEditUsuario(null)
    setForm({ nombre: '', apellido: '', email: '', password: '', rol: 'admin', colegio_id: colegioFiltro ?? colegios[0]?.id ?? '' })
    setShowModal(true)
  }

  function openEditar(u: any) {
    setEditUsuario(u)
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, password: '', rol: u.rol, colegio_id: u.colegio_id })
    setShowModal(true)
  }

  async function handleGuardar() {
    if (!form.nombre || !form.email || !form.colegio_id) {
      toast.error('Nombre, email y colegio son requeridos')
      return
    }
    if (!editUsuario && !form.password) {
      toast.error('La contraseña es requerida para nuevos usuarios')
      return
    }
    setLoading(true)
    try {
      const url = editUsuario ? `/api/admin/usuarios/${editUsuario.id}` : '/api/admin/usuarios'
      const method = editUsuario ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      toast.success(editUsuario ? 'Usuario actualizado' : 'Usuario creado correctamente')
      setShowModal(false)
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambiarRol(usuarioId: string, nuevoRol: string) {
    const res = await fetch(`/api/admin/usuarios/${usuarioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: nuevoRol }),
    })
    if (res.ok) {
      toast.success('Rol actualizado')
      window.location.reload()
    } else {
      toast.error('Error al actualizar rol')
    }
  }

  const contsPorRol = Object.keys(ROL_CONFIG).reduce((acc, rol) => {
    acc[rol] = usuarios.filter(u => u.rol === rol).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Gestión de usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{usuarios.length} usuarios registrados en la plataforma</p>
        </div>
        <button onClick={openNuevo} className="btn-primary">
          <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nuevo usuario
        </button>
      </div>

      {/* KPIs por rol */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(ROL_CONFIG).map(([rol, cfg]) => (
          <button key={rol} onClick={() => setFiltroRol(filtroRol === rol ? '' : rol)}
            className={`p-3 rounded-xl border text-left transition-all ${filtroRol === rol ? `border-current ${cfg.bg}` : 'bg-white border-slate-200 hover:border-slate-300'}`}>
            <div className={`flex items-center gap-1.5 mb-1 ${cfg.color}`}>
              <i className={`ti ${cfg.icon} text-sm`} aria-hidden="true"/>
              <span className="text-xs font-semibold">{cfg.label}</span>
            </div>
            <div className={`font-display text-2xl font-bold ${cfg.color}`}>{contsPorRol[rol] ?? 0}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input-base pl-9" placeholder="Buscar usuario..."/>
        </div>
        <select value={filtroColegio} onChange={e => setFiltroColegio(e.target.value)} className="select-base">
          <option value="">Todos los colegios</option>
          {colegios.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {filtroRol && (
          <button onClick={() => setFiltroRol('')} className="btn-secondary text-sm gap-1">
            <i className="ti ti-x text-xs" aria-hidden="true"/> {ROL_CONFIG[filtroRol]?.label}
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{usuariosFiltrados.length} resultado{usuariosFiltrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Usuario','Email','Colegio','Rol','Creado','Acciones'].map(h => (
                <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <i className="ti ti-users text-4xl text-slate-300 block mb-2" aria-hidden="true"/>
                <p className="text-slate-400 text-sm">No se encontraron usuarios.</p>
              </td></tr>
            ) : usuariosFiltrados.map((u: any) => {
              const cfg = ROL_CONFIG[u.rol] ?? ROL_CONFIG.admin
              return (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center font-bold text-xs flex-shrink-0 ${cfg.color}`}>
                        {u.nombre?.[0]}{u.apellido?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{u.nombre} {u.apellido}</div>
                        <div className="text-xs text-slate-400">{u.activo ? 'Activo' : 'Inactivo'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.colegio?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    {/* Selector de rol inline */}
                    <select
                      value={u.rol}
                      onChange={e => handleCambiarRol(u.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${cfg.bg} ${cfg.color}`}
                    >
                      {Object.entries(ROL_CONFIG).map(([r, c]) => (
                        <option key={r} value={r}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEditar(u)} className="text-xs text-blue-600 hover:underline mr-3">
                      Editar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-white">
                  {editUsuario ? 'Editar usuario' : 'Nuevo usuario'}
                </h3>
                <p className="text-white/50 text-xs mt-0.5">
                  {editUsuario ? `${editUsuario.nombre} ${editUsuario.apellido}` : 'Crear cuenta en AR School'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Nombre"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Apellido</label>
                  <input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: e.target.value}))} className="input-base" placeholder="Apellido"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="input-base" placeholder="correo@arschool.cl" disabled={!!editUsuario}/>
                {editUsuario && <p className="text-xs text-slate-400 mt-1">El email no se puede modificar</p>}
              </div>
              {!editUsuario && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contraseña *</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} className="input-base" placeholder="Mínimo 8 caracteres"/>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rol *</label>
                  <select value={form.rol} onChange={e => setForm(p => ({...p, rol: e.target.value}))} className="select-base w-full">
                    {Object.entries(ROL_CONFIG).map(([r, c]) => (
                      <option key={r} value={r}>{c.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {form.rol === 'tutor' ? 'Portal de apoderado — solo ve a su hijo/a' :
                     form.rol === 'alumno' ? 'Portal de alumno — solo ve sus datos' :
                     form.rol === 'docente' ? 'Gestiona sus cursos asignados' :
                     form.rol === 'admin' ? 'Acceso completo a su colegio' :
                     'Acceso a todos los colegios ARM Global'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Colegio *</label>
                  <select value={form.colegio_id} onChange={e => setForm(p => ({...p, colegio_id: e.target.value}))} className="select-base w-full">
                    {colegios.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview del rol */}
              {form.rol && ROL_CONFIG[form.rol] && (
                <div className={`p-3 rounded-xl ${ROL_CONFIG[form.rol].bg} border border-current/10`}>
                  <div className={`flex items-center gap-2 ${ROL_CONFIG[form.rol].color}`}>
                    <i className={`ti ${ROL_CONFIG[form.rol].icon}`} aria-hidden="true"/>
                    <span className="text-sm font-semibold">{ROL_CONFIG[form.rol].label}</span>
                  </div>
                  <p className={`text-xs mt-1 ${ROL_CONFIG[form.rol].color} opacity-75`}>
                    {form.rol === 'super_admin' ? 'Ve y gestiona todos los colegios de la Fundación ARM Global' :
                     form.rol === 'admin' ? 'Acceso completo: comunicados, asistencias, calificaciones, cobranzas, alumnos y reportes' :
                     form.rol === 'docente' ? 'Acceso a fichas, comunicados, asistencias y calificaciones de sus cursos' :
                     form.rol === 'tutor' ? 'Portal familiar: ve comunicados, asistencias, notas y pagos de su hijo/a' :
                     'Portal personal: ve sus propias notas, asistencias y comunicados del colegio'}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={loading} className="btn-primary disabled:opacity-60">
                {loading ? 'Guardando...' : editUsuario ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}