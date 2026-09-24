'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import PreAdmisionDetalle from '@/components/matricula/PreAdmisionDetalle'

interface Props { preAdmisiones: any[]; puedeEliminar?: boolean }

const ESTADOS = [
  { value: '', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'observada', label: 'Esperando apoderado' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'matriculada', label: 'Matriculadas' },
  { value: 'rechazada', label: 'Rechazadas' },
]

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  pendiente: { label: 'Pendiente', class: 'bg-amber-50 text-amber-700' },
  en_revision: { label: 'En revisión', class: 'bg-blue-50 text-blue-700' },
  observada: { label: 'Esperando apoderado', class: 'bg-orange-50 text-orange-700' },
  aprobada: { label: 'Aprobada', class: 'bg-[#EDF5F0] text-[#2D5A3F]' },
  matriculada: { label: 'Matriculada', class: 'bg-[#EDF5F0] text-[#2D5A3F]' },
  rechazada: { label: 'Rechazada', class: 'bg-red-50 text-red-700' },
  desistida: { label: 'Desistida', class: 'bg-gray-100 text-gray-600' },
}

// Orden y branding fijo de los programas para las secciones.
const PROGRAMAS_ORDEN = [
  { codigo: 'ar_school',    nombre: 'AR School',           icono: 'ti-school',        color: '#1B3A5C' },
  { codigo: 'play_group',   nombre: 'Play Group',          icono: 'ti-baby-carriage', color: '#E8722A' },
  { codigo: 'lions_soccer', nombre: 'Lions Soccer School', icono: 'ti-ball-football', color: '#2D5A3F' },
  { codigo: 'ar_worship',   nombre: 'AR Worship School',   icono: 'ti-music',         color: '#7C5CBF' },
]
const OTROS = { codigo: 'otros', nombre: 'Otros / sin programa', icono: 'ti-folder', color: '#6b7280' }
const PROGRAMA_POR_CODIGO: Record<string, typeof OTROS> = Object.fromEntries([...PROGRAMAS_ORDEN, OTROS].map(p => [p.codigo, p]))

// Secciones de la bandeja "Por atender" (lo que requiere una acción del equipo)
const SECCIONES_BANDEJA = [
  { estado: 'pendiente',   titulo: 'Por revisar',              desc: 'Solicitudes nuevas o corregidas por el apoderado', icono: 'ti-inbox' },
  { estado: 'en_revision', titulo: 'En revisión',              desc: 'El equipo las está evaluando',                     icono: 'ti-search' },
  { estado: 'observada',   titulo: 'Esperando al apoderado',   desc: 'Se pidió corrección; si pasa mucho tiempo, contactar a la familia', icono: 'ti-mail-forward' },
  { estado: 'aprobada',    titulo: 'Aprobadas por matricular', desc: 'Falta completar la matrícula',                     icono: 'ti-user-plus' },
]

const DIA_MS = 86400000

// Detecta el código de programa de una solicitud: primero el join, si no el texto del curso.
function codigoPrograma(pa: any): string {
  if (pa.programa?.codigo) return pa.programa.codigo
  const c = (pa.curso_solicitado || '').toLowerCase()
  if (c.includes('lions') || c.includes('soccer')) return 'lions_soccer'
  if (c.includes('worship') || c.includes('music')) return 'ar_worship'
  if (c.includes('play')) return 'play_group'
  if (c.includes('kinder') || c.includes('school') || c.includes('elementary') || c.includes('middle') || c.includes('high') || c.includes('ciclo')) return 'ar_school'
  return 'otros'
}

// Pendiente que ya había sido revisada y luego se actualizó => el apoderado envió
// correcciones. (Un "observar" del gestor también toca revisado_at y updated_at, pero
// en el mismo instante, por eso se exige un margen.)
function esCorregida(pa: any): boolean {
  if (pa.estado !== 'pendiente' || !pa.revisado_at || !pa.updated_at) return false
  return new Date(pa.updated_at).getTime() - new Date(pa.revisado_at).getTime() > 60_000
}

// Fecha desde la que corre la espera, según el estado:
// pendiente => envío (o última corrección del apoderado); en revisión / aprobada => última revisión.
function fechaEspera(pa: any): Date {
  const f = pa.estado === 'pendiente'
    ? (esCorregida(pa) ? pa.updated_at : pa.created_at)
    : (pa.revisado_at ?? pa.updated_at ?? pa.created_at)
  return new Date(f)
}

function diasEspera(pa: any): number {
  return Math.max(0, Math.floor((Date.now() - fechaEspera(pa).getTime()) / DIA_MS))
}

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

// Normaliza para buscar sin importar tildes ni mayúsculas ("joaquin" encuentra "Joaquín").
function normalizar(s: string): string {
  // Quita los acentos: NFD separa "í" en "i" + tilde combinada (U+0300–U+036F) y se elimina la tilde.
  return (s || '').normalize('NFD').replace(DIACRITICOS, '').toLowerCase()
}

