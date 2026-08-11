'use client'
import { useState, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const CURSOS = [
  'Play Group (2-3 años)', 'Pre School (3-4 años)', 'Kinder (Ciclo 0)',
  'Elementary 1 (Ciclo 1)', 'Elementary 2 (Ciclo 2)', 'Elementary 3 (Ciclo 3)', 'Elementary 4 (Ciclo 4)',
  'Middle School 5 (Ciclo 5)', 'Middle School 6 (Ciclo 6)', 'Middle School 7 (Ciclo 7)', 'Middle School 8 (Ciclo 8)',
  'High School (1° Medio)', 'High School (2° Medio)', 'High School (3° Medio)', 'High School (4° Medio)',
]

const SEDES = [
  { value: 'santiago', label: 'Santiago (Victoria 52)' },
  { value: 'puente_alto', label: 'Puente Alto' },
  { value: 'punta_arenas', label: 'Punta Arenas' },
]

const DOCS_OBLIGATORIOS = [
  { key: 'cedula_alumno', label: 'Cédula de identidad del alumno', desc: 'Copia por ambos lados' },
  { key: 'cert_nacimiento_alumno', label: 'Certificado de nacimiento del alumno', desc: 'Original o copia' },
  { key: 'cedula_apoderado', label: 'Cédula de identidad del apoderado', desc: 'Copia por ambos lados' },
  { key: 'cuenta_servicios', label: 'Cuenta de servicios básicos', desc: 'Luz, agua o gas (verificar domicilio)' },
]

const DOCS_OPCIONALES = [
  { key: 'cert_medico', label: 'Certificado médico', desc: 'Solo si hay patología crónica' },
  { key: 'cert_diagnostico', label: 'Certificado de diagnóstico', desc: 'Solo si hay condición neurológica/terapéutica' },
  { key: 'notas_anteriores', label: 'Notas del colegio anterior', desc: 'Últimos 2 años' },
]

type Paso = 1 | 2 | 3 | 4 | 5

export default function PreAdmisionForm() {
  const [paso, setPaso] = useState<Paso>(1)
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [codigoSeguimiento, setCodigoSeguimiento] = useState('')
  const [form, setForm] = useState<any>({
    sede: 'santiago', jornada: 'completa', modalidad: 'presencial',
    alumno_nacionalidad: 'Chilena', alumno_pais_natal: 'Chile',
  })
  const [documentos, setDocumentos] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function set(field: string, value: any) {
    setForm((f: any) => ({ ...f, [field]: value }))
  }

  function edadDesdeNacimiento(fecha: string): string {
    if (!fecha) return ''
    const hoy = new Date()
    const nac = new Date(fecha + 'T12:00')
    let edad = hoy.getFullYear() - nac.getFullYear()
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--
    return `${edad} años`
  }

  function handleFile(key: string, file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10 MB'); return }
    const reader = new FileReader()
    reader.onload = () => { setDocumentos(d => ({ ...d, [key]: reader.result as string })); toast.success('Adjuntado') }
    reader.readAsDataURL(file)
  }

  async function enviar() {
    setLoading(true)
    try {
      const res = await fetch('/api/admision/pre-registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, documentos }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCodigoSeguimiento(data.codigo_seguimiento)
      setEnviado(true)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const totalPasos = 5
  const progreso = ((paso - 1) / (totalPasos - 1)) * 100

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
        <Toaster position="top-center"/>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center animate-[fadeIn_0.3s]">
          <div className="w-16 h-16 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1B3A5C] mb-2">Solicitud enviada</h1>
          <p className="text-sm text-gray-500 mb-5">Su solicitud de admisión fue recibida exitosamente.</p>
          <div className="bg-[#f0f4f8] rounded-xl p-4 mb-5">
            <div className="text-[10px] text-gray-500 mb-1">Código de seguimiento</div>
            <div className="text-2xl font-bold text-[#1B3A5C] tracking-wider font-mono">{codigoSeguimiento}</div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Guarde este código. Recibirá un email de confirmación con los próximos pasos.</p>
          <a href={`/admision/seguimiento?codigo=${codigoSeguimiento}`} className="inline-block bg-[#1B3A5C] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            Ver estado de mi solicitud
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      <Toaster position="top-center"/>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-[#1B3A5C]">AR SCHOOL</div>
            <div className="text-[10px] text-gray-400">Solicitud de Admisión</div>
          </div>
          <div className="text-xs font-semibold text-[#1B3A5C] bg-[#f0f4f8] px-2.5 py-1 rounded-lg">Paso {paso}/{totalPasos}</div>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-3">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1B3A5C] rounded-full transition-all duration-300" style={{ width: `${progreso}%` }}/>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-32">
        {/* PASO 1: Datos alumno */}
        {paso === 1 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <h2 className="text-lg font-bold text-[#1B3A5C]">Datos del alumno</h2>
            <p className="text-xs text-gray-500 -mt-2">Información del estudiante que desea matricular.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre *" value={form.alumno_nombre} onChange={v => set('alumno_nombre', v)} placeholder="Ej: Benjamín"/>
              <Input label="Apellido *" value={form.alumno_apellido} onChange={v => set('alumno_apellido', v)} placeholder="Ej: Pinto"/>
            </div>
            <Input label="RUT" value={form.alumno_rut} onChange={v => set('alumno_rut', v)} placeholder="12.345.678-9"/>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Fecha nacimiento" type="date" value={form.alumno_fecha_nacimiento} onChange={v => set('alumno_fecha_nacimiento', v)}/>
              {form.alumno_fecha_nacimiento && <div className="flex items-end pb-2 text-xs text-[#2D5A3F] font-semibold">{edadDesdeNacimiento(form.alumno_fecha_nacimiento)}</div>}
            </div>
            <Select label="Sexo" value={form.alumno_sexo} onChange={v => set('alumno_sexo', v)} options={[{v:'',l:'Seleccionar'},{v:'masculino',l:'Masculino'},{v:'femenino',l:'Femenino'}]}/>
            <Select label="Curso solicitado *" value={form.curso_solicitado} onChange={v => set('curso_solicitado', v)} options={[{v:'',l:'Seleccionar curso'},...CURSOS.map(c=>({v:c,l:c}))]}/>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Sede" value={form.sede} onChange={v => set('sede', v)} options={SEDES.map(s=>({v:s.value,l:s.label}))}/>
              <Select label="Jornada" value={form.jornada} onChange={v => set('jornada', v)} options={[{v:'completa',l:'Completa'},{v:'media',l:'Media'}]}/>
            </div>
            <Input label="Nacionalidad" value={form.alumno_nacionalidad} onChange={v => set('alumno_nacionalidad', v)}/>
            <Input label="Dirección" value={form.alumno_direccion} onChange={v => set('alumno_direccion', v)} placeholder="Calle, número, depto"/>
            <Input label="Comuna" value={form.alumno_comuna} onChange={v => set('alumno_comuna', v)}/>
          </section>
        )}

        {/* PASO 2: Datos apoderado + padre */}
        {paso === 2 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <h2 className="text-lg font-bold text-[#1B3A5C]">Datos del apoderado</h2>
            <p className="text-xs text-gray-500 -mt-2">Persona responsable que firma el contrato.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre *" value={form.apoderado_nombre} onChange={v => set('apoderado_nombre', v)}/>
              <Input label="Apellido *" value={form.apoderado_apellido} onChange={v => set('apoderado_apellido', v)}/>
            </div>
            <Input label="RUT" value={form.apoderado_rut} onChange={v => set('apoderado_rut', v)} placeholder="12.345.678-9"/>
            <Input label="Email *" type="email" value={form.apoderado_email} onChange={v => set('apoderado_email', v)} placeholder="correo@ejemplo.com"/>
            <Input label="Teléfono" value={form.apoderado_telefono} onChange={v => set('apoderado_telefono', v)} placeholder="+56 9 1234 5678"/>
            <Input label="Dirección" value={form.apoderado_direccion} onChange={v => set('apoderado_direccion', v)}/>
            <Input label="Comuna" value={form.apoderado_comuna} onChange={v => set('apoderado_comuna', v)}/>
            <Select label="Parentesco" value={form.apoderado_parentesco} onChange={v => set('apoderado_parentesco', v)} options={[{v:'madre/padre',l:'Madre/Padre'},{v:'abuelo/a',l:'Abuelo/a'},{v:'tutor_legal',l:'Tutor legal'},{v:'otro',l:'Otro'}]}/>

            <hr className="my-4 border-gray-100"/>
            <h3 className="text-sm font-bold text-[#1B3A5C]">Padre / segundo apoderado (opcional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre" value={form.padre_nombre} onChange={v => set('padre_nombre', v)}/>
              <Input label="Apellido" value={form.padre_apellido} onChange={v => set('padre_apellido', v)}/>
            </div>
            <Input label="RUT" value={form.padre_rut} onChange={v => set('padre_rut', v)}/>
            <Input label="Teléfono" value={form.padre_telefono} onChange={v => set('padre_telefono', v)}/>
            <Input label="Email" type="email" value={form.padre_email} onChange={v => set('padre_email', v)}/>
          </section>
        )}

        {/* PASO 3: Salud + emergencia */}
        {paso === 3 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <h2 className="text-lg font-bold text-[#1B3A5C]">Salud y emergencia</h2>
            <p className="text-xs text-gray-500 -mt-2">Información médica relevante y contacto de emergencia.</p>
            <Input label="Previsión de salud" value={form.prevision_salud} onChange={v => set('prevision_salud', v)} placeholder="Fonasa, Isapre, otro"/>
            <Input label="Alergia alimentaria" value={form.alergia_alimentaria} onChange={v => set('alergia_alimentaria', v)} placeholder="Dejar vacío si no aplica"/>
            <Input label="Alergia a medicamentos" value={form.alergia_medicamento} onChange={v => set('alergia_medicamento', v)}/>
            <Input label="Enfermedad crónica" value={form.enfermedad_cronica} onChange={v => set('enfermedad_cronica', v)}/>
            <Input label="Centro de salud para emergencias" value={form.centro_salud_emergencia} onChange={v => set('centro_salud_emergencia', v)}/>
            <Input label="Diagnóstico (condición neurológica/terapéutica)" value={form.diagnostico} onChange={v => set('diagnostico', v)}/>
            <Input label="Contacto especialista tratante" value={form.contacto_especialista} onChange={v => set('contacto_especialista', v)}/>
            <hr className="my-4 border-gray-100"/>
            <h3 className="text-sm font-bold text-[#1B3A5C]">Contacto de emergencia</h3>
            <Input label="Nombre" value={form.contacto_emergencia} onChange={v => set('contacto_emergencia', v)}/>
            <Input label="Teléfono" value={form.telefono_emergencia} onChange={v => set('telefono_emergencia', v)}/>
            <hr className="my-4 border-gray-100"/>
            <h3 className="text-sm font-bold text-[#1B3A5C]">Persona autorizada para retiro</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre" value={form.retiro_nombre} onChange={v => set('retiro_nombre', v)}/>
              <Input label="Parentesco" value={form.retiro_parentesco} onChange={v => set('retiro_parentesco', v)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="RUT" value={form.retiro_rut} onChange={v => set('retiro_rut', v)}/>
              <Input label="Teléfono" value={form.retiro_telefono} onChange={v => set('retiro_telefono', v)}/>
            </div>
          </section>
        )}

        {/* PASO 4: Documentos */}
        {paso === 4 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <h2 className="text-lg font-bold text-[#1B3A5C]">Documentos</h2>
            <p className="text-xs text-gray-500 -mt-2">Adjunte los documentos requeridos. Puede subir fotos o PDF.</p>
            <div className="space-y-2">
              {DOCS_OBLIGATORIOS.map(doc => (
                <DocUploadRow key={doc.key} doc={doc} uploaded={!!documentos[doc.key]} obligatorio onSelect={f => handleFile(doc.key, f)} onRemove={() => setDocumentos(d => { const n = {...d}; delete n[doc.key]; return n })} fileRef={el => { fileRefs.current[doc.key] = el }}/>
              ))}
            </div>
            <details className="group mt-4">
              <summary className="text-xs font-semibold text-gray-500 cursor-pointer py-2">Documentos opcionales ({DOCS_OPCIONALES.length})</summary>
              <div className="space-y-2 mt-2">
                {DOCS_OPCIONALES.map(doc => (
                  <DocUploadRow key={doc.key} doc={doc} uploaded={!!documentos[doc.key]} obligatorio={false} onSelect={f => handleFile(doc.key, f)} onRemove={() => setDocumentos(d => { const n = {...d}; delete n[doc.key]; return n })} fileRef={el => { fileRefs.current[doc.key] = el }}/>
                ))}
              </div>
            </details>
          </section>
        )}

        {/* PASO 5: Resumen */}
        {paso === 5 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <h2 className="text-lg font-bold text-[#1B3A5C]">Resumen</h2>
            <p className="text-xs text-gray-500 -mt-2">Revise que los datos estén correctos antes de enviar.</p>
            <SummaryCard title="Alumno" items={[
              ['Nombre', `${form.alumno_nombre || ''} ${form.alumno_apellido || ''}`],
              ['RUT', form.alumno_rut],
              ['Curso', form.curso_solicitado],
              ['Sede', SEDES.find(s=>s.value===form.sede)?.label],
              ['Fecha nac.', form.alumno_fecha_nacimiento],
            ]}/>
            <SummaryCard title="Apoderado" items={[
              ['Nombre', `${form.apoderado_nombre || ''} ${form.apoderado_apellido || ''}`],
              ['Email', form.apoderado_email],
              ['Teléfono', form.apoderado_telefono],
              ['RUT', form.apoderado_rut],
            ]}/>
            <SummaryCard title="Documentos" items={[
              ['Obligatorios subidos', `${DOCS_OBLIGATORIOS.filter(d=>documentos[d.key]).length}/${DOCS_OBLIGATORIOS.length}`],
              ['Opcionales subidos', `${DOCS_OPCIONALES.filter(d=>documentos[d.key]).length}`],
            ]}/>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Observaciones (opcional)</label>
              <textarea value={form.observaciones_apoderado || ''} onChange={e => set('observaciones_apoderado', e.target.value)} rows={3} placeholder="Algo que quiera comunicar al equipo de admisión..." className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none"/>
            </div>
          </section>
        )}
      </main>

      {/* Footer fijo con navegación */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-10">
        <div className="max-w-lg mx-auto flex gap-3">
          {paso > 1 && (
            <button onClick={() => setPaso((paso - 1) as Paso)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 active:scale-[0.98]">
              Anterior
            </button>
          )}
          {paso < 5 ? (
            <button onClick={() => setPaso((paso + 1) as Paso)} disabled={paso === 1 && (!form.alumno_nombre || !form.alumno_apellido || !form.curso_solicitado)} className="flex-1 py-3 rounded-xl bg-[#1B3A5C] text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50">
              Siguiente
            </button>
          ) : (
            <button onClick={enviar} disabled={loading || !form.apoderado_email} className="flex-1 py-3 rounded-xl bg-[#2D5A3F] text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

// --- Sub-components ---

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none transition-all"/>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value?: string; onChange: (v: string) => void; options: {v:string;l:string}[] }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none appearance-none">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

function DocUploadRow({ doc, uploaded, obligatorio, onSelect, onRemove, fileRef }: { doc: {key:string;label:string;desc:string}; uploaded: boolean; obligatorio: boolean; onSelect: (f:File)=>void; onRemove: ()=>void; fileRef: (el: HTMLInputElement|null)=>void }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${uploaded ? 'bg-[#EDF5F0] border-[#2D5A3F]/20' : 'bg-white border-gray-200'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${uploaded ? 'bg-[#2D5A3F]/10' : 'bg-gray-100'}`}>
        {uploaded ? <svg className="w-3.5 h-3.5 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> : <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[#1B3A5C] truncate">{doc.label}</div>
        <div className="text-[9px] text-gray-400 truncate">{doc.desc}</div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {uploaded && <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
        <label className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${uploaded ? 'bg-white border border-gray-200 text-gray-600' : 'bg-[#1B3A5C] text-white'}`}>
          {uploaded ? 'Cambiar' : 'Subir'}
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) onSelect(e.target.files[0]); e.target.value = '' }}/>
        </label>
      </div>
    </div>
  )
}

function SummaryCard({ title, items }: { title: string; items: [string, string|undefined][] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1">
        {items.filter(([,v]) => v).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-gray-500">{k}</span>
            <span className="font-medium text-[#1B3A5C]">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
