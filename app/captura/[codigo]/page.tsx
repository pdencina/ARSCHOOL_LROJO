'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

const DOCUMENTOS = [
  { tipo: 'ci_frente', label: 'CI Alumno (frente)', icon: 'ti-id' },
  { tipo: 'ci_reverso', label: 'CI Alumno (reverso)', icon: 'ti-id' },
  { tipo: 'foto_alumno', label: 'Foto del alumno', icon: 'ti-user' },
  { tipo: 'ci_apoderado_frente', label: 'CI Apoderado (frente)', icon: 'ti-id-badge-2' },
  { tipo: 'ci_apoderado_reverso', label: 'CI Apoderado (reverso)', icon: 'ti-id-badge-2' },
  { tipo: 'certificado_nacimiento', label: 'Certificado de nacimiento', icon: 'ti-file-certificate' },
  { tipo: 'cuenta_servicios', label: 'Cuenta servicio básico', icon: 'ti-file-invoice' },
  { tipo: 'certificado_medico', label: 'Certificado médico (opcional)', icon: 'ti-stethoscope' },
]

export default function CapturaMovilPage() {
  const params = useParams()
  const codigo = (params.codigo as string)?.toUpperCase()
  const [sesionValida, setSesionValida] = useState<boolean | null>(null)
  const [capturados, setCapturados] = useState<Record<string, string>>({})
  const [capturando, setCapturando] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    verificarSesion()
  }, [])

  async function verificarSesion() {
    const res = await fetch(`/api/captura?codigo=${codigo}`)
    if (res.ok) {
      const data = await res.json()
      setSesionValida(true)
      setCapturados(data.documentos || {})
    } else {
      setSesionValida(false)
    }
  }

  async function abrirCamara(tipo: string) {
    setCapturando(tipo)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      })
      setStream(mediaStream)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play()
        }
      }, 100)
    } catch {
      // Fallback a input file
      inputRef.current?.click()
    }
  }

  function capturarFoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !capturando) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    enviarDocumento(capturando, dataUrl)
    cerrarCamara()
  }

  function cerrarCamara() {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setCapturando(null)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !capturando) return
    const reader = new FileReader()
    reader.onload = () => {
      enviarDocumento(capturando!, reader.result as string)
      setCapturando(null)
    }
    reader.readAsDataURL(file)
  }

  async function enviarDocumento(tipo: string, dataUrl: string) {
    setEnviando(true)
    const res = await fetch('/api/captura', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, tipo, url: dataUrl }),
    })
    if (res.ok) {
      setCapturados(prev => ({ ...prev, [tipo]: dataUrl }))
    }
    setEnviando(false)
  }

  if (sesionValida === null) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1a2332] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-[13px] text-[#6b7280]">Conectando...</p>
        </div>
      </div>
    )
  }

  if (sesionValida === false) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-link-off text-2xl text-red-500" aria-hidden="true"/>
          </div>
          <h1 className="text-[18px] font-bold text-[#1a2332] mb-2">Sesión no válida</h1>
          <p className="text-[13px] text-[#6b7280]">Este enlace ha expirado o no es válido. Genera uno nuevo desde el formulario de matrícula.</p>
        </div>
      </div>
    )
  }

  const totalCapturados = Object.keys(capturados).filter(k => capturados[k]).length

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8eaed] px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo-arschool.png" alt="AR School" width={28} height={28} className="rounded-md"/>
            <div>
              <div className="text-[12px] font-bold text-[#1a2332]">Captura de documentos</div>
              <div className="text-[10px] text-[#9ca3af]">Código: {codigo}</div>
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md">
            {totalCapturados}/{DOCUMENTOS.length - 1}
          </div>
        </div>
      </div>

      {/* Cámara activa */}
      {capturando && stream && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} className="flex-1 object-cover" autoPlay playsInline muted/>
          <div className="absolute top-4 left-4 bg-black/50 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg">
            {DOCUMENTOS.find(d => d.tipo === capturando)?.label}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex items-center justify-center gap-6">
            <button onClick={cerrarCamara} className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="ti ti-x text-white text-xl" aria-hidden="true"/>
            </button>
            <button onClick={capturarFoto} className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-white/50">
              <div className="w-12 h-12 bg-white rounded-full border-2 border-[#1a2332]"/>
            </button>
            <div className="w-12 h-12"/>
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      <div className="p-4 space-y-3">
        <p className="text-[12px] text-[#6b7280] mb-4">Toma las fotos de cada documento. Se sincronizan automáticamente con el formulario.</p>

        {DOCUMENTOS.map(doc => {
          const captured = !!capturados[doc.tipo]
          return (
            <div key={doc.tipo} className={`bg-white border rounded-xl p-4 flex items-center gap-3 transition-all ${captured ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#e8eaed]'}`}>
              {captured ? (
                <img src={capturados[doc.tipo]} alt={doc.label} className="w-14 h-14 rounded-lg object-cover flex-shrink-0"/>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#f4f5f7] flex items-center justify-center flex-shrink-0">
                  <i className={`ti ${doc.icon} text-xl text-[#b0b7c3]`} aria-hidden="true"/>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-medium ${captured ? 'text-emerald-800' : 'text-[#1a2332]'}`}>{doc.label}</div>
                {captured && <div className="text-[10px] text-emerald-600 font-medium">✓ Capturado</div>}
              </div>
              <button 
                onClick={() => abrirCamara(doc.tipo)} 
                disabled={enviando}
                className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                  captured 
                    ? 'bg-[#f4f5f7] text-[#6b7280] hover:bg-[#e8eaed]' 
                    : 'bg-[#1a2332] text-white hover:bg-[#2a3342]'
                }`}
              >
                <i className={`ti ${captured ? 'ti-refresh' : 'ti-camera'} text-xs mr-1`} aria-hidden="true"/>
                {captured ? 'Repetir' : 'Capturar'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {totalCapturados > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-[#e8eaed] p-4 text-center">
          <div className="text-[12px] text-emerald-600 font-medium">
            <i className="ti ti-check text-sm" aria-hidden="true"/> {totalCapturados} documento{totalCapturados > 1 ? 's' : ''} sincronizado{totalCapturados > 1 ? 's' : ''} con el formulario
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="hidden"/>
      <canvas ref={canvasRef} className="hidden"/>
    </div>
  )
}
