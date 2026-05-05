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
      toast.error('Credenciales incorrectas. Intenta de nuevo.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-papel papel-rayado flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-azul rounded flex items-center justify-center">
            <span className="font-playfair font-black text-white text-xl">Fv</span>
          </div>
          <div>
            <div className="font-playfair font-bold text-2xl text-tinta">Folio Verde</div>
            <div className="font-mono text-xs tracking-widest text-tinta-s uppercase">Plataforma Educacional</div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="border-l-4 border-rojo pl-4 mb-6">
            <h1 className="font-playfair text-xl font-bold">Iniciar sesión</h1>
            <p className="text-sm text-tinta-s italic mt-1">Accede con tu cuenta de colegio</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-base"
                placeholder="director@colegio.cl"
                required
              />
            </div>
            <div>
              <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">
                Contraseña
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
              className="btn-primary w-full mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'INGRESANDO...' : 'INGRESAR'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <a href="#" className="font-mono text-xs text-azul hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <p className="text-center font-mono text-xs text-tinta-s mt-6">
          ¿Tu colegio no tiene cuenta?{' '}
          <a href="#" className="text-azul hover:underline">Solicita una demo</a>
        </p>
      </div>
    </div>
  )
}
