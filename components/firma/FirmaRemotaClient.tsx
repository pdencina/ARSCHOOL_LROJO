'use client'
import { useState, useEffect } from 'react'

interface Props {
  token: string
  tipo: 'contrato' | 'pagare'
  nombreEsperado: string
  contratoUrl: string
}

type Paso = 'ver' | 'codigo' | 'firmar' | 'exito'

export default function FirmaRemotaClient({ token, tipo, nombreEsperado, contratoUrl }: Props) {
  const [paso, setPaso] = useState<Paso>('ver')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombreFirma, setNombreFirma] = useState(nombreEsperado)
  const [rutFirma, setRutFirma] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [evidencia, setEvidencia] = useState<any>(null)

  const tipoLabel = tipo === 'pagare' ? 'Pagaré' : 'Contrato de Servicios Educacionales'

  // Marcar como visto al cargar
  useEffect(() => {
    fetch('/api/contratos/firmar-remoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, accion: 'ver' }),
    })
  }, [token])

  async function enviarCodigo() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contratos/firmar-remoto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, accion: 'codigo' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCodigoEnviado(true)
      setPaso('codigo')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function firmar() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contratos/firmar-remoto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, accion: 'firmar', nombre_firma: nombreFirma, rut_firma: rutFirma, codigo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEvidencia(data.evidencia)
      setPaso('exito')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-center sticky top-0 z-10">
        <div className="text-center">
          <div className="text-sm font-bold text-[#1B3A5C]">AR SCHOOL</div>
          <div className="text-[10px] text-gray-400">Firma Electrónica</div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Paso 1: Ver documento */}
        {paso === 'ver' && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h1 className="text-lg font-bold text-[#1B3A5C] mb-1">Firma de {tipoLabel}</h1>
              <p className="text-xs text-gray-500 mb-4">Revise el documento completo antes de firmar.</p>

              {/* Documento embebido */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4" style={{ height: '50vh' }}>
                <iframe
                  src={contratoUrl}
                  className="w-full h-full"
                  title={tipoLabel}
                />
              </div>

              <p className="text-xs text-gray-500 mb-4 text-center">
                Scroll para leer el documento completo. Una vez revisado, presione continuar.
              </p>

              <button
                onClick={() => setPaso('firmar')}
                className="w-full bg-[#1B3A5C] text-white py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
              >
                He leído el documento — Continuar a firma
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Ingresar datos y solicitar código */}
        {paso === 'firmar' && !codigoEnviado && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-bold text-[#1B3A5C] mb-1">Confirmar identidad</h2>
              <p className="text-xs text-gray-500 mb-5">
                Ingrese su nombre completo y RUT tal como fueron registrados al momento de la matrícula.
                Su nombre completo actúa como firma electrónica simple (Ley 19.799).
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre completo (como firma)</label>
                  <input
                    type="text"
                    value={nombreFirma}
                    onChange={e => setNombreFirma(e.target.value)}
                    placeholder={nombreEsperado}
                    className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none"
                    autoComplete="name"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Debe coincidir exactamente con el nombre registrado</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">RUT</label>
                  <input
                    type="text"
                    value={rutFirma}
                    onChange={e => setRutFirma(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 mt-3 bg-red-50 p-2 rounded-lg">{error}</p>}

              <button
                onClick={enviarCodigo}
                disabled={loading || !nombreFirma.trim()}
                className="w-full mt-5 bg-[#1B3A5C] text-white py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Enviando código...' : 'Enviar código de verificación a mi correo'}
              </button>

              <button
                onClick={() => setPaso('ver')}
                className="w-full mt-2 text-gray-500 text-xs py-2"
              >
                ← Volver al documento
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Ingresar código */}
        {(paso === 'codigo' || (paso === 'firmar' && codigoEnviado)) && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-bold text-[#1B3A5C] mb-1">Código de verificación</h2>
              <p className="text-xs text-gray-500 mb-5">
                Ingrese el código de 6 dígitos que enviamos a su correo electrónico.
              </p>

              <div className="flex justify-center mb-5">
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl font-bold tracking-[8px] w-52 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none font-mono"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>

              {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded-lg">{error}</p>}

              {/* Resumen de firma */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs">
                <div className="font-semibold text-gray-600 mb-1">Firmará como:</div>
                <div className="text-[#1B3A5C] font-bold">{nombreFirma}</div>
                {rutFirma && <div className="text-gray-500">RUT: {rutFirma}</div>}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-800 leading-relaxed">
                  Al confirmar, declaro haber leído íntegramente el documento y acepto sus términos.
                  Esta firma electrónica simple tiene plena validez legal conforme a la Ley 19.799.
                </p>
              </div>

              <button
                onClick={firmar}
                disabled={loading || codigo.length !== 6}
                className="w-full bg-[#2D5A3F] text-white py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Procesando firma...' : 'Confirmar y firmar documento'}
              </button>

              <button
                onClick={enviarCodigo}
                disabled={loading}
                className="w-full mt-2 text-[#1B3A5C] text-xs py-2 font-medium"
              >
                Reenviar código
              </button>
            </div>
          </div>
        )}

        {/* Paso 4: Éxito */}
        {paso === 'exito' && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="w-16 h-16 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-[#2D5A3F] mb-2">Documento firmado</h2>
              <p className="text-sm text-gray-500 mb-5">
                Su {tipoLabel.toLowerCase()} ha sido firmado exitosamente. El Centro Educacional recibirá notificación de su firma.
              </p>

              {evidencia && (
                <div className="bg-gray-50 rounded-xl p-4 text-left text-xs space-y-1.5">
                  <div className="font-semibold text-gray-600 mb-2">Evidencia de firma:</div>
                  <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{evidencia.nombre}</span></div>
                  <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{new Date(evidencia.timestamp).toLocaleString('es-CL')}</span></div>
                  <div><span className="text-gray-500">Hash:</span> <span className="font-mono text-[10px]">{evidencia.firma_hash?.slice(0, 16)}...</span></div>
                </div>
              )}

              <p className="text-[10px] text-gray-400 mt-4">
                Puede cerrar esta página. Los documentos firmados estarán disponibles en su portal de apoderado.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-[10px] text-gray-400">
        AR School Global · Firma Electrónica Simple · Ley 19.799
      </footer>
    </div>
  )
}
