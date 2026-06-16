'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || 'Error al enviar el email')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-mail-check text-2xl text-emerald-600" aria-hidden="true"/>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">Revisa tu correo</h2>
          <p className="text-slate-500 text-sm mb-6">
            Enviamos un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada y spam.
          </p>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-display font-bold text-white text-sm">AR</div>
          <span className="font-display font-semibold text-slate-900 text-lg">AR School</span>
        </div>

        <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Recuperar contraseña</h2>
        <p className="text-slate-500 text-sm mb-8">Te enviaremos un enlace para restablecer tu contraseña</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Correo electrónico
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 mt-2 text-sm"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-blue-600 hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
