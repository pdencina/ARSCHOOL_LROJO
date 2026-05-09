'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import FichaCard from './FichaCard'
import FichaDetalle from './FichaDetalle'
import ModalNuevaFicha from './ModalNuevaFicha'
import { MATERIAS_CONFIG } from '@/lib/utils'

interface Props {
  fichas: any[]
  conteosPorMateria: Record<string, number>
  filtrosActivos: { materia?: string; grado?: string; tipo?: string; q?: string }
  colegioId: string
  rol: string
  userId: string
}

const GRADOS = ['1° Básico','2° Básico','3° Básico','4° Básico','5° Básico','6° Básico',
                 '7° Básico','8° Básico','I° Medio','II° Medio','III° Medio','IV° Medio']
const TIPOS = [
  { value: 'ejercicio',  label: 'Ejercicios' },
  { value: 'evaluacion', label: 'Evaluaciones' },
  { value: 'guia',       label: 'Guías' },
  { value: 'cuento',     label: 'Cuentos' },
  { value: 'manualidad', label: 'Manualidades' },
]

export default function FichasClient({ fichas, conteosPorMateria, filtrosActivos, colegioId, rol, userId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [busqueda, setBusqueda] = useState(filtrosActivos.q ?? '')
  const [fichaDetalle, setFichaDetalle] = useState<any>(null)
  const [showNueva, setShowNueva] = useState(false)

  const canEdit = ['tutor','admin','super_admin'].includes(rol)

  function navegar(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const merged = { ...filtrosActivos, ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v) })
    router.push(`${pathname}?${sp.toString()}`)
  }

  const totalFichas = Object.values(conteosPorMateria).reduce((a, b) => a + b, 0)
  const topDescargadas = fichas.filter(f => f.descargas > 0).sort((a, b) => b.descargas - a.descargas).slice(0, 3)

  return (
    <div className="flex min-h-full">
      {/* Sidebar filtros */}
      <aside className="w-52 bg-white border-r border-slate-200 shrink-0 py-4">
        <div className="px-4 mb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Materias</div>
          <button
            onClick={() => navegar({ materia: undefined })}
            className={`w-full flex justify-between items-center px-2.5 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${!filtrosActivos.materia ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <span>Todas</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{totalFichas}</span>
          </button>
          {Object.entries(MATERIAS_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => navegar({ materia: key })}
              className={`w-full flex justify-between items-center px-2.5 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${filtrosActivos.materia === key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span>{cfg.emoji} {cfg.label}</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{conteosPorMateria[key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="px-4 border-t border-slate-100 pt-4 mb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tipo</div>
          {TIPOS.map(t => (
            <button key={t.value} onClick={() => navegar({ tipo: filtrosActivos.tipo === t.value ? undefined : t.value })}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${filtrosActivos.tipo === t.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Grado</div>
          <select value={filtrosActivos.grado ?? ''} onChange={e => navegar({ grado: e.target.value || undefined })} className="select-base w-full text-xs">
            <option value="">Todos los grados</option>
            {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 p-6 overflow-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">Fichas pedagógicas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Materiales listos para imprimir y compartir con tus alumnos</p>
          </div>
          {canEdit && (
            <button onClick={() => setShowNueva(true)} className="btn-primary">
              <i className="ti ti-upload text-sm" aria-hidden="true"/> Subir ficha
            </button>
          )}
        </div>

        {/* Top descargadas */}
        {topDescargadas.length > 0 && !filtrosActivos.materia && !filtrosActivos.q && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <i className="ti ti-trending-up text-amber-500" aria-hidden="true"/> Más descargadas
            </div>
            <div className="grid grid-cols-3 gap-3">
              {topDescargadas.map((f, i) => (
                <button key={f.id} onClick={() => setFichaDetalle(f)}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center font-display font-bold text-amber-600 text-sm flex-shrink-0">
                    #{i+1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 truncate">{f.titulo}</div>
                    <div className="text-xs text-slate-400">{f.grado} · {f.descargas} descargas</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 max-w-md relative">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navegar({ q: busqueda || undefined })}
              className="input-base pl-9" placeholder="Buscar fichas..."/>
          </div>
          <button onClick={() => navegar({ q: busqueda || undefined })} className="btn-primary">Buscar</button>
          {(filtrosActivos.q || filtrosActivos.materia || filtrosActivos.grado || filtrosActivos.tipo) && (
            <button onClick={() => { setBusqueda(''); navegar({ q: undefined, materia: undefined, grado: undefined, tipo: undefined }) }} className="btn-secondary">
              <i className="ti ti-x text-sm" aria-hidden="true"/> Limpiar
            </button>
          )}
        </div>

        {/* Conteo */}
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display text-lg font-semibold text-slate-900">{fichas.length} fichas</span>
          {filtrosActivos.materia && <span className="tag tag-blue">{MATERIAS_CONFIG[filtrosActivos.materia]?.label}</span>}
          {filtrosActivos.grado && <span className="tag tag-blue">{filtrosActivos.grado}</span>}
          {filtrosActivos.tipo && <span className="tag tag-blue">{TIPOS.find(t => t.value === filtrosActivos.tipo)?.label}</span>}
        </div>

        {/* Grid fichas */}
        {fichas.length === 0 ? (
          <div className="text-center py-16">
            <i className="ti ti-books text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
            <p className="text-slate-500 font-medium mb-1">No se encontraron fichas</p>
            <p className="text-slate-400 text-sm mb-4">Prueba con otros filtros o sube una nueva ficha</p>
            {canEdit && (
              <button onClick={() => setShowNueva(true)} className="btn-primary">
                <i className="ti ti-upload text-sm" aria-hidden="true"/> Subir primera ficha
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {fichas.map(ficha => (
              <FichaCard key={ficha.id} ficha={ficha} onClick={() => setFichaDetalle(ficha)}/>
            ))}
            {canEdit && (
              <button onClick={() => setShowNueva(true)}
                className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 min-h-44 hover:border-blue-400 hover:bg-blue-50 transition-colors group">
                <i className="ti ti-plus text-2xl text-slate-300 group-hover:text-blue-400 mb-2" aria-hidden="true"/>
                <span className="text-xs text-center text-slate-400 group-hover:text-blue-500 font-medium">Subir nueva ficha</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Panel detalle ficha */}
      {fichaDetalle && (
        <FichaDetalle
          ficha={fichaDetalle}
          colegioId={colegioId}
          userId={userId}
          canEdit={canEdit}
          onClose={() => setFichaDetalle(null)}
        />
      )}

      {/* Modal nueva ficha */}
      {showNueva && (
        <ModalNuevaFicha
          colegioId={colegioId}
          userId={userId}
          onClose={() => setShowNueva(false)}
        />
      )}
    </div>
  )
}