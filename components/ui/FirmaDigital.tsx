'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onFirmar: (firmaDataUrl: string) => void
  label?: string
}

export default function FirmaDigital({ onFirmar, label = 'Firma del Apoderado' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dibujando, setDibujando] = useState(false)
  const [haFirmado, setHaFirmado] = useState(false)

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    // Ajustar resolución del canvas al tamaño real en pantalla
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1a2332'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    return () => window.removeEventListener('resize', setupCanvas)
  }, [setupCanvas])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDibujando(true)
    setHaFirmado(true)
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!dibujando) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function stopDraw() {
    setDibujando(false)
  }

  function limpiar() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHaFirmado(false)
    setupCanvas()
  }

  function confirmar() {
    const canvas = canvasRef.current!
    const dataUrl = canvas.toDataURL('image/png')
    onFirmar(dataUrl)
  }

  return (
    <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">{label}</div>
        <div className="flex gap-2">
          <button onClick={limpiar} className="text-[11px] text-[#9ca3af] hover:text-[#1a2332] transition-colors">
            Limpiar
          </button>
          {haFirmado && (
            <button onClick={confirmar} className="btn-primary text-xs py-1.5 px-3">
              Confirmar firma
            </button>
          )}
        </div>
      </div>
      <div className="border border-dashed border-[#d1d5db] rounded-lg overflow-hidden bg-[#fafbfc] relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[150px] cursor-crosshair touch-none block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!haFirmado && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[#d1d5db] text-sm">Firme aquí</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#9ca3af] mt-2">Dibuje su firma con el mouse o el dedo (en dispositivo móvil)</p>
    </div>
  )
}
