'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  preAdmision: any
  onClose: () => void
  onImportar: (datos: any) => void
  onEstadoCambiado: () => void
}

const DOCS_LABELS: Record<string, string> = {
  cedula_alumno: 'Cédula alumno',
  cert_nacimiento_alumno: 'Cert. nacimiento alumno',
  cedula_apoderado: 'Cédula apoderado',
  cert_nacimiento_apoderado: 'Cert. nacimiento apoderado',
  cuenta_servicios: 'Cuenta servicios',
  cert_medico: 'Cert. médico',
  cert_diagnostico: 'Cert. diagnóstico',
  notas_anteriores: 'Notas anteriores',
}

export default function PreAdmisionDetalle({ preAdmision: pa, onClose, onImportar, onEstadoCambiado }: Props) {
  const [loading, setLoading] = useState(false)
  const [observaciones, setObservaciones] = useState(pa.observaciones_admin || '')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [mostrarRechazo, setMostrarRechazo] = useState(false)
  const [docPreview, setDocPreview] = useState<string | null>(null)

  const docs = pa.documentos || {}
  const docsSubidos = Object.keys(docs).filter(k => docs[k])

  async function cambiarEstado(accion: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admision/${pa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, observaciones_admin: observaciones, motivo_rechazo: motivoRechazo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(accion === 'aprobar' ? 'Solicitud aprobada' : accion === 'rechazar' ? 'Solicitud rechazada' : 'Estado actualizado')
      onEstadoCambiado()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function importar() {
    setLoading(true)
    try {
      const res = await fetch('/api/admision/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_admision_id: pa.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Datos importados al formulario de matrícula')
      onImportar(data.datos)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}/>

      {/* Panel lateral */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[580px] bg-white shadow-2xl overflow-y-auto animate-[slideIn_0.2s_ease-out]" style={{ animationName: 'slideInRight' }}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-[15px] font-bold text-[#1B3A5C]">Revisión de solicitud</h2>
            <span className="text-[11px] text-gray-400 font-mono">{pa.codigo_seguimiento}</span>
          </div>
          <div className="flex items-center gap-2">
            <EstadoBadge estado={pa.estado}/>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Datos alumno */}
          <Section titulo="Datos del alumno" icono="ti-user">
            <Row label="Nombre completo" value={`${pa.alumno_nombre} ${pa.alumno_apellido}`} highlight/>
            <Row label="RUT" value={pa.alumno_rut}/>
            <Row label="Fecha nacimiento" value={pa.alumno_fecha_nacimiento ? new Date(pa.alumno_fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : null}/>
            <Row label="Sexo" value={pa.alumno_sexo}/>
            <Row label="Curso solicitado" value={pa.curso_solicitado} highlight/>
            <Row label="Sede" value={pa.sede}/>
            <Row label="Jornada" value={pa.jornada}/>
            <Row label="Nacionalidad" value={pa.alumno_nacionalidad}/>
            <Row label="País natal" value={pa.alumno_pais_natal}/>
            <Row label="Dirección" value={pa.alumno_direccion}/>
            <Row label="Comuna" value={pa.alumno_comuna}/>
          </Section>

          {/* Datos apoderado */}
          <Section titulo="Apoderado" icono="ti-heart-handshake">
            <Row label="Nombre completo" value={`${pa.apoderado_nombre} ${pa.apoderado_apellido}`} highlight/>
            <Row label="RUT" value={pa.apoderado_rut}/>
            <Row label="Email" value={pa.apoderado_email}/>
            <Row label="Teléfono" value={pa.apoderado_telefono}/>
            <Row label="Dirección" value={pa.apoderado_direccion}/>
            <Row label="Comuna" value={pa.apoderado_comuna}/>
            <Row label="Parentesco" value={pa.apoderado_parentesco}/>
          </Section>

          {/* Padre */}
          {pa.padre_nombre && (
            <Section titulo="Padre / segundo apoderado" icono="ti-user-plus">
              <Row label="Nombre completo" value={`${pa.padre_nombre} ${pa.padre_apellido || ''}`}/>
              <Row label="RUT" value={pa.padre_rut}/>
              <Row label="Teléfono" value={pa.padre_telefono}/>
              <Row label="Email" value={pa.padre_email}/>
            </Section>
          )}

          {/* Salud */}
          <Section titulo="Salud y emergencia" icono="ti-heart">
            <Row label="Previsión" value={pa.prevision_salud}/>
            <Row label="Alergia alimentaria" value={pa.alergia_alimentaria}/>
            <Row label="Alergia medicamentos" value={pa.alergia_medicamento}/>
            <Row label="Enfermedad crónica" value={pa.enfermedad_cronica}/>
            <Row label="Diagnóstico" value={pa.diagnostico}/>
            <Row label="Contacto emergencia" value={pa.contacto_emergencia}/>
            <Row label="Tel. emergencia" value={pa.telefono_emergencia}/>
          </Section>

          {/* Documentos */}
          <Section titulo={`Documentos adjuntos (${docsSubidos.length})`} icono="ti-paperclip">
            {docsSubidos.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No se adjuntaron documentos</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {docsSubidos.map(key => {
                  const isImage = docs[key].startsWith('data:image')
                  return (
                    <button
                      key={key}
                      onClick={() => setDocPreview(docs[key])}
                      className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {isImage ? (
                          <img src={docs[key]} alt="" className="w-full h-full object-cover"/>
                        ) : (
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M7 18h10v-2H7v2zM7 14h10v-2H7v2zM7 10h4V8H7v2zm12-4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold text-[#1B3A5C] truncate">{DOCS_LABELS[key] || key}</div>
                        <div className="text-[9px] text-gray-400">{isImage ? 'Imagen' : 'PDF'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Verificación de obligatorios */}
            <div className="mt-3 space-y-1">
              {['cedula_alumno', 'cert_nacimiento_alumno', 'cedula_apoderado', 'cuenta_servicios'].map(key => (
                <div key={key} className="flex items-center gap-2 text-[10px]">
                  {docs[key] ? (
                    <span className="text-[#2D5A3F] font-bold">✓</span>
                  ) : (
                    <span className="text-red-500 font-bold">✗</span>
                  )}
                  <span className={docs[key] ? 'text-gray-600' : 'text-red-600 font-medium'}>{DOCS_LABELS[key]}</span>
                  {!docs[key] && <span className="text-red-400 text-[9px]">(faltante)</span>}
                </div>
              ))}
            </div>
          </Section>

          {/* Observaciones del apoderado */}
          {pa.observaciones_apoderado && (
            <Section titulo="Nota del apoderado" icono="ti-message">
              <p className="text-xs text-gray-600 italic bg-amber-50 p-3 rounded-lg border border-amber-100">
                "{pa.observaciones_apoderado}"
              </p>
            </Section>
          )}

          {/* Acciones del gestor */}
          <Section titulo="Gestión" icono="ti-clipboard-check">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Observaciones internas</label>
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Notas internas sobre esta solicitud..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs resize-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none"
                />
              </div>

              {mostrarRechazo && (
                <div>
                  <label className="text-[11px] font-semibold text-red-600 mb-1 block">Motivo de rechazo *</label>
                  <textarea
                    value={motivoRechazo}
                    onChange={e => setMotivoRechazo(e.target.value)}
                    rows={2}
                    placeholder="Ej: No hay cupo disponible para el nivel solicitado"
                    className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs resize-none focus:ring-2 focus:ring-red-200 outline-none"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {pa.estado !== 'aprobada' && pa.estado !== 'matriculada' && (
                  <button onClick={() => cambiarEstado('aprobar')} disabled={loading}
                    className="flex-1 py-2.5 bg-[#2D5A3F] text-white text-xs font-semibold rounded-lg hover:bg-[#245234] disabled:opacity-50 transition-colors">
                    ✓ Aprobar
                  </button>
                )}
                {pa.estado !== 'aprobada' && pa.estado !== 'matriculada' && pa.estado !== 'rechazada' && (
                  <button onClick={() => { if (!observaciones.trim()) { toast.error('Escriba la observación que verá el apoderado'); return }; cambiarEstado('subsanar') }} disabled={loading}
                    className="flex-1 py-2.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
                    📩 Solicitar corrección
                  </button>
                )}
                {pa.estado === 'aprobada' && (
                  <button onClick={importar} disabled={loading}
                    className="flex-1 py-2.5 bg-[#1B3A5C] text-white text-xs font-semibold rounded-lg hover:bg-[#143050] disabled:opacity-50 transition-colors">
                    Importar a matrícula
                  </button>
                )}
                {!mostrarRechazo && pa.estado !== 'rechazada' && pa.estado !== 'matriculada' && (
                  <button onClick={() => setMostrarRechazo(true)}
                    className="px-4 py-2.5 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                    Rechazar
                  </button>
                )}
                {mostrarRechazo && (
                  <button onClick={() => cambiarEstado('rechazar')} disabled={loading || !motivoRechazo.trim()}
                    className="px-4 py-2.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                    Confirmar rechazo
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* Metadata */}
          <div className="text-[9px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-4">
            <div>Enviado: {new Date(pa.created_at).toLocaleString('es-CL')}</div>
            <div>IP: {pa.ip_envio || 'N/A'}</div>
            {pa.revisado_at && <div>Revisado: {new Date(pa.revisado_at).toLocaleString('es-CL')}</div>}
          </div>
        </div>
      </div>

      {/* Modal preview documento */}
      {docPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setDocPreview(null)}>
          <div className="bg-white rounded-2xl max-w-2xl max-h-[85vh] overflow-auto p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            {docPreview.startsWith('data:image') ? (
              <img src={docPreview} alt="Documento" className="max-w-full rounded-lg"/>
            ) : docPreview.startsWith('data:application/pdf') ? (
              <iframe src={docPreview} className="w-[500px] h-[70vh] rounded-lg" title="PDF"/>
            ) : (
              <p className="p-8 text-sm text-gray-500">No se puede previsualizar este documento</p>
            )}
            <div className="text-center mt-3 pb-2">
              <button onClick={() => setDocPreview(null)} className="text-xs text-gray-500 hover:text-gray-700">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  )
}

// Sub-components
function Section({ titulo, icono, children }: { titulo: string; icono: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <i className={`ti ${icono} text-[var(--ar-accent)] text-sm`} aria-hidden="true"/>
        <h3 className="text-[12px] font-bold text-[#1B3A5C] uppercase tracking-wider">{titulo}</h3>
      </div>
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  if (!value) return null
  return (
    <div className="flex justify-between text-[11px] py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right max-w-[60%] ${highlight ? 'font-bold text-[#1B3A5C]' : 'font-medium text-gray-700'}`}>{value}</span>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pendiente: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    en_revision: { label: 'En revisión', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    aprobada: { label: 'Aprobada', cls: 'bg-[#EDF5F0] text-[#2D5A3F] border-[#2D5A3F]/20' },
    matriculada: { label: 'Matriculada', cls: 'bg-[#EDF5F0] text-[#2D5A3F] border-[#2D5A3F]/20' },
    rechazada: { label: 'Rechazada', cls: 'bg-red-50 text-red-700 border-red-200' },
  }
  const c = config[estado] || config.pendiente
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${c.cls}`}>{c.label}</span>
}
