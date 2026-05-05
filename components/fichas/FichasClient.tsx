'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Ficha } from '@/types'
import { MATERIAS_CONFIG } from '@/lib/utils'
import FichaCard from './FichaCard'

interface Props {
  fichas: Ficha[]
  conteosPorMateria: Record<string, number>
  filtrosActivos: { materia?: string; grado?: string; tipo?: string; q?: string }
}

const GRADOS = ['1° Básico','2° Básico','3° Básico','4° Básico','5° Básico','6° Básico',
                 '7° Básico','8° Básico','I° Medio','II° Medio','III° Medio','IV° Medio']
const TIPOS = [
  { value: 'ejercicio',   label: 'Ejercicios' },
  { value: 'evaluacion',  label: 'Evaluaciones' },
  { value: 'cuento',      label: 'Cuentos' },
  { value: 'manualidad',  label: 'Manualidades' },
  { value: 'guia',        label: 'Guías' },
]

export default function FichasClient({ fichas, conteosPorMateria, filtrosActivos }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [busqueda, setBusqueda] = useState(filtrosActivos.q ?? '')

  function navegar(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const merged = { ...filtrosActivos, ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v) })
    router.push(`${pathname}?${sp.toString()}`)
  }

  const totalFichas = Object.values(conteosPorMateria).reduce((a, b) => a + b, 0)

  return (
    <div className="flex min-h-full">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-100 shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-3">Materias</div>
          <button
            onClick={() => navegar({ materia: undefined })}
            className={`w-full flex justify-between items-center px-2 py-1.5 rounded-sm text-sm mb-0.5 transition-colors ${!filtrosActivos.materia ? 'bg-rojo-claro text-rojo font-semibold' : 'hover:bg-gray-50'}`}
          >
            <span>Todas</span>
            <span className="font-mono text-xs bg-papel px-1.5 py-0.5 rounded-full border border-gray-200">{totalFichas}</span>
          </button>
          {Object.entries(MATERIAS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => navegar({ materia: key })}
              className={`w-full flex justify-between items-center px-2 py-1.5 rounded-sm text-sm mb-0.5 transition-colors ${filtrosActivos.materia === key ? 'bg-rojo-claro text-rojo font-semibold' : 'hover:bg-gray-50'}`}
            >
              <span>{cfg.emoji} {cfg.label}</span>
              <span className="font-mono text-xs bg-papel px-1.5 py-0.5 rounded-full border border-gray-200">
                {conteosPorMateria[key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-3">Tipo</div>
          {TIPOS.map(t => (
            <button
              key={t.value}
              onClick={() => navegar({ tipo: filtrosActivos.tipo === t.value ? undefined : t.value })}
              className={`w-full text-left px-2 py-1.5 rounded-sm text-sm mb-0.5 transition-colors ${filtrosActivos.tipo === t.value ? 'bg-rojo-claro text-rojo font-semibold' : 'hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-3">Grado</div>
          <select
            value={filtrosActivos.grado ?? ''}
            onChange={e => navegar({ grado: e.target.value || undefined })}
            className="select-base w-full"
          >
            <option value="">Todos los grados</option>
            {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 p-5">
        {/* Hero search */}
        <div className="bg-papel border-b border-gray-200 -mx-5 -mt-0 px-5 pt-5 pb-4 mb-5 border-l-4 border-l-rojo">
          <h2 className="font-playfair text-xl font-bold mb-1 pl-3">Biblioteca de fichas pedagógicas</h2>
          <p className="text-sm text-tinta-s italic pl-3 mb-3">Materiales listos para imprimir y compartir</p>
          <div className="flex gap-2 pl-3">
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navegar({ q: busqueda || undefined })}
              className="input-base max-w-xs"
              placeholder="Buscar fichas…"
            />
            <button onClick={() => navegar({ q: busqueda || undefined })} className="btn-danger">
              BUSCAR
            </button>
            <button
              onClick={() => { setBusqueda(''); navegar({ q: undefined, materia: undefined, grado: undefined, tipo: undefined }) }}
              className="btn-secondary"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-4">
          <span className="font-playfair text-lg font-bold">
            {fichas.length} ficha{fichas.length !== 1 ? 's' : ''}
          </span>
          {filtrosActivos.materia && (
            <span className="tag tag-ok">{MATERIAS_CONFIG[filtrosActivos.materia]?.label}</span>
          )}
          {filtrosActivos.grado && (
            <span className="tag tag-pend">{filtrosActivos.grado}</span>
          )}
        </div>

        {/* Grid */}
        {fichas.length === 0 ? (
          <div className="text-center py-16 text-tinta-s">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-lora italic">No se encontraron fichas con esos filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {fichas.map(ficha => (
              <FichaCard key={ficha.id} ficha={ficha} />
            ))}
            {/* Card nueva */}
            <div className="border-2 border-dashed border-gray-200 rounded-sm flex flex-col items-center justify-center p-4 min-h-44 cursor-pointer hover:border-rojo hover:bg-rojo-claro transition-colors group">
              <span className="text-2xl opacity-40 group-hover:opacity-70 mb-2">＋</span>
              <span className="font-mono text-xs text-center text-tinta-s group-hover:text-rojo">
                Crear ficha<br />con IA
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
