'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PagosContratoModal from '@/components/pagos/PagosContratoModal'
import { VOUCHERS_EQUIPO_HABILITADOS } from '@/lib/pagosConfig'

interface Contrato {
  id: string
  alumno: { nombre?: string; apellido?: string; curso?: string } | null
  programa: { codigo?: string; nombre?: string } | null
  apoderado: string | null
  estado: string | null
  fecha_inicio: string | null
  duracion: number | null
  total: number
  pagado: number
  pendiente: number
  cuotas_mensuales: number
  cuotas_pagadas: number
  vencidas: number
  sin_voucher: number
  por_validar: number
  descuadre: boolean
  proximo: { mes: number; anio: number; monto: number; vence: string | null } | null
}

const PROGRAMAS = [
  { codigo: '', nombre: 'Todos los programas' },
  { codigo: 'ar_school', nombre: 'AR School' },
  { codigo: 'play_group', nombre: 'Play Group' },
  { codigo: 'lions_soccer', nombre: 'Lions Soccer School' },
  { codigo: 'ar_worship', nombre: 'AR Worship School' },
]
const COLOR_PROGRAMA: Record<string, string> = { ar_school: '#1B3A5C', play_group: '#E8722A', lions_soccer: '#2D5A3F', ar_worship: '#7C5CBF' }
const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'por_validar', label: 'Vouchers por validar' },
  { value: 'vencidas', label: 'Con cuotas vencidas' },
  { value: 'al_dia', label: 'Al día' },
  { value: 'sin_voucher', label: 'Pagos sin voucher' },
] as const
type Filtro = typeof FILTROS[number]['value']
// El filtro de vouchers solo aplica si la subida de vouchers del equipo está habilitada
const FILTROS_VISIBLES = FILTROS.filter(f => VOUCHERS_EQUIPO_HABILITADOS || f.value !== 'sin_voucher')

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const $ = (n: number) => `$${(n ?? 0).toLocaleString('es-CL')}`
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')
const norm = (s: string) => (s || '').normalize('NFD').replace(DIACRITICOS, '').toLowerCase()

