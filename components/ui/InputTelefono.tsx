'use client'

import { useState } from 'react'
import { CODIGOS_PAIS } from '@/lib/chile'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export default function InputTelefono({ value, onChange, placeholder = '9 1234 5678', className = '' }: Props) {
  // Extraer código y número del valor actual
  const codigoActual = CODIGOS_PAIS.find(c => value.startsWith(c.code))?.code || '+56'
  const numero = value.replace(codigoActual, '').replace(/\s/g, '').trim()

  const [codigo, setCodigo] = useState(codigoActual)

  function handleNumeroChange(num: string) {
    // Solo permitir dígitos y espacios
    const limpio = num.replace(/[^\d\s]/g, '')
    onChange(`${codigo} ${limpio}`.trim())
  }

  function handleCodigoChange(newCodigo: string) {
    setCodigo(newCodigo)
    onChange(`${newCodigo} ${numero}`.trim())
  }

  const paisActual = CODIGOS_PAIS.find(c => c.code === codigo)

  return (
    <div className={`flex gap-1 ${className}`}>
      <select
        value={codigo}
        onChange={e => handleCodigoChange(e.target.value)}
        className="px-2 py-2.5 bg-white border border-[var(--ar-border)] rounded-lg text-[11px] w-[85px] flex-shrink-0 focus:outline-none focus:border-[#1B3A5C]"
      >
        {CODIGOS_PAIS.map(c => (
          <option key={c.code} value={c.code}>{c.bandera} {c.code}</option>
        ))}
      </select>
      <input
        type="tel"
        value={numero}
        onChange={e => handleNumeroChange(e.target.value)}
        className="flex-1 px-3 py-2.5 bg-white border border-[var(--ar-border)] rounded-lg text-[13px] text-[var(--ar-text)] placeholder-[#b0b7c3] focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C]"
        placeholder={placeholder}
        maxLength={15}
      />
    </div>
  )
}
