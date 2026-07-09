'use client'

import { useState, useEffect, useRef } from 'react'

const DOCS_LABELS: Record<string, string> = {
  ci_frente: 'CI Alumno (frente)',
  ci_reverso: 'CI Alumno (reverso)',
  foto_alumno: 'Foto del alumno',
  ci_apoderado_frente: 'CI Apoderado (frente)',
  ci_apoderado_reverso: 'CI Apoderado (reverso)',
  certificado_nacimiento: 'Certificado de nacimiento',
  cuenta_servicios: 'Cuenta servicio básico',
  certificado_medico: 'Certificado médico',
}

interface Props {
  documentos: Record<string, string>
  onDocumentos: (docs: Record<string, string>) => void
}

export default function CapturaMovilSection({ documentos, onDocumentos }: Props) {
  const [sesionActiva, setSesionActiva] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [creando, setCreando] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function crearSesion() {
    setCreando(true)
    const res = await fetch('/api/captura', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCodigo(data.codigo)
      setSesionActiva(true)
      iniciarPolling(data.codigo)
    }
    setCreando(false)
  }

  function iniciarPolling(cod: string) {
    pollingRef.current = setInterval(async () => {
      const res = await fetch(`/api/captura?codigo=${cod}`)
      if (res.ok) {
        const data = await res.json()
        if (data.documentos && Object.keys(data.documentos).length > 0) {
          onDocumentos(data.documentos)
        }
      }
    }, 3000)
  }

  function cerrarSesion() {
    setSesionActiva(false)
    setCodigo('')
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const totalCapturados = Object.keys(documentos).filter(k => documentos[k]).length
  const linkCaptura = `${siteUrl}/captura/${codigo}`

  if (!sesionActiva) {
    return (
      <div className="border border-dashed border-[#d1d5db] rounded-xl p-5 text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <i className="ti ti-device-mobile-camera text-xl text-blue-600" aria-hidden="true"/>
        </div>
        <h3 className="text-[13px] font-semibold text-[#1a2332] mb-1">Captura desde el teléfono</h3>
        <p className="text-[11px] text-[#6b7280] mb-4 max-w-md mx-auto">
          Genera un código QR para abrir la cámara en el celular. Las fotos se sincronizan en tiempo real con este formulario.
        </p>
        <button onClick={crearSesion} disabled={creando} className="btn-primary text-xs disabled:opacity-60">
          <i className="ti ti-qrcode text-sm" aria-hidden="true"/> {creando ? 'Generando...' : 'Continuar con teléfono'}
        </button>
      </div>
    )
  }

  return (
    <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-5">
      <div className="flex items-start gap-5">
        {/* QR / Código */}
        <div className="text-center flex-shrink-0">
          <div className="bg-white border border-[#e8eaed] rounded-xl p-3 mb-2">
            {/* QR simple usando una API de QR */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(linkCaptura)}`} 
              alt="QR Code" 
              className="w-[140px] h-[140px]"
            />
          </div>
          <div className="bg-[#1a2332] text-white text-[14px] font-mono font-bold px-4 py-2 rounded-lg tracking-[0.2em]">
            {codigo}
          </div>
          <p className="text-[10px] text-[#9ca3af] mt-2">Escanea el QR o ingresa el código en<br/><span className="font-medium">{siteUrl}/captura/{codigo}</span></p>
        </div>

        {/* Estado de documentos */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-[#1a2332]">Documentos recibidos</h3>
            <button onClick={cerrarSesion} className="text-[10px] text-[#9ca3af] hover:text-red-500">
              <i className="ti ti-x text-xs" aria-hidden="true"/> Cerrar sesión
            </button>
          </div>

          <div className="space-y-1.5">
            {Object.entries(DOCS_LABELS).map(([tipo, label]) => {
              const captured = !!documentos[tipo]
              return (
                <div key={tipo} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] ${captured ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-[#9ca3af]'}`}>
                  <i className={`ti ${captured ? 'ti-circle-check' : 'ti-circle-dashed'} text-xs`} aria-hidden="true"/>
                  <span className={captured ? 'font-medium' : ''}>{label}</span>
                  {captured && <img src={documentos[tipo]} alt="" className="w-6 h-6 rounded object-cover ml-auto"/>}
                </div>
              )
            })}
          </div>

          {totalCapturados > 0 && (
            <div className="mt-3 bg-emerald-100 text-emerald-800 text-[11px] font-medium px-3 py-2 rounded-lg text-center">
              ✓ {totalCapturados} documento{totalCapturados > 1 ? 's' : ''} sincronizado{totalCapturados > 1 ? 's' : ''}
            </div>
          )}

          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-600">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"/>
            Esperando capturas del teléfono...
          </div>
        </div>
      </div>
    </div>
  )
}
