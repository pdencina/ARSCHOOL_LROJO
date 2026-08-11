'use client'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'

interface DocConfig {
  categoria: string
  nombre_display: string
  descripcion: string | null
  obligatorio: boolean
}

interface Props {
  documentosConfig: DocConfig[]
  documentosSubidos: Record<string, string> // categoria → url o base64
  onChange: (docs: Record<string, string>) => void
  nivel?: string // para filtrar docs que aplican
}

export default function DocumentosAdmision({ documentosConfig, documentosSubidos, onChange, nivel }: Props) {
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Filtrar por nivel si aplica
  const docsAplicables = documentosConfig.filter(d => {
    if (!d.obligatorio && !nivel) return true
    return true // Mostrar todos, los opcionales con indicador
  })

  const obligatorios = docsAplicables.filter(d => d.obligatorio)
  const opcionales = docsAplicables.filter(d => !d.obligatorio)
  const totalObligatorios = obligatorios.length
  const subidosObligatorios = obligatorios.filter(d => documentosSubidos[d.categoria]).length

  async function handleFileSelect(categoria: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10 MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG) o PDF')
      return
    }

    setUploading(categoria)

    try {
      // Convertir a base64 para almacenamiento temporal
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        const newDocs = { ...documentosSubidos, [categoria]: base64 }
        onChange(newDocs)
        toast.success('Documento adjuntado')
        setUploading(null)
      }
      reader.onerror = () => {
        toast.error('Error al leer el archivo')
        setUploading(null)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('Error al procesar archivo')
      setUploading(null)
    }
  }

  function removeDoc(categoria: string) {
    const newDocs = { ...documentosSubidos }
    delete newDocs[categoria]
    onChange(newDocs)
  }

  function renderDocItem(doc: DocConfig) {
    const subido = !!documentosSubidos[doc.categoria]
    const isUploading = uploading === doc.categoria

    return (
      <div
        key={doc.categoria}
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
          subido
            ? 'bg-[#EDF5F0] border-[#2D5A3F]/20'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Icono estado */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          subido ? 'bg-[#2D5A3F]/10' : 'bg-gray-100'
        }`}>
          {subido ? (
            <svg className="w-4 h-4 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-[#1B3A5C] truncate">{doc.nombre_display}</span>
            {doc.obligatorio && !subido && (
              <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">REQUERIDO</span>
            )}
          </div>
          {doc.descripcion && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{doc.descripcion}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {subido && (
            <button
              onClick={() => removeDoc(doc.categoria)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
          <button
            onClick={() => fileRefs.current[doc.categoria]?.click()}
            disabled={isUploading}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              subido
                ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                : 'bg-[#1B3A5C] text-white hover:bg-[#143050]'
            }`}
          >
            {isUploading ? '...' : subido ? 'Cambiar' : 'Subir'}
          </button>
          <input
            ref={el => { fileRefs.current[doc.categoria] = el }}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(doc.categoria, file)
              e.target.value = ''
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1B3A5C]">Documentos de admisión</h3>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${
          subidosObligatorios === totalObligatorios
            ? 'bg-[#EDF5F0] text-[#2D5A3F]'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {subidosObligatorios}/{totalObligatorios} obligatorios
        </span>
      </div>

      {/* Obligatorios */}
      <div className="space-y-2">
        {obligatorios.map(renderDocItem)}
      </div>

      {/* Opcionales */}
      {opcionales.length > 0 && (
        <details className="group">
          <summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 py-2 flex items-center gap-1">
            <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
            Documentos opcionales ({opcionales.length})
          </summary>
          <div className="space-y-2 mt-2">
            {opcionales.map(renderDocItem)}
          </div>
        </details>
      )}

      {/* Indicación QR */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
        <span className="text-lg flex-shrink-0">📱</span>
        <p className="text-[11px] text-blue-700 leading-relaxed">
          <strong>Tip:</strong> También puede subir documentos desde su teléfono escaneando el código QR que aparece en la sesión de matrícula presencial.
        </p>
      </div>
    </div>
  )
}
