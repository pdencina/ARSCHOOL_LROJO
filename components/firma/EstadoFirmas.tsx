'use client'

type Estado = 'firmado' | 'visto' | 'enviado' | 'vencido' | 'sin_enviar'

const CONFIG: Record<Estado, { texto: string; cls: string; icono: string; ayuda: string }> = {
  firmado:    { texto: 'firmado',    cls: 'bg-[#EDF5F0] text-[#2D5A3F] border-[#2D5A3F]/15', icono: 'ti-circle-check', ayuda: 'Firmado' },
  visto:      { texto: 'abierto',    cls: 'bg-blue-50 text-blue-700 border-blue-100',         icono: 'ti-eye',          ayuda: 'La familia abrió el enlace, pero aún no firma' },
  enviado:    { texto: 'sin abrir',  cls: 'bg-amber-50 text-amber-800 border-amber-100',      icono: 'ti-mail',         ayuda: 'Enviado por email; la familia aún no abre el enlace' },
  vencido:    { texto: 'vencido',    cls: 'bg-red-50 text-red-700 border-red-100',            icono: 'ti-clock-x',      ayuda: 'El enlace venció (72 h). Hay que reenviarlo' },
  sin_enviar: { texto: 'no enviado', cls: 'bg-slate-50 text-slate-500 border-slate-200',      icono: 'ti-circle-dashed', ayuda: 'Aún no se envía a firma' },
}

/** Dos chips: estado del contrato y del pagaré. */
export default function EstadoFirmas({ contrato, pagare }: { contrato?: Estado | null; pagare?: Estado | null }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Chip doc="Contrato" estado={contrato ?? 'sin_enviar'}/>
      <Chip doc="Pagaré" estado={pagare ?? 'sin_enviar'}/>
    </span>
  )
}

function Chip({ doc, estado }: { doc: string; estado: Estado }) {
  const c = CONFIG[estado]
  return (
    <span title={`${doc}: ${c.ayuda}`}
      className={`inline-flex items-center gap-0.5 whitespace-nowrap text-[9.5px] font-semibold px-1.5 py-0.5 rounded border ${c.cls}`}>
      <i className={`ti ${c.icono} text-[10px]`} aria-hidden="true"/>
      {doc} {estado === 'firmado' ? '✓' : `· ${c.texto}`}
    </span>
  )
}
