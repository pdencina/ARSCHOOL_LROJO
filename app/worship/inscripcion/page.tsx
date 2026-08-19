'use client'
import { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const INSTRUMENTOS = ['Guitarra', 'Bajo', 'Teclado', 'Batería', 'Canto', 'Saxophone', 'Violín']

export default function WorshipInscripcionPage() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [form, setForm] = useState({
    alumno_nombre: '', alumno_apellido: '', alumno_rut: '', alumno_fecha_nacimiento: '',
    alumno_sexo: '', alumno_telefono: '', alumno_email: '',
    apoderado_nombre: '', apoderado_apellido: '', apoderado_email: '', apoderado_telefono: '',
    instrumento: '', ciclo: '', experiencia_previa: '', motivacion: '',
    como_se_entero: '', observaciones: '',
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function enviar() {
    if (!form.alumno_nombre || !form.alumno_apellido || !form.instrumento) {
      toast.error('Nombre, apellido e instrumento son obligatorios')
      return
    }
    if (!form.apoderado_email && !form.alumno_email) {
      toast.error('Se requiere al menos un email de contacto')
      return
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
          curso_solicitado: `AR Worship - ${form.ciclo || 'Ciclo 1'} - ${form.instrumento}`,
          sede: 'santiago',
          jornada: 'completa',
          apoderado_nombre: form.apoderado_nombre || form.alumno_nombre,
          apoderado_apellido: form.apoderado_apellido || form.alumno_apellido,
          apoderado_email: form.apoderado_email || form.alumno_email,
          apoderado_telefono: form.apoderado_telefono || form.alumno_telefono,
          observaciones_apoderado: [
            form.instrumento ? `Instrumento: ${form.instrumento}` : '',
            form.ciclo ? `Ciclo: ${form.ciclo}` : '',
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

            {/* Instrumento */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Instrumento *</label>
              <select value={form.instrumento} onChange={e => set('instrumento', e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl text-sm text-white outline-none focus:border-[#ff6b6b] appearance-none">
                <option value="">Seleccionar instrumento...</option>
                {INSTRUMENTOS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Ciclo</label>
              <select value={form.ciclo} onChange={e => set('ciclo', e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl text-sm text-white outline-none focus:border-[#ff6b6b] appearance-none">
                <option value="">Seleccionar...</option>
                <option value="Ciclo 1">Ciclo 1 — Sábados 09:30 a 10:50</option>
                <option value="Ciclo 2">Ciclo 2 — Sábados 11:20 a 12:40</option>
              </select>
            </div>

            <WInput label="Experiencia musical previa" value={form.experiencia_previa} onChange={v => set('experiencia_previa', v)} placeholder="Ej: 2 años tocando guitarra autodidacta"/>
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

        {/* Aranceles info */}
        <div className="bg-[#2a2a2a] rounded-2xl p-5 border border-[#3a3a3a] mb-4">
          <h3 className="text-xs font-bold text-[#ff6b6b] uppercase tracking-wider mb-3">Aranceles 2027</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300"><span>Aporte inicial (inscripción)</span><span className="font-bold text-white">$50.000</span></div>
            <div className="flex justify-between text-gray-300"><span>Aporte anual (5 cuotas)</span><span className="font-bold text-white">$240.000</span></div>
            <div className="flex justify-between text-gray-400 text-xs border-t border-[#3a3a3a] pt-2 mt-2"><span>Cuota mensual</span><span>$48.000</span></div>
          </div>
        </div>

        <button onClick={enviar} disabled={loading} className="w-full py-3.5 bg-[#ff6b6b] text-white text-sm font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all">
          {loading ? 'Enviando...' : 'Inscribirme en AR Worship School'}
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
