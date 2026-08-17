'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  pendiente: { color: 'text-amber-700', bg: 'bg-amber-50', icon: '⏳' },
  en_revision: { color: 'text-blue-700', bg: 'bg-blue-50', icon: '🔍' },
  aprobada: { color: 'text-[#2D5A3F]', bg: 'bg-[#EDF5F0]', icon: '✅' },
  matriculada: { color: 'text-[#2D5A3F]', bg: 'bg-[#EDF5F0]', icon: '🎓' },
  rechazada: { color: 'text-red-700', bg: 'bg-red-50', icon: '❌' },
  desistida: { color: 'text-gray-600', bg: 'bg-gray-100', icon: '↩️' },
}

function SeguimientoContent() {
  const searchParams = useSearchParams()
  const codigoUrl = searchParams.get('codigo') || ''
  const [codigo, setCodigo] = useState(codigoUrl)
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (codigoUrl) consultar(codigoUrl)
  }, [codigoUrl])

  async function consultar(cod?: string) {
    const c = cod || codigo
    if (!c.trim()) return
    setLoading(true)
    setError('')
    setResultado(null)
    try {
      const res = await fetch(`/api/admision/pre-registro?codigo=${encodeURIComponent(c.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultado(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cfg = resultado ? ESTADO_CONFIG[resultado.estado] || ESTADO_CONFIG.pendiente : null

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-sm font-bold text-[#1B3A5C]">AR SCHOOL</div>
          <h1 className="text-lg font-bold text-[#1B3A5C] mt-2">Estado de solicitud</h1>
          <p className="text-xs text-gray-500">Ingrese su código de seguimiento</p>
        </div>

        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="ADM-2026-XXXX"
            className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-wide focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none"
            onKeyDown={e => e.key === 'Enter' && consultar()}
          />
          <button
            onClick={() => consultar()}
            disabled={loading || !codigo.trim()}
            className="px-4 py-2.5 bg-[#1B3A5C] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? '...' : 'Consultar'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 mb-4">{error}</div>
        )}

        {resultado && cfg && (
          <div className="animate-[fadeIn_0.2s]">
            <div className={`${cfg.bg} rounded-xl p-4 mb-4 text-center`}>
              <div className="text-2xl mb-1">{cfg.icon}</div>
              <div className={`text-sm font-bold ${cfg.color} capitalize`}>{resultado.estado.replace('_', ' ')}</div>
              <p className="text-xs text-gray-600 mt-1">{resultado.mensaje}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Alumno</span>
                <span className="font-medium text-[#1B3A5C]">{resultado.alumno}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Curso solicitado</span>
                <span className="font-medium text-[#1B3A5C]">{resultado.curso}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Fecha envío</span>
                <span className="font-medium">{new Date(resultado.fecha_envio).toLocaleDateString('es-CL')}</span>
              </div>
              {resultado.observaciones && (
                <div className="bg-blue-50 rounded-lg p-2.5 mt-2">
                  <div className="font-semibold text-blue-700 mb-0.5">Mensaje del Centro Educacional:</div>
                  <div className="text-blue-600">{resultado.observaciones}</div>
                </div>
              )}
              {resultado.motivo_rechazo && (
                <div className="bg-red-50 rounded-lg p-2.5 mt-2">
                  <div className="font-semibold text-red-700 mb-0.5">Motivo:</div>
                  <div className="text-red-600">{resultado.motivo_rechazo}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/admision" className="text-xs text-[#1B3A5C] font-medium hover:underline">
            ← Volver al formulario de admisión
          </a>
        </div>
      </div>
    </div>
  )
}

export default function SeguimientoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center"><div className="text-sm text-gray-400">Cargando...</div></div>}>
      <SeguimientoContent />
    </Suspense>
  )
}
