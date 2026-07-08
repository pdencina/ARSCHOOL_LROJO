'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onFirmar: (firmaDataUrl: string) => void
  firma?: string | null
}

export default function FirmaDigital({ onFirmar, firma }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dibujando, setDibujando] = useState(false)
  const [hayFirma, setHayFirma] = useState(false)

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1a2332'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Si ya hay firma, dibujarla
    if (firma) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        setHayFirma(true)
      }
      img.src = firma
    }
  }, [firma])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDibujando(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function dibujar(e: React.MouseEvent | React.TouchEvent) {
    if (!dibujando) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHayFirma(true)
  }

  function terminar() {
    setDibujando(false)
  }

  function limpiar() {
    setHayFirma(false)
    setupCanvas()
  }

  function confirmar() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onFirmar(dataUrl)
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Firma del apoderado</div>
      <div className="border border-[var(--ar-border)] rounded-xl overflow-hidden bg-white" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-[160px] cursor-crosshair touch-none block"
          onMouseDown={iniciar}
          onMouseMove={dibujar}
          onMouseUp={terminar}
          onMouseLeave={terminar}
          onTouchStart={iniciar}
          onTouchMove={dibujar}
          onTouchEnd={terminar}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#9ca3af]">Dibuje su firma con el mouse o el dedo en pantalla táctil</p>
        <div className="flex gap-2">
          <button onClick={limpiar} className="btn-secondary text-xs py-1.5 px-3">
            Limpiar
          </button>
          <button onClick={confirmar} disabled={!hayFirma} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40">
            Confirmar firma
          </button>
        </div>
      </div>
    </div>
  )
}
