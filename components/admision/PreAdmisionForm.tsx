'use client'
import { useState, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import {
  validarRut, formatearRut, limpiarRut,
  CODIGOS_PAIS, formatearTelefono, validarTelefono, telefonoCompleto,
  validarEmail, calcularEdad, validarFormularioAdmision,
} from '@/lib/validaciones'
import { TODAS_COMUNAS, PREVISIONES_SALUD, NACIONALIDADES, PARENTESCOS } from '@/lib/comunas-chile'

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
const DOCS_OBL = [
  { key: 'cedula_alumno_frente', label: 'CI alumno — Frente', desc: 'Foto clara del frente de la cédula' },
  { key: 'cedula_alumno_dorso', label: 'CI alumno — Dorso', desc: 'Foto clara del reverso de la cédula' },
  { key: 'cedula_apoderado_frente', label: 'CI apoderado — Frente', desc: 'Foto clara del frente de la cédula' },
  { key: 'cedula_apoderado_dorso', label: 'CI apoderado — Dorso', desc: 'Foto clara del reverso de la cédula' },
  { key: 'cert_nacimiento_alumno', label: 'Certificado de nacimiento', desc: 'Del alumno — original o copia' },
  { key: 'cuenta_servicios', label: 'Cuenta de servicios básicos', desc: 'Luz, agua o gas (verifica domicilio)' },
]
const DOCS_OPT = [
  { key: 'cert_medico', label: 'Certificado médico', desc: 'Solo si hay patología crónica' },
  { key: 'cert_diagnostico', label: 'Certificado de diagnóstico', desc: 'Condición neurológica/terapéutica' },
  { key: 'notas_anteriores', label: 'Notas Centro Educativo anterior', desc: 'Últimos 2 años cursados' },
]

type Paso = 1 | 2 | 3 | 4 | 5

export default function PreAdmisionForm() {
  const [paso, setPaso] = useState<Paso>(1)
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [codigoSeguimiento, setCodigoSeguimiento] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [form, setForm] = useState<any>(() => {
    // Restaurar desde localStorage si existe
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ar_admision_form')
      if (saved) try { return JSON.parse(saved) } catch {}
    }
    return {
      sede: 'santiago', jornada: 'completa', modalidad: 'presencial',
      alumno_nacionalidad: 'Chilena', alumno_pais_natal: 'Chile',
      apoderado_telefono_cod: '+56', telefono_emergencia_cod: '+56',
      padre_telefono_cod: '+56',
    }
  })
  const [documentos, setDocumentos] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ar_admision_docs')
      if (saved) try { return JSON.parse(saved) } catch {}
    }
    return {}
  })

  function set(field: string, value: any) {
    setForm((f: any) => {
      const n = { ...f, [field]: value }
      localStorage.setItem('ar_admision_form', JSON.stringify(n))
      // Si cambia curso, sede o jornada → consultar montos
      if (['curso_solicitado', 'sede', 'jornada'].includes(field)) {
        const curso = field === 'curso_solicitado' ? value : n.curso_solicitado
        const sede = field === 'sede' ? value : n.sede
        const jornada = field === 'jornada' ? value : n.jornada
        if (curso) fetchMontos(curso, sede, jornada)
      }
      return n
    })
  }

  const [montosRef, setMontosRef] = useState<{ inicial: number; mensual: number } | null>(null)

  async function fetchMontos(curso: string, sede: string, jornada: string) {
    try {
      const params = new URLSearchParams({ curso, sede: sede || '', jornada: jornada || 'completa', tipo_ingreso: 'nuevo' })
      const res = await fetch(`/api/aportes/consultar?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMontosRef({ inicial: data.monto_inicial, mensual: data.monto_mensual })
      }
    } catch { /* silently fail */ }
  }
  function clearError(field: string) { setErrores(e => { const n = { ...e }; delete n[field]; return n }) }

  // Guardar documentos en localStorage al cambiar
  function setDocumentosAndSave(updater: (d: Record<string, string>) => Record<string, string>) {
    setDocumentos(prev => { const n = updater(prev); localStorage.setItem('ar_admision_docs', JSON.stringify(n)); return n })
  }

  function intentarAvanzar() {
    const errs = validarFormularioAdmision(form, paso)
    setErrores(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Complete los campos obligatorios marcados en rojo')
      return
    }
    setPaso((paso + 1) as Paso)
  }

  function handleFile(key: string, file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10 MB'); return }
    const tipos = ['image/jpeg','image/png','image/webp','application/pdf']
    if (!tipos.includes(file.type)) { toast.error('Solo JPG, PNG o PDF'); return }
    const reader = new FileReader()
    reader.onload = () => { setDocumentosAndSave(d => ({ ...d, [key]: reader.result as string })); toast.success('Adjuntado') }
    reader.readAsDataURL(file)
  }

  async function enviar() {
    setLoading(true)
    try {
      const payload = {
        ...form,
        // Concatenar nombres completos para el backend
        alumno_nombre: `${form.alumno_nombre || ''} ${form.alumno_segundo_nombre || ''}`.replace(/\s+/g, ' ').trim(),
        alumno_apellido: `${form.alumno_apellido || ''} ${form.alumno_apellido_materno || ''}`.replace(/\s+/g, ' ').trim(),
        apoderado_nombre: `${form.apoderado_nombre || ''} ${form.apoderado_segundo_nombre || ''}`.replace(/\s+/g, ' ').trim(),
        apoderado_apellido: `${form.apoderado_apellido || ''} ${form.apoderado_apellido_materno || ''}`.replace(/\s+/g, ' ').trim(),
        padre_nombre: form.padre_nombre ? `${form.padre_nombre || ''} ${form.padre_segundo_nombre || ''}`.replace(/\s+/g, ' ').trim() : null,
        padre_apellido: form.padre_apellido ? `${form.padre_apellido || ''} ${form.padre_apellido_materno || ''}`.replace(/\s+/g, ' ').trim() : null,
        alumno_rut: form.alumno_rut ? limpiarRut(form.alumno_rut) : null,
        apoderado_rut: form.apoderado_rut ? limpiarRut(form.apoderado_rut) : null,
        padre_rut: form.padre_rut ? limpiarRut(form.padre_rut) : null,
        apoderado_telefono: form.apoderado_telefono_num ? telefonoCompleto(form.apoderado_telefono_cod, form.apoderado_telefono_num) : null,
        telefono_emergencia: form.telefono_emergencia_num ? telefonoCompleto(form.telefono_emergencia_cod, form.telefono_emergencia_num) : null,
        padre_telefono: form.padre_telefono_num ? telefonoCompleto(form.padre_telefono_cod, form.padre_telefono_num) : null,
        contacto_especialista: form.nombre_especialista ? `${form.nombre_especialista}${form.especialista_telefono_num ? ' | ' + telefonoCompleto(form.especialista_telefono_cod || '+56', form.especialista_telefono_num) : ''}` : null,
        retiro_telefono: form.retiro_telefono_num ? telefonoCompleto(form.retiro_telefono_cod || '+56', form.retiro_telefono_num) : null,
        documentos,
      }
      const res = await fetch('/api/admision/pre-registro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCodigoSeguimiento(data.codigo_seguimiento)
      setEnviado(true)
      localStorage.removeItem('ar_admision_form')
      localStorage.removeItem('ar_admision_docs')
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  const edadInfo = form.alumno_fecha_nacimiento ? calcularEdad(form.alumno_fecha_nacimiento) : null

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
        <Toaster position="top-center"/>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center animate-[fadeIn_0.3s]">
          <div className="w-16 h-16 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 className="text-xl font-bold text-[#1B3A5C] mb-2">Solicitud enviada</h1>
          <p className="text-sm text-gray-500 mb-5">Hemos recibido su solicitud de admisión exitosamente.</p>
          <div className="bg-[#f0f4f8] rounded-xl p-4 mb-5">
            <div className="text-[10px] text-gray-500 mb-1">Código de seguimiento</div>
            <div className="text-2xl font-bold text-[#1B3A5C] tracking-wider font-mono">{codigoSeguimiento}</div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Guarde este código. Recibirá un email de confirmación.</p>
          <a href={`/admision/seguimiento?codigo=${codigoSeguimiento}`} className="inline-block bg-[#1B3A5C] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Ver estado</a>
        </div>
      </div>
    )
  }

  const totalPasos = 5
  const progreso = (paso / totalPasos) * 100

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      <Toaster position="top-center"/>
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div><div className="text-sm font-bold text-[#1B3A5C]">AR SCHOOL</div><div className="text-[10px] text-gray-400">Solicitud de Admisión {new Date().getFullYear()}</div></div>
          <div className="text-xs font-semibold text-[#1B3A5C] bg-[#f0f4f8] px-2.5 py-1 rounded-lg">Paso {paso} de {totalPasos}</div>
        </div>
        <div className="max-w-lg mx-auto mt-3"><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#1B3A5C] rounded-full transition-all duration-500" style={{ width: `${progreso}%` }}/></div></div>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-28">

        {/* PASO 1: Datos alumno */}
        {paso === 1 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <div className="mb-2"><h2 className="text-lg font-bold text-[#1B3A5C]">Datos del alumno</h2><p className="text-xs text-gray-500">Información del estudiante a matricular. Los campos con * son obligatorios.</p></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primer nombre *" value={form.alumno_nombre} onChange={v => { set('alumno_nombre', v); clearError('alumno_nombre') }} error={errores.alumno_nombre} placeholder="Ej: Benjamín" autoCapitalize/>
              <Field label="Segundo nombre" value={form.alumno_segundo_nombre} onChange={v => set('alumno_segundo_nombre', v)} placeholder="Ej: Ananías" autoCapitalize/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apellido paterno *" value={form.alumno_apellido} onChange={v => { set('alumno_apellido', v); clearError('alumno_apellido') }} error={errores.alumno_apellido} placeholder="Ej: Pinto" autoCapitalize/>
              <Field label="Apellido materno *" value={form.alumno_apellido_materno} onChange={v => { set('alumno_apellido_materno', v); clearError('alumno_apellido_materno') }} error={errores.alumno_apellido_materno} placeholder="Ej: Guzmán" autoCapitalize/>
            </div>
            <RutField label="RUT del alumno" value={form.alumno_rut} onChange={v => { set('alumno_rut', v); clearError('alumno_rut') }} error={errores.alumno_rut}/>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de nacimiento *" type="date" value={form.alumno_fecha_nacimiento} onChange={v => { set('alumno_fecha_nacimiento', v); clearError('alumno_fecha_nacimiento') }} error={errores.alumno_fecha_nacimiento}/>
              {edadInfo && <div className="flex items-end pb-1"><span className="text-xs font-semibold text-[#2D5A3F] bg-[#EDF5F0] px-2 py-1 rounded-lg">{edadInfo.anios} años{edadInfo.meses > 0 ? `, ${edadInfo.meses} meses` : ''}</span></div>}
            </div>
            <SelectField label="Sexo *" value={form.alumno_sexo} onChange={v => { set('alumno_sexo', v); clearError('alumno_sexo') }} error={errores.alumno_sexo} options={[{v:'',l:'Seleccionar...'},{v:'masculino',l:'Masculino'},{v:'femenino',l:'Femenino'}]}/>
            <SelectField label="Nivel / Ciclo *" value={form.curso_solicitado} onChange={v => { set('curso_solicitado', v); clearError('curso_solicitado') }} error={errores.curso_solicitado} options={[{v:'',l:'Seleccionar nivel...'},...CURSOS.map(c=>({v:c,l:c}))]}/>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Sede" value={form.sede} onChange={v => set('sede', v)} options={SEDES.map(s=>({v:s.value,l:s.label}))}/>
              <SelectField label="Jornada" value={form.jornada} onChange={v => set('jornada', v)} options={[{v:'completa',l:'Jornada completa'},{v:'media',l:'Media jornada'}]}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Nacionalidad" value={form.alumno_nacionalidad} onChange={v => set('alumno_nacionalidad', v)} options={NACIONALIDADES.map(n => ({v:n, l:n}))}/>
              <Field label="País de nacimiento" value={form.alumno_pais_natal} onChange={v => set('alumno_pais_natal', v)}/>
            </div>
            <Field label="Dirección del alumno" value={form.alumno_direccion} onChange={v => set('alumno_direccion', v)} placeholder="Calle, número, depto"/>
            <ComunaField label="Comuna" value={form.alumno_comuna} onChange={v => set('alumno_comuna', v)}/>

            {/* Montos referenciales desde tabla de aportes */}
            {montosRef && montosRef.mensual > 0 && (
              <div className="bg-[#f0f4f8] rounded-xl p-3 mt-2">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Aportes referenciales</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Aporte inicial:</span>
                  <span className="font-semibold text-[#1B3A5C]">${montosRef.inicial.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-600">Aporte mensual:</span>
                  <span className="font-semibold text-[#1B3A5C]">${montosRef.mensual.toLocaleString('es-CL')}</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PASO 2: Apoderado + padre */}
        {paso === 2 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <div className="mb-2"><h2 className="text-lg font-bold text-[#1B3A5C]">Datos del apoderado</h2><p className="text-xs text-gray-500">Persona responsable que firmará el contrato.</p></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primer nombre *" value={form.apoderado_nombre} onChange={v => { set('apoderado_nombre', v); clearError('apoderado_nombre') }} error={errores.apoderado_nombre} autoCapitalize/>
              <Field label="Segundo nombre" value={form.apoderado_segundo_nombre} onChange={v => set('apoderado_segundo_nombre', v)} autoCapitalize/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apellido paterno *" value={form.apoderado_apellido} onChange={v => { set('apoderado_apellido', v); clearError('apoderado_apellido') }} error={errores.apoderado_apellido} autoCapitalize/>
              <Field label="Apellido materno *" value={form.apoderado_apellido_materno} onChange={v => { set('apoderado_apellido_materno', v); clearError('apoderado_apellido_materno') }} error={errores.apoderado_apellido_materno} autoCapitalize/>
            </div>
            <RutField label="RUT del apoderado" value={form.apoderado_rut} onChange={v => { set('apoderado_rut', v); clearError('apoderado_rut') }} error={errores.apoderado_rut}/>
            <Field label="Email *" type="email" value={form.apoderado_email} onChange={v => { set('apoderado_email', v); clearError('apoderado_email') }} error={errores.apoderado_email} placeholder="correo@ejemplo.com"/>
            <PhoneField label="Teléfono *" codigoPais={form.apoderado_telefono_cod} onCodigoChange={v => set('apoderado_telefono_cod', v)} numero={form.apoderado_telefono_num} onNumeroChange={v => { set('apoderado_telefono_num', v); clearError('apoderado_telefono') }} error={errores.apoderado_telefono}/>
            <Field label="Dirección *" value={form.apoderado_direccion} onChange={v => { set('apoderado_direccion', v); clearError('apoderado_direccion') }} error={errores.apoderado_direccion} placeholder="Calle, número, depto"/>
            <ComunaField label="Comuna *" value={form.apoderado_comuna} onChange={v => { set('apoderado_comuna', v); clearError('apoderado_comuna') }} error={errores.apoderado_comuna}/>
            <SelectField label="Parentesco con el alumno" value={form.apoderado_parentesco} onChange={v => set('apoderado_parentesco', v)} options={PARENTESCOS.map(p => ({v:p, l:p}))}/>

            <hr className="my-5 border-gray-100"/>
            <div className="mb-2"><h3 className="text-sm font-bold text-[#1B3A5C]">Padre / segundo apoderado</h3><p className="text-[10px] text-gray-400">Opcional — complete si aplica</p></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primer nombre" value={form.padre_nombre} onChange={v => set('padre_nombre', v)} autoCapitalize/>
              <Field label="Segundo nombre" value={form.padre_segundo_nombre} onChange={v => set('padre_segundo_nombre', v)} autoCapitalize/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apellido paterno" value={form.padre_apellido} onChange={v => set('padre_apellido', v)} autoCapitalize/>
              <Field label="Apellido materno" value={form.padre_apellido_materno} onChange={v => set('padre_apellido_materno', v)} autoCapitalize/>
            </div>
            <RutField label="RUT" value={form.padre_rut} onChange={v => { set('padre_rut', v); clearError('padre_rut') }} error={errores.padre_rut}/>
            <PhoneField label="Teléfono" codigoPais={form.padre_telefono_cod} onCodigoChange={v => set('padre_telefono_cod', v)} numero={form.padre_telefono_num} onNumeroChange={v => set('padre_telefono_num', v)}/>
            <Field label="Email" type="email" value={form.padre_email} onChange={v => set('padre_email', v)} placeholder="correo@ejemplo.com"/>
          </section>
        )}

        {/* PASO 3: Salud + emergencia */}
        {paso === 3 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <div className="mb-2"><h2 className="text-lg font-bold text-[#1B3A5C]">Salud y emergencia</h2><p className="text-xs text-gray-500">Información médica y contacto ante emergencias.</p></div>
            <SelectField label="Previsión de salud" value={form.prevision_salud} onChange={v => set('prevision_salud', v)} options={[{v:'',l:'Seleccionar...'},...PREVISIONES_SALUD.map(p => ({v:p, l:p}))]}/>
            <Field label="Alergia alimentaria" value={form.alergia_alimentaria} onChange={v => set('alergia_alimentaria', v)} placeholder="Dejar vacío si no aplica"/>
            <Field label="Alergia a medicamentos" value={form.alergia_medicamento} onChange={v => set('alergia_medicamento', v)} placeholder="Dejar vacío si no aplica"/>
            <Field label="Enfermedad crónica" value={form.enfermedad_cronica} onChange={v => set('enfermedad_cronica', v)} placeholder="Ej: asma, diabetes, epilepsia"/>
            <Field label="Centro de salud para emergencias" value={form.centro_salud_emergencia} onChange={v => set('centro_salud_emergencia', v)} placeholder="Hospital o clínica más cercana"/>
            <Field label="Diagnóstico (condición neurológica)" value={form.diagnostico} onChange={v => set('diagnostico', v)} placeholder="Ej: TEA, TDAH, dislexia"/>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre especialista tratante" value={form.nombre_especialista} onChange={v => set('nombre_especialista', v)} placeholder="Ej: Dra. María López" autoCapitalize/>
              <PhoneField label="Teléfono especialista" codigoPais={form.especialista_telefono_cod || '+56'} onCodigoChange={v => set('especialista_telefono_cod', v)} numero={form.especialista_telefono_num} onNumeroChange={v => set('especialista_telefono_num', v)}/>
            </div>

            <hr className="my-5 border-gray-100"/>
            <div className="mb-2"><h3 className="text-sm font-bold text-[#1B3A5C]">Contacto de emergencia *</h3><p className="text-[10px] text-gray-400">Persona a contactar si no se ubica al apoderado</p></div>
            <Field label="Nombre completo *" value={form.contacto_emergencia} onChange={v => { set('contacto_emergencia', v); clearError('contacto_emergencia') }} error={errores.contacto_emergencia}/>
            <PhoneField label="Teléfono *" codigoPais={form.telefono_emergencia_cod} onCodigoChange={v => set('telefono_emergencia_cod', v)} numero={form.telefono_emergencia_num} onNumeroChange={v => { set('telefono_emergencia_num', v); clearError('telefono_emergencia') }} error={errores.telefono_emergencia}/>

            <hr className="my-5 border-gray-100"/>
            <div className="mb-2"><h3 className="text-sm font-bold text-[#1B3A5C]">Persona autorizada para retiro</h3><p className="text-[10px] text-gray-400">Opcional — quien puede retirar al alumno además del apoderado</p></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" value={form.retiro_nombre} onChange={v => set('retiro_nombre', v)} autoCapitalize/>
              <SelectField label="Parentesco" value={form.retiro_parentesco} onChange={v => set('retiro_parentesco', v)} options={[{v:'',l:'Seleccionar...'}, ...PARENTESCOS.map(p => ({v:p, l:p}))]}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <RutField label="RUT" value={form.retiro_rut} onChange={v => set('retiro_rut', v)}/>
              <PhoneField label="Teléfono" codigoPais={form.retiro_telefono_cod || '+56'} onCodigoChange={v => set('retiro_telefono_cod', v)} numero={form.retiro_telefono_num} onNumeroChange={v => set('retiro_telefono_num', v)}/>
            </div>
          </section>
        )}

        {/* PASO 4: Documentos */}
        {paso === 4 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <div className="mb-2"><h2 className="text-lg font-bold text-[#1B3A5C]">Documentos requeridos</h2><p className="text-xs text-gray-500">Adjunte fotos claras o archivos PDF (máx. 10 MB cada uno).</p></div>
            <div className="flex items-center justify-between bg-[#f0f4f8] rounded-xl p-3 mb-2">
              <span className="text-xs text-gray-600">Obligatorios completados</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${DOCS_OBL.filter(d=>documentos[d.key]).length === DOCS_OBL.length ? 'bg-[#EDF5F0] text-[#2D5A3F]' : 'bg-amber-50 text-amber-700'}`}>
                {DOCS_OBL.filter(d=>documentos[d.key]).length} / {DOCS_OBL.length}
              </span>
            </div>
            <div className="space-y-2">{DOCS_OBL.map(doc => <DocRow key={doc.key} doc={doc} uploaded={!!documentos[doc.key]} onSelect={f => handleFile(doc.key, f)} onRemove={() => setDocumentosAndSave(d => { const n={...d}; delete n[doc.key]; return n })}/>)}</div>
            <details className="group mt-4">
              <summary className="text-xs font-semibold text-gray-500 cursor-pointer py-2 flex items-center gap-1"><svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>Documentos opcionales ({DOCS_OPT.length})</summary>
              <div className="space-y-2 mt-2">{DOCS_OPT.map(doc => <DocRow key={doc.key} doc={doc} uploaded={!!documentos[doc.key]} onSelect={f => handleFile(doc.key, f)} onRemove={() => setDocumentosAndSave(d => { const n={...d}; delete n[doc.key]; return n })}/>)}</div>
            </details>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2 mt-4">
              <span className="text-base">📱</span>
              <p className="text-[11px] text-blue-700 leading-relaxed"><strong>Tip:</strong> Puede tomar fotos directamente con su cámara. Asegúrese de que el documento sea legible y esté completo.</p>
            </div>
          </section>
        )}

        {/* PASO 5: Resumen */}
        {paso === 5 && (
          <section className="space-y-4 animate-[fadeIn_0.2s]">
            <div className="mb-2"><h2 className="text-lg font-bold text-[#1B3A5C]">Resumen de solicitud</h2><p className="text-xs text-gray-500">Verifique que todo esté correcto antes de enviar.</p></div>
            <SumCard title="Alumno" rows={[['Nombre completo',`${form.alumno_nombre||''} ${form.alumno_segundo_nombre||''} ${form.alumno_apellido||''} ${form.alumno_apellido_materno||''}`.replace(/\s+/g,' ').trim()],['RUT',form.alumno_rut],['Edad',edadInfo?`${edadInfo.anios} años`:null],['Curso',form.curso_solicitado],['Sede',SEDES.find(s=>s.value===form.sede)?.label],['Jornada',form.jornada==='completa'?'Completa':'Media']]}/>
            <SumCard title="Apoderado" rows={[['Nombre completo',`${form.apoderado_nombre||''} ${form.apoderado_segundo_nombre||''} ${form.apoderado_apellido||''} ${form.apoderado_apellido_materno||''}`.replace(/\s+/g,' ').trim()],['RUT',form.apoderado_rut],['Email',form.apoderado_email],['Teléfono',form.apoderado_telefono_num?`${form.apoderado_telefono_cod} ${form.apoderado_telefono_num}`:null],['Dirección',form.apoderado_direccion],['Comuna',form.apoderado_comuna]]}/>
            <SumCard title="Documentos" rows={[['Obligatorios',`${DOCS_OBL.filter(d=>documentos[d.key]).length}/${DOCS_OBL.length} subidos`],['Opcionales',`${DOCS_OPT.filter(d=>documentos[d.key]).length} subidos`]]}/>
            <div><label className="text-[11px] font-semibold text-gray-600 mb-1 block">Observaciones para el equipo de admisión (opcional)</label><textarea value={form.observaciones_apoderado||''} onChange={e=>set('observaciones_apoderado',e.target.value)} rows={3} placeholder="Algo que desee comunicar..." className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] outline-none"/></div>
          </section>
        )}
      </main>

      {/* Footer navegación */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-10 safe-area-pb">
        <div className="max-w-lg mx-auto flex gap-3">
          {paso > 1 && <button onClick={() => setPaso((paso-1) as Paso)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 active:scale-[0.98] transition-transform">Anterior</button>}
          {paso < 5 ? (
            <button onClick={intentarAvanzar} disabled={paso === 4 && DOCS_OBL.some(d => !documentos[d.key])} className="flex-1 py-3 rounded-xl bg-[#1B3A5C] text-white text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50">
              {paso === 4 && DOCS_OBL.some(d => !documentos[d.key]) ? 'Faltan documentos obligatorios' : 'Siguiente'}
            </button>
          ) : (
            <button onClick={enviar} disabled={loading} className="flex-1 py-3 rounded-xl bg-[#2D5A3F] text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform">{loading ? 'Enviando...' : 'Enviar solicitud de admisión'}</button>
          )}
        </div>
      </footer>
    </div>
  )
}

// ===================== Sub-components =====================

function Field({ label, value, onChange, placeholder, type='text', error, autoCapitalize }: { label:string; value?:string; onChange:(v:string)=>void; placeholder?:string; type?:string; error?:string; autoCapitalize?:boolean }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
      <input type={type} value={value||''} onChange={e => onChange(autoCapitalize ? capitalizar(e.target.value) : e.target.value)} placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] ${error ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}/>
      {error && <p className="text-[10px] text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}

function RutField({ label, value, onChange, error }: { label:string; value?:string; onChange:(v:string)=>void; error?:string }) {
  function handleChange(raw: string) {
    const formatted = formatearRut(raw)
    onChange(formatted)
  }
  const isValid = value && value.length > 3 ? validarRut(value) : null
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
      <div className="relative">
        <input type="text" value={value||''} onChange={e => handleChange(e.target.value)} placeholder="12.345.678-9" maxLength={12}
          className={`w-full px-3.5 py-2.5 pr-8 bg-gray-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] ${error ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}/>
        {isValid !== null && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isValid ? 'text-[#2D5A3F]' : 'text-red-500'}`}>
            {isValid ? '✓' : '✗'}
          </span>
        )}
      </div>
      {error && <p className="text-[10px] text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}

function PhoneField({ label, codigoPais, onCodigoChange, numero, onNumeroChange, error }: { label:string; codigoPais:string; onCodigoChange:(v:string)=>void; numero?:string; onNumeroChange:(v:string)=>void; error?:string }) {
  const config = CODIGOS_PAIS.find(c => c.codigo === codigoPais) || CODIGOS_PAIS[0]
  function handleNumero(raw: string) {
    const soloDigitos = raw.replace(/\D/g, '').slice(0, config.largo)
    onNumeroChange(formatearTelefono(soloDigitos, codigoPais))
  }
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
      <div className="flex gap-2">
        <select value={codigoPais} onChange={e => onCodigoChange(e.target.value)}
          className="w-[100px] px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 appearance-none">
          {CODIGOS_PAIS.map(c => <option key={c.codigo} value={c.codigo}>{c.bandera} {c.codigo}</option>)}
        </select>
        <input type="tel" value={numero||''} onChange={e => handleNumero(e.target.value)} placeholder={config.formato} inputMode="tel"
          className={`flex-1 px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] ${error ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}/>
      </div>
      {error && <p className="text-[10px] text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}

function SelectField({ label, value, onChange, options, error }: { label:string; value?:string; onChange:(v:string)=>void; options:{v:string;l:string}[]; error?:string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
      <select value={value||''} onChange={e => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none appearance-none focus:ring-2 focus:ring-[#1B3A5C]/20 ${error ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {error && <p className="text-[10px] text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}

function ComunaField({ label, value, onChange, error }: { label: string; value?: string; onChange: (v: string) => void; error?: string }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const filtradas = busqueda.length > 0
    ? TODAS_COMUNAS.filter(c => c.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 12)
    : TODAS_COMUNAS.slice(0, 20)

  return (
    <div className="relative">
      <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
      <input
        type="text"
        value={abierto ? busqueda : (value || '')}
        onFocus={() => { setAbierto(true); setBusqueda(value || '') }}
        onChange={e => { setBusqueda(e.target.value); setAbierto(true) }}
        placeholder="Escriba para buscar..."
        className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[#1B3A5C]/20 focus:border-[#1B3A5C] ${error ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}
      />
      {abierto && filtradas.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtradas.map(c => (
            <button key={c} type="button" onClick={() => { onChange(c); setAbierto(false); setBusqueda('') }}
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-[#f0f4f8] transition-colors ${c === value ? 'bg-[#f0f4f8] font-semibold text-[#1B3A5C]' : 'text-gray-700'}`}>
              {c}
            </button>
          ))}
        </div>
      )}
      {abierto && <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)}/>}
      {error && <p className="text-[10px] text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}

function DocRow({ doc, uploaded, onSelect, onRemove }: { doc:{key:string;label:string;desc:string}; uploaded:boolean; onSelect:(f:File)=>void; onRemove:()=>void }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${uploaded ? 'bg-[#EDF5F0] border-[#2D5A3F]/20' : 'bg-white border-gray-200'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${uploaded ? 'bg-[#2D5A3F]/10' : 'bg-gray-100'}`}>
        {uploaded ? <svg className="w-3.5 h-3.5 text-[#2D5A3F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> : <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[#1B3A5C] truncate">{doc.label}</div>
        <div className="text-[9px] text-gray-400 truncate">{doc.desc}</div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {uploaded && <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
        {/* Botón cámara — abre cámara directamente en mobile */}
        <label className="px-2 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors" title="Tomar foto">
          📷
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if(e.target.files?.[0]) onSelect(e.target.files[0]); e.target.value='' }}/>
        </label>
        {/* Botón archivo — abre selector de archivos/galería */}
        <label className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${uploaded ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-[#1B3A5C] text-white hover:bg-[#143050]'}`}>
          {uploaded ? 'Cambiar' : 'Adjuntar'}
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => { if(e.target.files?.[0]) onSelect(e.target.files[0]); e.target.value='' }}/>
        </label>
      </div>
    </div>
  )
}

function SumCard({ title, rows }: { title:string; rows:[string,string|null|undefined][] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1.5">{rows.filter(([,v])=>v).map(([k,v])=><div key={k} className="flex justify-between text-xs"><span className="text-gray-500">{k}</span><span className="font-medium text-[#1B3A5C] text-right max-w-[60%] truncate">{v}</span></div>)}</div>
    </div>
  )
}

function capitalizar(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}
