'use client'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'

interface DatosCedula {
  rut: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  fechaNacimiento: string // ISO: YYYY-MM-DD
  sexo: string
  nacionalidad: string
}

interface Props {
  onDatosEscaneados: (datos: DatosCedula) => void
  onCerrar: () => void
}

/**
 * Parser del código PDF417 de la cédula chilena.
 * El formato del barcode contiene campos separados por delimitadores.
 * Formato aproximado: RUN|APELLIDO1|APELLIDO2|NOMBRES|NACIONALIDAD|FECHA_NAC|SEXO|...
 */
function parsearPDF417Chileno(raw: string): DatosCedula | null {
  try {
    // El PDF417 de la cédula chilena no tiene un formato 100% público documentado.
    // Intentamos varios patrones conocidos:

    // Patrón 1: Campos separados por espacios/tabs con estructura fija
    // Típicamente: 0|RUT|APELLIDO_P|APELLIDO_M|NOMBRES|NAC|SEXO|FECHA_NAC|...
    const partes = raw.split(/[|\t]/).map(s => s.trim()).filter(Boolean)

    if (partes.length >= 5) {
      // Buscar el RUT (formato XX.XXX.XXX-X o sin puntos)
      const rutIndex = partes.findIndex(p => /^\d{7,8}[-]?\d?[kK]?$/.test(p.replace(/\./g, '')))

      if (rutIndex >= 0) {
        const rut = partes[rutIndex].replace(/\./g, '')
        const apellidoPaterno = partes[rutIndex + 1] || ''
        const apellidoMaterno = partes[rutIndex + 2] || ''
        const nombres = partes[rutIndex + 3] || ''

        // Buscar fecha (formato DDMMYYYY o DD-MM-YYYY)
        const fechaMatch = raw.match(/(\d{2})[-\/]?(\d{2})[-\/]?(\d{4})/)
        let fechaNacimiento = ''
        if (fechaMatch) {
          fechaNacimiento = `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}`
        }

        // Buscar sexo
        const sexo = raw.includes('MASCULINO') || raw.includes(' M ') ? 'masculino' : raw.includes('FEMENINO') || raw.includes(' F ') ? 'femenino' : ''

        return {
          rut: formatearRutSimple(rut),
          nombres: capitalizarPalabras(nombres),
          apellidoPaterno: capitalizarPalabras(apellidoPaterno),
          apellidoMaterno: capitalizarPalabras(apellidoMaterno),
          fechaNacimiento,
          sexo,
          nacionalidad: raw.includes('CHILE') ? 'Chilena' : '',
        }
      }
    }

    // Patrón 2: texto corrido — buscar RUT por regex
    const rutMatch = raw.match(/(\d{1,2}\.?\d{3}\.?\d{3}[-]?[\dkK])/i)
    if (rutMatch) {
      return {
        rut: formatearRutSimple(rutMatch[1]),
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        fechaNacimiento: '',
        sexo: '',
        nacionalidad: '',
      }
    }

    return null
  } catch {
    return null
  }
}

function formatearRutSimple(rut: string): string {
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase()
  if (limpio.length < 2) return rut
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

function capitalizarPalabras(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export default function EscanerCedula({ onDatosEscaneados, onCerrar }: Props) {
  const [escaneando, setEscaneando] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch {}
      }
    }
  }, [])

  async function iniciarEscaneo() {
    setEscaneando(true)
    setError('')

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('scanner-container')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' }, // Cámara trasera
        {
          fps: 10,
          qrbox: { width: 350, height: 150 }, // Rectángulo horizontal para barcode
          formatsToSupport: [0, 5, 8], // QR_CODE=0, PDF_417=5, CODE_128=8
        },
        (decodedText) => {
          // Éxito — parsear datos
          const datos = parsearPDF417Chileno(decodedText)
          if (datos) {
            toast.success('Cédula escaneada correctamente')
            scanner.stop()
            onDatosEscaneados(datos)
          } else if (decodedText.length > 5) {
            // Algo se leyó pero no se pudo parsear — intentar con RUT al menos
            const rutMatch = decodedText.match(/(\d{1,2}\.?\d{3}\.?\d{3}[-]?[\dkK])/i)
            if (rutMatch) {
              toast.success('RUT detectado')
              scanner.stop()
              onDatosEscaneados({
                rut: formatearRutSimple(rutMatch[1]),
                nombres: '', apellidoPaterno: '', apellidoMaterno: '',
                fechaNacimiento: '', sexo: '', nacionalidad: '',
              })
            }
          }
        },
        () => {} // Error silencioso por frame
      )
    } catch (err: any) {
      setError(err.message || 'No se pudo acceder a la cámara')
      setEscaneando(false)
    }
  }

  function detenerEscaneo() {
    if (scannerRef.current) {
      try { scannerRef.current.stop() } catch {}
    }
    setEscaneando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,36,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-[#1B3A5C]">Escanear cédula de identidad</h3>
            <p className="text-[10px] text-gray-500">Apunte al código de barras del reverso de la cédula</p>
          </div>
          <button onClick={() => { detenerEscaneo(); onCerrar() }} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-5">
          {!escaneando ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#f0f4f8] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#1B3A5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
              </div>
              <p className="text-xs text-gray-500 mb-4">Se abrirá la cámara para leer el código de barras (PDF417) del reverso de la cédula.</p>
              <button onClick={iniciarEscaneo} className="btn-primary">
                Activar cámara
              </button>
              {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
            </div>
          ) : (
            <div>
              <div id="scanner-container" ref={containerRef} className="rounded-xl overflow-hidden" style={{ minHeight: '250px' }}/>
              <div className="flex items-center justify-between mt-3">
                <p className="text-[10px] text-gray-400">Mantenga la cédula estable frente a la cámara...</p>
                <button onClick={detenerEscaneo} className="text-xs text-red-500 font-medium">Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="px-5 pb-5">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-700 space-y-1">
            <div><strong>Tips:</strong></div>
            <div>• Use el reverso de la cédula (donde está el código de barras rectangular)</div>
            <div>• Buena iluminación mejora la detección</div>
            <div>• Si no funciona, ingrese los datos manualmente</div>
          </div>
        </div>
      </div>
    </div>
  )
}
