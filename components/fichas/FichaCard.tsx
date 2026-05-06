import type { Ficha } from '@/types'
import { MATERIAS_CONFIG } from '@/lib/utils'

interface Props { ficha: Ficha }

const TIPO_EMOJI: Record<string, string> = {
  ejercicio: '📄', evaluacion: '📝', cuento: '📖', manualidad: '✂️', guia: '📋',
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

export default function FichaCard({ ficha }: Props) {
  const cfg = MATERIAS_CONFIG[ficha.materia] ?? MATERIAS_CONFIG.otro
  const bg = MATERIA_BG[ficha.materia] ?? MATERIA_BG.otro
  const promedio = ficha.valoraciones_total > 0
    ? Math.round(ficha.valoraciones_suma / ficha.valoraciones_total)
    : 0

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group">
      <div className={`h-24 bg-gradient-to-br ${bg} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <span className="text-3xl relative z-10">{TIPO_EMOJI[ficha.tipo] ?? '📄'}</span>
      </div>
      <div className="p-3">
        <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>
          {cfg.label}
        </div>
        <div className="text-xs font-semibold text-slate-800 leading-tight mb-2 line-clamp-2">
          {ficha.titulo}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{ficha.grado}</span>
          <span className="text-xs text-amber-400">{'★'.repeat(promedio)}{'☆'.repeat(5 - promedio)}</span>
        </div>
      </div>
    </div>
  )
}