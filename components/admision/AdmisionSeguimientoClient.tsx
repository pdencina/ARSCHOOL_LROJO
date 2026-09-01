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

export default function AdmisionSeguimientoClient({ preAdmisiones, puedeEliminar = false }: Props) {
  const [filtro, setFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState<any>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const lista = useMemo(() => {
    return preAdmisiones.filter(pa => {
      const mEstado = !filtro || pa.estado === filtro
      const mBusq = !busqueda || `${pa.alumno_nombre} ${pa.alumno_apellido} ${pa.apoderado_nombre} ${pa.apoderado_apellido} ${pa.curso_solicitado} ${pa.codigo_seguimiento}`.toLowerCase().includes(busqueda.toLowerCase())
      return mEstado && mBusq
    })
  }, [preAdmisiones, filtro, busqueda])

  // KPIs del embudo de admisión
  const kpis = useMemo(() => ({
    pendientes: preAdmisiones.filter(p => p.estado === 'pendiente').length,
    enRevision: preAdmisiones.filter(p => p.estado === 'en_revision').length,
    aprobadas: preAdmisiones.filter(p => p.estado === 'aprobada').length,
    matriculadas: preAdmisiones.filter(p => p.estado === 'matriculada').length,
  }), [preAdmisiones])

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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--ar-text)]" style={{ fontFamily: 'DM Sans' }}>Admisiones</h1>
        <p className="text-xs text-[var(--ar-muted)]">Solicitudes que van llegando · revisa, aprueba y haz seguimiento</p>
      </div>

      {/* KPIs embudo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="kpi-card"><div className="kpi-label">Pendientes</div><div className="kpi-value text-amber-600">{kpis.pendientes}</div></div>
        <div className="kpi-card"><div className="kpi-label">En revisión</div><div className="kpi-value text-blue-600">{kpis.enRevision}</div></div>
        <div className="kpi-card"><div className="kpi-label">Aprobadas</div><div className="kpi-value text-[#2D5A3F]">{kpis.aprobadas}</div></div>
        <div className="kpi-card"><div className="kpi-label">Matriculadas</div><div className="kpi-value text-[#2D5A3F]">{kpis.matriculadas}</div></div>
      </div>

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

      {/* Lista */}
      <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        {lista.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <i className="ti ti-inbox text-3xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
            <p className="text-[var(--ar-muted)] text-sm">No hay solicitudes de admisión{filtro ? ' en este estado' : ''}.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f5f6f7]">
            {lista.map(pa => {
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
        )}
      </div>

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
