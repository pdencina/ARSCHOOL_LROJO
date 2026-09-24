'use client'
import { useMemo, useState } from 'react'
import { codigoPrograma } from '@/lib/admisionDocs'
import { DIA_MS, ESTADOS_ABIERTOS, diasEspera } from '@/lib/admisionTiempos'

interface Props {
  preAdmisiones: any[]
  /** id de solicitud -> fecha de la primera respuesta del equipo (historial) */
  primeraRespuesta: Record<string, string>
  /** id de usuario -> nombre */
  equipoMap: Record<string, string>
}

const PERIODOS = [
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
  { dias: 365, label: '12 meses' },
]

const PROGRAMAS = [
  { codigo: 'ar_school', nombre: 'AR School' },
  { codigo: 'play_group', nombre: 'Play Group' },
  { codigo: 'lions_soccer', nombre: 'Lions Soccer School' },
  { codigo: 'ar_worship', nombre: 'AR Worship School' },
  { codigo: 'otros', nombre: 'Otros / sin programa' },
]

const esAprobada = (e: string) => e === 'aprobada' || e === 'matriculada'
const esCerradaNegativa = (e: string) => e === 'rechazada' || e === 'desistida'

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : '—'
}

function dias1(n: number): string {
  return n.toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

/**
 * Indicadores de admisión de la sede: KPIs del período + tablas por programa
 * y por responsable. Todo se calcula con las solicitudes ya cargadas en la página.
 */
export default function IndicadoresAdmision({ preAdmisiones, primeraRespuesta, equipoMap }: Props) {
  const [periodo, setPeriodo] = useState(30)

  const datos = useMemo(() => {
    const ahora = Date.now()
    const desde = ahora - periodo * DIA_MS
    const desdeAnterior = desde - periodo * DIA_MS
    const creada = (pa: any) => new Date(pa.created_at).getTime()

    const actual = preAdmisiones.filter(pa => creada(pa) >= desde)
    const anterior = preAdmisiones.filter(pa => creada(pa) >= desdeAnterior && creada(pa) < desde)

    // Tiempo hasta la primera respuesta del equipo (historial; si no hay, revisado_at)
    const tiempoRespuesta = (lista: any[]) => {
      const tiempos: number[] = []
      let sinRespuesta = 0
      for (const pa of lista) {
        const f = primeraRespuesta[pa.id] ?? (pa.estado !== 'pendiente' ? pa.revisado_at : null)
        if (f) tiempos.push(Math.max(0, (new Date(f).getTime() - creada(pa)) / DIA_MS))
        else sinRespuesta++
      }
      const prom = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null
      return { prom, sinRespuesta }
    }

    const respActual = tiempoRespuesta(actual)
    const respAnterior = tiempoRespuesta(anterior)

    const aprobadas = actual.filter(pa => esAprobada(pa.estado)).length
    const resueltas = actual.filter(pa => esAprobada(pa.estado) || pa.estado === 'rechazada').length
    const matriculadas = actual.filter(pa => pa.estado === 'matriculada').length

    const porPrograma = PROGRAMAS.map(p => {
      const items = actual.filter(pa => codigoPrograma(pa) === p.codigo)
      return {
        ...p,
        recibidas: items.length,
        enCurso: items.filter(pa => ['pendiente', 'en_revision', 'observada'].includes(pa.estado)).length,
        aprobadas: items.filter(pa => pa.estado === 'aprobada').length,
        matriculadas: items.filter(pa => pa.estado === 'matriculada').length,
        cerradas: items.filter(pa => esCerradaNegativa(pa.estado)).length,
      }
    }).filter(p => p.recibidas > 0)

    // Carga por responsable: solicitudes abiertas HOY (no dependen del período)
    const abiertas = preAdmisiones.filter(pa => ESTADOS_ABIERTOS.includes(pa.estado))
    const cargaMap: Record<string, { nombre: string; abiertas: number; atrasadas: number }> = {}
    for (const pa of abiertas) {
      const key = pa.asignado_a || '__sin__'
      const nombre = pa.asignado_a ? (equipoMap[pa.asignado_a] || 'Otro usuario') : 'Sin asignar'
      cargaMap[key] ??= { nombre, abiertas: 0, atrasadas: 0 }
      cargaMap[key].abiertas++
      if (diasEspera(pa) > 7) cargaMap[key].atrasadas++
    }
    const carga = Object.entries(cargaMap)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.id === '__sin__' ? -1 : b.id === '__sin__' ? 1 : b.abiertas - a.abiertas))

    return {
      recibidas: actual.length,
      recibidasAnterior: anterior.length,
      respActual,
      respAnterior,
      aprobadas, resueltas, matriculadas,
      porPrograma,
      carga,
      abiertas: abiertas.length,
      atrasadas: abiertas.filter(pa => diasEspera(pa) > 7).length,
    }
  }, [preAdmisiones, primeraRespuesta, equipoMap, periodo])

  const deltaRecibidas = datos.recibidas - datos.recibidasAnterior
  const deltaRespuesta = datos.respActual.prom != null && datos.respAnterior.prom != null
    ? datos.respActual.prom - datos.respAnterior.prom
    : null
  const nombrePeriodo = PERIODOS.find(p => p.dias === periodo)?.label ?? `${periodo} días`

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-[var(--ar-muted)] mr-1">Período:</span>
        {PERIODOS.map(p => (
          <button key={p.dias} onClick={() => setPeriodo(p.dias)}
            className={`text-[11px] px-3 py-1 rounded-full font-medium transition-colors ${periodo === p.dias ? 'bg-[#1B3A5C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Últimos {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Solicitudes recibidas"
          valor={datos.recibidas.toLocaleString('es-CL')}
          delta={datos.recibidasAnterior > 0 || datos.recibidas > 0
            ? { texto: `${deltaRecibidas >= 0 ? '+' : ''}${deltaRecibidas} vs ${nombrePeriodo} anteriores`, direccion: Math.sign(deltaRecibidas), subirEsBueno: true }
            : null}
        />
        <StatTile
          label="Primera respuesta (promedio)"
          valor={datos.respActual.prom != null ? `${dias1(datos.respActual.prom)} días` : '—'}
          delta={deltaRespuesta != null && Math.abs(deltaRespuesta) >= 0.1
            ? { texto: `${deltaRespuesta > 0 ? '+' : '−'}${dias1(Math.abs(deltaRespuesta))} días vs período anterior`, direccion: Math.sign(deltaRespuesta), subirEsBueno: false }
            : null}
          nota={datos.respActual.sinRespuesta > 0 ? `${datos.respActual.sinRespuesta} aún sin respuesta` : undefined}
        />
        <StatTile
          label="Tasa de aprobación"
          valor={pct(datos.aprobadas, datos.resueltas)}
          nota={datos.resueltas > 0 ? `${datos.aprobadas} de ${datos.resueltas} resueltas` : 'Sin solicitudes resueltas'}
        />
        <StatTile
          label="Aprobadas que se matricularon"
          valor={pct(datos.matriculadas, datos.aprobadas)}
          nota={datos.aprobadas > 0 ? `${datos.matriculadas} de ${datos.aprobadas} aprobadas` : 'Sin aprobadas en el período'}
        />
      </div>

      {/* Estado actual (no depende del período) */}
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border ${datos.atrasadas > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-[#EDF5F0] border-[#2D5A3F]/10 text-[#2D5A3F]'}`}>
        <i className={`ti ${datos.atrasadas > 0 ? 'ti-alert-triangle' : 'ti-circle-check'} text-sm`} aria-hidden="true"/>
        {datos.atrasadas > 0
          ? `Hoy hay ${datos.abiertas} solicitudes abiertas; ${datos.atrasadas} llevan más de 7 días sin avanzar.`
          : `Hoy hay ${datos.abiertas} solicitudes abiertas y ninguna lleva más de 7 días sin avanzar.`}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por programa */}
        <Tabla titulo={`Por programa · últimos ${nombrePeriodo}`}>
          {datos.porPrograma.length === 0 ? (
            <p className="text-xs text-[var(--ar-muted)] px-4 py-6 text-center">Sin solicitudes en el período.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--ar-muted)] border-b border-[var(--ar-border)]">
                  <th className="text-left font-semibold px-4 py-2">Programa</th>
                  <th className="text-right font-semibold px-2 py-2">Recibidas</th>
                  <th className="text-right font-semibold px-2 py-2">En curso</th>
                  <th className="text-right font-semibold px-2 py-2">Aprobadas</th>
                  <th className="text-right font-semibold px-2 py-2">Matric.</th>
                  <th className="text-right font-semibold px-4 py-2" title="Rechazadas o desistidas">Cerradas</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {datos.porPrograma.map(p => (
                  <tr key={p.codigo} className="border-b border-[#f5f6f7] last:border-0">
                    <td className="px-4 py-2 font-medium text-[var(--ar-text)]">{p.nombre}</td>
                    <td className="px-2 py-2 text-right font-semibold text-[var(--ar-text)]">{p.recibidas}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{p.enCurso}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{p.aprobadas}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{p.matriculadas}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{p.cerradas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Tabla>

        {/* Por responsable */}
        <Tabla titulo="Carga por responsable · hoy">
          {datos.carga.length === 0 ? (
            <p className="text-xs text-[var(--ar-muted)] px-4 py-6 text-center">No hay solicitudes abiertas.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--ar-muted)] border-b border-[var(--ar-border)]">
                  <th className="text-left font-semibold px-4 py-2">Responsable</th>
                  <th className="text-right font-semibold px-2 py-2">Abiertas</th>
                  <th className="text-right font-semibold px-4 py-2">Más de 7 días</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {datos.carga.map(c => (
                  <tr key={c.id} className="border-b border-[#f5f6f7] last:border-0">
                    <td className={`px-4 py-2 font-medium ${c.id === '__sin__' ? 'text-slate-500 italic' : 'text-[var(--ar-text)]'}`}>{c.nombre}</td>
                    <td className="px-2 py-2 text-right font-semibold text-[var(--ar-text)]">{c.abiertas}</td>
                    <td className="px-4 py-2 text-right">
                      {c.atrasadas > 0
                        ? <span className="inline-flex items-center gap-1 text-red-700 font-semibold"><i className="ti ti-alert-triangle text-[11px]" aria-hidden="true"/>{c.atrasadas}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Tabla>
      </div>

      <p className="text-[10px] text-[var(--ar-muted)]">
        Primera respuesta: tiempo entre el envío y la primera acción del equipo (revisar, pedir corrección, aprobar o rechazar).
        Tasa de aprobación: aprobadas o matriculadas sobre las resueltas (aprobadas + rechazadas). Las desistidas no cuentan.
      </p>
    </div>
  )
}

function StatTile({ label, valor, delta, nota }: {
  label: string
  valor: string
  delta?: { texto: string; direccion: number; subirEsBueno: boolean } | null
  nota?: string
}) {
  // Color del delta = dirección × si subir es bueno; 0 = neutro
  const bueno = delta ? (delta.direccion === 0 ? null : (delta.direccion > 0) === delta.subirEsBueno) : null
  return (
    <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="text-[11px] text-[var(--ar-muted)] mb-1">{label}</div>
      <div className="text-2xl font-bold text-[var(--ar-text)]" style={{ fontFamily: 'DM Sans' }}>{valor}</div>
      {delta && (
        <div className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${bueno === null ? 'text-slate-500' : bueno ? 'text-[#2D5A3F]' : 'text-red-700'}`}>
          {delta.direccion !== 0 && <i className={`ti ${delta.direccion > 0 ? 'ti-arrow-up-right' : 'ti-arrow-down-right'} text-[11px]`} aria-hidden="true"/>}
          {delta.texto}
        </div>
      )}
      {nota && <div className="text-[10px] text-[var(--ar-muted)] mt-1">{nota}</div>}
    </div>
  )
}

function Tabla({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 py-2.5 border-b border-[var(--ar-border)] text-[12px] font-bold text-[var(--ar-text)]">{titulo}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}
