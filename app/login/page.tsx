'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Credenciales incorrectas.')
      setLoading(false)
      return
    }
    const { data: usuario } = await supabase.from('usuarios').select('rol, colegio_id').eq('id', data.user.id).single()
    const rol = (usuario as any)?.rol
    const colegioId = (usuario as any)?.colegio_id

    if (rol === 'super_admin' && !colegioId) {
      router.push('/super-admin')
    } else if (['apoderado', 'alumno'].includes(rol)) {
      router.push('/portal')
    } else {
      router.push('/inicio')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-blue-900/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-20">
            <Image src="/logo.svg" alt="AR School" width={44} height={44} className="rounded-lg"/>
            <div>
              <span className="font-display font-bold text-white text-lg tracking-wide">AR SCHOOL</span>
              <div className="text-white/30 text-[10px] uppercase tracking-[0.2em]">Gestión Educacional</div>
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-5">
            Sistema integral de<br/>gestión escolar
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-md">
            Administra comunicados, asistencias, calificaciones y cobranzas de manera centralizada y profesional.
          </p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: 'Multi-sede', label: 'Gestión centralizada', icon: '🏫' },
              { n: 'Tiempo real', label: 'Datos actualizados', icon: '⚡' },
              { n: 'Seguro', label: 'Datos protegidos', icon: '🔒' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 backdrop-blur-sm">
                <div className="text-lg mb-2">{s.icon}</div>
                <div className="font-display font-semibold text-white text-sm">{s.n}</div>
                <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Image src="/logo.svg" alt="AR School" width={38} height={38} className="rounded-lg"/>
            <span className="font-display font-bold text-slate-900 text-lg tracking-wide">AR SCHOOL</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Iniciar sesión</h2>
          <p className="text-slate-400 text-sm mb-8">Ingresa con tu cuenta institucional</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-base h-11"
                placeholder="usuario@institucion.org"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-base h-11"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0F1B2D] hover:bg-[#1a2d47] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 text-sm tracking-wide"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/forgot-password" className="text-xs text-slate-400 hover:text-blue-600 transition-colors">¿Olvidaste tu contraseña?</a>
          </div>

          <div className="mt-16 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-300 uppercase tracking-widest">AR School · Fundación ARM Global</p>
          </div>
        </div>
      </div>
    </div>
  )
}
