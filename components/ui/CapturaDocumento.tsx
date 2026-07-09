'use client'

import { useRef, useState } from 'react'

interface Props {
  label: string
  tipo: string
  onCaptura: (dataUrl: string, tipo: string) => void
  valor?: string | null
}

export default function CapturaDocumento({ label, tipo, onCaptura, valor }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [preview, setPreview] = useState<string | null>(valor || null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  async function abrirCamara() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setStream(mediaStream)
      setCamaraActiva(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play()
        }
      }, 100)
    } catch {
      // Si no hay cámara, abrir file input
      inputRef.current?.click()
    }
  }

  function capturar() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setPreview(dataUrl)
    onCaptura(dataUrl, tipo)
    cerrarCamara()
  }

  function cerrarCamara() {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setCamaraActiva(false)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      onCaptura(dataUrl, tipo)
    }
    reader.readAsDataURL(file)
  }

  function eliminar() {
    setPreview(null)
    onCaptura('', tipo)
  }

  return (
    <div className="relative">
      <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">{label}</label>

      {preview ? (
        <div className="relative border border-[var(--ar-border)] rounded-lg overflow-hidden bg-[#f9fafb]">
          <img src={preview} alt={label} className="w-full h-[100px] object-cover"/>
          <button onClick={eliminar} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
          <div className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            ✓ Capturado
          </div>
        </div>
      ) : camaraActiva ? (
        <div className="border border-[var(--ar-border)] rounded-lg overflow-hidden bg-black">
          <video ref={videoRef} className="w-full h-[140px] object-cover" autoPlay playsInline muted/>
          <div className="flex gap-2 p-2 bg-[#1a2332]">
            <button onClick={capturar} className="flex-1 py-1.5 bg-white text-[#1a2332] text-[11px] font-semibold rounded-md">
              <i className="ti ti-camera text-xs" aria-hidden="true"/> Capturar
            </button>
            <button onClick={cerrarCamara} className="px-3 py-1.5 bg-red-500/20 text-red-300 text-[11px] font-semibold rounded-md">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={abrirCamara} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[#d1d5db] rounded-lg text-[11px] text-[#6b7280] hover:border-[#1a2332] hover:text-[#1a2332] transition-colors">
            <i className="ti ti-camera text-sm" aria-hidden="true"/> Tomar foto
          </button>
          <button onClick={() => inputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[#d1d5db] rounded-lg text-[11px] text-[#6b7280] hover:border-[#1a2332] hover:text-[#1a2332] transition-colors">
            <i className="ti ti-upload text-sm" aria-hidden="true"/> Subir archivo
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={handleFileInput} className="hidden"/>
      <canvas ref={canvasRef} className="hidden"/>
    </div>
  )
}
