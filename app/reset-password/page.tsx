'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase redirige con tokens en el hash fragment después de verificar el recovery link
    // El cliente de Supabase auto-detecta el hash y establece la sesión
    async function checkSession() {
      // Darle tiempo a Supabase client para procesar el hash fragment
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
        setChecking(false)
        return
      }

      // Escuchar por cambios de auth (cuando se procesa el token del hash)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setSessionReady(true)
          setChecking(false)
        }
      })

      // Timeout: si después de 3 segundos no hay sesión, mostrar error
      setTimeout(() => {
        setChecking(false)
      }, 3000)

      return () => subscription.unsubscribe()
    }

    checkSession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error('Error al actualizar la contraseña: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('¡Contraseña creada correctamente!')
    router.push('/inicio')
    router.refresh()
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1a2332] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[13px] text-[#6b7280]">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-link-off text-2xl text-red-500" aria-hidden="true"/>
          </div>
          <h2 className="text-[18px] font-bold text-[#1a2332] mb-2" style={{ fontFamily: 'var(--font-display)' }}>Enlace expirado</h2>
          <p className="text-[13px] text-[#6b7280] mb-6">Este enlace ya no es válido. Puede haber expirado o ya fue utilizado.</p>
          <a href="/forgot-password" className="btn-primary text-sm inline-block">
            Solicitar nuevo enlace
          </a>
          <a href="/login" className="block mt-3 text-[12px] text-[#6b7280] hover:text-[#1a2332]">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo-arschool.png" alt="AR School" className="h-10" />
        </div>

        <h2 className="text-[22px] font-bold text-[#1a2332] mb-1" style={{ fontFamily: 'var(--font-display)' }}>Crear contraseña</h2>
        <p className="text-[13px] text-[#6b7280] mb-8">Ingresa la contraseña que usarás para acceder a la plataforma</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[#e8eaed] rounded-lg text-[13px] text-[#1a2332] focus:outline-none focus:border-[#1a2332] focus:ring-1 focus:ring-[#1a2332] transition-all"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[#e8eaed] rounded-lg text-[13px] text-[#1a2332] focus:outline-none focus:border-[#1a2332] focus:ring-1 focus:ring-[#1a2332] transition-all"
              placeholder="Repetir contraseña"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#1a2332] hover:bg-[#2a3342] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 mt-2 text-[13px]"
          >
            {loading ? 'Guardando...' : 'Crear contraseña y acceder'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-white border border-[#e8eaed] rounded-lg">
          <p className="text-[11px] text-[#9ca3af] leading-relaxed">
            💡 Usa una contraseña segura que puedas recordar. Después de crearla podrás acceder a la plataforma y ver la información de tu hijo/a.
          </p>
        </div>
      </div>
    </div>
  )
}
