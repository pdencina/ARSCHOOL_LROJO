'use client'
import { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { formatearRut, validarRut } from '@/lib/validaciones'

const CATEGORIAS = [
  { value: 'Sub-6', label: 'Sub-6 (5-6 años)' },
  { value: 'Sub-8', label: 'Sub-8 (7-8 años)' },
  { value: 'Sub-10', label: 'Sub-10 (9-10 años)' },
  { value: 'Sub-12', label: 'Sub-12 (11-12 años)' },
  { value: 'Sub-14', label: 'Sub-14 (13-14 años)' },
  { value: 'Sub-16', label: 'Sub-16 (15-16 años)' },
  { value: 'Juvenil', label: 'Juvenil (17+ años)' },
]

const POSICIONES = ['Arquero', 'Defensa', 'Mediocampista', 'Delantero', 'Sin definir']

export default function LionsInscripcionPage() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [form, setForm] = useState({
    alumno_nombre: '', alumno_segundo_nombre: '', alumno_apellido: '', alumno_apellido_materno: '',
    alumno_rut: '', alumno_fecha_nacimiento: '', alumno_sexo: '', alumno_telefono: '', alumno_email: '',
    categoria: '', posicion: '', experiencia_previa: '', club_anterior: '',
    apoderado_nombre: '', apoderado_segundo_nombre: '', apoderado_apellido: '', apoderado_apellido_materno: '',
    apoderado_rut: '', apoderado_email: '', apoderado_telefono: '', apoderado_direccion: '',
    como_se_entero: '', observaciones: '', sede: 'santiago',
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function enviar() {
    const errores: string[] = []
    if (!form.alumno_nombre) errores.push('Primer nombre del alumno')
    if (!form.alumno_segundo_nombre) errores.push('Segundo nombre del alumno')
    if (!form.alumno_apellido) errores.push('Apellido paterno del alumno')
    if (!form.alumno_apellido_materno) errores.push('Apellido materno del alumno')
    if (!form.alumno_rut || !validarRut(form.alumno_rut)) errores.push('RUT del alumno válido')
    if (!form.alumno_fecha_nacimiento) errores.push('Fecha de nacimiento')
    if (!form.alumno_sexo) errores.push('Sexo')
    if (!form.categoria) errores.push('Categoría')
    if (!form.apoderado_nombre) errores.push('Nombre del apoderado')
    if (!form.apoderado_apellido) errores.push('Apellido del apoderado')
    if (!form.apoderado_email) errores.push('Email del apoderado')
    if (!form.apoderado_telefono) errores.push('Teléfono del apoderado')
    if (form.apoderado_rut && !validarRut(form.apoderado_rut)) errores.push('RUT apoderado válido')

    if (errores.length > 0) {
      toast.error(`Campos obligatorios: ${errores.slice(0, 3).join(', ')}${errores.length > 3 ? ` (+${errores.length - 3} más)` : ''}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admision/pre-registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_nombre: `${form.alumno_nombre} ${form.alumno_segundo_nombre || ''}`.trim(),
          alumno_apellido: `${form.alumno_apellido} ${form.alumno_apellido_materno || ''}`.trim(),
          alumno_rut: form.alumno_rut,
          alumno_fecha_nacimiento: form.alumno_fecha_nacimiento,
          alumno_sexo: form.alumno_sexo,
          curso_solicitado: `Lions Soccer - ${form.categoria}`,
          sede: form.sede,
          jornada: 'completa',
          apoderado_nombre: `${form.apoderado_nombre} ${form.apoderado_segundo_nombre || ''}`.trim(),
          apoderado_apellido: `${form.apoderado_apellido} ${form.apoderado_apellido_materno || ''}`.trim(),
          apoderado_rut: form.apoderado_rut || null,
          apoderado_email: form.apoderado_email,
          apoderado_telefono: form.apoderado_telefono,
          apoderado_direccion: form.apoderado_direccion || null,
          observaciones_apoderado: [
            'Programa: Lions Soccer School',
            `Categoría: ${form.categoria}`,
            form.posicion ? `Posición: ${form.posicion}` : '',
            form.experiencia_previa ? `Experiencia previa: ${form.experiencia_previa}` : '',
            form.club_anterior ? `Club anterior: ${form.club_anterior}` : '',
            form.como_se_entero ? `Cómo se enteró: ${form.como_se_entero}` : '',
            form.observaciones || '',
          ].filter(Boolean).join('\n'),
          colegio_id: '11111111-1111-1111-1111-111111111111',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCodigo(data.codigo_seguimiento)
      setEnviado(true)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0f1a13] flex items-center justify-center p-4">
        <Toaster/>
        <div className="bg-[#16241b] rounded-2xl p-8 max-w-md w-full text-center border border-[#2a3d30]">
          <div className="w-14 h-14 bg-[#2D5A3F]/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#5fd18a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Inscripción recibida</h1>
          <p className="text-sm text-gray-400 mb-5">Tu solicitud para Lions Soccer School fue recibida. Te contactaremos pronto para coordinar la clase de prueba.</p>
          <div className="bg-[#0f1a13] rounded-xl p-3 mb-4">
            <div className="text-[10px] text-gray-500 mb-1">Código de seguimiento</div>
            <div className="text-lg font-bold text-[#5fd18a] tracking-wider font-mono">{codigo}</div>
          </div>
          <p className="text-xs text-gray-500">Revisa tu correo para más información. Recuerda tener a mano el certificado médico deportivo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1a13]">
      <Toaster position="top-center"/>
      <header className="bg-[#0f1a13] border-b border-[#1c2e22] px-4 py-5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-xl font-bold text-white">lions<span className="text-[#5fd18a]"> soccer</span> school</h1>
          <p className="text-[11px] text-gray-500 mt-1">Formación deportiva · Disciplina · Trabajo en equipo</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-8">
        <div className="bg-[#16241b] rounded-2xl p-5 border border-[#2a3d30] mb-4">
          <h2 className="text-sm font-bold text-white mb-1">Formulario de inscripción</h2>
          <p className="text-[11px] text-gray-400 mb-5">Completa tus datos para inscribirte en Lions Soccer School.</p>

          <div className="space-y-4">
            {/* Datos alumno */}
            <div className="text-[10px] font-bold text-[#5fd18a] uppercase tracking-wider">Datos del jugador</div>
            <div className="grid grid-cols-2 gap-3">
              <LInput label="Primer nombre *" value={form.alumno_nombre} onChange={v => set('alumno_nombre', v.replace(/\b\w/g, c => c.toUpperCase()))} placeholder="Ej: Matías"/>
              <LInput label="Segundo nombre *" value={form.alumno_segundo_nombre} onChange={v => set('alumno_segundo_nombre', v.replace(/\b\w/g, c => c.toUpperCase()))} placeholder="Ej: Andrés"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LInput label="Apellido paterno *" value={form.alumno_apellido} onChange={v => set('alumno_apellido', v.replace(/\b\w/g, c => c.toUpperCase()))} placeholder="Ej: González"/>
              <LInput label="Apellido materno *" value={form.alumno_apellido_materno} onChange={v => set('alumno_apellido_materno', v.replace(/\b\w/g, c => c.toUpperCase()))} placeholder="Ej: Rojas"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">RUT jugador *</label>
                <div className="relative">
                  <input type="text" value={form.alumno_rut} onChange={e => set('alumno_rut', formatearRut(e.target.value))} placeholder="12.345.678-9" maxLength={12}
                    className="w-full px-3 py-2.5 pr-8 bg-[#0f1a13] border border-[#2a3d30] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#5fd18a]"/>
                  {form.alumno_rut && form.alumno_rut.length > 3 && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${validarRut(form.alumno_rut) ? 'text-[#5fd18a]' : 'text-red-400'}`}>
                      {validarRut(form.alumno_rut) ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
              <LInput label="Fecha nacimiento *" type="date" value={form.alumno_fecha_nacimiento} onChange={v => set('alumno_fecha_nacimiento', v)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Sexo *</label>
                <select value={form.alumno_sexo} onChange={e => set('alumno_sexo', e.target.value)} className="w-full px-3 py-2.5 bg-[#0f1a13] border border-[#2a3d30] rounded-xl text-sm text-white outline-none focus:border-[#5fd18a] appearance-none">
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
              </div>
              <LInput label="Teléfono jugador" value={form.alumno_telefono} onChange={v => set('alumno_telefono', v)} placeholder="+56 9 1234 5678"/>
            </div>
            <LInput label="Email jugador" type="email" value={form.alumno_email} onChange={v => set('alumno_email', v)} placeholder="correo@ejemplo.com"/>

            {/* Categoría + posición */}
            <div className="bg-[#0f1a13] border border-[#2a3d30] rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#5fd18a] uppercase tracking-wider mb-1">Categoría * <span className="normal-case text-gray-500 font-normal">(según edad)</span></label>
                <select value={form.categoria} onChange={e => set('categoria', e.target.value)} className="w-full px-3 py-2.5 bg-[#16241b] border-2 border-[#5fd18a]/40 rounded-xl text-sm text-white outline-none focus:border-[#5fd18a] appearance-none">
                  <option value="">Seleccionar categoría...</option>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Posición preferida</label>
                <div className="grid grid-cols-3 gap-2">
                  {POSICIONES.map(p => (
                    <button key={p} type="button" onClick={() => set('posicion', p)} className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${form.posicion === p ? 'bg-[#2D5A3F] text-white' : 'bg-[#16241b] text-gray-300 border border-[#2a3d30] hover:border-[#5fd18a]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <LInput label="Experiencia previa" value={form.experiencia_previa} onChange={v => set('experiencia_previa', v)} placeholder="Ej: 2 años en escuela de fútbol"/>
              <LInput label="Club anterior" value={form.club_anterior} onChange={v => set('club_anterior', v)} placeholder="Ej: Ninguno / nombre del club"/>
            </div>

            {/* Sede */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Sede</label>
              <select value={form.sede} onChange={e => set('sede', e.target.value)} className="w-full px-3 py-2.5 bg-[#0f1a13] border border-[#2a3d30] rounded-xl text-sm text-white outline-none focus:border-[#5fd18a] appearance-none">
                <option value="santiago">Santiago</option>
                <option value="puente_alto">Puente Alto</option>
                <option value="punta_arenas">Punta Arenas</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">¿Cómo te enteraste?</label>
              <select value={form.como_se_entero} onChange={e => set('como_se_entero', e.target.value)} className="w-full px-3 py-2.5 bg-[#0f1a13] border border-[#2a3d30] rounded-xl text-sm text-white outline-none focus:border-[#5fd18a] appearance-none">
                <option value="">Seleccionar...</option>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">Grupo de WhatsApp</option>
                <option value="Evento">Evento deportivo</option>
                <option value="Amigo">Un amigo/conocido</option>
                <option value="Web">Página web</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Apoderado */}
            <div className="border-t border-[#2a3d30] pt-4 mt-4">
              <div className="text-[10px] font-bold text-[#5fd18a] uppercase tracking-wider mb-3">Datos del apoderado *</div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <LInput label="Primer nombre *" value={form.apoderado_nombre} onChange={v => set('apoderado_nombre', v.replace(/\b\w/g, c => c.toUpperCase()))} placeholder="Nombre"/>
                  <LInput label="Segundo nombre" value={form.apoderado_segundo_nombre} onChange={v => set('apoderado_segundo_nombre', v.replace(/\b\w/g, c => c.toUpperCase()))}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <LInput label="Apellido paterno *" value={form.apoderado_apellido} onChange={v => set('apoderado_apellido', v.replace(/\b\w/g, c => c.toUpperCase()))}/>
                  <LInput label="Apellido materno *" value={form.apoderado_apellido_materno} onChange={v => set('apoderado_apellido_materno', v.replace(/\b\w/g, c => c.toUpperCase()))}/>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">RUT apoderado *</label>
                  <div className="relative">
                    <input type="text" value={form.apoderado_rut} onChange={e => set('apoderado_rut', formatearRut(e.target.value))} placeholder="12.345.678-9" maxLength={12}
                      className="w-full px-3 py-2.5 pr-8 bg-[#0f1a13] border border-[#2a3d30] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#5fd18a]"/>
                    {form.apoderado_rut && form.apoderado_rut.length > 3 && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${validarRut(form.apoderado_rut) ? 'text-[#5fd18a]' : 'text-red-400'}`}>
                        {validarRut(form.apoderado_rut) ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                </div>
                <LInput label="Email apoderado *" type="email" value={form.apoderado_email} onChange={v => set('apoderado_email', v)} placeholder="correo@ejemplo.com"/>
                <LInput label="Teléfono apoderado *" value={form.apoderado_telefono} onChange={v => set('apoderado_telefono', v)} placeholder="+56 9 1234 5678"/>
                <LInput label="Dirección *" value={form.apoderado_direccion} onChange={v => set('apoderado_direccion', v)} placeholder="Calle, número, comuna"/>
              </div>
            </div>

            <LInput label="Observaciones" value={form.observaciones} onChange={v => set('observaciones', v)} placeholder="Algo que quieras agregar..."/>

            <div className="bg-[#0f1a13] border border-[#2a3d30] rounded-xl p-3 text-[10px] text-gray-400">
              <i className="ti ti-info-circle mr-1" aria-hidden="true"/>
              Para participar necesitarás un <strong className="text-gray-300">certificado médico deportivo</strong>. Podrás entregarlo después de la inscripción.
            </div>
          </div>
        </div>

        <button onClick={enviar} disabled={loading} className="w-full py-3.5 bg-[#2D5A3F] text-white text-sm font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all hover:bg-[#245234]">
          {loading ? 'Enviando...' : 'Inscribirme en Lions Soccer'}
        </button>

        <p className="text-center text-[10px] text-gray-500 mt-4">
          Al enviar, recibirás un email de confirmación. Te contactaremos para coordinar la clase de prueba.
        </p>
      </main>
    </div>
  )
}

function LInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-[#0f1a13] border border-[#2a3d30] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#5fd18a] transition-colors"/>
    </div>
  )
}
