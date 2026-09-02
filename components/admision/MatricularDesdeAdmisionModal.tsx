'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  preAdmision: any
  onClose: () => void
  onMatriculado: () => void
}

/**
 * Matricula un alumno a partir de una solicitud de admisión aprobada.
 * Crea alumno + familia + matrícula + cobros + inscripción al programa,
 * marca la admisión como "matriculada" y permite enviar el contrato.
 */
export default function MatricularDesdeAdmisionModal({ preAdmision: pa, onClose, onMatriculado }: Props) {
  const [loading, setLoading] = useState(false)
  const [matriculaId, setMatriculaId] = useState<string | null>(null)
  const [enviandoContrato, setEnviandoContrato] = useState(false)

  const [form, setForm] = useState({
    curso: pa.curso_solicitado || '',
    monto_matricula: 0,
    monto_mensual: 0,
    meses_cobro: 10,
    fecha_inicio_contrato: new Date().toISOString().split('T')[0],
    observaciones: '',
    crear_cuenta_apoderado: true,
  })

  // Política de hermanos (matrícula 2x1 + descuento en el mensual)
  const [hermanos, setHermanos] = useState<any>(null)
  const [buscandoHermanos, setBuscandoHermanos] = useState(false)
  // Modalidad del contrato a enviar: monto completo o matrícula exenta (2x1)
  const [modalidadContrato, setModalidadContrato] = useState<'completo' | 'hermanos_2x1'>('completo')

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  // Consulta hermanos ya matriculados y sugiere los montos con descuento
  async function revisarHermanos() {
    if (!form.monto_matricula && !form.monto_mensual) {
      toast.error('Ingresa primero los montos base del programa')
      return
    }
    setBuscandoHermanos(true)
    try {
      const res = await fetch('/api/matriculas/hermanos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut_apoderado: pa.apoderado_rut,
          email_apoderado: pa.apoderado_email,
          monto_matricula: Number(form.monto_matricula) || 0,
          monto_mensual: Number(form.monto_mensual) || 0,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo consultar')
      setHermanos(data)
      if (data.yaMatriculados === 0) {
        toast('Es el primer hermano: paga matrícula y aporte completo', { icon: 'ℹ️' })
      }
    } catch (e: any) { toast.error(e.message) }
    finally { setBuscandoHermanos(false) }
  }

  // Aplica los montos sugeridos por la política de hermanos
  function aplicarDescuento() {
    if (!hermanos) return
    setForm(f => ({
      ...f,
      monto_matricula: hermanos.montoMatriculaSugerido,
      monto_mensual: hermanos.montoMensualSugerido,
    }))
    // Si queda exento de matrícula, el contrato debe ir en modalidad 2x1
    if (!hermanos.pagaMatricula) setModalidadContrato('hermanos_2x1')
    toast.success('Montos actualizados con el descuento de hermanos')
  }

  async function matricular() {
    if (!form.curso.trim()) { toast.error('El curso/nivel es obligatorio'); return }
    if (form.monto_mensual <= 0 && form.monto_matricula <= 0) {
      if (!confirm('No ingresaste montos. ¿Continuar con matrícula en $0? Podrás editarlos después.')) return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/matriculas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Alumno (desde la solicitud)
          nombre: pa.alumno_nombre,
          apellido: pa.alumno_apellido,
          rut: pa.alumno_rut,
          fecha_nacimiento: pa.alumno_fecha_nacimiento,
          sexo: pa.alumno_sexo,
          curso: form.curso,
          jornada: pa.jornada || 'completa',
          sede: pa.sede,
          direccion: pa.alumno_direccion,
          comuna: pa.alumno_comuna,
          nacionalidad: pa.alumno_nacionalidad || 'Chilena',
          pais_natal: pa.alumno_pais_natal || 'Chile',
          tipo_ingreso: 'nuevo',
          programa_id: pa.programa_id || null,
          // Salud
          prevision_salud: pa.prevision_salud,
          alergia_alimentaria: pa.alergia_alimentaria,
          alergia_medicamento: pa.alergia_medicamento,
          enfermedad_cronica: pa.enfermedad_cronica,
          centro_salud_emergencia: pa.centro_salud_emergencia,
          diagnostico: pa.diagnostico,
          contacto_emergencia: pa.contacto_emergencia,
          telefono_emergencia: pa.telefono_emergencia,
          // Apoderado
          nombre_apoderado: pa.apoderado_nombre,
          apellido_apoderado: pa.apoderado_apellido,
          rut_apoderado: pa.apoderado_rut,
          email_apoderado: pa.apoderado_email,
          telefono_apoderado: pa.apoderado_telefono,
          direccion_apoderado: pa.apoderado_direccion,
          parentesco: pa.apoderado_parentesco,
          // Plan de cobro
          monto_matricula: Number(form.monto_matricula) || 0,
          monto_mensual: Number(form.monto_mensual) || 0,
          meses_cobro: Number(form.meses_cobro) || 10,
          fecha_inicio_contrato: form.fecha_inicio_contrato || null,
          // Config
          crear_cuenta_apoderado: form.crear_cuenta_apoderado,
          observaciones: [
            form.observaciones || '',
            hermanos ? `[Hermanos] ${hermanos.detalle}` : '',
          ].filter(Boolean).join(' · ') || null,
          documentos: pa.documentos || {},
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo matricular')

      const nuevaMatriculaId = data?.matricula?.id ?? null
      setMatriculaId(nuevaMatriculaId)

      // Inscribir en el programa (si la solicitud tiene programa)
      if (pa.programa_id && data?.alumno?.id) {
        await fetch('/api/programas/inscripciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alumno_id: data.alumno.id,
            programa_id: pa.programa_id,
            nivel: form.curso,
            estado: 'activa',
          }),
        }).catch(() => {})
      }

      // Marcar la solicitud como matriculada
      await fetch(`/api/admision/${pa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'matriculada' }),
      }).catch(() => {})

      toast.success('Matrícula creada correctamente')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function enviarContrato() {
    if (!matriculaId) return
    setEnviandoContrato(true)
    try {
      // Si el hermano quedó exento de matrícula, el contrato va en modalidad 2x1
      const modalidad = modalidadContrato
      const res = await fetch('/api/contratos/enviar-firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula_id: matriculaId, tipo: 'contrato', modalidad }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Error al enviar contrato')
      toast.success(`Contrato enviado a ${data.email_enviado_a || pa.apoderado_email}`)

      // Enviar también el pagaré
      await fetch('/api/contratos/enviar-firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula_id: matriculaId, tipo: 'pagare' }),
      }).catch(() => {})
      toast.success('Pagaré también enviado')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setEnviandoContrato(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1B3A5C] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-white">Matricular alumno</h3>
            <p className="text-[11px] text-white/60 mt-0.5">{pa.alumno_nombre} {pa.alumno_apellido} · {pa.codigo_seguimiento}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Ya matriculado: ofrecer contrato */}
          {matriculaId ? (
            <div className="space-y-4">
              <div className="bg-[#EDF5F0] border border-[#2D5A3F]/20 rounded-xl p-4 text-center">
                <div className="w-11 h-11 bg-[#2D5A3F]/15 rounded-full flex items-center justify-center mx-auto mb-2">
                  <i className="ti ti-check text-xl text-[#2D5A3F]" aria-hidden="true"/>
                </div>
                <div className="text-[13px] font-bold text-[#2D5A3F]">Matrícula creada</div>
                <div className="text-[11px] text-[#2D5A3F]/80 mt-0.5">
                  El alumno quedó matriculado e inscrito en el programa.
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-[12px] font-bold text-[#1B3A5C] mb-1">Siguiente paso: contrato</div>
                <p className="text-[11px] text-gray-500 mb-3">
                  Envía el contrato y el pagaré al apoderado ({pa.apoderado_email}) para su firma electrónica.
                </p>

                {/* Qué contrato enviar */}
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de contrato</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setModalidadContrato('completo')}
                      className={`py-2.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${modalidadContrato === 'completo' ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      Monto completo
                    </button>
                    <button type="button" onClick={() => setModalidadContrato('hermanos_2x1')}
                      className={`py-2.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${modalidadContrato === 'hermanos_2x1' ? 'bg-[#7C5CBF] text-white border-[#7C5CBF]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      Matrícula 2x1
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {modalidadContrato === 'hermanos_2x1'
                      ? 'El contrato indicará la matrícula como EXENTA por promoción de hermanos.'
                      : 'El contrato incluirá la matrícula y el aporte mensual completos.'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a href={`/api/contratos?matricula_id=${matriculaId}&modalidad=${modalidadContrato}`} target="_blank"
                    className="px-3 py-2.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                    Previsualizar
                  </a>
                  <button onClick={enviarContrato} disabled={enviandoContrato}
                    className="flex-1 py-2.5 bg-[#1B3A5C] text-white text-xs font-bold rounded-lg hover:bg-[#143050] disabled:opacity-50 transition-colors">
                    {enviandoContrato ? 'Enviando...' : '📧 Enviar a firma'}
                  </button>
                </div>
              </div>

              <button onClick={onMatriculado} className="w-full py-2.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">
                Finalizar
              </button>
            </div>
          ) : (
            <>
              {/* Resumen de la solicitud */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <Row label="Alumno" value={`${pa.alumno_nombre} ${pa.alumno_apellido}`}/>
                <Row label="RUT" value={pa.alumno_rut}/>
                <Row label="Apoderado" value={`${pa.apoderado_nombre} ${pa.apoderado_apellido}`}/>
                <Row label="Email" value={pa.apoderado_email}/>
                <Row label="Sede" value={pa.sede}/>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Curso / nivel *</label>
                <input value={form.curso} onChange={e => set('curso', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B3A5C]"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Aporte inicial (CLP)</label>
                  <input type="number" value={form.monto_matricula} onChange={e => set('monto_matricula', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B3A5C]" min={0}/>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Aporte mensual (CLP)</label>
                  <input type="number" value={form.monto_mensual} onChange={e => set('monto_mensual', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B3A5C]" min={0}/>
                </div>
              </div>

              {/* Descuento por hermanos */}
              <div className="bg-[#f0f4f8] border border-[#1B3A5C]/10 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-[11px] font-bold text-[#1B3A5C]">Descuento por hermanos</div>
                  <button type="button" onClick={revisarHermanos} disabled={buscandoHermanos}
                    className="text-[10px] font-semibold text-[#1B3A5C] hover:underline disabled:opacity-50">
                    {buscandoHermanos ? 'Revisando...' : 'Revisar familia'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-snug">
                  Matrícula 2x1 por cada par de hermanos · 2° hermano 30% de descuento en el aporte · 3° y más, aporte fijo $40.000
                </p>

                {hermanos && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#1B3A5C]/10">
                    <div className="text-[11px] text-gray-700 mb-1.5">
                      <strong>{hermanos.orden === 1 ? 'Primer' : hermanos.orden === 2 ? 'Segundo' : `${hermanos.orden}°`} hermano</strong> de la familia
                      {hermanos.yaMatriculados > 0 && ` (${hermanos.yaMatriculados} ya matriculado${hermanos.yaMatriculados > 1 ? 's' : ''})`}
                    </div>
                    {hermanos.hermanos.length > 0 && (
                      <ul className="text-[10px] text-gray-500 mb-2 space-y-0.5">
                        {hermanos.hermanos.map((h: any, i: number) => (
                          <li key={i}>• {h.nombre}{h.curso ? ` — ${h.curso}` : ''}</li>
                        ))}
                      </ul>
                    )}
                    <div className="bg-white rounded-lg p-2.5 space-y-1 mb-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500">Matrícula</span>
                        <span className={`font-semibold ${hermanos.pagaMatricula ? 'text-gray-800' : 'text-[#2D5A3F]'}`}>
                          {hermanos.pagaMatricula
                            ? `$${hermanos.montoMatriculaSugerido.toLocaleString('es-CL')}`
                            : 'Exenta (2x1)'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500">Aporte mensual</span>
                        <span className="font-semibold text-gray-800">
                          ${hermanos.montoMensualSugerido.toLocaleString('es-CL')}
                          {hermanos.descuentoMensual > 0 && (
                            <span className="text-[#2D5A3F] font-normal"> (−{hermanos.descuentoMensual}%)</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={aplicarDescuento}
                      className="w-full py-2 bg-[#1B3A5C] text-white text-[11px] font-bold rounded-lg hover:bg-[#143050] transition-colors">
                      Aplicar estos montos
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Meses de cobro</label>
                  <input type="number" value={form.meses_cobro} onChange={e => set('meses_cobro', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B3A5C]" min={1} max={12}/>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Inicio del contrato</label>
                  <input type="date" value={form.fecha_inicio_contrato} onChange={e => set('fecha_inicio_contrato', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1B3A5C]"/>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Observaciones</label>
                <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none outline-none focus:border-[#1B3A5C]"
                  placeholder="Notas de la matrícula..."/>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={form.crear_cuenta_apoderado}
                  onChange={e => set('crear_cuenta_apoderado', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1B3A5C]"/>
                <span className="text-[11px] text-gray-700">Crear cuenta de portal para el apoderado (recibe email de acceso)</span>
              </label>

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={matricular} disabled={loading}
                  className="flex-1 py-2.5 bg-[#2D5A3F] text-white text-xs font-bold rounded-lg hover:bg-[#245234] disabled:opacity-50 transition-colors">
                  {loading ? 'Matriculando...' : '✓ Matricular'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-700 text-right max-w-[60%]">{value}</span>
    </div>
  )
}
