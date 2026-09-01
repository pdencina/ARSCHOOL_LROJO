'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import PreAdmisionDetalle from './PreAdmisionDetalle'

interface PreAdmision {
  id: string
  codigo_seguimiento: string
  estado: string
  alumno_nombre: string
  alumno_apellido: string
  curso_solicitado: string
  apoderado_nombre: string
  apoderado_apellido: string
  apoderado_email: string
  documentos: Record<string, string>
  created_at: string
}

interface Props {
  preAdmisiones: PreAdmision[]
  onImportar: (datos: any) => void
  /** Permite eliminar solicitudes desde el detalle */
  puedeEliminar?: boolean
}

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  pendiente: { label: 'Pendiente', class: 'bg-amber-50 text-amber-700' },
  en_revision: { label: 'En revisión', class: 'bg-blue-50 text-blue-700' },
  aprobada: { label: 'Aprobada', class: 'bg-[#EDF5F0] text-[#2D5A3F]' },
}

export default function PreAdmisionesQueue({ preAdmisiones, onImportar, puedeEliminar = false }: Props) {
  const [detalleAbierto, setDetalleAbierto] = useState<any>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (!preAdmisiones.length) return null

  async function abrirDetalle(id: string) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admision/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDetalleAbierto(data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingId(null)
    }
  }

  const docsCount = (docs: Record<string, string>) => Object.keys(docs || {}).filter(k => docs[k]).length

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--ar-text)]">Pre-admisiones pendientes</h3>
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
            {preAdmisiones.length}
          </span>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {preAdmisiones.map(pa => {
            const badge = ESTADO_BADGE[pa.estado] || ESTADO_BADGE.pendiente
            const docs = docsCount(pa.documentos)
            return (
              <div
                key={pa.id}
                className="card p-3 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => abrirDetalle(pa.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-[var(--ar-text)] truncate">
                      {pa.alumno_nombre} {pa.alumno_apellido}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.class}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--ar-muted)] flex items-center gap-2">
                    <span>{pa.curso_solicitado}</span>
                    <span>·</span>
                    <span>{pa.apoderado_nombre} {pa.apoderado_apellido}</span>
                    {docs > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-[#2D5A3F] font-medium">{docs} docs</span>
                      </>
                    )}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-0.5">
                    {pa.codigo_seguimiento} · {new Date(pa.created_at).toLocaleDateString('es-CL')}
                  </div>
                </div>

                <button
                  disabled={loadingId === pa.id}
                  className="px-3 py-1.5 bg-white border border-[var(--ar-border)] text-[var(--ar-text)] text-[10px] font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {loadingId === pa.id ? '...' : 'Revisar'}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-[var(--ar-muted)] mt-2">
          Haga clic en una solicitud para revisar datos completos, documentos adjuntos, y aprobar o rechazar.
        </p>
      </div>

      {/* Panel de detalle */}
      {detalleAbierto && (
        <PreAdmisionDetalle
          preAdmision={detalleAbierto}
          onClose={() => setDetalleAbierto(null)}
          onImportar={(datos) => {
            setDetalleAbierto(null)
            onImportar(datos)
          }}
          onEstadoCambiado={() => {
            setDetalleAbierto(null)
            // Recargar la página para refrescar la lista
            window.location.reload()
          }}
          permitirEliminar={puedeEliminar}
          permitirImportar
        />
      )}
    </>
  )
}
