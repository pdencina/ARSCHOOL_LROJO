'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import PreAdmisionDetalle from '@/components/matricula/PreAdmisionDetalle'

interface Props { preAdmisiones: any[]; puedeEliminar?: boolean }

const ESTADOS = [
  { value: '', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'matriculada', label: 'Matriculadas' },
  { value: 'rechazada', label: 'Rechazadas' },
]

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  pendiente: { label: 'Pendiente', class: 'bg-amber-50 text-amber-700' },
  en_revision: { label: 'En revisión', class: 'bg-blue-50 text-blue-700' },
  aprobada: { label: 'Aprobada', class: 'bg-[#EDF5F0] text-[#2D5A3F]' },
  matriculada: { label: 'Matriculada', class: 'bg-[#EDF5F0] text-[#2D5A3F]' },
  rechazada: { label: 'Rechazada', class: 'bg-red-50 text-red-700' },
}

// Orden y branding fijo de los programas para las secciones.
const PROGRAMAS_ORDEN = [
  { codigo: 'ar_school',    nombre: 'AR School',           icono: 'ti-school',        color: '#1B3A5C' },
  { codigo: 'play_group',   nombre: 'Play Group',          icono: 'ti-baby-carriage', color: '#E8722A' },
  { codigo: 'lions_soccer', nombre: 'Lions Soccer School', icono: 'ti-ball-football', color: '#2D5A3F' },
  { codigo: 'ar_worship',   nombre: 'AR Worship School',   icono: 'ti-music',         color: '#7C5CBF' },
]
const OTROS = { codigo: 'otros', nombre: 'Otros / sin programa', icono: 'ti-folder', color: '#6b7280' }

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

export default function AdmisionSeguimientoClient({ preAdmisiones, puedeEliminar = false }: Props) {
  const [filtro, setFiltro] = useState('')
  // Carpeta abierta: null = vista de carpetas; código de programa = dentro de esa carpeta.
  const [carpeta, setCarpeta] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState<any>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

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
      const mBusq = !busqueda || `${pa.alumno_nombre} ${pa.alumno_apellido} ${pa.apoderado_nombre} ${pa.apoderado_apellido} ${pa.curso_solicitado} ${pa.codigo_seguimiento}`.toLowerCase().includes(busqueda.toLowerCase())
      return mEstado && mBusq
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

  const docsCount = (docs: Record<string, string>) => Object.keys(docs || {}).filter(k => docs[k]).length

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex items-center gap-3">
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
              : 'Elige un programa para ver sus solicitudes'}
          </p>
        </div>
      </div>

      {/* ─── VISTA DE CARPETAS (una por programa) ─── */}
      {!carpeta && (
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
            <div className="bg-white border border-[var(--ar-border)] rounded-xl px-4 py-12 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <i className="ti ti-inbox text-3xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
              <p className="text-[var(--ar-muted)] text-sm">No hay solicitudes{filtro ? ' en este estado' : ''} para este programa.</p>
            </div>
          ) : (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)', borderLeft: `3px solid ${carpetaActual?.color ?? '#1B3A5C'}` }}>
              <div className="divide-y divide-[#f5f6f7]">
                {listaCarpeta.map((pa: any) => {
                  const badge = ESTADO_BADGE[pa.estado] || ESTADO_BADGE.pendiente
                  const docs = docsCount(pa.documentos)
                  return (
                    <div key={pa.id} className="p-3.5 flex items-center gap-3 hover:bg-[#fafbfc] cursor-pointer" onClick={() => abrirDetalle(pa.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-semibold text-[var(--ar-text)] truncate">{pa.alumno_nombre} {pa.alumno_apellido}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.class}`}>{badge.label}</span>
                        </div>
                        <div className="text-[11px] text-[var(--ar-muted)] flex items-center gap-2 flex-wrap">
                          <span>{pa.curso_solicitado}</span>
                          <span>·</span>
                          <span>{pa.apoderado_nombre} {pa.apoderado_apellido}</span>
                          {docs > 0 && (<><span>·</span><span className="text-[#2D5A3F] font-medium">{docs} docs</span></>)}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{pa.codigo_seguimiento} · {new Date(pa.created_at).toLocaleDateString('es-CL')}</div>
                      </div>
                      <button disabled={loadingId === pa.id} className="px-3 py-1.5 bg-white border border-[var(--ar-border)] text-[var(--ar-text)] text-[10px] font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex-shrink-0">
                        {loadingId === pa.id ? '...' : 'Revisar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
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
