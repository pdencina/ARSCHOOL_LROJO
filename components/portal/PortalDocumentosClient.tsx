'use client'

interface Props {
  matriculas: any[]
  documentos: any[]
  usuario: any
}

export default function PortalDocumentosClient({ matriculas, documentos, usuario }: Props) {
  const pendientesFirma = matriculas.filter(m => !m.firma_apoderado)
  const firmados = matriculas.filter(m => m.firma_apoderado)

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="page-title">Documentos</h1>
        <p className="page-subtitle">Contratos, documentos compartidos y firmas pendientes</p>
      </div>

      {/* Alerta de firmas pendientes */}
      {pendientesFirma.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ti ti-alert-triangle text-amber-600 text-lg" aria-hidden="true"/>
            </div>
            <div className="flex-1">
              <h3 className="text-[14px] font-bold text-amber-800 mb-1">
                {pendientesFirma.length === 1 ? 'Tienes 1 documento pendiente de firma' : `Tienes ${pendientesFirma.length} documentos pendientes de firma`}
              </h3>
              <p className="text-[12px] text-amber-700 mb-3">
                Por favor firma los contratos pendientes para completar el proceso de matrícula.
              </p>
              <div className="flex flex-wrap gap-2">
                {pendientesFirma.map(m => (
                  <a
                    key={m.id}
                    href={`/matricula/firmar/${m.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[11px] font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <i className="ti ti-pencil text-xs" aria-hidden="true"/>
                    Firmar — {m.alumno?.nombre} {m.alumno?.apellido}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contratos */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <i className="ti ti-file-certificate text-[var(--ar-accent)] text-lg" aria-hidden="true"/>
          <h2 className="text-[15px] font-bold text-[#1a2332]">Contratos de matrícula</h2>
        </div>

        {matriculas.length === 0 ? (
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-8 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <i className="ti ti-file-off text-3xl text-[#d1d5db] mb-2" aria-hidden="true"/>
            <p className="text-[13px] text-[#9ca3af]">No hay contratos registrados aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matriculas.map(m => {
              const firmado = !!m.firma_apoderado
              const fecha = m.created_at ? new Date(m.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
              const firmadoAt = m.firmado_at ? new Date(m.firmado_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : null

              return (
                <div key={m.id} className="bg-white border border-[var(--ar-border)] rounded-xl p-4 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  {/* Icono */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${firmado ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    <i className={`ti ${firmado ? 'ti-file-check text-emerald-600' : 'ti-file-alert text-amber-600'} text-lg`} aria-hidden="true"/>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1a2332] truncate">
                      Contrato de Prestación de Servicios — {m.alumno?.nombre} {m.alumno?.apellido}
                    </div>
                    <div className="text-[11px] text-[#9ca3af] mt-0.5">
                      {m.alumno?.curso} · Creado el {fecha}
                      {firmadoAt && <span className="text-emerald-600 ml-2">· Firmado el {firmadoAt}</span>}
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {firmado ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                        <i className="ti ti-check text-xs" aria-hidden="true"/> Firmado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                        <i className="ti ti-clock text-xs" aria-hidden="true"/> Pendiente
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`/api/contratos?matricula_id=${m.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#f4f5f7] text-[#4b5563] text-[11px] font-medium rounded-lg hover:bg-[#e8eaed] transition-colors"
                    >
                      <i className="ti ti-file-text text-xs" aria-hidden="true"/> Contrato
                    </a>
                    <a
                      href={`/api/contratos?matricula_id=${m.id}&tipo=pagare`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#f4f5f7] text-[#5B8FA8] text-[11px] font-medium rounded-lg hover:bg-[#e8eaed] transition-colors"
                    >
                      <i className="ti ti-file-dollar text-xs" aria-hidden="true"/> Pagaré
                    </a>
                    {!firmado && (
                      <a
                        href={`/matricula/firmar/${m.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1a2332] text-white text-[11px] font-medium rounded-lg hover:bg-[#2a3342] transition-colors"
                      >
                        <i className="ti ti-pencil text-xs" aria-hidden="true"/> Firmar
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Documentos compartidos */}
      {documentos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <i className="ti ti-folder text-[var(--ar-accent)] text-lg" aria-hidden="true"/>
            <h2 className="text-[15px] font-bold text-[#1a2332]">Documentos compartidos</h2>
          </div>

          <div className="space-y-2">
            {documentos.map((doc: any) => (
              <div key={doc.id} className="bg-white border border-[var(--ar-border)] rounded-xl p-4 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-file-text text-blue-500" aria-hidden="true"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1a2332] truncate">{doc.titulo || doc.nombre}</div>
                  <div className="text-[11px] text-[#9ca3af]">
                    {doc.categoria && <span className="capitalize">{doc.categoria} · </span>}
                    {doc.created_at && new Date(doc.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {doc.url && (
                  <a href={doc.url} target="_blank" className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#f4f5f7] text-[#4b5563] text-[11px] font-medium rounded-lg hover:bg-[#e8eaed] transition-colors">
                    <i className="ti ti-download text-xs" aria-hidden="true"/> Descargar
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
