'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  tareas: any[]
  entregas: any[]
  alumnoId: string
  curso: string
}

export default function PortalTareasClient({ tareas, entregas, alumnoId, curso }: Props) {
  const [entregandoId, setEntregandoId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [comentario, setComentario] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const hoy = new Date().toISOString().split('T')[0]

  // Map de entregas por tarea_id
  const entregaMap = new Map<string, any>()
  entregas.forEach(e => entregaMap.set(e.tarea_id, e))

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('El archivo no puede superar 10MB'); return }
    setArchivo(file)
  }

  async function handleEntregar(tareaId: string) {
    setUploading(true)

    let archivoUrl: string | null = null
    let archivoNombre: string | null = null

    // Subir archivo si existe
    if (archivo) {
      const fileName = `entregas/${alumnoId}/${tareaId}_${Date.now()}_${archivo.name.replace(/\s/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tareas')
        .upload(fileName, archivo, { upsert: true })

      if (uploadError) {
        // Si el bucket no existe, continuar sin archivo
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          toast.error('Storage no configurado. Se guardará sin archivo.')
        } else {
          toast.error('Error al subir archivo: ' + uploadError.message)
          setUploading(false)
          return
        }
      } else {
        const { data: urlData } = supabase.storage.from('tareas').getPublicUrl(uploadData.path)
        archivoUrl = urlData.publicUrl
        archivoNombre = archivo.name
      }
    }

    // Registrar entrega
    const res = await fetch('/api/entregas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tarea_id: tareaId,
        archivo_url: archivoUrl,
        archivo_nombre: archivoNombre,
        comentario_alumno: comentario || null,
      }),
    })

    if (res.ok) {
      toast.success('¡Tarea entregada!')
      setEntregandoId(null)
      setArchivo(null)
      setComentario('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Error al entregar')
    }
    setUploading(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Mis tareas</h1>
        <p className="text-sm text-slate-500 mt-0.5">{curso} · Actividades y trabajos pendientes</p>
      </div>

      {tareas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-14 text-center">
          <i className="ti ti-checklist text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-500">No hay tareas asignadas todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tareas.map((t: any) => {
            const entrega = entregaMap.get(t.id)
            const vencida = t.fecha_entrega < hoy && t.estado === 'activa' && !entrega
            const isEntregando = entregandoId === t.id

            return (
              <div key={t.id} className={`bg-white border rounded-xl p-4 transition-colors ${
                entrega?.estado === 'calificada' ? 'border-emerald-200' :
                entrega ? 'border-blue-200' :
                vencida ? 'border-red-200' : 'border-slate-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    entrega?.estado === 'calificada' ? 'bg-emerald-50' :
                    entrega ? 'bg-blue-50' :
                    vencida ? 'bg-red-50' : 'bg-blue-50'
                  }`}>
                    <i className={`ti ${
                      entrega?.estado === 'calificada' ? 'ti-check text-emerald-600' :
                      entrega ? 'ti-send text-blue-600' :
                      vencida ? 'ti-alert-triangle text-red-600' :
                      'ti-clipboard-list text-blue-600'
                    } text-base`} aria-hidden="true"/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{t.titulo}</span>
                      <span className="tag tag-gray text-xs">{t.materia}</span>
                      {vencida && <span className="tag bg-red-50 text-red-700 text-xs">Vencida</span>}
                      {entrega && !entrega.puntaje && (
                        <span className="tag bg-blue-50 text-blue-700 text-xs">Entregada</span>
                      )}
                      {entrega?.estado === 'calificada' && (
                        <span className="tag bg-emerald-50 text-emerald-700 text-xs">
                          Calificada: {entrega.puntaje}{t.puntaje_max ? `/${t.puntaje_max}` : ''}
                        </span>
                      )}
                      {t.estado === 'revisada' && !entrega && (
                        <span className="tag tag-ok text-xs">Revisada</span>
                      )}
                    </div>
                    {t.descripcion && <p className="text-sm text-slate-600 mb-2">{t.descripcion}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {t.fecha_entrega && (
                        <span><i className="ti ti-calendar text-xs mr-1" aria-hidden="true"/>
                          Entrega: {new Date(t.fecha_entrega + 'T12:00').toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' })}
                        </span>
                      )}
                      {t.puntaje_max && <span><i className="ti ti-star text-xs mr-1" aria-hidden="true"/>Puntaje máx: {t.puntaje_max}</span>}
                    </div>

                    {/* Comentario del tutor si fue calificada */}
                    {entrega?.comentario_tutor && (
                      <div className="mt-2 bg-emerald-50 rounded-lg p-2.5 text-[12px] text-emerald-800">
                        <i className="ti ti-message-2 text-xs mr-1" aria-hidden="true"/>
                        <strong>Tutor:</strong> {entrega.comentario_tutor}
                      </div>
                    )}

                    {/* Archivo entregado */}
                    {entrega?.archivo_nombre && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <i className="ti ti-paperclip text-xs" aria-hidden="true"/>
                        <span>{entrega.archivo_nombre}</span>
                        {entrega.archivo_url && (
                          <a href={entrega.archivo_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">Ver</a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botón entregar */}
                  <div className="flex-shrink-0">
                    {!entrega && t.estado === 'activa' && (
                      <button
                        onClick={() => setEntregandoId(isEntregando ? null : t.id)}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        <i className="ti ti-upload text-sm mr-1" aria-hidden="true"/>
                        Entregar
                      </button>
                    )}
                    {entrega && entrega.estado === 'devuelta' && (
                      <button
                        onClick={() => setEntregandoId(isEntregando ? null : t.id)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        <i className="ti ti-refresh text-sm mr-1" aria-hidden="true"/>
                        Re-entregar
                      </button>
                    )}
                  </div>
                </div>

                {/* Panel de entrega expandido */}
                {isEntregando && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="space-y-3">
                      {/* Upload archivo */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Archivo (opcional)</label>
                        {!archivo ? (
                          <div
                            onClick={() => fileRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                          >
                            <i className="ti ti-cloud-upload text-2xl text-slate-300 block mb-1" aria-hidden="true"/>
                            <p className="text-[11px] text-slate-500">Clic para seleccionar archivo</p>
                            <p className="text-[10px] text-slate-400">Máximo 10MB</p>
                            <input ref={fileRef} type="file" onChange={handleFileChange} className="hidden"/>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                            <i className="ti ti-file text-blue-600" aria-hidden="true"/>
                            <span className="text-[11px] text-blue-800 flex-1 truncate">{archivo.name}</span>
                            <button onClick={() => { setArchivo(null); if (fileRef.current) fileRef.current.value = '' }}
                              className="text-blue-400 hover:text-red-500">
                              <i className="ti ti-x text-sm" aria-hidden="true"/>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Comentario */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Comentario (opcional)</label>
                        <textarea
                          value={comentario}
                          onChange={e => setComentario(e.target.value)}
                          className="input-base text-[12px] resize-none"
                          rows={2}
                          placeholder="Algún comentario para el tutor..."
                        />
                      </div>

                      {/* Botones */}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEntregandoId(null); setArchivo(null); setComentario('') }} className="btn-secondary text-xs">
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleEntregar(t.id)}
                          disabled={uploading}
                          className="btn-primary text-xs disabled:opacity-60"
                        >
                          <i className={`ti ${uploading ? 'ti-loader animate-spin' : 'ti-send'} text-sm mr-1`} aria-hidden="true"/>
                          {uploading ? 'Enviando...' : 'Enviar entrega'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
