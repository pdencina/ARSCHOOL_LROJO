'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Credenciales incorrectas.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center font-display font-bold text-white">
              AR
            </div>
            <span className="font-display font-semibold text-white text-lg">AR School</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Plataforma educacional<br />integral
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Comunicados, asistencias, calificaciones y cobranzas — todo en un solo lugar para AR School Global.
          </p>
        </div>
        <div className="relative">
          <div className="grid grid-cols-3 gap-3">
            {[
              { n: '3', label: 'Sedes' },
              { n: '500+', label: 'Alumnos' },
              { n: '100%', label: 'Digital' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="font-display font-bold text-white text-2xl">{s.n}</div>
                <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-display font-bold text-white text-sm">AR</div>
            <span className="font-display font-semibold text-slate-900 text-lg">AR School</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Bienvenido</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresa con tu cuenta de AR School Global</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Correo electronico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-base"
                placeholder="usuario@arschoolglobal.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-base"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 mt-2 text-sm"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/forgot-password" className="text-xs text-blue-600 hover:underline">Olvidaste tu contrasena?</a>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">AR School Global · Fundacion ARM Global</p>
          </div>
        </div>
      </div>
    </div>
  )
}