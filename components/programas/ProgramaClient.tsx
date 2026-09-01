'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { PROGRAMA_CONFIG } from '@/lib/programas'
import { formatearRut, validarRut } from '@/lib/validaciones'
import FichaAlumnoModal from './FichaAlumnoModal'

interface Props {
  programa: any
  inscripciones: any[]
  matriculas: any[]
  colegioId: string
  asistencias4w?: any[]
  cobrosPendientes?: any[]
}

export default function ProgramaClient({ programa, inscripciones, matriculas, colegioId, asistencias4w = [], cobrosPendientes = [] }: Props) {
  const router = useRouter()
  const [vista, setVista] = useState<'lista' | 'nueva' | 'asistencia'>('lista')
  const [saving, setSaving] = useState(false)
  const [esPrueba, setEsPrueba] = useState(false)
  const [fichaAbierta, setFichaAbierta] = useState<any>(null)
  const [filtroNivel, setFiltroNivel] = useState<string>('')
  const [enviandoContrato, setEnviandoContrato] = useState<string | null>(null)
  const config = PROGRAMA_CONFIG[programa.codigo] || PROGRAMA_CONFIG.ar_school

  const [form, setForm] = useState({
    nombre: '', apellido: '', rut: '', fecha_nacimiento: '', sexo: '',
    nombre_apoderado: '', apellido_apoderado: '', email_apoderado: '', telefono_apoderado: '',
    // Requeridos por el contrato: RUT, domicilio y comuna del apoderado
    rut_apoderado: '', direccion_apoderado: '', comuna_apoderado: '',
    horario: '', nivel: '', observaciones: '', sede: 'santiago',
  })

  // ─── Datos para gráfico de asistencia semanal ───
  const datosGrafico = useMemo(() => {
    const semanas: { label: string; presentes: number; ausentes: number; total: number }[] = []
    const hoy = new Date()
    for (let i = 3; i >= 0; i--) {
      const inicioSemana = new Date(hoy)
      inicioSemana.setDate(hoy.getDate() - (i * 7 + hoy.getDay()))
      const finSemana = new Date(inicioSemana)
      finSemana.setDate(inicioSemana.getDate() + 6)

      const inicioStr = inicioSemana.toISOString().split('T')[0]
      const finStr = finSemana.toISOString().split('T')[0]

      const semanaDatos = asistencias4w.filter(a => a.fecha >= inicioStr && a.fecha <= finStr)
      const presentes = semanaDatos.filter(a => a.estado === 'presente' || a.estado === 'tardanza').length
      const ausentes = semanaDatos.filter(a => a.estado === 'ausente').length

      semanas.push({
        label: `${inicioSemana.getDate()}/${inicioSemana.getMonth() + 1}`,
        presentes,
        ausentes,
        total: presentes + ausentes,
      })
    }
    return semanas
  }, [asistencias4w])

  const maxTotal = Math.max(...datosGrafico.map(s => s.total), 1)

  // ─── Alertas de baja asistencia (<70%) ───
  const alertasBajaAsistencia = useMemo(() => {
    const porAlumno: Record<string, { presente: number; total: number; nombre: string }> = {}
    asistencias4w.forEach(a => {
      if (!porAlumno[a.alumno_id]) {
        const ins = inscripciones.find(i => i.alumno?.id === a.alumno_id)
        porAlumno[a.alumno_id] = { presente: 0, total: 0, nombre: ins ? `${ins.alumno?.nombre} ${ins.alumno?.apellido}` : 'Alumno' }
      }
      porAlumno[a.alumno_id].total++
      if (a.estado === 'presente' || a.estado === 'tardanza') porAlumno[a.alumno_id].presente++
    })
    return Object.entries(porAlumno)
      .map(([id, d]) => ({ alumno_id: id, nombre: d.nombre, pct: d.total > 0 ? Math.round((d.presente / d.total) * 100) : 100 }))
      .filter(x => x.pct < 70 && x.pct > 0)
      .sort((a, b) => a.pct - b.pct)
  }, [asistencias4w, inscripciones])

  // ─── Niveles únicos para filtro ───
  const nivelesUnicos = useMemo(() => {
    const niveles = inscripciones.map(i => i.nivel).filter(Boolean)
    return Array.from(new Set(niveles)).sort()
  }, [inscripciones])

  // ─── Alumnos con mora (cobros pendientes) ───
  const alumnosConMora = useMemo(() => {
    const moraPorAlumno: Record<string, number> = {}
    cobrosPendientes.forEach(c => {
      if (!moraPorAlumno[c.alumno_id]) moraPorAlumno[c.alumno_id] = 0
      moraPorAlumno[c.alumno_id] += c.monto
    })
    return moraPorAlumno
  }, [cobrosPendientes])

  const alumnosAlDia = inscripciones.filter(i => !alumnosConMora[i.alumno?.id]).length

  // ─── Embudo Prueba → Activa ───
  const embudo = useMemo(() => {
    const enPrueba = inscripciones.filter(i => i.estado === 'prueba').length
    const activos = inscripciones.filter(i => i.estado === 'activa').length
    // Convertidos: inscripciones activas que tienen registro de conversión desde prueba
    const convertidos = inscripciones.filter(i => i.convertida_at).length
    return { enPrueba, activos, convertidos }
  }, [inscripciones])

  // ─── Inscripciones filtradas ───
  const inscripcionesFiltradas = useMemo(() => {
    if (!filtroNivel) return inscripciones
    return inscripciones.filter(i => i.nivel === filtroNivel)
  }, [inscripciones, filtroNivel])

  // ─── Enviar contrato ───
  async function handleEnviarContrato(alumnoId: string) {
    const mat = matriculas.find((m: any) => m.alumno_id === alumnoId)
    if (!mat) {
      toast.error('Este alumno no tiene matrícula asociada. Debe matricularlo primero.')
      return
    }
    setEnviandoContrato(alumnoId)
    try {
      const res = await fetch('/api/contratos/enviar-firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula_id: mat.id, tipo: 'contrato' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Contrato enviado a ${data.email_enviado_a}`)
      // También enviar pagaré
      await fetch('/api/contratos/enviar-firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula_id: mat.id, tipo: 'pagare' }),
      })
      toast.success('Pagaré también enviado')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error al enviar contrato')
    } finally {
      setEnviandoContrato(null)
    }
  }

  // ─── Convertir clase de prueba en inscripción activa ───
  async function handleConvertir(alumnoId: string, nombre: string) {
    if (!confirm(`¿Convertir a ${nombre} de clase de prueba a inscripción activa?`)) return
    try {
      const res = await fetch('/api/programas/inscripciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: alumnoId, programa_id: programa.id, accion: 'convertir' }),
      })
      if (res.ok) { toast.success(`${nombre} ahora es inscripción activa`); router.refresh() }
      else { const d = await res.json().catch(() => null); toast.error(d?.error || 'Error al convertir') }
    } catch { toast.error('Error') }
  }

  async function handleInscribir() {
    if (!form.nombre || !form.apellido || !form.email_apoderado) {
      toast.error('Nombre, apellido y email del apoderado son requeridos')
      return
    }
    // Datos que exige el contrato (solo se validan al inscribir en firme, no en prueba)
    if (!esPrueba) {
      const faltan: string[] = []
      if (!form.rut_apoderado || !validarRut(form.rut_apoderado)) faltan.push('RUT del apoderado válido')
      if (!form.direccion_apoderado) faltan.push('Dirección del apoderado')
      if (!form.comuna_apoderado) faltan.push('Comuna del apoderado')
      if (faltan.length > 0) {
        toast.error(`Para el contrato falta: ${faltan.join(', ')}`)
        return
      }
    }
    setSaving(true)
    try {
      // Crear alumno + familia + inscripción
      const res = await fetch('/api/matriculas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          curso: `${programa.nombre_corto} - ${form.nivel || 'General'}`,
          jornada: 'completa',
          sede: form.sede,
          // Domicilio del alumno = del apoderado (para el contrato)
          comuna: form.comuna_apoderado || null,
          direccion: form.direccion_apoderado || null,
          tipo_ingreso: 'nuevo',
          nacionalidad: 'Chilena',
          pais_natal: 'Chile',
          crear_cuenta_apoderado: true,
          monto_matricula: 0,
          monto_mensual: 0,
          meses_cobro: programa.meses_cobro_default || 10,
          programa_id: programa.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Inscribir en el programa
      if (data.alumno?.id) {
        await fetch('/api/programas/inscripciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alumno_id: data.alumno.id,
            programa_id: programa.id,
            horario: form.horario,
            nivel: form.nivel,
            observaciones: form.observaciones,
            estado: esPrueba ? 'prueba' : 'activa',
          }),
        })
      }

      toast.success(esPrueba ? 'Clase de prueba registrada' : 'Inscripción completada')
      setVista('lista')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
            <i className={`ti ${config.icon} text-lg ${config.color}`} aria-hidden="true"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--ar-text)]" style={{ fontFamily: 'DM Sans' }}>{programa.nombre}</h1>
            <p className="text-xs text-[var(--ar-muted)]">{programa.descripcion}</p>
          </div>
        </div>
        {vista === 'lista' ? (
          <div className="flex gap-2">
            <button onClick={() => setVista('asistencia')} className="btn-secondary text-xs">
              <i className="ti ti-clipboard-check text-sm" aria-hidden="true"/> Asistencia
            </button>
            <button onClick={() => setVista('nueva')} className="btn-primary">
              <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nueva inscripción
            </button>
          </div>
        ) : (
          <button onClick={() => setVista('lista')} className="btn-secondary">
            <i className="ti ti-arrow-left text-sm" aria-hidden="true"/> Volver
          </button>
        )}
      </div>

      {/* KPIs + Chart + Alertas */}
      {vista === 'lista' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="kpi-card"><div className="kpi-label">Inscritos activos</div><div className="kpi-value">{inscripciones.length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Matrículas</div><div className="kpi-value">{matriculas.length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Contratos firmados</div><div className="kpi-value text-[#2D5A3F]">{matriculas.filter(m => m.firma_apoderado).length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Pendientes firma</div><div className="kpi-value text-amber-600">{matriculas.filter(m => !m.firma_apoderado).length}</div></div>
            <div className="kpi-card"><div className="kpi-label">Al día en pagos</div><div className="kpi-value text-[#2D5A3F]">{alumnosAlDia}<span className="text-xs text-[var(--ar-muted)] font-normal">/{inscripciones.length}</span></div></div>
          </div>

          {/* ─── Embudo de seguimiento: Prueba → Activa ─── */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5 mb-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-xs font-bold text-[var(--ar-text)] mb-4">
              <i className="ti ti-filter text-sm mr-1.5" aria-hidden="true"/>Seguimiento de inscripciones
            </h3>
            <div className="flex items-center gap-2">
              {/* En prueba */}
              <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{embudo.enPrueba}</div>
                <div className="text-[10px] text-amber-700/80 font-semibold uppercase tracking-wider mt-1">En prueba</div>
              </div>
              <i className="ti ti-arrow-right text-lg text-[var(--ar-muted)]" aria-hidden="true"/>
              {/* Activos */}
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700">{embudo.activos}</div>
                <div className="text-[10px] text-emerald-700/80 font-semibold uppercase tracking-wider mt-1">Inscritos activos</div>
              </div>
              {/* Convertidos */}
              <div className="flex-1 bg-[#f0f4f8] border border-[var(--ar-border)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#1B3A5C]">{embudo.convertidos}</div>
                <div className="text-[10px] text-[var(--ar-muted)] font-semibold uppercase tracking-wider mt-1">Convertidos de prueba</div>
              </div>
            </div>
            {embudo.enPrueba > 0 && (
              <p className="text-[10px] text-[var(--ar-muted)] mt-3">
                <i className="ti ti-info-circle mr-1" aria-hidden="true"/>
                Hay {embudo.enPrueba} alumno{embudo.enPrueba > 1 ? 's' : ''} en clase de prueba. Conviértelos a inscripción activa desde la tabla cuando confirmen.
              </p>
            )}
          </div>

          {/* ─── Gráfico Asistencia últimas 4 semanas ─── */}
          {asistencias4w.length > 0 && (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5 mb-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-[var(--ar-text)]">
                  <i className="ti ti-chart-bar text-sm mr-1.5" aria-hidden="true"/>Asistencia — últimas 4 semanas
                </h3>
                <span className="text-[10px] text-[var(--ar-muted)]">{asistencias4w.length} registros</span>
              </div>
              <div className="flex items-end gap-3 h-32">
                {datosGrafico.map((semana, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      {semana.total > 0 ? (
                        <div className="w-full max-w-[40px] flex flex-col gap-0.5">
                          <div
                            className="w-full bg-[#2D5A3F] rounded-t-md transition-all"
                            style={{ height: `${(semana.presentes / maxTotal) * 96}px` }}
                            title={`Presentes: ${semana.presentes}`}
                          />
                          {semana.ausentes > 0 && (
                            <div
                              className="w-full bg-red-300 rounded-b-md transition-all"
                              style={{ height: `${(semana.ausentes / maxTotal) * 96}px` }}
                              title={`Ausentes: ${semana.ausentes}`}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-full max-w-[40px] h-2 bg-gray-100 rounded"/>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--ar-muted)] font-medium">Sem {semana.label}</span>
                    {semana.total > 0 && (
                      <span className="text-[9px] font-bold text-[#2D5A3F]">
                        {Math.round((semana.presentes / semana.total) * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-[#2D5A3F] rounded-sm"/><span className="text-[9px] text-[var(--ar-muted)]">Presentes/Tardanza</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-red-300 rounded-sm"/><span className="text-[9px] text-[var(--ar-muted)]">Ausentes</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── Alertas baja asistencia (<70%) ─── */}
          {alertasBajaAsistencia.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <i className="ti ti-alert-triangle text-amber-600 text-sm" aria-hidden="true"/>
                <h3 className="text-xs font-bold text-amber-800">Alumnos con baja asistencia (&lt;70%)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {alertasBajaAsistencia.map(a => (
                  <div key={a.alumno_id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-800 truncate">{a.nombre}</p>
                    </div>
                    <span className="text-[11px] font-bold text-red-600 flex-shrink-0">{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Filtro por nivel ─── */}
          {nivelesUnicos.length > 1 && (
            <div className="flex items-center gap-3 mb-4">
              <label className="text-[10px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider">Filtrar por nivel:</label>
              <select
                value={filtroNivel}
                onChange={e => setFiltroNivel(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[var(--ar-border)] rounded-lg text-xs outline-none focus:border-[#1B3A5C] min-w-[180px]"
              >
                <option value="">Todos los niveles ({inscripciones.length})</option>
                {nivelesUnicos.map(n => (
                  <option key={n} value={n}>{n} ({inscripciones.filter(i => i.nivel === n).length})</option>
                ))}
              </select>
              {filtroNivel && (
                <button onClick={() => setFiltroNivel('')} className="text-[10px] text-[var(--ar-accent)] hover:underline">Limpiar</button>
              )}
            </div>
          )}

          {/* ─── Tabla de inscritos ─── */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                  {['Alumno', 'Nivel', 'Horario', 'Inscrito', 'Estado', 'Pago', 'Acciones'].map(h => (
                    <th key={h} className="text-[10px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inscripcionesFiltradas.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center">
                    <i className={`ti ${config.icon} text-3xl text-[#d1d5db] block mb-3`} aria-hidden="true"/>
                    <p className="text-[var(--ar-muted)] text-sm">
                      {filtroNivel ? `No hay inscritos en nivel "${filtroNivel}".` : `No hay inscritos en ${programa.nombre_corto}. Registra el primero.`}
                    </p>
                  </td></tr>
                ) : inscripcionesFiltradas.map((ins: any) => {
                  const tieneMatricula = matriculas.find((m: any) => m.alumno_id === ins.alumno?.id)
                  const contratoFirmado = tieneMatricula?.firma_apoderado
                  return (
                    <tr key={ins.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc]">
                      <td className="px-4 py-3.5 font-medium text-[var(--ar-text)]">
                        <button onClick={() => setFichaAbierta(ins.alumno)} className="hover:text-[#1B3A5C] hover:underline text-left">{ins.alumno?.nombre} {ins.alumno?.apellido}</button>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--ar-muted)]">{ins.nivel || '—'}</td>
                      <td className="px-4 py-3.5 text-[var(--ar-muted)] text-xs">{ins.horario || '—'}</td>
                      <td className="px-4 py-3.5 text-[var(--ar-muted)] text-xs">{new Date(ins.created_at).toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-3.5">
                        {ins.estado === 'prueba' ? (
                          <span className="tag tag-pend" title={ins.fecha_prueba ? `Prueba desde ${new Date(ins.fecha_prueba + 'T12:00').toLocaleDateString('es-CL')}` : undefined}>Prueba</span>
                        ) : (
                          <span className="tag tag-ok">Activo</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {alumnosConMora[ins.alumno?.id] ? (
                          <span className="text-[11px] font-semibold text-red-600" title="Cobros pendientes">
                            Debe ${alumnosConMora[ins.alumno?.id].toLocaleString('es-CL')}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[#2D5A3F]">Al día</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/asistencias-sesion', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ alumno_id: ins.alumno?.id, programa_id: programa.id, estado: 'presente' }),
                                })
                                if (res.ok) toast.success(`Asistencia registrada: ${ins.alumno?.nombre}`)
                                else if (res.status === 409) toast('Asistencia ya registrada hoy', { icon: '⚠️' })
                                else toast.error('Error al registrar')
                              } catch { toast.error('Error') }
                            }}
                            className="text-[10px] text-emerald-600 hover:underline font-medium"
                          >✓ Presente</button>
                          {ins.estado === 'prueba' && (
                            <button
                              onClick={() => handleConvertir(ins.alumno?.id, `${ins.alumno?.nombre} ${ins.alumno?.apellido}`)}
                              className="text-[10px] text-[#1B3A5C] hover:underline font-medium"
                            >⤴ Convertir a activa</button>
                          )}
                          {tieneMatricula ? (
                            contratoFirmado ? (
                              <span className="text-[10px] text-[#2D5A3F] font-medium">✓ Firmado</span>
                            ) : (
                              <button
                                onClick={() => handleEnviarContrato(ins.alumno?.id)}
                                disabled={enviandoContrato === ins.alumno?.id}
                                className="text-[10px] text-[var(--ar-accent)] hover:underline font-medium disabled:opacity-50"
                              >
                                {enviandoContrato === ins.alumno?.id ? '⏳ Enviando...' : '📧 Enviar contrato'}
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] text-gray-400">Sin matrícula</span>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Dar de baja a ${ins.alumno?.nombre} ${ins.alumno?.apellido}? Se finalizará su inscripción.`)) return
                              try {
                                const res = await fetch(`/api/programas/inscripciones?alumno_id=${ins.alumno?.id}&programa_id=${programa.id}`, { method: 'DELETE' })
                                if (res.ok) { toast.success('Inscripción finalizada'); router.refresh() }
                                else { const d = await res.json(); toast.error(d.error || 'Error') }
                              } catch { toast.error('Error') }
                            }}
                            className="text-[10px] text-red-500 hover:underline font-medium"
                          >✗ Baja</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Formulario nueva inscripción */}
      {vista === 'nueva' && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-bold text-[var(--ar-text)] mb-4">Datos del alumno</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value.replace(/\b\w/g, c => c.toUpperCase())}))} className="input-base" placeholder="Nombres completos"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Apellido *</label><input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: e.target.value.replace(/\b\w/g, c => c.toUpperCase())}))} className="input-base" placeholder="Apellidos completos"/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">RUT</label>
                <div className="relative">
                  <input value={form.rut} onChange={e => setForm(p => ({...p, rut: formatearRut(e.target.value)}))} className="input-base pr-8" placeholder="12.345.678-9" maxLength={12}/>
                  {form.rut && form.rut.length > 3 && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${validarRut(form.rut) ? 'text-[#2D5A3F]' : 'text-red-500'}`}>
                      {validarRut(form.rut) ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Fecha nacimiento</label><input type="date" value={form.fecha_nacimiento} onChange={e => setForm(p => ({...p, fecha_nacimiento: e.target.value}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Sexo</label>
                <select value={form.sexo} onChange={e => setForm(p => ({...p, sexo: e.target.value}))} className="select-base w-full">
                  <option value="">Seleccionar</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option>
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nivel / Categoría</label>
                <select value={form.nivel} onChange={e => setForm(p => ({...p, nivel: e.target.value}))} className="select-base w-full">
                  <option value="">Seleccionar...</option>
                  {programa.codigo === 'lions_soccer' ? (
                    <>
                      <option value="Sub-6">Sub-6 (5-6 años)</option>
                      <option value="Sub-8">Sub-8 (7-8 años)</option>
                      <option value="Sub-10">Sub-10 (9-10 años)</option>
                      <option value="Sub-12">Sub-12 (11-12 años)</option>
                      <option value="Sub-14">Sub-14 (13-14 años)</option>
                      <option value="Sub-16">Sub-16 (15-16 años)</option>
                      <option value="Juvenil">Juvenil (17+)</option>
                    </>
                  ) : programa.codigo === 'ar_worship' ? (
                    <>
                      <optgroup label="Music and Play">
                        <option value="Music and Play (0-4 años)">Music and Play (0-4 años)</option>
                        <option value="Music and Play (4-7 años)">Music and Play (4-7 años)</option>
                      </optgroup>
                      <optgroup label="AR Worship School">
                        <option value="Ciclo 1 - Guitarra">Ciclo 1 — Guitarra (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Bajo">Ciclo 1 — Bajo (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Teclado">Ciclo 1 — Teclado (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Batería">Ciclo 1 — Batería (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Canto">Ciclo 1 — Canto (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Saxophone">Ciclo 1 — Saxophone (Sáb 09:30)</option>
                        <option value="Ciclo 1 - Violín">Ciclo 1 — Violín (Sáb 09:30)</option>
                        <option value="Ciclo 2 - Guitarra">Ciclo 2 — Guitarra (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Bajo">Ciclo 2 — Bajo (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Teclado">Ciclo 2 — Teclado (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Batería">Ciclo 2 — Batería (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Canto">Ciclo 2 — Canto (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Saxophone">Ciclo 2 — Saxophone (Sáb 11:20)</option>
                        <option value="Ciclo 2 - Violín">Ciclo 2 — Violín (Sáb 11:20)</option>
                      </optgroup>
                    </>
                  ) : (
                    <>
                      <option value="Iniciación">Iniciación (5-7 años)</option>
                      <option value="Básico">Básico (8-10 años)</option>
                      <option value="Intermedio">Intermedio (11-13 años)</option>
                      <option value="Avanzado">Avanzado (14-17 años)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Horario preferido</label>
              <input value={form.horario} onChange={e => setForm(p => ({...p, horario: e.target.value}))} className="input-base" placeholder="Ej: Martes y Jueves 16:00-17:30"/>
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Sede *</label>
              <select value={form.sede} onChange={e => setForm(p => ({...p, sede: e.target.value}))} className="select-base w-full">
                <option value="santiago">Sede Santiago</option>
                <option value="puente_alto">Sede Puente Alto</option>
                <option value="punta_arenas">Sede Punta Arenas</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-bold text-[var(--ar-text)] mb-4">Datos del apoderado</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Nombre *</label><input value={form.nombre_apoderado} onChange={e => setForm(p => ({...p, nombre_apoderado: e.target.value.replace(/\b\w/g, c => c.toUpperCase())}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Apellido</label><input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: e.target.value.replace(/\b\w/g, c => c.toUpperCase())}))} className="input-base"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Email *</label><input type="email" value={form.email_apoderado} onChange={e => setForm(p => ({...p, email_apoderado: e.target.value}))} className="input-base" placeholder="correo@email.com"/></div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Teléfono</label><input value={form.telefono_apoderado} onChange={e => setForm(p => ({...p, telefono_apoderado: e.target.value}))} className="input-base" placeholder="+56 9..."/></div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">RUT apoderado *</label>
                <div className="relative">
                  <input value={form.rut_apoderado} onChange={e => setForm(p => ({...p, rut_apoderado: formatearRut(e.target.value)}))} className="input-base pr-8" placeholder="12.345.678-9" maxLength={12}/>
                  {form.rut_apoderado && form.rut_apoderado.length > 3 && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${validarRut(form.rut_apoderado) ? 'text-[#2D5A3F]' : 'text-red-500'}`}>
                      {validarRut(form.rut_apoderado) ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </div>
              <div><label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Comuna *</label><input value={form.comuna_apoderado} onChange={e => setForm(p => ({...p, comuna_apoderado: e.target.value}))} className="input-base" placeholder="Ej: Santiago"/></div>
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Dirección *</label>
              <input value={form.direccion_apoderado} onChange={e => setForm(p => ({...p, direccion_apoderado: e.target.value}))} className="input-base" placeholder="Calle, número, depto"/>
            </div>
            <p className="text-[10px] text-[var(--ar-muted)] mt-2">
              <i className="ti ti-info-circle mr-1" aria-hidden="true"/>
              RUT, dirección y comuna son necesarios para generar el contrato.
            </p>
          </div>

          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <label className="block text-[11px] font-semibold text-[var(--ar-muted)] uppercase tracking-wider mb-1">Observaciones</label>
            <textarea value={form.observaciones} onChange={e => setForm(p => ({...p, observaciones: e.target.value}))} rows={3} className="input-base resize-none" placeholder="Notas adicionales..."/>
          </div>

          {/* Toggle clase de prueba */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div className="text-xs font-semibold text-[var(--ar-text)]">Clase de prueba</div>
              <div className="text-[10px] text-[var(--ar-muted)]">Registrar como prueba (no genera cobro, puede convertirse después)</div>
            </div>
            <button onClick={() => setEsPrueba(!esPrueba)} className={`w-10 h-5 rounded-full transition-colors ${esPrueba ? 'bg-[#2D5A3F]' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${esPrueba ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </button>
          </div>

          <button onClick={handleInscribir} disabled={saving} className="btn-primary w-full py-3">
            {saving ? 'Procesando...' : esPrueba ? `Registrar clase de prueba` : `Inscribir en ${programa.nombre_corto}`}
          </button>
        </div>
      )}

      {/* Vista: Asistencia masiva */}
      {vista === 'asistencia' && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-sm font-bold text-[var(--ar-text)] mb-4">Asistencia de hoy — {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {inscripciones.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No hay inscritos para tomar asistencia</p>
          ) : (
            <div className="space-y-2">
              {inscripciones.map((ins: any) => (
                <div key={ins.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--ar-text)]">{ins.alumno?.nombre} {ins.alumno?.apellido}</div>
                    <div className="text-[9px] text-[var(--ar-muted)]">{ins.nivel || ins.horario || ''}</div>
                  </div>
                  <div className="flex gap-1">
                    {['presente', 'ausente', 'tardanza'].map(estado => (
                      <button key={estado} onClick={async () => {
                        try {
                          const res = await fetch('/api/asistencias-sesion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alumno_id: ins.alumno?.id, programa_id: programa.id, estado }) })
                          if (res.ok) toast.success(`${ins.alumno?.nombre}: ${estado}`)
                          else if (res.status === 409) toast(`${ins.alumno?.nombre}: ya registrada hoy`, { icon: '⚠️' })
                          else toast.error('Error')
                        } catch { toast.error('Error') }
                      }} className={`px-2 py-1 rounded text-[9px] font-semibold transition-colors ${estado === 'presente' ? 'bg-[#EDF5F0] text-[#2D5A3F] hover:bg-[#d4edda]' : estado === 'ausente' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                        {estado === 'presente' ? '✓' : estado === 'ausente' ? '✗' : '⏱'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Ficha Alumno */}
      {fichaAbierta && (
        <FichaAlumnoModal
          alumno={fichaAbierta}
          programaId={programa.id}
          onClose={() => setFichaAbierta(null)}
        />
      )}
    </div>
  )
}
