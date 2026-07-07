'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  usuario: any
  alumnos: any[]
}

export default function PortalPerfilClient({ usuario, alumnos }: Props) {
  const supabase = createClient()
  const [cambiandoPass, setCambiandoPass] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCambiarPassword() {
    if (password.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    if (password !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Error al cambiar contraseña')
    } else {
      toast.success('Contraseña actualizada')
      setCambiandoPass(false)
      setPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="page-title">Mi perfil</h1>
        <p className="page-subtitle">Información de tu cuenta y familia</p>
      </div>

      {/* Datos personales */}
      <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5 mb-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a2332] to-[#3a4a5e] flex items-center justify-center text-white text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </div>
          <div>
            <div className="text-[16px] font-bold text-[#1a2332]" style={{ fontFamily: 'var(--font-display)' }}>{usuario?.nombre} {usuario?.apellido}</div>
            <div className="text-[12px] text-[#6b7280]">{usuario?.email}</div>
            <span className="inline-flex items-center mt-1 gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f0f4f8] text-[#2c4a6e] uppercase tracking-wider">
              <i className="ti ti-heart-handshake text-[10px]" aria-hidden="true"/> Apoderado
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-[#f3f4f6] pt-4">
          <div>
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-0.5">Colegio</div>
            <div className="text-[13px] text-[#1a2332]">{usuario?.colegio?.nombre ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-0.5">Email</div>
            <div className="text-[13px] text-[#1a2332]">{usuario?.email ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Hijos vinculados */}
      <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5 mb-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 mb-4">
          <i className="ti ti-users text-[var(--ar-accent)]" aria-hidden="true"/>
          <h2 className="text-[14px] font-bold text-[#1a2332]">Mis hijos/as</h2>
        </div>
        {alumnos.length === 0 ? (
          <p className="text-[13px] text-[#9ca3af]">No hay alumnos vinculados a tu cuenta.</p>
        ) : (
          <div className="space-y-2">
            {alumnos.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-[#f9fafb] rounded-lg">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[12px] font-bold">
                  {a.nombre?.[0]}{a.apellido?.[0]}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[#1a2332]">{a.nombre} {a.apellido}</div>
                  <div className="text-[11px] text-[#6b7280]">{a.curso}{a.rut ? ` · ${a.rut}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <i className="ti ti-lock text-[var(--ar-accent)]" aria-hidden="true"/>
            <h2 className="text-[14px] font-bold text-[#1a2332]">Seguridad</h2>
          </div>
          {!cambiandoPass && (
            <button onClick={() => setCambiandoPass(true)} className="btn-secondary text-xs">
              <i className="ti ti-key text-xs" aria-hidden="true"/> Cambiar contraseña
            </button>
          )}
        </div>

        {cambiandoPass && (
          <div className="space-y-3 border-t border-[#f3f4f6] pt-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Nueva contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#e8eaed] rounded-lg text-[13px] focus:outline-none focus:border-[#1a2332] focus:ring-1 focus:ring-[#1a2332]" placeholder="Mínimo 6 caracteres" minLength={6}/>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Confirmar contraseña</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#e8eaed] rounded-lg text-[13px] focus:outline-none focus:border-[#1a2332] focus:ring-1 focus:ring-[#1a2332]" placeholder="Repetir contraseña" minLength={6}/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setCambiandoPass(false); setPassword(''); setConfirmPassword('') }} className="btn-secondary text-xs">Cancelar</button>
              <button onClick={handleCambiarPassword} disabled={loading} className="btn-primary text-xs disabled:opacity-60">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {!cambiandoPass && (
          <p className="text-[12px] text-[#9ca3af]">Tu contraseña está configurada. Puedes cambiarla cuando quieras.</p>
        )}
      </div>
    </div>
  )
}
