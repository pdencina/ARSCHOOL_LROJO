'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  matricula: any
  onClose: () => void
  onSave: () => void
}

// Valores del formulario a partir de una matrícula (con alumno y familia)
function formDesde(matricula: any) {
  return {
    monto_matricula: matricula.monto_matricula ?? 0,
    monto_mensual: matricula.monto_mensual ?? 0,
    meses_cobro: matricula.duracion_contrato_meses ?? matricula.meses_cobro ?? 10,
    anio_escolar: matricula.anio_escolar ?? new Date().getFullYear(),
    fecha_inicio_contrato: matricula.fecha_inicio_contrato || matricula.fecha_matricula || '',
    porcentaje_beca: matricula.porcentaje_beca ?? 0,
    proporcional_primer_mes: 0,
    sede: matricula.sede || '',
    modalidad_contrato: matricula.modalidad_contrato || 'completo',
    // Datos que aparecen en el contrato — Apoderado
    nombre_apoderado: matricula.familia?.nombre_apoderado || matricula.familias?.nombre_apoderado || '',
    apellido_apoderado: matricula.familia?.apellido_apoderado || matricula.familias?.apellido_apoderado || '',
    rut_apoderado: matricula.familia?.rut || matricula.familias?.rut || '',
    email_apoderado: matricula.familia?.email || matricula.familias?.email || '',
    telefono_apoderado: matricula.familia?.telefono || matricula.familias?.telefono || '',
    direccion_apoderado: matricula.familia?.direccion || matricula.familias?.direccion || '',
    comuna_apoderado: matricula.familia?.comuna || matricula.familias?.comuna || '',
    // Datos que aparecen en el contrato — Alumno
    alumno_nombre: matricula.alumno?.nombre || '',
    alumno_apellido: matricula.alumno?.apellido || '',
    alumno_rut: matricula.alumno?.rut || '',
    alumno_fecha_nacimiento: matricula.alumno?.fecha_nacimiento || '',
    observaciones: matricula.observaciones || '',
  }
}

