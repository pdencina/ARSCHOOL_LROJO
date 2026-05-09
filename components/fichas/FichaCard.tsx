'use client'

const MATERIA_BG: Record<string, string> = {
  lenguaje:         'from-red-500 to-rose-600',
  matematicas:      'from-blue-500 to-blue-700',
  ciencias:         'from-emerald-500 to-green-700',
  historia:         'from-amber-500 to-yellow-600',
  ingles:           'from-violet-500 to-purple-700',
  artes:            'from-orange-400 to-orange-600',
  educacion_fisica: 'from-teal-500 to-cyan-600',
  otro:             'from-slate-400 to-slate-600',
}
const MATERIA_LABEL: Record<string, string> = {
  lenguaje: 'Lenguaje', matematicas: 'Matemáticas', ciencias: 'Cs. Naturales',
  historia: 'Historia', ingles: 'Inglés', artes: 'Artes',
  educacion_fisica: 'Ed. Física', otro: 'Otro',
}
const TIPO_EMOJI: Record<string, string> = {
  ejercicio: '📄', evaluacion: '📝', cuento: '📖', manualidad: '✂️', guia: '📋',
}
const MATERIA_COLOR: Record<string, string> = {
  lenguaje: 'text-red-600', matematicas: 'text-blue-600', ciencias: 'text-emerald-600',
  historia: 'text-amber-600', ingles: 'text-violet-600', artes: 'text-orange-600',
  educacion_fisica: 'text-teal-600', otro: 'text-slate-600',
}

interface Props { ficha: any; onClick: () => void }

export default function FichaCard({ ficha, onClick }: Props) {
  const bg = MATERIA_BG[ficha.materia] ?? MATERIA_BG.otro
  const promedio = ficha.valoraciones_total > 0
    ? Math.round(ficha.valoraciones_suma / ficha.valoraciones_total)
    : 0
  const tienePdf = !!ficha.pdf_url

  return (
    <button onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all group text-left w-full">
      {/* Thumbnail */}
      <div className={`h-24 bg-gradient-to-br ${bg} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10"/>
        <span className="text-3xl relative z-10">{TIPO_EMOJI[ficha.tipo] ?? '📄'}</span>
        {/* Badge PDF */}
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${tienePdf ? 'bg-emerald-400 text-white' : 'bg-white/30 text-white/70'}`}
          title={tienePdf ? 'PDF disponible' : 'Sin PDF'}>
          {tienePdf ? <i className="ti ti-check text-xs" aria-hidden="true"/> : <i className="ti ti-minus text-xs" aria-hidden="true"/>}
        </div>
        {/* Descargas */}
        {(ficha.descargas ?? 0) > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/30 text-white text-xs px-1.5 py-0.5 rounded-full z-10 flex items-center gap-1">
            <i className="ti ti-download text-xs" aria-hidden="true"/>{ficha.descargas}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${MATERIA_COLOR[ficha.materia] ?? 'text-slate-600'}`}>
          {MATERIA_LABEL[ficha.materia] ?? ficha.materia}
        </div>
        <div className="text-xs font-semibold text-slate-800 leading-tight mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {ficha.titulo}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{ficha.grado}</span>
          <span className="text-xs text-amber-400">
            {'★'.repeat(promedio)}{'☆'.repeat(5 - promedio)}
          </span>
        </div>
      </div>
    </button>
  )
}