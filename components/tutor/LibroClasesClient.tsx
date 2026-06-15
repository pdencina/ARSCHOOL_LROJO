'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { registros: any[]; cursos: string[]; colegioId: string; tutorId: string }

const MATERIAS = ['Lenguaje','Matemáticas','Ciencias Naturales','Historia','Inglés','Artes','Ed. Física','Música','Tecnología']

export default function LibroClasesClient({ registros, cursos, colegioId, tutorId }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtroCurso, setFiltroCurso] = useState(cursos[0] ?? '')
  const [form, setForm] = useState({
    materia: 'Lenguaje', curso: cursos[0] ?? '',
    fecha: new Date().toISOString().split('T')[0],
    contenido: '', observaciones: '', firma_digital: false,
  })
  const supabase = createClient()

  const registrosFiltrados = useMemo(() =>
    registros.filter(r => !filtroCurso || r.curso === filtroCurso),
    [registros, filtroCurso]
  )

  async function handleGuardar() {
    if (!form.contenido || !form.curso) { toast.error('Contenido y curso son requeridos'); return }
    setSaving(true)
    const { error } = await supabase.from('libro_clases').insert({
      colegio_id: colegioId, tutor_id: tutorId,
      materia: form.materia, curso: form.curso, fecha: form.fecha,
      contenido: form.contenido,
      observaciones: form.observaciones || null,
      firma_digital: form.firma_digital,
    })
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success('Registro guardado en el libro de clases')
    setSaving(false); setShowModal(false)
    router.refresh()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Libro de clases</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro oficial de clases realizadas con firma digital</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-notebook text-sm" aria-hidden="true"/> Registrar clase
        </button>
      </div>

      {/* Filtro por curso */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {cursos.map(c => (
          <button key={c} onClick={() => setFiltroCurso(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filtroCurso === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Registros */}
      {registrosFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-14 text-center">
          <i className="ti ti-notebook text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-500 font-medium mb-1">Sin registros para este curso</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-3">Registrar primera clase</button>
        </div>
      ) : (
        <div className="space-y-3">
          {registrosFiltrados.map((r: any) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-display font-semibold text-slate-800">
                      {new Date(r.fecha + 'T12:00').toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    </span>
                    <span className="tag tag-blue text-xs">{r.curso}</span>
                    <span className="tag tag-gray text-xs">{r.materia}</span>
                    {r.firma_digital && (
                      <span className="tag bg-emerald-50 text-emerald-700 text-xs">
                        <i className="ti ti-signature text-xs mr-1" aria-hidden="true"/>Firmado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mb-2 leading-relaxed">{r.contenido}</p>
                  {r.observaciones && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                      <i className="ti ti-note text-xs mr-1" aria-hidden="true"/>
                      <strong>Observaciones:</strong> {r.observaciones}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(r.created_at).toLocaleDateString('es-CL')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Registrar clase</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Materia</label>
                  <select value={form.materia} onChange={e => setForm(p => ({...p, materia: e.target.value}))} className="select-base w-full">
                    {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Curso</label>
                  <select value={form.curso} onChange={e => setForm(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                    {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(p => ({...p, fecha: e.target.value}))} className="input-base"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contenido de la clase *</label>
                <textarea value={form.contenido} onChange={e => setForm(p => ({...p, contenido: e.target.value}))} className="input-base resize-none" rows={4} placeholder="Describe el contenido desarrollado en la clase, actividades realizadas y materiales utilizados..."/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm(p => ({...p, observaciones: e.target.value}))} className="input-base resize-none" rows={2} placeholder="Incidentes, ausencias significativas, notas importantes..."/>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <input type="checkbox" id="firma" checked={form.firma_digital} onChange={e => setForm(p => ({...p, firma_digital: e.target.checked}))} className="w-4 h-4 accent-emerald-600"/>
                <label htmlFor="firma" className="text-sm font-medium text-emerald-800 cursor-pointer">
                  <i className="ti ti-signature mr-1.5" aria-hidden="true"/>Firmar digitalmente este registro
                </label>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}