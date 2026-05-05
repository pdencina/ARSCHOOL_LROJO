import type { Ficha } from '@/types'
import { MATERIAS_CONFIG } from '@/lib/utils'

interface Props { ficha: Ficha }

const TIPO_EMOJI: Record<string, string> = {
  ejercicio: '📄', evaluacion: '📝', cuento: '📖',
  manualidad: '✂️', guia: '📋',
}

export default function FichaCard({ ficha }: Props) {
  const cfg = MATERIAS_CONFIG[ficha.materia] ?? MATERIAS_CONFIG.otro
  const promedio = ficha.valoraciones_total > 0
    ? Math.round(ficha.valoraciones_suma / ficha.valoraciones_total)
    : 0

  return (
    <div
      className="bg-white border border-gray-100 rounded-sm overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all relative group"
      style={{ borderTop: `3px solid ${cfg.color}` }}
    >
      {/* Esquina doblada */}
      <div className="absolute top-0 right-0 w-0 h-0 border-solid border-t-0 border-r-crema border-b-0 border-l-transparent"
           style={{ borderWidth: '0 18px 18px 0', borderRightColor: '#FDFBF7' }} />

      {/* Portada */}
      <div
        className="h-24 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}99)` }}
      >
        {/* Líneas cuaderno */}
        <div className="absolute inset-0"
             style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 16px,rgba(255,255,255,0.2) 16px,rgba(255,255,255,0.2) 17px)' }} />
        {/* Margen */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-white/30" />
        <span className="text-3xl relative">{TIPO_EMOJI[ficha.tipo] ?? '📄'}</span>
      </div>

      {/* Cuerpo */}
      <div className="p-3">
        <div className="font-mono text-xs tracking-wide uppercase mb-1" style={{ color: cfg.color }}>
          {cfg.label}
        </div>
        <div className="font-semibold text-xs leading-tight text-tinta mb-2 line-clamp-2">
          {ficha.titulo}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs bg-papel px-1.5 py-0.5 rounded-sm text-tinta-s">
            {ficha.grado}
          </span>
          <span className="text-xs text-yellow-500">
            {'★'.repeat(promedio)}{'☆'.repeat(5 - promedio)}
          </span>
        </div>
      </div>
    </div>
  )
}
