'use client'
import { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const INSTRUMENTOS = ['Guitarra', 'Bajo', 'Teclado', 'Batería', 'Canto', 'Saxophone', 'Violín']
const PROGRAMAS = [
  { value: '', label: 'Seleccionar programa...' },
  { value: 'music_and_play', label: 'Music and Play (0-7 años)' },
  { value: 'ar_worship', label: 'AR Worship School (instrumento)' },
]

export default function WorshipInscripcionPage() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [form, setForm] = useState({
    programa: '', // music_and_play | ar_worship
    alumno_nombre: '', alumno_apellido: '', alumno_rut: '', alumno_fecha_nacimiento: '',
    alumno_sexo: '', alumno_telefono: '', alumno_email: '',
    apoderado_nombre: '', apoderado_apellido: '', apoderado_email: '', apoderado_telefono: '',
    instrumento: '', ciclo: '', rango_edad: '', experiencia_previa: '', motivacion: '',
    como_se_entero: '', observaciones: '', sede: 'santiago',
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function enviar() {
    if (!form.alumno_nombre || !form.alumno_apellido || !form.programa) {
      toast.error('Nombre, apellido y programa son obligatorios')
      return
    }
    if (form.programa === 'ar_worship' && !form.instrumento) {
      toast.error('Selecciona un instrumento')
      return
    }
    if (!form.apoderado_email && !form.alumno_email) {
      toast.error('Se requiere al menos un email de contacto')
      return
    }

    // Generar nivel según programa
    let nivel = ''
    if (form.programa === 'music_and_play') {
      nivel = `Music and Play (${form.rango_edad || '0-4 años'})`
    } else {
      nivel = `${form.ciclo || 'Ciclo 1'} - ${form.instrumento}`
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admision/pre-registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_nombre: form.alumno_nombre,
          alumno_apellido: form.alumno_apellido,
          alumno_rut: form.alumno_rut,
          alumno_fecha_nacimiento: form.alumno_fecha_nacimiento,
          alumno_sexo: form.alumno_sexo,
          curso_solicitado: `AR Worship - ${nivel}`,
          sede: form.sede,
          jornada: 'completa',
          apoderado_nombre: form.apoderado_nombre || form.alumno_nombre,
          apoderado_apellido: form.apoderado_apellido || form.alumno_apellido,
          apoderado_email: form.apoderado_email || form.alumno_email,
          apoderado_telefono: form.apoderado_telefono || form.alumno_telefono,
          observaciones_apoderado: [
            `Programa: ${form.programa === 'music_and_play' ? 'Music and Play' : 'AR Worship School'}`,
            form.instrumento ? `Instrumento: ${form.instrumento}` : '',
            form.ciclo ? `Ciclo: ${form.ciclo}` : '',
            form.rango_edad ? `Rango edad: ${form.rango_edad}` : '',
            form.experiencia_previa ? `Experiencia previa: ${form.experiencia_previa}` : '',
            form.motivacion ? `Motivación: ${form.motivacion}` : '',
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
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <Toaster/>
        <div className="bg-[#2a2a2a] rounded-2xl p-8 max-w-md w-full text-center border border-[#3a3a3a]">
          <div className="w-14 h-14 bg-[#ff6b6b]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#ff6b6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Inscripción recibida</h1>
          <p className="text-sm text-gray-400 mb-5">Tu solicitud para AR Worship School fue recibida. Te contactaremos pronto.</p>
          <div className="bg-[#1a1a1a] rounded-xl p-3 mb-4">
            <div className="text-[10px] text-gray-500 mb-1">Código de seguimiento</div>
            <div className="text-lg font-bold text-[#ff6b6b] tracking-wider font-mono">{codigo}</div>
          </div>
          <p className="text-xs text-gray-500">Revisa tu correo para más información.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Toaster position="top-center"/>
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-xl font-bold text-white">ar<span className="text-[#ff6b6b]">worship</span> school</h1>
          <p className="text-[11px] text-gray-500 mt-1">Desarrolla tu talento · Eleva tu adoración</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-8">
        <div className="bg-[#2a2a2a] rounded-2xl p-5 border border-[#3a3a3a] mb-4">
          <h2 className="text-sm font-bold text-white mb-1">Formulario de inscripción</h2>
          <p className="text-[11px] text-gray-400 mb-5">Completa tus datos para inscribirte en AR Worship School.</p>

          <div className="space-y-4">
            {/* Datos alumno */}
            <div className="grid grid-cols-2 gap-3">
              <WInput label="Nombre *" value={form.alumno_nombre} onChange={v => set('alumno_nombre', v)}/>
              <WInput label="Apellido *" value={form.alumno_apellido} onChange={v => set('alumno_apellido', v)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <WInput label="RUT" value={form.alumno_rut} onChange={v => set('alumno_rut', v)} placeholder="12.345.678-9"/>
              <WInput label="Fecha nacimiento" type="date" value={form.alumno_fecha_nacimiento} onChange={v => set('alumno_fecha_nacimiento', v)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <WInput label="Email" type="email" value={form.alumno_email} onChange={v => set('alumno_email', v)}/>
              <WInput label="Teléfono" value={form.alumno_telefono} onChange={v => set('alumno_telefono', v)} placeholder="+56 9..."/>
            </div>

            {/* Programa */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Programa *</label>
              <select value={form.programa} onChange={e => { set('programa', e.target.value); set('instrumento', ''); set('ciclo', ''); set('rango_edad', '') }} className="w-full px-3 py-2.5 bg-[#1a1a1a] border-2 border-[#ff6b6b]/50 rounded-xl text-sm text-white outline-none focus:border-[#ff6b6b] appearance-none">
                {PROGRAMAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Music and Play: solo rango de edad */}
            {form.programa === 'music_and_play' && (
              <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl p-4">
                <label className="block text-[10px] font-semibold text-[#ff6b6b] uppercase tracking-wider mb-2">Rango de edad</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => set('rango_edad', '0-4 años')} className={`py-3 rounded-lg text-sm font-semibold transition-all ${form.rango_edad === '0-4 años' ? 'bg-[#ff6b6b] text-white' : 'bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a] hover:border-[#ff6b6b]'}`}>
                    0-4 años
                  </button>
                  <button type="button" onClick={() => set('rango_edad', '4-7 años')} className={`py-3 rounded-lg text-sm font-semibold transition-all ${form.rango_edad === '4-7 años' ? 'bg-[#ff6b6b] text-white' : 'bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a] hover:border-[#ff6b6b]'}`}>
                    4-7 años
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 mt-2">Estimulación musical temprana a través del juego y el movimiento.</p>
              </div>
            )}

            {/* AR Worship: instrumento + ciclo */}
            {form.programa === 'ar_worship' && (
              <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl p-4 space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#ff6b6b] uppercase tracking-wider mb-1">Instrumento * <span className="normal-case text-gray-400 font-normal">(desde 8 años en adelante)</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {INSTRUMENTOS.map(i => (
                      <button key={i} type="button" onClick={() => set('instrumento', i)} className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${form.instrumento === i ? 'bg-[#ff6b6b] text-white' : 'bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a] hover:border-[#ff6b6b]'}`}>
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#ff6b6b] uppercase tracking-wider mb-2">Ciclo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => set('ciclo', 'Ciclo 1')} className={`py-3 rounded-lg text-xs font-semibold transition-all ${form.ciclo === 'Ciclo 1' ? 'bg-[#ff6b6b] text-white' : 'bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a] hover:border-[#ff6b6b]'}`}>
                      <div>Ciclo 1</div><div className="text-[9px] opacity-70 mt-0.5">Sáb 09:30 - 10:50</div>
                    </button>
                    <button type="button" onClick={() => set('ciclo', 'Ciclo 2')} className={`py-3 rounded-lg text-xs font-semibold transition-all ${form.ciclo === 'Ciclo 2' ? 'bg-[#ff6b6b] text-white' : 'bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a] hover:border-[#ff6b6b]'}`}>
                      <div>Ciclo 2</div><div className="text-[9px] opacity-70 mt-0.5">Sáb 11:20 - 12:40</div>
                    </button>
                  </div>
                </div>
                <WInput label="Experiencia musical previa" value={form.experiencia_previa} onChange={v => set('experiencia_previa', v)} placeholder="Ej: 2 años tocando guitarra autodidacta"/>
              </div>
            )}

            {/* Sede */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Sede</label>
              <select value={form.sede} onChange={e => set('sede', e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl text-sm text-white outline-none focus:border-[#ff6b6b] appearance-none">
                <option value="santiago">Santiago (Victoria 52)</option>
                <option value="puente_alto">Puente Alto</option>
                <option value="punta_arenas">Punta Arenas</option>
              </select>
            </div>

            <WInput label="¿Qué te motiva a inscribirte?" value={form.motivacion} onChange={v => set('motivacion', v)} placeholder="Ej: Quiero servir en el equipo de adoración"/>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">¿Cómo te enteraste?</label>
              <select value={form.como_se_entero} onChange={e => set('como_se_entero', e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl text-sm text-white outline-none focus:border-[#ff6b6b] appearance-none">
                <option value="">Seleccionar...</option>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">Grupo de WhatsApp</option>
                <option value="Evento">Evento de la iglesia</option>
                <option value="Amigo">Un amigo/conocido</option>
                <option value="Web">Página web</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Apoderado (si es menor) */}
            <details className="group">
              <summary className="text-[11px] font-semibold text-[#ff6b6b] cursor-pointer py-1">Datos del apoderado (si el alumno es menor de edad)</summary>
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <WInput label="Nombre apoderado" value={form.apoderado_nombre} onChange={v => set('apoderado_nombre', v)}/>
                  <WInput label="Apellido apoderado" value={form.apoderado_apellido} onChange={v => set('apoderado_apellido', v)}/>
                </div>
                <WInput label="Email apoderado" type="email" value={form.apoderado_email} onChange={v => set('apoderado_email', v)}/>
                <WInput label="Teléfono apoderado" value={form.apoderado_telefono} onChange={v => set('apoderado_telefono', v)}/>
              </div>
            </details>

            <WInput label="Observaciones" value={form.observaciones} onChange={v => set('observaciones', v)} placeholder="Algo que quieras agregar..."/>
          </div>
        </div>

        <button onClick={enviar} disabled={loading || !form.programa} className="w-full py-3.5 bg-[#ff6b6b] text-white text-sm font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all">
          {loading ? 'Enviando...' : form.programa === 'music_and_play' ? 'Inscribirme en Music and Play' : 'Inscribirme en AR Worship School'}
        </button>

        <p className="text-center text-[10px] text-gray-500 mt-4">
          Al enviar, recibirás un email de confirmación. El contrato se formalizará en las próximas semanas.
        </p>
      </main>
    </div>
  )
}

function WInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-[#ff6b6b] transition-colors"/>
    </div>
  )
}
