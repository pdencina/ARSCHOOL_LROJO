'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  rol: string
  userId: string
  colegioId: string
}

export default function AsistenciaBanner({ rol, userId, colegioId }: Props) {
  const [mostrar, setMostrar] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Solo mostrar para tutores después de las 10:00 AM
    if (rol !== 'tutor') return

    const hora = new Date().getHours()
    if (hora < 10 || hora >= 18) return // Solo entre 10:00 y 18:00

    // Verificar si ya fue descartado hoy
    const dismissKey = `asist_banner_${new Date().toISOString().split('T')[0]}`
    if (sessionStorage.getItem(dismissKey)) return

    // Verificar si hay asistencia registrada hoy
    async function checkAsistencia() {
      try {
        const hoy = new Date().toISOString().split('T')[0]
        const res = await fetch(`/api/asistencias/check?fecha=${hoy}`)
        if (res.ok) {
          const data = await res.json()
          if (!data.registrada) {
            setMostrar(true)
          }
        }
      } catch { /* silently fail */ }
    }

    checkAsistencia()
  }, [rol])

  function dismiss() {
    const dismissKey = `asist_banner_${new Date().toISOString().split('T')[0]}`
    sessionStorage.setItem(dismissKey, '1')
    setDismissed(true)
    setMostrar(false)
  }

  if (!mostrar || dismissed) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium shadow-md z-20 relative">
      <i className="ti ti-alert-circle text-lg" aria-hidden="true"/>
      <span>La asistencia de hoy aún no ha sido registrada</span>
      <Link
        href="/asistencias"
        className="bg-white text-amber-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors"
      >
        Registrar ahora
      </Link>
      <button
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
        aria-label="Cerrar"
      >
        <i className="ti ti-x text-sm" aria-hidden="true"/>
      </button>
    </div>
  )
}
