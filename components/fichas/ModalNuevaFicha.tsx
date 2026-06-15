'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { colegioId: string; userId: string; onClose: () => void }

const MATERIAS = [
  { value: 'lenguaje',      label: 'Lenguaje' },
  { value: 'matematicas',   label: 'Matemáticas' },
  { value: 'ciencias',      label: 'Cs. Naturales' },
  { value: 'historia',      label: 'Historia' },
  { value: 'ingles',        label: 'Inglés' },
  { value: 'artes',         label: 'Artes' },
  { value: 'educacion_fisica',label: 'Ed. Física' },
  { value: 'otro',          label: 'Otro' },
]
const GRADOS = ['1° Básico','2° Básico','3° Básico','4° Básico','5° Básico','6° Básico',
                 '7° Básico','8° Básico','I° Medio','II° Medio','III° Medio','IV° Medio']
const TIPOS = [
  { value: 'ejercicio',  label: 'Ejercicio' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'guia',       label: 'Guía' },
  { value: 'cuento',     label: 'Cuento' },
  { value: 'manualidad', label: 'Manualidad' },
]

export default function ModalNuevaFicha({ colegioId, userId, onClose }: Props) {
  const [paso, setPaso] = useState<1|2>(1)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPreview, setPdfPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    titulo: '', materia: 'lenguaje', grado: '1° Básico', tipo: 'ejercicio',
    descripcion: '', duracion_minutos: '',
    objetivos: [''], es_publica: false,
  })
  const supabase = createClient()
  const router = useRouter()

  function setF(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }
  function setObj(i: number, v: string) {
    setForm(p => { const o = [...p.objetivos]; o[i] = v; return { ...p, objetivos: o } })
  }
  function addObj() { setForm(p => ({ ...p, objetivos: [...p.objetivos, ''] })) }
  function removeObj(i: number) { setForm(p => ({ ...p, objetivos: p.objetivos.filter((_, j) => j !== i) })) }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Solo se aceptan archivos PDF'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('El archivo no puede superar 10MB'); return }
    setPdfFile(file)
    toast.success(`PDF cargado: ${file.name}`)
  }

  async function handleGuardar() {
    if (!form.titulo || !form.materia || !form.grado) {
      toast.error('Título, materia y grado son requeridos'); return
    }
    setSaving(true)

    try {
      let pdfUrl: string | null = null
      let pdfNombre: string | null = null

      // 1. Subir PDF si existe
      if (pdfFile) {
        setUploading(true)
        const fileName = `${userId}/${Date.now()}_${pdfFile.name.replace(/\s/g, '_')}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fichas')
          .upload(fileName, pdfFile, { contentType: 'application/pdf', upsert: false })

        if (uploadError) {
          // Si el bucket no existe, guardar sin PDF y notificar
          if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
            toast.error('El storage de fichas no está configurado. La ficha se creará sin PDF. Crea el bucket "fichas" en Supabase Storage.')
          } else {
            throw new Error(uploadError.message)
          }
        } else {
          const { data: urlData } = supabase.storage.from('fichas').getPublicUrl(uploadData.path)
          pdfUrl = urlData.publicUrl
          pdfNombre = pdfFile.name
        }
        setUploading(false)
      }

      // 2. Crear ficha en BD
      const { error } = await supabase.from('fichas').insert({
        colegio_id: colegioId,
        creado_por: userId,
        titulo: form.titulo,
        materia: form.materia,
        grado: form.grado,
        tipo: form.tipo,
        descripcion: form.descripcion || null,
        duracion_minutos: form.duracion_minutos ? parseInt(form.duracion_minutos) : null,
        objetivos: form.objetivos.filter(Boolean),
        es_publica: form.es_publica,
        pdf_url: pdfUrl,
        pdf_nombre: pdfNombre,
        descargas: 0,
        valoraciones_total: 0,
        valoraciones_suma: 0,
      })

      if (error) throw new Error(error.message)

      toast.success('¡Ficha creada correctamente!')
      onClose()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-display font-semibold text-white">Nueva ficha pedagógica</h3>
            <p className="text-white/40 text-xs mt-0.5">Paso {paso} de 2</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
        </div>

        {/* Pasos indicator */}
        <div className="flex border-b border-slate-200 shrink-0">
          {[{ n:1, label:'Información' }, { n:2, label:'Archivo PDF' }].map(p => (
            <button key={p.n} onClick={() => form.titulo && setPaso(p.n as 1|2)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${paso === p.n ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-2 ${paso === p.n ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{p.n}</span>
              {p.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* PASO 1: Información */}
          {paso === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Título de la ficha *</label>
                <input value={form.titulo} onChange={e => setF('titulo', e.target.value)} className="input-base" placeholder="Ej: Fracciones equivalentes — nivel básico"/>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Materia *</label>
                  <select value={form.materia} onChange={e => setF('materia', e.target.value)} className="select-base w-full">
                    {MATERIAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grado *</label>
                  <select value={form.grado} onChange={e => setF('grado', e.target.value)} className="select-base w-full">
                    {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={e => setF('tipo', e.target.value)} className="select-base w-full">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Duración estimada</label>
                  <div className="relative">
                    <input type="number" value={form.duracion_minutos} onChange={e => setF('duracion_minutos', e.target.value)} className="input-base pr-10" placeholder="45"/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">min</span>
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.es_publica} onChange={e => setF('es_publica', e.target.checked)} className="w-4 h-4 accent-blue-600"/>
                    <div>
                      <div className="text-sm font-medium text-slate-700">Compartir con todos</div>
                      <div className="text-xs text-slate-400">Visible para otros colegios</div>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} className="input-base resize-none" rows={3} placeholder="Describe brevemente el contenido y cómo usar esta ficha..."/>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objetivos de aprendizaje</label>
                  <button onClick={addObj} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <i className="ti ti-plus text-xs" aria-hidden="true"/> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.objetivos.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <i className="ti ti-circle-check text-emerald-400 text-base flex-shrink-0" aria-hidden="true"/>
                      <input value={obj} onChange={e => setObj(i, e.target.value)} className="input-base flex-1" placeholder={`Objetivo ${i+1}...`}/>
                      {form.objetivos.length > 1 && (
                        <button onClick={() => removeObj(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <i className="ti ti-x text-sm" aria-hidden="true"/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: PDF */}
          {paso === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Archivo PDF</label>

                {!pdfFile ? (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
                    <i className="ti ti-file-type-pdf text-5xl text-slate-300 group-hover:text-blue-400 block mb-3 transition-colors" aria-hidden="true"/>
                    <p className="font-medium text-slate-600 group-hover:text-blue-600 mb-1">Haz clic para seleccionar el PDF</p>
                    <p className="text-xs text-slate-400">Máximo 10MB · Solo archivos .pdf</p>
                    <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden"/>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <i className="ti ti-file-type-pdf text-2xl text-red-500" aria-hidden="true"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-emerald-800 truncate">{pdfFile.name}</div>
                        <div className="text-xs text-emerald-600">{(pdfFile.size / 1024).toFixed(0)} KB · PDF listo para subir</div>
                      </div>
                      <button onClick={() => { setPdfFile(null); if (fileRef.current) fileRef.current.value = '' }}
                        className="text-emerald-500 hover:text-red-500 transition-colors">
                        <i className="ti ti-x" aria-hidden="true"/>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-700">
                    <i className="ti ti-info-circle mr-1" aria-hidden="true"/>
                    <strong>Requisito previo:</strong> Crea el bucket <code className="bg-blue-100 px-1 rounded">fichas</code> en Supabase Dashboard → Storage → New bucket (marcar como público).
                  </p>
                </div>
              </div>

              <div className="text-center text-slate-400 text-sm py-2">— o —</div>

              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">También puedes crear la ficha sin PDF ahora</p>
                <p className="text-xs text-slate-400">y subir el archivo después editando la ficha</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2 justify-between border-t border-slate-100 pt-4 shrink-0">
          <div>
            {paso === 2 && (
              <button onClick={() => setPaso(1)} className="btn-secondary">
                <i className="ti ti-arrow-left text-sm" aria-hidden="true"/> Anterior
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            {paso === 1 ? (
              <button onClick={() => { if (!form.titulo) { toast.error('El título es requerido'); return }; setPaso(2) }} className="btn-primary">
                Siguiente <i className="ti ti-arrow-right text-sm" aria-hidden="true"/>
              </button>
            ) : (
              <button onClick={handleGuardar} disabled={saving || uploading} className="btn-primary disabled:opacity-60">
                {uploading ? 'Subiendo PDF...' : saving ? 'Guardando...' : 'Crear ficha'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}