'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Colegio { id: string; nombre: string }
interface Props { colegios: Colegio[]; sedeActiva: string }

export default function SedeSelector({ colegios, sedeActiva }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const label = sedeActiva === 'todas' || !sedeActiva
    ? 'Todas las sedes'
    : (colegios.find(c => c.id === sedeActiva)?.nombre ?? 'Sede')

  async function elegir(sede: string) {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/sede-activa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sede }),
      })
      if (!res.ok) { toast.error('No se pudo cambiar la sede'); setSaving(false); return }
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--ar-border)] hover:border-slate-300 hover:bg-slate-50 transition-all text-[12px] text-[var(--ar-text)] font-medium"
      >
        <i className="ti ti-building-school text-sm text-[#b0b7c3]" aria-hidden="true"/>
        <span className="hidden sm:inline max-w-[140px] truncate">{label}</span>
        <i className="ti ti-chevron-down text-xs text-[#b0b7c3]" aria-hidden="true"/>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[var(--ar-border)] rounded-xl py-1.5 z-50 animate-fade-in-scale max-h-[70vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div className="px-3.5 py-2 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Ver sede</div>
            <button
              onClick={() => elegir('todas')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] transition-colors ${sedeActiva === 'todas' || !sedeActiva ? 'bg-[#f8f9fb] text-[var(--ar-text)] font-semibold' : 'text-[#5f6876] hover:bg-[#f8f9fb]'}`}
            >
              <i className="ti ti-layout-grid text-[14px] text-[#b0b7c3]" aria-hidden="true"/> Todas las sedes
            </button>
            <div className="border-t border-[#f5f6f7] my-1"/>
            {colegios.map(c => (
              <button
                key={c.id}
                onClick={() => elegir(c.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] transition-colors ${sedeActiva === c.id ? 'bg-[#f8f9fb] text-[var(--ar-text)] font-semibold' : 'text-[#5f6876] hover:bg-[#f8f9fb]'}`}
              >
                <i className="ti ti-building text-[14px] text-[#b0b7c3]" aria-hidden="true"/>
                <span className="truncate">{c.nombre}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
