'use client'

import { useState } from 'react'
import { REGIONES, getComunas } from '@/lib/chile'

interface Props {
  region: string
  comuna: string
  onRegionChange: (region: string) => void
  onComunaChange: (comuna: string) => void
}

export default function SelectorRegionComuna({ region, comuna, onRegionChange, onComunaChange }: Props) {
  const comunas = region ? getComunas(region) : []

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Región</label>
        <select
          value={region}
          onChange={e => { onRegionChange(e.target.value); onComunaChange('') }}
          className="select-base w-full text-[12px]"
        >
          <option value="">Seleccionar región</option>
          {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Comuna</label>
        <select
          value={comuna}
          onChange={e => onComunaChange(e.target.value)}
          className="select-base w-full text-[12px]"
          disabled={!region}
        >
          <option value="">{region ? 'Seleccionar comuna' : 'Seleccione región primero'}</option>
          {comunas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  )
}
