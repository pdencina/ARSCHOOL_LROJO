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
 * Parser universal para códigos de la cédula chilena.
 * Soporta: QR (nuevo formato), PDF417, y MRZ-like text.
 * 
 * Formato MRZ del CI chileno (3 líneas):
 * INCHL5213860852S05<<<<<<<<<<<<<<<
 * 8912237M2912235CHL17339278<8<3
 * ENCINA<ACEVEDO<<PABLO<DAVID<<<
 * 
 * Línea 3: APELLIDO1<APELLIDO2<<NOMBRES (separados por <)
 * Línea 2: FECHANAC(AAMMDD)SEXO...RUT...
 */
function parsearCodigoCedula(raw: string): DatosCedula | null {
  try {
    // Intento 1: Formato QR de cédula nueva (JSON o URL con params)
    if (raw.startsWith('{')) {
      const json = JSON.parse(raw)
      return {
        rut: formatearRutSimple(json.RUN || json.rut || ''),
        nombres: capitalizarPalabras(json.nombres || json.name || ''),
        apellidoPaterno: capitalizarPalabras(json.apellidoPaterno || json.ap || ''),
        apellidoMaterno: capitalizarPalabras(json.apellidoMaterno || json.am || ''),
        fechaNacimiento: json.fechaNacimiento || '',
        sexo: (json.sexo || '').toLowerCase().includes('m') ? 'masculino' : 'femenino',
        nacionalidad: 'Chilena',
      }
    }

    // Intento 2: URL con parámetros (algunos QR de CI nuevas)
    if (raw.startsWith('http')) {
      const url = new URL(raw)
      const run = url.searchParams.get('RUN') || url.searchParams.get('run') || ''
      if (run) {
        return {
          rut: formatearRutSimple(run),
          nombres: capitalizarPalabras(url.searchParams.get('nombres') || ''),
          apellidoPaterno: capitalizarPalabras(url.searchParams.get('ap') || ''),
          apellidoMaterno: capitalizarPalabras(url.searchParams.get('am') || ''),
          fechaNacimiento: '',
          sexo: '',
          nacionalidad: 'Chilena',
        }
      }
    }

    // Intento 3: Texto MRZ-like (lo que se ve en la foto)
    // Buscar patrón APELLIDO<APELLIDO<<NOMBRE<NOMBRE
    const mrzMatch = raw.match(/([A-Z]+)<([A-Z]+)<<([A-Z<]+)/i)
    if (mrzMatch) {
      const apellido1 = mrzMatch[1]
      const apellido2 = mrzMatch[2]
      const nombres = mrzMatch[3].replace(/</g, ' ').trim()

      // Buscar RUT en el texto (8 dígitos seguidos)
      const rutMatch = raw.match(/(\d{7,8})\D*(\d|[kK])/i)
      let rut = ''
      if (rutMatch) {
        rut = formatearRutSimple(rutMatch[1] + rutMatch[2])
      }

      // Buscar fecha nacimiento (formato AAMMDD en MRZ)
      const fechaMatch = raw.match(/(\d{2})(\d{2})(\d{2})[MF]/i)
      let fechaNacimiento = ''
      if (fechaMatch) {
        const anio = parseInt(fechaMatch[1]) > 50 ? `19${fechaMatch[1]}` : `20${fechaMatch[1]}`
        fechaNacimiento = `${anio}-${fechaMatch[2]}-${fechaMatch[3]}`
      }

      // Sexo
      const sexoMatch = raw.match(/\d{6}([MF])/i)
      const sexo = sexoMatch ? (sexoMatch[1].toUpperCase() === 'M' ? 'masculino' : 'femenino') : ''

      return {
        rut,
        nombres: capitalizarPalabras(nombres),
        apellidoPaterno: capitalizarPalabras(apellido1),
        apellidoMaterno: capitalizarPalabras(apellido2),
        fechaNacimiento,
        sexo,
        nacionalidad: 'Chilena',
      }
    }

    // Intento 4: Buscar al menos el RUT
    const rutSolo = raw.match(/(\d{1,2}\.?\d{3}\.?\d{3}[-]?[\dkK])/i)
    if (rutSolo) {
      return {
        rut: formatearRutSimple(rutSolo[1]),
        nombres: '', apellidoPaterno: '', apellidoMaterno: '',
        fechaNacimiento: '', sexo: '', nacionalidad: '',
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
          fps: 15,
          qrbox: { width: 300, height: 300 }, // Cuadrado para QR
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Éxito — parsear datos
          console.log('Código leído:', decodedText)
          const datos = parsearCodigoCedula(decodedText)
          if (datos && (datos.rut || datos.nombres)) {
            toast.success(`Datos detectados: ${datos.rut || datos.nombres}`)
            scanner.stop()
            onDatosEscaneados(datos)
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
            <div>• Apunte al <strong>código QR</strong> pequeño del reverso de la cédula (cuadrado, esquina izquierda)</div>
            <div>• Si no detecta el QR, intente con el código de barras rectangular</div>
            <div>• Buena iluminación y mantener estable mejora la detección</div>
            <div>• Si no funciona, ingrese los datos manualmente — es igual de válido</div>
          </div>
        </div>
      </div>
    </div>
  )
}
