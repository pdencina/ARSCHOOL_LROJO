'use client'
import { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const DOCS_OBL = [
  { key: 'cedula_alumno_frente', label: 'CI alumno — Frente' },
  { key: 'cedula_alumno_dorso', label: 'CI alumno — Dorso' },
  { key: 'cedula_apoderado_frente', label: 'CI apoderado — Frente' },
  { key: 'cedula_apoderado_dorso', label: 'CI apoderado — Dorso' },
  { key: 'cert_nacimiento_alumno', label: 'Certificado de nacimiento del alumno' },
  { key: 'cuenta_servicios', label: 'Cuenta de servicios básicos' },
]
const DOCS_OPT = [
  { key: 'cert_medico', label: 'Certificado médico' },
  { key: 'cert_diagnostico', label: 'Certificado de diagnóstico' },
  { key: 'notas_anteriores', label: 'Notas centro educacional anterior' },
]

interface Props { preAdmision: any }

export default function SubsanarClient({ preAdmision: pa }: Props) {
  const [documentos, setDocumentos] = useState<Record<string, string>>(pa.documentos || {})
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const docsFaltantes = DOCS_OBL.filter(d => !documentos[d.key])

  function handleFile(key: string, file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10 MB'); return }
    const reader = new FileReader()
    reader.onload = () => { setDocumentos(d => ({ ...d, [key]: reader.result as string })); toast.success('Documento adjuntado') }
    reader.readAsDataURL(file)
  }

  async function enviar() {
    if (docsFaltantes.length > 0) {
      toast.error('Debe completar todos los documentos obligatorios')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admision/subsanar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: pa.codigo_seguimiento,
          documentos,
          observaciones_apoderado: observaciones || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEnviado(true)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
        <Toaster position="top-center"/>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center animate-[fadeIn_0.3s]">
          <div className="w-16 h-16 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 className="text-xl font-bold text-[#1B3A5C] mb-2">Correcciones enviadas</h1>
          <p className="text-sm text-gray-500">Sus correcciones fueron recibidas. El equipo de admisión revisará nuevamente su solicitud.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      <Toaster position="top-center"/>
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="text-sm font-bold text-[#1B3A5C]">AR SCHOOL</div>
          <div className="text-[10px] text-gray-400">Subsanación de solicitud · {pa.codigo_seguimiento}</div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-32 space-y-5">
        {/* Observación del admin */}
        {pa.observaciones_admin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-amber-800 mb-1">Observación del Centro Educacional</h3>
                <p className="text-xs text-amber-700 leading-relaxed">{pa.observaciones_admin}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resumen datos actuales */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Datos del alumno</h3>
          <div className="text-sm font-semibold text-[#1B3A5C]">{pa.alumno_nombre} {pa.alumno_apellido}</div>
          <div className="text-xs text-gray-500">{pa.curso_solicitado} · {pa.sede}</div>
        </div>

        {/* Documentos — lo principal a corregir */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Documentos obligatorios</h3>
          {docsFaltantes.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-[11px] text-red-700">
              Faltan <strong>{docsFaltantes.length}</strong> documento{docsFaltantes.length > 1 ? 's' : ''} obligatorio{docsFaltantes.length > 1 ? 's' : ''}
            </div>
          )}
          <div className="space-y-2">
            {DOCS_OBL.map(doc => {
              const subido = !!documentos[doc.key]
              return (
                <div key={doc.key} className={`flex items-center gap-3 p-3 rounded-xl border ${subido ? 'bg-[#EDF5F0] border-[#2D5A3F]/20' : 'bg-red-50/50 border-red-200'}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${subido ? 'bg-[#2D5A3F]/10' : 'bg-red-100'}`}>
                    {subido ? <svg className="w-3.5 h-3.5 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> : <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                  </div>
                  <span className={`flex-1 text-[11px] font-semibold ${subido ? 'text-[#2D5A3F]' : 'text-red-700'}`}>{doc.label}</span>
                  <label className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer ${subido ? 'bg-white border border-gray-200 text-gray-600' : 'bg-[#1B3A5C] text-white'}`}>
                    {subido ? 'Cambiar' : 'Subir'}
                    <input type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(doc.key, e.target.files[0]); e.target.value = '' }}/>
                  </label>
                </div>
              )
            })}
          </div>

          {/* Opcionales */}
          <details className="group mt-3">
            <summary className="text-[10px] font-semibold text-gray-500 cursor-pointer py-1">Documentos opcionales</summary>
            <div className="space-y-2 mt-2">
              {DOCS_OPT.map(doc => {
                const subido = !!documentos[doc.key]
                return (
                  <div key={doc.key} className={`flex items-center gap-3 p-2.5 rounded-xl border ${subido ? 'bg-[#EDF5F0] border-[#2D5A3F]/20' : 'bg-gray-50 border-gray-200'}`}>
                    <span className="flex-1 text-[10px] text-gray-600">{doc.label}</span>
                    <label className="px-2 py-1 rounded-lg text-[9px] font-semibold cursor-pointer bg-white border border-gray-200 text-gray-600">
                      {subido ? 'Cambiar' : 'Subir'}
                      <input type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(doc.key, e.target.files[0]); e.target.value = '' }}/>
                    </label>
                  </div>
                )
              })}
            </div>
          </details>
        </div>

        {/* Respuesta del apoderado */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Respuesta al Centro Educacional (opcional)</label>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} placeholder="Explique correcciones realizadas o consultas..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs resize-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none"/>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-10">
        <div className="max-w-lg mx-auto">
          <button onClick={enviar} disabled={loading || docsFaltantes.length > 0}
            className="w-full py-3.5 rounded-xl bg-[#2D5A3F] text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform">
            {loading ? 'Enviando...' : docsFaltantes.length > 0 ? `Faltan ${docsFaltantes.length} documento${docsFaltantes.length > 1 ? 's' : ''}` : 'Enviar correcciones'}
          </button>
        </div>
      </footer>
    </div>
  )
}
