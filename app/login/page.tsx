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
    <div className="min-h-screen bg-[#1B3A5C] flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8722A]/5 via-transparent to-[#5B8FA8]/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E8722A]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#5B8FA8]/5 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-4 mb-16">
            <div className="bg-white rounded-xl p-2">
              <Image src="/logo-arschool.png" alt="AR School" width={120} height={40} className="h-10 w-auto"/>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Sistema integral de<br/>gestión escolar
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-md">
            Administra comunicados, asistencias, calificaciones y aportes de manera centralizada y profesional.
          </p>
        </div>

        <div className="relative">
          <div className="flex items-center gap-6">
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-4 backdrop-blur-sm">
              <Image src="/logo-arschool.png" alt="AR School" width={140} height={50} className="h-8 w-auto invert opacity-80"/>
            </div>
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-4 backdrop-blur-sm">
              <Image src="/logo-playgroup.png" alt="Play and Group" width={140} height={50} className="h-8 w-auto invert opacity-80"/>
            </div>
          </div>
          <div className="mt-4 text-white/30 text-[10px] uppercase tracking-[0.15em]">Fundación ARM Global</div>
        </div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="bg-[#f3f4f6] rounded-lg p-1.5">
              <Image src="/logo-arschool.png" alt="AR School" width={100} height={36} className="h-7 w-auto"/>
            </div>
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
