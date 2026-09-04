'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  matriculaId: string | null
  /** true si el alumno ya tiene cobros (cambia el texto: regenerar vs generar) */
  tieneCobros: boolean
}

export default function GenerarCobrosButton({ matriculaId, tieneCobros }: Props) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)

  if (!matriculaId) return null

  async function generar() {
    const msg = tieneCobros
      ? '¿Regenerar los cobros pendientes? Los cobros ya pagados NO se tocan. Se recalcularán los pendientes según el arancel del programa.'
      : '¿Generar los cobros de aporte inicial y mensualidades? Se usarán los aranceles del programa del alumno.'
    if (!confirm(msg)) return

    setCargando(true)
    try {
      // Body vacío: el endpoint resuelve los montos automáticamente según el programa
      const res = await fetch(`/api/matriculas/${matriculaId}/recalcular-cobros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        toast.success(`Cobros generados: ${data?.generados ?? 0} (${data?.arancel ?? ''})`)
        router.refresh()
      } else {
        toast.error(data?.error || 'No se pudieron generar los cobros')
      }
    } catch {
      toast.error('Error de conexión')
    }
    setCargando(false)
  }

  return (
    <button
      onClick={generar}
      disabled={cargando}
      className="w-full mt-2 text-[11px] py-2 px-3 rounded-lg border border-[#1B3A5C]/20 text-[#1B3A5C] font-semibold hover:bg-[#1B3A5C]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
    >
      {cargando ? (
        <><i className="ti ti-loader animate-spin text-xs" aria-hidden="true"/> Generando...</>
      ) : (
        <><i className="ti ti-refresh text-xs" aria-hidden="true"/> {tieneCobros ? 'Regenerar cobros pendientes' : 'Generar cobros'}</>
      )}
    </button>
  )
}
