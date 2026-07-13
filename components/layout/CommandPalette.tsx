'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Resultado {
  tipo: string
  id: string
  titulo: string
  subtitulo: string
  href: string
  icon: string
}

const TIPO_COLOR: Record<string, string> = {
  alumno:     'bg-blue-50 text-blue-600',
  comunicado: 'bg-amber-50 text-amber-600',
  tarea:      'bg-emerald-50 text-emerald-600',
  usuario:    'bg-purple-50 text-purple-600',
}

const TIPO_LABEL: Record<string, string> = {
  alumno: 'Alumno',
  comunicado: 'Comunicado',
  tarea: 'Tarea',
  usuario: 'Usuario',
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Listener Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Focus input when opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResultados([])
      setSelectedIdx(0)
    }
  }, [open])

  // Search with debounce
  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/busqueda?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResultados(data.resultados ?? [])
        setSelectedIdx(0)
      }
    } catch { /* silently fail */ }
    setLoading(false)
  }, [])

  function handleInputChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(val), 250)
  }

  function handleSelect(resultado: Resultado) {
    setOpen(false)
    router.push(resultado.href)
  }

  function handleKeyNav(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && resultados[selectedIdx]) {
      e.preventDefault()
      handleSelect(resultados[selectedIdx])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fade-in-scale">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <i className="ti ti-search text-slate-400 text-lg" aria-hidden="true"/>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyNav}
            className="flex-1 text-[14px] text-slate-800 placeholder-slate-400 outline-none bg-transparent"
            placeholder="Buscar alumnos, tareas, comunicados..."
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[350px] overflow-y-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              <i className="ti ti-loader animate-spin text-lg block mb-1" aria-hidden="true"/>
              Buscando...
            </div>
          )}

          {!loading && query.length >= 2 && resultados.length === 0 && (
            <div className="px-4 py-8 text-center">
              <i className="ti ti-search-off text-3xl text-slate-300 block mb-2" aria-hidden="true"/>
              <p className="text-slate-400 text-sm">No se encontraron resultados para "{query}"</p>
            </div>
          )}

          {!loading && resultados.length > 0 && (
            <div className="py-2">
              {resultados.map((r, i) => (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIdx ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TIPO_COLOR[r.tipo] ?? 'bg-slate-100 text-slate-500'}`}>
                    <i className={`ti ${r.icon} text-sm`} aria-hidden="true"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-800 truncate">{r.titulo}</div>
                    <div className="text-[11px] text-slate-400 truncate">{r.subtitulo}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${TIPO_COLOR[r.tipo] ?? 'bg-slate-100 text-slate-500'}`}>
                    {TIPO_LABEL[r.tipo] ?? r.tipo}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="px-4 py-6 text-center">
              <p className="text-slate-400 text-sm mb-3">Escribe para buscar en todo el sistema</p>
              <div className="flex justify-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><i className="ti ti-user text-blue-400" aria-hidden="true"/>Alumnos</span>
                <span className="flex items-center gap-1"><i className="ti ti-checklist text-emerald-400" aria-hidden="true"/>Tareas</span>
                <span className="flex items-center gap-1"><i className="ti ti-speakerphone text-amber-400" aria-hidden="true"/>Comunicados</span>
                <span className="flex items-center gap-1"><i className="ti ti-user-cog text-purple-400" aria-hidden="true"/>Usuarios</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400 bg-slate-50">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">↑↓</kbd> Navegar</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">↵</kbd> Seleccionar</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">Esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  )
}