export default function EditarMatriculaModal({ matricula: matriculaLista, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  // La lista de Matrículas trae solo algunas columnas: el modal carga la matrícula
  // completa para no mostrar (y volver a guardar) valores por defecto.
  const [matricula, setMatricula] = useState<any>(matriculaLista)
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(() => formDesde(matriculaLista))

  useEffect(() => {
    let vivo = true
    fetch(`/api/matriculas/${matriculaLista.id}`)
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error(d?.error || 'No se pudo cargar la matrícula')
        if (!vivo) return
        setMatricula(d)
        setForm(formDesde(d))
      })
      .catch((e: any) => { if (vivo) toast.error(`${e.message}. Revisa los datos antes de guardar.`) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [matriculaLista.id])

  const contratoFirmado = !!matricula.firma_apoderado

  async function guardar() {
    setSaving(true)
    try {
      const payload: any = {
        monto_matricula: form.monto_matricula,
        monto_mensual: form.monto_mensual,
      }
      if (form.observaciones) payload.observaciones = form.observaciones
      if (form.sede) payload.sede = form.sede
      if (form.fecha_inicio_contrato) payload.fecha_inicio_contrato = form.fecha_inicio_contrato
      payload.porcentaje_beca = form.porcentaje_beca || 0
      if (form.anio_escolar) payload.anio_escolar = form.anio_escolar
      if (form.meses_cobro) payload.meses_cobro = form.meses_cobro
      if (form.modalidad_contrato) payload.modalidad_contrato = form.modalidad_contrato
      // Datos del apoderado (se guardan en la familia, se reflejan en el contrato)
      payload.direccion_apoderado = form.direccion_apoderado
      payload.comuna_apoderado = form.comuna_apoderado
      payload.nombre_apoderado = form.nombre_apoderado
      payload.apellido_apoderado = form.apellido_apoderado
      payload.rut_apoderado = form.rut_apoderado
      payload.email_apoderado = form.email_apoderado
      payload.telefono_apoderado = form.telefono_apoderado
      // Datos del alumno (se guardan en alumnos, se reflejan en el contrato)
      payload.alumno_nombre = form.alumno_nombre
      payload.alumno_apellido = form.alumno_apellido
      payload.alumno_rut = form.alumno_rut
      payload.alumno_fecha_nacimiento = form.alumno_fecha_nacimiento || null

      // 1. Guardar matrícula
      const res = await fetch(`/api/matriculas/${matricula.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text ? JSON.parse(text).error || 'Error al guardar' : 'Error al guardar')
      }
      const guardado = await res.json().catch(() => ({}))
      const advertencias: string[] = guardado?.advertencias ?? []

      // 2. Recalcular cobros automáticamente
      const res2 = await fetch(`/api/matriculas/${matricula.id}/recalcular-cobros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_mensual: form.monto_mensual,
          monto_matricula: form.monto_matricula,
          fecha_inicio_contrato: form.fecha_inicio_contrato,
          porcentaje_beca: form.porcentaje_beca,
          proporcional_primer_mes: form.proporcional_primer_mes || 0,
          meses_cobro: form.meses_cobro || undefined,
          anio: form.anio_escolar || undefined,
        }),
      })
      if (res2.ok) {
        const data2 = await res2.json()
        const extra = data2.omitidos ? `, ${data2.omitidos} ya pagados se mantuvieron` : ''
        if (data2.errores?.length) advertencias.push(`Algunos cobros no se generaron: ${data2.errores[0]}`)
        if (advertencias.length === 0) toast.success(`Matrícula guardada y cobros recalculados (${data2.generados} generados${extra})`)
      } else {
        const d2 = await res2.json().catch(() => null)
        advertencias.push(`Los cobros no se recalcularon${d2?.error ? `: ${d2.error}` : ''}. El contrato mostrará los montos anteriores.`)
      }
      // Si algo no se guardó, decirlo claramente (antes se mostraba "guardado" igual)
      if (advertencias.length) {
        toast.error(`Guardado con problemas:\n• ${advertencias.join('\n• ')}`, { duration: 9000 })
      }

      onSave()
    } catch (e: any) { toast.error(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function recalcularCobros() {
    if (!confirm('¿Recalcular cobros? Se eliminarán los cobros PENDIENTES y se generarán nuevos con los montos actuales. Los cobros ya pagados no se tocan.')) return
    setRecalculando(true)
    try {
      const res = await fetch(`/api/matriculas/${matricula.id}/recalcular-cobros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto_mensual: form.monto_mensual,
          monto_matricula: form.monto_matricula,
          fecha_inicio_contrato: form.fecha_inicio_contrato,
          porcentaje_beca: form.porcentaje_beca,
          proporcional_primer_mes: form.proporcional_primer_mes || 0,
          meses_cobro: form.meses_cobro || undefined,
          anio: form.anio_escolar || undefined,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text ? JSON.parse(text).error || 'Error' : 'Error al recalcular')
      }
      const data = await res.json()
      toast.success(`Cobros recalculados: ${data.eliminados} eliminados, ${data.generados} generados`)
      onSave()
    } catch (e: any) { toast.error(e.message || 'Error al recalcular') }
    finally { setRecalculando(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-[var(--ar-text)]">Editar matrícula</h2>
              <p className="text-[10px] text-[var(--ar-muted)]">{matricula.alumno?.nombre} {matricula.alumno?.apellido}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {cargando && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--ar-muted)] mb-3">
              <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true"/> Cargando datos actuales de la matrícula…
            </div>
          )}

          {/* Aviso si el contrato ya fue firmado */}
          {contratoFirmado && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <i className="ti ti-alert-triangle text-amber-600 text-sm mt-0.5" aria-hidden="true"/>
              <p className="text-[11px] text-amber-800 leading-snug">
                El contrato ya fue firmado. Si corriges nombre, RUT o datos del apoderado/alumno,
                deberás <strong>reenviar el contrato a firma</strong> para que refleje los cambios.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* ── Datos del alumno (aparecen en el contrato) ── */}
            <details className="border border-[var(--ar-border)] rounded-lg" open>
              <summary className="px-3 py-2 text-[11px] font-bold text-[var(--ar-text)] cursor-pointer select-none">
                <i className="ti ti-user text-xs mr-1.5" aria-hidden="true"/>Datos del alumno
              </summary>
              <div className="p-3 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nombre</label>
                    <input value={form.alumno_nombre} onChange={e => setForm(p => ({...p, alumno_nombre: e.target.value}))} className="input-base"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Apellido</label>
                    <input value={form.alumno_apellido} onChange={e => setForm(p => ({...p, alumno_apellido: e.target.value}))} className="input-base"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">RUT</label>
                    <input value={form.alumno_rut} onChange={e => setForm(p => ({...p, alumno_rut: e.target.value}))} className="input-base" placeholder="12.345.678-9"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Fecha nacimiento</label>
                    <input type="date" value={form.alumno_fecha_nacimiento ? String(form.alumno_fecha_nacimiento).split('T')[0] : ''} onChange={e => setForm(p => ({...p, alumno_fecha_nacimiento: e.target.value}))} className="input-base"/>
                  </div>
                </div>
              </div>
            </details>

            {/* ── Datos del apoderado (aparecen en el contrato) ── */}
            <details className="border border-[var(--ar-border)] rounded-lg" open>
              <summary className="px-3 py-2 text-[11px] font-bold text-[var(--ar-text)] cursor-pointer select-none">
                <i className="ti ti-heart-handshake text-xs mr-1.5" aria-hidden="true"/>Datos del apoderado
              </summary>
              <div className="p-3 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nombre</label>
                    <input value={form.nombre_apoderado} onChange={e => setForm(p => ({...p, nombre_apoderado: e.target.value}))} className="input-base"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Apellido</label>
                    <input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: e.target.value}))} className="input-base"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">RUT</label>
                    <input value={form.rut_apoderado} onChange={e => setForm(p => ({...p, rut_apoderado: e.target.value}))} className="input-base" placeholder="12.345.678-9"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Teléfono</label>
                    <input value={form.telefono_apoderado} onChange={e => setForm(p => ({...p, telefono_apoderado: e.target.value}))} className="input-base" placeholder="+56 9..."/>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Email <span className="text-[9px] normal-case text-[var(--ar-muted)]">(recibe firma y comprobantes)</span></label>
                  <input type="email" value={form.email_apoderado} onChange={e => setForm(p => ({...p, email_apoderado: e.target.value}))} className="input-base" placeholder="correo@ejemplo.com"/>
                </div>
              </div>
            </details>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Aporte inicial ($)</label>
                <input
                  type="number"
                  value={form.monto_matricula}
                  onChange={e => setForm(p => ({...p, monto_matricula: parseInt(e.target.value) || 0}))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Aporte mensual ($)</label>
                <input
                  type="number"
                  value={form.monto_mensual}
                  onChange={e => setForm(p => ({...p, monto_mensual: parseInt(e.target.value) || 0}))}
                  className="input-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Meses de cobro</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={form.meses_cobro}
                  onChange={e => setForm(p => ({...p, meses_cobro: parseInt(e.target.value) || 1}))}
                  className="input-base"
                />
                <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Libre: 2, 3, 4… hasta 12.</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Año escolar</label>
                <select
                  value={form.anio_escolar}
                  onChange={e => setForm(p => ({...p, anio_escolar: parseInt(e.target.value)}))}
                  className="select-base w-full"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
                <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Aranceles distintos por año.</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Fecha inicio contrato</label>
              <input
                type="date"
                value={form.fecha_inicio_contrato}
                onChange={e => setForm(p => ({...p, fecha_inicio_contrato: e.target.value}))}
                className="input-base"
              />
              <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Desde cuándo rigen los cobros. Afecta la tabla del contrato.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Sede</label>
              <select
                value={form.sede}
                onChange={e => setForm(p => ({...p, sede: e.target.value}))}
                className="select-base w-full"
              >
                <option value="">Según colegio del usuario</option>
                <option value="santiago">Sede Santiago — Victoria 52</option>
                <option value="puente_alto">Sede Puente Alto — Irarrázaval 0565</option>
                <option value="punta_arenas">Sede Punta Arenas — Chiloé 862</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Modalidad del contrato</label>
              <select
                value={form.modalidad_contrato}
                onChange={e => setForm(p => ({...p, modalidad_contrato: e.target.value}))}
                className="select-base w-full"
              >
                <option value="completo">Contrato completo (paga aporte inicial)</option>
                <option value="hermanos_2x1">Matrícula 2x1 (aporte inicial exento)</option>
              </select>
              <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Usa 2x1 solo para el hermano exento de matrícula por la promoción.</p>
            </div>

            {/* Domicilio del apoderado — aparece en el contrato */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Dirección del apoderado</label>
              <input
                value={form.direccion_apoderado}
                onChange={e => setForm(p => ({...p, direccion_apoderado: e.target.value}))}
                className="input-base"
                placeholder="Calle, número, depto"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Comuna del apoderado</label>
              <input
                value={form.comuna_apoderado}
                onChange={e => setForm(p => ({...p, comuna_apoderado: e.target.value}))}
                className="input-base"
                placeholder="Ej: Punta Arenas"
              />
              <p className="text-[10px] text-[var(--ar-muted)] mt-1">Aparece en el contrato como domicilio del apoderado.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Proporcional 1er mes ($)</label>
                <input
                  type="number"
                  value={form.proporcional_primer_mes || ''}
                  onChange={e => setForm(p => ({...p, proporcional_primer_mes: parseInt(e.target.value) || 0}))}
                  className="input-base"
                  placeholder="0"
                />
                <p className="text-[9px] text-[var(--ar-muted)] mt-0.5">Días fraccionados del primer mes</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Beca (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.porcentaje_beca || ''}
                  onChange={e => setForm(p => ({...p, porcentaje_beca: parseInt(e.target.value) || 0}))}
                  className="input-base"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm(p => ({...p, observaciones: e.target.value}))}
                rows={2}
                className="input-base resize-none"
                placeholder="Notas internas..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 btn-secondary py-2.5">Cancelar</button>
            <button onClick={guardar} disabled={saving || cargando} className="flex-1 py-2.5 bg-[#1B3A5C] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar y recalcular'}
            </button>
          </div>

          <p className="text-[9px] text-[var(--ar-muted)] text-center mt-3">
            Al guardar, se actualizan los datos y se regeneran los cobros pendientes automáticamente.
          </p>
        </div>
      </div>
    </>
  )
}
