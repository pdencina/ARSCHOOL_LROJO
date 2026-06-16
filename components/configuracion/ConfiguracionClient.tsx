'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Props {
  usuario: any
  stats: { alumnos: number; usuarios: number; cursos: number }
}

export default function ConfiguracionClient({ usuario, stats }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const colegio = usuario?.colegio
  const [editando, setEditando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: colegio?.nombre ?? '',
    rut: colegio?.rut ?? '',
    direccion: colegio?.direccion ?? '',
    telefono: colegio?.telefono ?? '',
  })

  // Cambiar contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwords, setPasswords] = useState({ nueva: '', confirmar: '' })
  const [savingPass, setSavingPass] = useState(false)

  async function handleGuardarColegio() {
    setSaving(true)
    const res = await fetch('/api/colegios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Datos del colegio actualizados')
      setEditando(false)
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Error al guardar')
    }
    setSaving(false)
  }

  async function handleCambiarPassword() {
    if (passwords.nueva.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (passwords.nueva !== passwords.confirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.nueva })
    if (error) {
      toast.error('Error al cambiar la contraseña')
    } else {
      toast.success('Contraseña actualizada')
      setShowPasswordModal(false)
      setPasswords({ nueva: '', confirmar: '' })
    }
    setSavingPass(false)
  }

  const canEdit = ['super_admin', 'admin'].includes(usuario?.rol)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Datos del colegio y cuenta</p>
      </div>

      <div className="space-y-5">
        {/* Info colegio */}
        {colegio && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 font-display">Información del colegio</h2>
              {canEdit && !editando && (
                <button onClick={() => setEditando(true)} className="btn-secondary text-xs">
                  <i className="ti ti-pencil text-xs" aria-hidden="true"/> Editar
                </button>
              )}
            </div>

            {editando ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                    <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">RUT</label>
                    <input value={form.rut} onChange={e => setForm(p => ({...p, rut: e.target.value}))} className="input-base" placeholder="12.345.678-9"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dirección</label>
                    <input value={form.direccion} onChange={e => setForm(p => ({...p, direccion: e.target.value}))} className="input-base"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                    <input value={form.telefono} onChange={e => setForm(p => ({...p, telefono: e.target.value}))} className="input-base" placeholder="+56 2 1234 5678"/>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleGuardarColegio} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditando(false)} className="btn-secondary text-sm">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Nombre', val: colegio.nombre ?? '—' },
                  { label: 'RUT', val: colegio.rut ?? '—' },
                  { label: 'Dirección', val: colegio.direccion ?? '—' },
                  { label: 'Teléfono', val: colegio.telefono ?? '—' },
                  { label: 'Plan', val: colegio.plan ?? '—' },
                  { label: 'Creado', val: new Date(colegio.created_at).toLocaleDateString('es-CL') },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</div>
                    <div className="text-slate-800 font-medium">{f.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Alumnos activos', val: stats.alumnos, icon: 'ti-users', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Usuarios', val: stats.usuarios, icon: 'ti-user-cog', color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Cursos', val: stats.cursos, icon: 'ti-school', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
                <i className={`ti ${k.icon} ${k.color}`} aria-hidden="true"/>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{k.label}</div>
                <div className={`font-display text-xl font-bold ${k.color}`}>{k.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mi cuenta */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 font-display">Mi cuenta</h2>
            <button onClick={() => setShowPasswordModal(true)} className="btn-secondary text-xs">
              <i className="ti ti-lock text-xs" aria-hidden="true"/> Cambiar contraseña
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Nombre', val: `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}` },
              { label: 'Email', val: usuario?.email ?? '—' },
              { label: 'Rol', val: usuario?.rol ?? '—' },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</div>
                <div className="text-slate-800 font-medium">{f.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal cambiar contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Cambiar contraseña</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
                <input type="password" value={passwords.nueva} onChange={e => setPasswords(p => ({...p, nueva: e.target.value}))} className="input-base" placeholder="Mínimo 6 caracteres"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar</label>
                <input type="password" value={passwords.confirmar} onChange={e => setPasswords(p => ({...p, confirmar: e.target.value}))} className="input-base" placeholder="Repetir contraseña"/>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCambiarPassword} disabled={savingPass} className="btn-primary disabled:opacity-60">
                {savingPass ? 'Actualizando...' : 'Cambiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