function coincide(pa: any, q: string): boolean {
  if (!q) return true
  return normalizar(`${pa.alumno_nombre} ${pa.alumno_apellido} ${pa.apoderado_nombre} ${pa.apoderado_apellido} ${pa.curso_solicitado} ${pa.codigo_seguimiento}`).includes(normalizar(q))
}

export default function AdmisionSeguimientoClient({ preAdmisiones, puedeEliminar = false }: Props) {
  const [vista, setVista] = useState<'bandeja' | 'programas'>('bandeja')
  const [filtro, setFiltro] = useState('')
  // Carpeta abierta: null = vista de carpetas; código de programa = dentro de esa carpeta.
  const [carpeta, setCarpeta] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState<any>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Bandeja: solicitudes que requieren acción, agrupadas por estado, las más antiguas primero.
  const bandeja = useMemo(() => SECCIONES_BANDEJA.map(s => ({
    ...s,
    items: preAdmisiones
      .filter(pa => pa.estado === s.estado)
      .sort((a, b) => fechaEspera(a).getTime() - fechaEspera(b).getTime()),
  })), [preAdmisiones])
  const totalBandeja = bandeja.reduce((acc, s) => acc + s.items.length, 0)
  const atrasadas = bandeja.reduce((acc, s) => acc + s.items.filter(pa => diasEspera(pa) > 7).length, 0)

  // Búsqueda global (fuera de una carpeta): todas las solicitudes de la sede.
  const resultadosGlobales = useMemo(() => {
    if (carpeta || !busqueda.trim()) return []
    return preAdmisiones.filter(pa => coincide(pa, busqueda.trim()))
  }, [preAdmisiones, carpeta, busqueda])

  // Carpetas: un resumen por programa (total + pendientes + por revisar).
  const carpetas = useMemo(() => {
    const orden = [...PROGRAMAS_ORDEN, OTROS]
    return orden.map(p => {
      const items = preAdmisiones.filter(pa => codigoPrograma(pa) === p.codigo)
      return {
        ...p,
        total: items.length,
        pendientes: items.filter(i => i.estado === 'pendiente').length,
        enRevision: items.filter(i => i.estado === 'en_revision').length,
        observadas: items.filter(i => i.estado === 'observada').length,
        aprobadas: items.filter(i => i.estado === 'aprobada').length,
        matriculadas: items.filter(i => i.estado === 'matriculada').length,
      }
    }).filter(c => c.codigo !== 'otros' || c.total > 0) // "Otros" solo si tiene algo
  }, [preAdmisiones])

  // Solicitudes de la carpeta abierta, con filtros de estado y búsqueda.
  const listaCarpeta = useMemo(() => {
    if (!carpeta) return []
    return preAdmisiones.filter(pa => {
      if (codigoPrograma(pa) !== carpeta) return false
      const mEstado = !filtro || pa.estado === filtro
      return mEstado && coincide(pa, busqueda.trim())
    })
  }, [preAdmisiones, carpeta, filtro, busqueda])

  const carpetaActual = useMemo(() => carpetas.find(c => c.codigo === carpeta), [carpetas, carpeta])

  async function abrirDetalle(id: string) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admision/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDetalle(data)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoadingId(null) }
  }

  const buscando = !carpeta && busqueda.trim().length > 0

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5 flex items-center gap-3">
        {carpeta && (
          <button
            onClick={() => { setCarpeta(null); setFiltro(''); setBusqueda('') }}
            className="w-8 h-8 rounded-lg border border-[var(--ar-border)] bg-white flex items-center justify-center hover:bg-slate-50 flex-shrink-0"
            title="Volver a los programas"
          >
            <i className="ti ti-arrow-left text-sm text-[var(--ar-text)]" aria-hidden="true"/>
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-[var(--ar-text)]" style={{ fontFamily: 'DM Sans' }}>
            {carpetaActual ? carpetaActual.nombre : 'Admisiones'}
          </h1>
          <p className="text-xs text-[var(--ar-muted)]">
            {carpetaActual
              ? 'Solicitudes de este programa · revisa, aprueba y haz seguimiento'
              : vista === 'bandeja'
                ? 'Lo que requiere acción del equipo, empezando por lo más antiguo'
                : 'Elige un programa para ver sus solicitudes'}
          </p>
        </div>
      </div>

      {/* ─── BARRA SUPERIOR: pestañas + búsqueda global ─── */}
      {!carpeta && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setVista('bandeja')}
              className={`text-[12px] px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${vista === 'bandeja' ? 'bg-white text-[#1B3A5C] shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <i className="ti ti-inbox text-sm" aria-hidden="true"/>
              Por atender
              {totalBandeja > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1B3A5C] text-white">{totalBandeja}</span>}
            </button>
            <button
              onClick={() => setVista('programas')}
              className={`text-[12px] px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${vista === 'programas' ? 'bg-white text-[#1B3A5C] shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <i className="ti ti-folders text-sm" aria-hidden="true"/>
              Por programa
            </button>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <i className="ti ti-search text-sm text-[var(--ar-muted)] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true"/>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en todas las solicitudes: alumno, apoderado o código (ADM-2026-…)"
              className="w-full pl-9 pr-3 py-2 bg-white border border-[var(--ar-border)] rounded-lg text-xs outline-none focus:border-[#1B3A5C]"
            />
          </div>
        </div>
      )}

      {/* ─── RESULTADOS DE BÚSQUEDA GLOBAL ─── */}
      {buscando && (
        resultadosGlobales.length === 0 ? (
          <Vacio texto={`No se encontraron solicitudes para "${busqueda.trim()}".`}/>
        ) : (
          <Lista>
            {resultadosGlobales.map(pa => (
              <FilaSolicitud key={pa.id} pa={pa} mostrarPrograma loading={loadingId === pa.id} onAbrir={abrirDetalle}/>
            ))}
          </Lista>
        )
      )}

      {/* ─── BANDEJA "POR ATENDER" ─── */}
      {!carpeta && !buscando && vista === 'bandeja' && (
        totalBandeja === 0 ? (
          <Vacio texto="Todo al día: no hay solicitudes esperando acción." icono="ti-circle-check"/>
        ) : (
          <div className="space-y-5">
            {atrasadas > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-lg px-3 py-2 text-xs font-medium">
                <i className="ti ti-alert-triangle text-sm" aria-hidden="true"/>
                {atrasadas} solicitud{atrasadas !== 1 ? 'es llevan' : ' lleva'} más de 7 días sin avanzar.
              </div>
            )}
            {bandeja.filter(s => s.items.length > 0).map(s => (
              <section key={s.estado}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={`ti ${s.icono} text-sm text-[var(--ar-muted)]`} aria-hidden="true"/>
                  <h2 className="text-[13px] font-bold text-[var(--ar-text)]">{s.titulo}</h2>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{s.items.length}</span>
                  <span className="text-[11px] text-[var(--ar-muted)] hidden sm:inline">· {s.desc}</span>
                </div>
                <Lista>
                  {s.items.map(pa => (
                    <FilaSolicitud key={pa.id} pa={pa} mostrarPrograma mostrarEspera loading={loadingId === pa.id} onAbrir={abrirDetalle}/>
                  ))}
                </Lista>
              </section>
            ))}
          </div>
        )
      )}

      {/* ─── VISTA DE CARPETAS (una por programa) ─── */}
      {!carpeta && !buscando && vista === 'programas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {carpetas.map(c => (
            <button
              key={c.codigo}
              onClick={() => { setCarpeta(c.codigo); setFiltro('') }}
              className="text-left bg-white border border-[var(--ar-border)] rounded-xl p-5 hover:shadow-md transition-shadow group"
              style={{ boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${c.color}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${c.color}15` }}>
                  <i className={`ti ${c.icono} text-xl`} style={{ color: c.color }} aria-hidden="true"/>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: c.color, fontFamily: 'DM Sans' }}>{c.total}</div>
                  <div className="text-[10px] text-[var(--ar-muted)] uppercase tracking-wider">solicitudes</div>
                </div>
              </div>
              <div className="text-[14px] font-bold text-[var(--ar-text)] mb-2">{c.nombre}</div>
              <div className="flex flex-wrap gap-1.5">
                {c.pendientes > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{c.pendientes} pendiente{c.pendientes !== 1 ? 's' : ''}</span>}
                {c.enRevision > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{c.enRevision} en revisión</span>}
                {c.observadas > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">{c.observadas} esperando apoderado</span>}
                {c.aprobadas > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EDF5F0] text-[#2D5A3F]">{c.aprobadas} aprobada{c.aprobadas !== 1 ? 's' : ''}</span>}
                {c.total === 0 && <span className="text-[10px] text-[var(--ar-muted)]">Sin solicitudes aún</span>}
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold group-hover:gap-2 transition-all" style={{ color: c.color }}>
                Abrir <i className="ti ti-arrow-right text-xs" aria-hidden="true"/>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── VISTA DENTRO DE UNA CARPETA ─── */}
      {carpeta && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por alumno, apoderado o código..."
              className="flex-1 min-w-[220px] px-3 py-2 bg-white border border-[var(--ar-border)] rounded-lg text-xs outline-none focus:border-[#1B3A5C]"
            />
            <div className="flex gap-1 flex-wrap">
              {ESTADOS.map(e => (
                <button
                  key={e.value}
                  onClick={() => setFiltro(e.value)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${filtro === e.value ? 'bg-[#1B3A5C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {listaCarpeta.length === 0 ? (
            <Vacio texto={`No hay solicitudes${filtro ? ' en este estado' : ''} para este programa.`}/>
          ) : (
            <Lista color={carpetaActual?.color}>
              {listaCarpeta.map((pa: any) => (
                <FilaSolicitud key={pa.id} pa={pa} mostrarEspera loading={loadingId === pa.id} onAbrir={abrirDetalle}/>
              ))}
            </Lista>
          )}
        </>
      )}

      {detalle && (
        <PreAdmisionDetalle
          preAdmision={detalle}
          onClose={() => setDetalle(null)}
          onImportar={() => setDetalle(null)}
          onEstadoCambiado={() => { setDetalle(null); window.location.reload() }}
          permitirEliminar={puedeEliminar}
        />
      )}
    </div>
  )
}

function Lista({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)', borderLeft: `3px solid ${color ?? '#1B3A5C'}` }}>
      <div className="divide-y divide-[#f5f6f7]">{children}</div>
    </div>
  )
}

function Vacio({ texto, icono = 'ti-inbox' }: { texto: string; icono?: string }) {
  return (
    <div className="bg-white border border-[var(--ar-border)] rounded-xl px-4 py-12 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <i className={`ti ${icono} text-3xl text-[#d1d5db] block mb-2`} aria-hidden="true"/>
      <p className="text-[var(--ar-muted)] text-sm">{texto}</p>
    </div>
  )
}

// Indicador de antigüedad: verde ≤2 días, ámbar 3–7, rojo >7.
function ChipEspera({ pa }: { pa: any }) {
  if (!['pendiente', 'en_revision', 'observada', 'aprobada'].includes(pa.estado)) return null
  const d = diasEspera(pa)
  const cls = d > 7 ? 'bg-red-50 text-red-700' : d > 2 ? 'bg-amber-50 text-amber-700' : 'bg-[#EDF5F0] text-[#2D5A3F]'
  const txt = d === 0 ? 'hoy' : `hace ${d} día${d !== 1 ? 's' : ''}`
  const titulo = pa.estado === 'pendiente'
    ? 'Tiempo esperando revisión'
    : pa.estado === 'aprobada' ? 'Tiempo desde la aprobación sin matricular'
    : pa.estado === 'observada' ? 'Tiempo esperando la corrección del apoderado' : 'Tiempo desde la última revisión'
  return (
    <span title={titulo} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap ${cls}`}>
      <i className="ti ti-clock text-[11px]" aria-hidden="true"/>{txt}
    </span>
  )
}

function FilaSolicitud({ pa, mostrarPrograma = false, mostrarEspera = false, loading, onAbrir }: {
  pa: any; mostrarPrograma?: boolean; mostrarEspera?: boolean; loading: boolean; onAbrir: (id: string) => void
}) {
  const badge = ESTADO_BADGE[pa.estado] || ESTADO_BADGE.pendiente
  const docs = Object.keys(pa.documentos || {}).filter(k => pa.documentos[k]).length
  const prog = PROGRAMA_POR_CODIGO[codigoPrograma(pa)] ?? OTROS
  return (
    <div className="p-3.5 flex items-center gap-3 hover:bg-[#fafbfc] cursor-pointer" onClick={() => onAbrir(pa.id)}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[13px] font-semibold text-[var(--ar-text)] truncate">{pa.alumno_nombre} {pa.alumno_apellido}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.class}`}>{badge.label}</span>
          {esCorregida(pa) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700" title="El apoderado envió correcciones">Corregida</span>}
          {mostrarPrograma && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${prog.color}12`, color: prog.color }}>{prog.nombre}</span>
          )}
        </div>
        <div className="text-[11px] text-[var(--ar-muted)] flex items-center gap-2 flex-wrap">
          <span>{pa.curso_solicitado}</span>
          <span>·</span>
          <span>{pa.apoderado_nombre} {pa.apoderado_apellido}</span>
          {docs > 0
            ? (<><span>·</span><span className="text-[#2D5A3F] font-medium">{docs} docs</span></>)
            : (<><span>·</span><span className="text-amber-700 font-medium">sin documentos</span></>)}
        </div>
        <div className="text-[9px] text-gray-400 mt-0.5">{pa.codigo_seguimiento} · enviada {new Date(pa.created_at).toLocaleDateString('es-CL')}</div>
      </div>
      {mostrarEspera && <ChipEspera pa={pa}/>}
      <button disabled={loading} className="px-3 py-1.5 bg-white border border-[var(--ar-border)] text-[var(--ar-text)] text-[10px] font-semibold rounded-lg hover:bg-gray-50 flex-shrink-0">
        {loading ? '...' : 'Revisar'}
      </button>
    </div>
  )
}
