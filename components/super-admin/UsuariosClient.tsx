'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  usuarios: any[]
  colegios: { id: string; nombre: string }[]
}

const ROL_BADGE: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-orange-50 text-orange-700' },
  admin:       { label: 'Admin',       color: 'bg-blue-50 text-blue-700' },
  tutor:       { label: 'Tutor',       color: 'bg-emerald-50 text-emerald-700' },
  apoderado:   { label: 'Apoderado',   color: 'bg-slate-100 text-slate-600' },
  alumno:      { label: 'Alumno',      color: 'bg-purple-50 text-purple-600' },
}

const ROLES = ['super_admin', 'admin', 'tutor', 'apoderado', 'alumno']

const EMPTY_FORM = { nombre: '', apellido: '', email: '', password: '', rol: 'tutor', colegio_id: '' }

export default function UsuariosClient({ usuarios, colegios }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, colegio_id: colegios[0]?.id ?? '' })
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroColegio, setFiltroColegio] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const router = useRouter()

  const usuariosFiltrados = useMemo(() =>
    usuarios.filter(u =>
      (!filtroRol || u.rol === filtroRol) &&
      (!filtroColegio || u.colegio_id === filtroColegio) &&
      (!busqueda || `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase()))
    ),
    [usuarios, filtroRol, filtroColegio, busqueda]
  )

  async function handleCrear() {
    if (!form.nombre || !form.email || !form.password || !form.colegio_id) {
      toast.error('Nombre, email, contraseña y colegio son requeridos')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Usuario creado')
      setShowModal(false)
      setForm({ ...EMPTY_FORM, colegio_id: colegios[0]?.id ?? '' })
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Error al crear usuario')
    }
    setSaving(false)
  }

  async function handleToggleActivo(id: string, activo: boolean) {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo }),
    })
    if (res.ok) {
      toast.success(activo ? 'Usuario desactivado' : 'Usuario reactivado')
      router.refresh()
    } else {
      toast.error('Error al cambiar estado')
    }
  }

  async function handleCambiarRol(id: string, nuevoRol: string) {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: nuevoRol }),
    })
    if (res.ok) {
      toast.success(`Rol actualizado a ${ROL_BADGE[nuevoRol]?.label ?? nuevoRol}`)
      setEditingId(null)
      router.refresh()
    } else {
      toast.error('Error al cambiar rol')
    }
  }

  async function handleCambiarColegio(id: string, colegioId: string) {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colegio_id: colegioId }),
    })
    if (res.ok) {
      toast.success('Colegio actualizado')
      setEditingId(null)
      router.refresh()
    } else {
      toast.error('Error al cambiar colegio')
    }
  }

  const statsByRol = useMemo(() => {
    const r: Record<string, number> = {}
    usuarios.forEach(u => { if (u.activo) r[u.rol] = (r[u.rol] || 0) + 1 })
    return r
  }, [usuarios])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestión global de usuarios del sistema</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nuevo usuario
        </button>
      </div>

      {/* KPIs por rol */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {ROLES.map(rol => {
          const badge = ROL_BADGE[rol]
          return (
            <div key={rol} className="kpi-card">
              <div className="kpi-label">{badge.label}</div>
              <div className="kpi-value">{statsByRol[rol] ?? 0}</div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="input-base pl-9 text-[12px] w-full"
            placeholder="Buscar por nombre o email..."
          />
        </div>
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} className="select-base text-[12px]">
          <option value="">Todos los roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROL_BADGE[r].label}</option>)}
        </select>
        <select value={filtroColegio} onChange={e => setFiltroColegio(e.target.value)} className="select-base text-[12px]">
          <option value="">Todos los colegios</option>
          {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <span className="text-[11px] text-slate-400">{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Rol</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Colegio</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u: any) => {
                const badge = ROL_BADGE[u.rol] ?? ROL_BADGE.tutor
                const isEditing = editingId === u.id
                return (
                  <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${!u.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{u.nombre} {u.apellido}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          defaultValue={u.rol}
                          onChange={e => handleCambiarRol(u.id, e.target.value)}
                          className="select-base text-[11px] py-0.5 px-2"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{ROL_BADGE[r].label}</option>)}
                        </select>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {isEditing ? (
                        <select
                          defaultValue={u.colegio_id}
                          onChange={e => handleCambiarColegio(u.id, e.target.value)}
                          className="select-base text-[11px] py-0.5 px-2"
                        >
                          {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      ) : (
                        u.colegio?.nombre ?? '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditingId(isEditing ? null : u.id)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                          title={isEditing ? 'Cerrar edición' : 'Editar'}
                        >
                          <i className={`ti ${isEditing ? 'ti-x' : 'ti-edit'} text-sm`} aria-hidden="true"/>
                        </button>
                        <button
                          onClick={() => handleToggleActivo(u.id, u.activo)}
                          className={`p-1 rounded transition-colors ${u.activo ? 'text-slate-400 hover:text-red-600' : 'text-slate-400 hover:text-emerald-600'}`}
                          title={u.activo ? 'Desactivar' : 'Reactivar'}
                        >
                          <i className={`ti ${u.activo ? 'ti-user-off' : 'ti-user-check'} text-sm`} aria-hidden="true"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {usuariosFiltrados.length === 0 && (
          <div className="p-10 text-center">
            <i className="ti ti-users text-4xl text-slate-300 block mb-2" aria-hidden="true"/>
            <p className="text-slate-400 text-sm">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Modal crear usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-[#0F1B2D] px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nuevo usuario</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="María"/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Apellido</label>
                  <input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: e.target.value}))} className="input-base" placeholder="López"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="input-base" placeholder="usuario@escuela.cl"/>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Contraseña *</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} className="input-base" placeholder="Mínimo 6 caracteres"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Rol *</label>
                  <select value={form.rol} onChange={e => setForm(p => ({...p, rol: e.target.value}))} className="select-base w-full">
                    {ROLES.map(r => <option key={r} value={r}>{ROL_BADGE[r].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Colegio *</label>
                  <select value={form.colegio_id} onChange={e => setForm(p => ({...p, colegio_id: e.target.value}))} className="select-base w-full">
                    {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCrear} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