export default function PagosVouchersClient({ contratos, anio, anios }: { contratos: Contrato[]; anio: number; anios: number[] }) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [programa, setPrograma] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [abierto, setAbierto] = useState<string | null>(null)

  const totales = useMemo(() => ({
    contratos: contratos.length,
    por_validar: contratos.reduce((s, c) => s + c.por_validar, 0),
    vencidas: contratos.reduce((s, c) => s + c.vencidas, 0),
    sin_voucher: contratos.reduce((s, c) => s + c.sin_voucher, 0),
    pendiente: contratos.reduce((s, c) => s + c.pendiente, 0),
  }), [contratos])

  const cuenta = (f: Filtro) => contratos.filter(c => pasaFiltro(c, f)).length

  const lista = useMemo(() => {
    const q = norm(busqueda.trim())
    return contratos
      .filter(c => !programa || c.programa?.codigo === programa)
      .filter(c => pasaFiltro(c, filtro))
      .filter(c => !q || norm(`${c.alumno?.nombre} ${c.alumno?.apellido} ${c.apoderado ?? ''} ${c.alumno?.curso ?? ''}`).includes(q))
      // Primero lo que requiere acción: por validar, vencidas (y sin voucher, si aplica)
      .sort((a, b) => (b.por_validar - a.por_validar) || (b.vencidas - a.vencidas) || (VOUCHERS_EQUIPO_HABILITADOS ? b.sin_voucher - a.sin_voucher : 0)
        || `${a.alumno?.apellido}`.localeCompare(`${b.alumno?.apellido}`))
  }, [contratos, busqueda, programa, filtro])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--ar-text)]" style={{ fontFamily: 'DM Sans' }}>Pagos y vouchers</h1>
          <p className="text-xs text-[var(--ar-muted)]">Cuotas de cada contrato: marca cada una como pagada o pendiente y valida los comprobantes de apoderados</p>
        </div>
        <select
          value={anio}
          onChange={e => router.push(`/pagos?anio=${e.target.value}`)}
          className="px-3 py-2 bg-white border border-[var(--ar-border)] rounded-lg text-xs outline-none focus:border-[#1B3A5C]"
          aria-label="Año escolar"
        >
          {anios.map(a => <option key={a} value={a}>Año escolar {a}</option>)}
        </select>
      </div>

      {/* Indicadores (flex: globals.css fuerza grid-cols-2 a 1 columna en celular) */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Kpi label="Contratos" valor={String(totales.contratos)}/>
        <Kpi label="Por cobrar" valor={$(totales.pendiente)}/>
        <Kpi label="Vouchers por validar" valor={String(totales.por_validar)} tono={totales.por_validar > 0 ? 'violeta' : undefined} onClick={() => setFiltro('por_validar')}/>
        <Kpi label="Cuotas vencidas" valor={String(totales.vencidas)} tono={totales.vencidas > 0 ? 'rojo' : undefined} onClick={() => setFiltro('vencidas')}/>
        {VOUCHERS_EQUIPO_HABILITADOS && (
          <Kpi label="Pagos sin voucher" valor={String(totales.sin_voucher)} tono={totales.sin_voucher > 0 ? 'ambar' : undefined} onClick={() => setFiltro('sin_voucher')}/>
        )}
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <i className="ti ti-search text-sm text-[var(--ar-muted)] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true"/>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar alumno o apoderado…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-[var(--ar-border)] rounded-lg text-xs outline-none focus:border-[#1B3A5C]"/>
        </div>
        <select value={programa} onChange={e => setPrograma(e.target.value)}
          className="px-3 py-2 bg-white border border-[var(--ar-border)] rounded-lg text-xs outline-none focus:border-[#1B3A5C]" aria-label="Programa">
          {PROGRAMAS.map(p => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTROS_VISIBLES.map(f => (
          <button key={f.value} onClick={() => setFiltro(f.value)}
            className={`text-[11px] px-3 py-1 rounded-full font-medium transition-colors ${filtro === f.value ? 'bg-[#1B3A5C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f.label} <span className="opacity-70">({cuenta(f.value)})</span>
          </button>
        ))}
      </div>

      {/* Lista de contratos */}
      {lista.length === 0 ? (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl px-4 py-12 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <i className="ti ti-receipt-off text-3xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
          <p className="text-[var(--ar-muted)] text-sm">No hay contratos con estos filtros.</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden divide-y divide-[#f5f6f7]" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {lista.map(c => {
            const color = COLOR_PROGRAMA[c.programa?.codigo ?? ''] ?? '#6b7280'
            const pct = c.total > 0 ? Math.round((c.pagado / c.total) * 100) : 0
            return (
              <button key={c.id} onClick={() => setAbierto(c.id)}
                className="w-full text-left p-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-[#fafbfc]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[13px] font-semibold text-[var(--ar-text)]">{c.alumno?.nombre} {c.alumno?.apellido}</span>
                    {c.programa?.nombre && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${color}12`, color }}>{c.programa.nombre}</span>
                    )}
                    {c.por_validar > 0 && <Chip cls="bg-violet-50 text-violet-700" icono="ti-user-check">{c.por_validar} por validar</Chip>}
                    {c.vencidas > 0 && <Chip cls="bg-red-50 text-red-700" icono="ti-alert-triangle">{c.vencidas} vencida{c.vencidas !== 1 ? 's' : ''}</Chip>}
                    {VOUCHERS_EQUIPO_HABILITADOS && c.sin_voucher > 0 && <Chip cls="bg-amber-50 text-amber-800" icono="ti-file-alert">{c.sin_voucher} sin voucher</Chip>}
                    {c.descuadre && <Chip cls="bg-red-50 text-red-700" icono="ti-alert-circle">cuotas ≠ contrato</Chip>}
                  </div>
                  <div className="text-[11px] text-[var(--ar-muted)] flex flex-wrap gap-x-1.5">
                    <span className="whitespace-nowrap">{c.alumno?.curso}</span>
                    {c.apoderado && <span className="whitespace-nowrap">· {c.apoderado}</span>}
                    {c.proximo && (
                      <span className="whitespace-nowrap">· próxima: {MESES[c.proximo.mes - 1]} {c.proximo.anio} {$(c.proximo.monto)}</span>
                    )}
                  </div>
                </div>
                {/* Avance del contrato */}
                <div className="sm:w-[220px] flex-shrink-0">
                  <div className="flex items-baseline justify-between text-[11px] mb-1">
                    <span className="font-semibold text-[var(--ar-text)]">{c.cuotas_pagadas} de {c.cuotas_mensuales} cuotas</span>
                    <span className={c.pendiente > 0 ? 'text-amber-700 font-semibold' : 'text-[#2D5A3F] font-semibold'}>
                      {c.pendiente > 0 ? `debe ${$(c.pendiente)}` : 'al día'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#E6EEF6] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% pagado`}>
                    <div className="h-full rounded-full bg-[#2D5A3F]" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
                <i className="ti ti-chevron-right text-[var(--ar-muted)] hidden sm:block" aria-hidden="true"/>
              </button>
            )
          })}
        </div>
      )}

      {abierto && (
        <PagosContratoModal
          matriculaId={abierto}
          onClose={huboCambios => { setAbierto(null); if (huboCambios) router.refresh() }}
        />
      )}
    </div>
  )
}

function pasaFiltro(c: Contrato, f: Filtro): boolean {
  switch (f) {
    case 'por_validar': return c.por_validar > 0
    case 'vencidas': return c.vencidas > 0
    case 'sin_voucher': return c.sin_voucher > 0
    case 'al_dia': return c.vencidas === 0 && c.por_validar === 0
    default: return true
  }
}

function Kpi({ label, valor, tono, onClick }: { label: string; valor: string; tono?: 'rojo' | 'ambar' | 'violeta'; onClick?: () => void }) {
  const color = tono === 'rojo' ? 'text-red-700' : tono === 'ambar' ? 'text-amber-700' : tono === 'violeta' ? 'text-violet-700' : 'text-[var(--ar-text)]'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick}
      className={`flex-1 basis-[calc(50%-6px)] sm:basis-0 min-w-0 text-left bg-white border border-[var(--ar-border)] rounded-xl px-4 py-3 ${onClick ? 'hover:border-[#1B3A5C]/40 transition-colors' : ''}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="text-[11px] text-[var(--ar-muted)]">{label}</div>
      <div className={`text-xl font-bold ${color}`} style={{ fontFamily: 'DM Sans' }}>{valor}</div>
    </Tag>
  )
}

function Chip({ cls, icono, children }: { cls: string; icono: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${cls}`}>
      <i className={`ti ${icono} text-[10px]`} aria-hidden="true"/>{children}
    </span>
  )
}
