'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function VincularPage() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleVincular(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) { toast.error('Ingresa el código'); return }
    setLoading(true)

    // Verificar que hay sesión
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Debes iniciar sesión primero')
      router.push('/login')
      return
    }

    const res = await fetch('/api/invitaciones/vincular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigo.trim() }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Error al vincular')
      setLoading(false)
      return
    }

    setSuccess(true)
    toast.success('Vinculación exitosa')
    setTimeout(() => router.push('/portal'), 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-check text-3xl text-emerald-600" aria-hidden="true"/>
          </div>
          <h2 className="text-xl font-bold text-[#1a2332] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Vinculación exitosa</h2>
          <p className="text-[#6b7280] text-sm">Ya puedes ver la información de tu hijo/a. Redirigiendo al portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <Image src="/logo-arschool.png" alt="AR School" width={38} height={38} className="rounded-lg"/>
          <span className="font-semibold text-[#1a2332] text-lg tracking-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>AR SCHOOL</span>
        </div>

        <div className="bg-white border border-[#eceef1] rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1a2332] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Vincular a mi hijo/a</h2>
          <p className="text-[#6b7280] text-sm mb-6">Ingresa el código que te proporcionó el colegio para acceder a la información de tu hijo/a.</p>

          <form onSubmit={handleVincular} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Código de invitación</label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                className="input-base text-center text-lg font-mono tracking-[0.2em] h-12"
                placeholder="ABCD1234"
                maxLength={8}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? 'Verificando...' : 'Vincular'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#f3f4f6] text-center">
            <p className="text-[11px] text-[#9ca3af]">¿No tienes código? Solicítalo en la administración del colegio.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
