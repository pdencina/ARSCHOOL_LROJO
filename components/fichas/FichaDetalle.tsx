'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { MATERIAS_CONFIG } from '@/lib/utils'

interface Props {
  ficha: any
  colegioId: string
  userId: string
  canEdit: boolean
  onClose: () => void
}

const MATERIA_BG: Record<string, string> = {
  lenguaje:     'from-red-500 to-rose-600',
  matematicas:  'from-blue-500 to-blue-700',
  ciencias:     'from-emerald-500 to-green-700',
  historia:     'from-amber-500 to-yellow-600',
  ingles:       'from-violet-500 to-purple-700',
  artes:        'from-orange-400 to-orange-600',
  educacion_fisica: 'from-teal-500 to-cyan-600',
  otro:         'from-slate-400 to-slate-600',
}

const TIPO_EMOJI: Record<string, string> = {
  ejercicio: '📄', evaluacion: '📝', cuento: '📖', manualidad: '✂️', guia: '📋',
}

export default function FichaDetalle({ ficha, colegioId, userId, canEdit, onClose }: Props) {
  const [descargando, setDescargando] = useState(false)
  const [valoracion, setValoracion] = useState(0)
  const supabase = createClient()
  const cfg = MATERIAS_CONFIG[ficha.materia] ?? MATERIAS_CONFIG.otro
  const bg = MATERIA_BG[ficha.materia] ?? MATERIA_BG.otro
  const promedio = ficha.valoraciones_total > 0
    ? Math.round(ficha.valoraciones_suma / ficha.valoraciones_total * 10) / 10
    : 0

  async function handleDescargar() {
    if (!ficha.pdf_url) {
      toast.error('Esta ficha no tiene PDF disponible todavía.')
      return
    }
    setDescargando(true)
    try {
      // Incrementar contador de descargas
      await supabase.from('fichas').update({ descargas: (ficha.descargas ?? 0) + 1 }).eq('id', ficha.id)
      // Abrir PDF en nueva pestaña
      window.open(ficha.pdf_url, '_blank')
      toast.success('Descargando ficha...')
    } catch {
      toast.error('Error al descargar')
    } finally {
      setDescargando(false)
    }
  }

  async function handleValorar(estrella: number) {
    setValoracion(estrella)
    await supabase.from('fichas').update({
      valoraciones_total: (ficha.valoraciones_total ?? 0) + 1,
      valoraciones_suma: (ficha.valoraciones_suma ?? 0) + estrella,
    }).eq('id', ficha.id)
    toast.success('¡Gracias por tu valoración!')
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header con gradiente */}
        <div className={`bg-gradient-to-br ${bg} p-6 relative`}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white hover:bg-black/30 transition-colors">
            <i className="ti ti-x text-sm" aria-hidden="true"/>
          </button>
          <div className="text-4xl mb-3">{TIPO_EMOJI[ficha.tipo] ?? '📄'}</div>
          <div className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">{cfg.label}</div>
          <h2 className="font-display text-xl font-bold text-white leading-tight">{ficha.titulo}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{ficha.grado}</span>
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full capitalize">{ficha.tipo}</span>
            {ficha.duracion_minutos && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                <i className="ti ti-clock text-xs mr-1" aria-hidden="true"/>{ficha.duracion_minutos} min
              </span>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="font-display text-2xl font-bold text-slate-800">{ficha.descargas ?? 0}</div>
              <div className="text-xs text-slate-500">descargas</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="font-display text-2xl font-bold text-amber-500">{promedio > 0 ? promedio.toFixed(1) : '—'}</div>
              <div className="text-xs text-slate-500">valoración</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <div className="font-display text-2xl font-bold text-slate-800">{ficha.valoraciones_total ?? 0}</div>
              <div className="text-xs text-slate-500">valoraciones</div>
            </div>
          </div>

          {/* Descripción */}
          {ficha.descripcion && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descripción</div>
              <p className="text-sm text-slate-700 leading-relaxed">{ficha.descripcion}</p>
            </div>
          )}

          {/* Objetivos */}
          {ficha.objetivos?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Objetivos de aprendizaje</div>
              <ul className="space-y-1.5">
                {ficha.objetivos.map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <i className="ti ti-circle-check text-emerald-500 text-sm flex-shrink-0 mt-0.5" aria-hidden="true"/>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* PDF disponible */}
          <div className={`p-3 rounded-xl mb-4 flex items-center gap-3 ${ficha.pdf_url ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
            <i className={`ti ${ficha.pdf_url ? 'ti-file-type-pdf text-red-500' : 'ti-file-off text-slate-400'} text-2xl flex-shrink-0`} aria-hidden="true"/>
            <div className="flex-1">
              <div className={`text-sm font-semibold ${ficha.pdf_url ? 'text-emerald-800' : 'text-slate-500'}`}>
                {ficha.pdf_url ? (ficha.pdf_nombre ?? 'Archivo PDF disponible') : 'Sin PDF adjunto'}
              </div>
              <div className="text-xs text-slate-500">
                {ficha.pdf_url ? 'Listo para descargar e imprimir' : 'El profesor aún no ha subido el archivo'}
              </div>
            </div>
          </div>

          {/* Valorar */}
          {valoracion === 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">¿Te fue útil esta ficha?</div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(e => (
                  <button key={e} onClick={() => handleValorar(e)}
                    className="text-2xl hover:scale-110 transition-transform text-slate-300 hover:text-amber-400">
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          )}

          {valoracion > 0 && (
            <div className="mb-4 text-sm text-emerald-600 flex items-center gap-2">
              <i className="ti ti-check" aria-hidden="true"/> Valoraste con {valoracion} {'⭐'.repeat(valoracion)}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            {ficha.pdf_url ? (
              <button onClick={handleDescargar} disabled={descargando}
                className="btn-primary flex-1 justify-center disabled:opacity-60 text-sm">
                <i className={`ti ${descargando ? 'ti-loader animate-spin' : 'ti-download'} text-sm`} aria-hidden="true"/>
                {descargando ? 'Descargando...' : 'Descargar PDF'}
              </button>
            ) : (
              <button disabled className="btn-secondary flex-1 justify-center opacity-50 text-sm cursor-not-allowed">
                <i className="ti ti-file-off text-sm" aria-hidden="true"/> Sin PDF
              </button>
            )}
            <button onClick={onClose} className="btn-secondary text-sm px-4">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}