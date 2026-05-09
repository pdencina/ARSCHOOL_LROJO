'use client'

import { useState } from 'react'
import type { KpiContable, MorosidadMes, CobroConFamilia } from '@/types'
import { formatMonto, formatFecha, ESTADO_CONFIG } from '@/lib/utils'
import MorosidadChart from './MorosidadChart'
import ModalPago from './ModalPago'
import ModalPlan from './ModalPlan'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props {
  cobros: CobroConFamilia[]
  kpis: KpiContable
  historico: MorosidadMes[]
  ultimosPagos: any[]
  mesActual: string
  planes?: any[]
  mes?: number
  anio?: number
  mesesDisponibles?: { mes: number; anio: number }[]
}

type FiltroEstado = 'todos' | 'pagado' | 'mora' | 'pendiente' | 'parcial'

export default function ContableClient({ cobros, kpis, historico, ultimosPagos, mesActual, planes = [], mes, anio, mesesDisponibles = [] }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')
  const [cobroModal, setCobroModal] = useState<CobroConFamilia | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [vista, setVista] = useState<'cobros' | 'deudores' | 'planes'>('cobros')
  const [busqueda, setBusqueda] = useState('')
  const [loadingAvisos, setLoadingAvisos] = useState(false)
  const [planesData, setPlanesData] = useState(planes)

  const cobrosVisibles = cobros
    .filter(c => filtro === 'todos' || c.estado === filtro)
    .filter(c => {
      if (!busqueda) return true
      const fam = c.familia as any
      return `${fam?.apellido_apoderado ?? ''} ${fam?.alumno?.nombre ?? ''} ${fam?.alumno?.apellido ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())
    })

  const deudores = cobros
    .filter(c => ['mora','parcial','pendiente'].includes(c.estado))
    .sort((a: any, b: any) => (b.monto - b.monto_pagado) - (a.monto - a.monto_pagado))

  const pctRecaudado = kpis.proyectado > 0 ? Math.round(kpis.recaudado / kpis.proyectado * 100) : 0

  function cambiarMes(m: number, a: number) {
    router.push(`/contable?mes=${m}&anio=${a}`)
  }

  async function handleAvisos() {
    setLoadingAvisos(true)
    try {
      const res = await fetch('/api/cobros/avisos', { method: 'POST' })
      const data = await res.json()
      toast.success(data.message ?? 'Avisos enviados')
    } catch { toast.error('Error al enviar avisos') }
    finally { setLoadingAvisos(false) }
  }

  function handleExportar() {
    window.open(`/api/cobros/exportar?mes=${mes}&anio=${anio}`, '_blank')
    toast.success('Descargando...')
  }

  async function handleNuevoPlan(plan: any) {
    const res = await fetch('/api/planes-cobro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Error'); return }
    toast.success('Plan creado')
    setPlanesData(p => [...p, data])
    setShowPlanModal(false)
  }

  const kpiData = [
    { label: 'Recaudado',    val: formatMonto(kpis.recaudado),  sub: `${pctRecaudado}% del proyectado`, color: 'text-emerald-400', pct: pctRecaudado, bar: 'bg-emerald-400' },
    { label: 'Por cobrar',   val: formatMonto(kpis.enMora),     sub: `${deudores.length} familia${deudores.length !== 1 ? 's' : ''}`, color: 'text-amber-400', pct: kpis.proyectado > 0 ? Math.round(kpis.enMora/kpis.proyectado*100) : 0, bar: 'bg-amber-400' },
    { label: 'Mora crítica', val: String(kpis.moraCritica),     sub: '+2 meses sin pagar', color: kpis.moraCritica > 0 ? 'text-red-400' : 'text-slate-400', pct: 0, bar: '' },
    { label: 'Al día',       val: String(kpis.familiasAlDia),   sub: `de ${kpis.totalFamilias} familias`, color: 'text-blue-400', pct: kpis.totalFamilias > 0 ? Math.round(kpis.familiasAlDia/kpis.totalFamilias*100) : 0, bar: 'bg-blue-400' },
  ]

  const ESTADO_LABELS: Record<string, string> = {
    pagado: 'Pagado', mora: 'En mora', pendiente: 'Pendiente', parcial: 'Parcial'
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <div className="bg-[#0F1B2D] px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium mb-2">
              <i className="ti ti-cash text-xs" aria-hidden="true"/> Módulo contable
            </div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-bold text-white">Gestión de cobranzas</h2>
              {/* Selector de mes */}
              {mesesDisponibles.length > 0 && (
                <select
                  value={`${anio}-${mes}`}
                  onChange={e => {
                    const [a, m] = e.target.value.split('-')
                    cambiarMes(parseInt(m), parseInt(a))
                  }}
                  className="bg-white/10 text-white text-xs border border-white/20 rounded-lg px-2 py-1 cursor-pointer"
                >
                  {mesesDisponibles.map(md => (
                    <option key={`${md.anio}-${md.mes}`} value={`${md.anio}-${md.mes}`}>
                      {['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][md.mes]} {md.anio}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-white/50 text-sm mt-0.5">{mesActual} · {cobros.length} cobros registrados</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCobroModal({} as any)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-semibold rounded-lg transition-colors">
              <i className="ti ti-plus text-sm" aria-hidden="true"/> Registrar pago
            </button>
            <button onClick={handleAvisos} disabled={loadingAvisos} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60">
              <i className={`ti ${loadingAvisos ? 'ti-loader animate-spin' : 'ti-send'} text-sm`} aria-hidden="true"/>
              {loadingAvisos ? 'Enviando...' : 'Avisos de cobro'}
            </button>
            <button onClick={handleExportar} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors">
              <i className="ti ti-download text-sm" aria-hidden="true"/> Exportar Excel
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          {kpiData.map((k, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-white/40 text-xs mt-0.5">{k.sub}</div>
              {k.pct > 0 && k.bar && (
                <div className="mt-2 bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className={`h-full rounded-full ${k.bar}`} style={{ width: `${Math.min(k.pct, 100)}%` }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-0">
        {[
          { key: 'cobros',   label: 'Estado de cuentas',          icon: 'ti-list' },
          { key: 'deudores', label: `Deudores (${deudores.length})`, icon: 'ti-alert-triangle' },
          { key: 'planes',   label: 'Planes de cobro',             icon: 'ti-settings' },
        ].map(t => (
          <button key={t.key} onClick={() => setVista(t.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${vista === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <i className={`ti ${t.icon} text-sm`} aria-hidden="true"/> {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1">
        {/* Contenido principal */}
        <div className="flex-1 p-5 overflow-auto">

          {/* ESTADO DE CUENTAS */}
          {vista === 'cobros' && (
            <>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input-base pl-9 text-sm" placeholder="Buscar familia o alumno..."/>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(['todos','pagado','mora','pendiente','parcial'] as FiltroEstado[]).map(f => (
                    <button key={f} onClick={() => setFiltro(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {f === 'todos' ? 'Todos' : ESTADO_LABELS[f] ?? f}
                      {f !== 'todos' && (
                        <span className="ml-1 opacity-70">({cobros.filter(c => c.estado === f).length})</span>
                      )}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400 ml-auto">{cobrosVisibles.length} resultado{cobrosVisibles.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Familia / Alumno','Concepto','Monto','Vencimiento','Días mora','Estado','Acción'].map(h => (
                        <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cobrosVisibles.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-14 text-center">
                        <i className="ti ti-inbox text-5xl text-slate-200 block mb-3" aria-hidden="true"/>
                        <p className="text-slate-400 font-medium">
                          {cobros.length === 0
                            ? 'No hay cobros registrados para este mes.'
                            : 'Sin resultados para ese filtro.'}
                        </p>
                        {cobros.length === 0 && (
                          <p className="text-slate-400 text-xs mt-1">
                            Usa el selector de mes arriba para ver períodos anteriores.
                          </p>
                        )}
                      </td></tr>
                    ) : cobrosVisibles.map((cobro: any) => {
                      const fam = cobro.familia
                      const alumno = fam?.alumno
                      const diasMora = cobro.dias_mora ?? (
                        ['mora','parcial','pendiente'].includes(cobro.estado) && cobro.fecha_vencimiento < new Date().toISOString().split('T')[0]
                          ? Math.floor((Date.now() - new Date(cobro.fecha_vencimiento).getTime()) / 86400000)
                          : 0
                      )
                      const pendiente = cobro.monto - cobro.monto_pagado

                      return (
                        <tr key={cobro.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 flex-shrink-0">
                                {fam?.apellido_apoderado?.[0] ?? '?'}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800">Fam. {fam?.apellido_apoderado ?? '—'}</div>
                                <div className="text-xs text-slate-400">
                                  {alumno?.nombre} {alumno?.apellido} · {alumno?.curso ?? '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{cobro.concepto?.nombre ?? 'Mensualidad'}</td>
                          <td className="px-4 py-3">
                            <div className={`font-semibold font-display ${cobro.estado === 'pagado' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {formatMonto(cobro.monto)}
                            </div>
                            {cobro.estado === 'parcial' && (
                              <div className="text-xs text-red-500">Pendiente: {formatMonto(pendiente)}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(cobro.fecha_vencimiento)}</td>
                          <td className="px-4 py-3">
                            {diasMora > 0 ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${diasMora > 60 ? 'text-red-600' : diasMora > 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                                <i className="ti ti-clock text-xs" aria-hidden="true"/>{diasMora}d
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`tag ${cobro.estado === 'pagado' ? 'tag-ok' : cobro.estado === 'mora' ? 'tag-mora' : cobro.estado === 'parcial' ? 'tag-par' : 'tag-pend'}`}>
                              {ESTADO_LABELS[cobro.estado] ?? cobro.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cobro.estado === 'pagado'
                              ? <button onClick={() => toast.success('Boleta generada')} className="text-xs text-blue-600 hover:underline">Ver boleta</button>
                              : <button onClick={() => setCobroModal(cobro)} className="btn-primary text-xs py-1 px-3">Registrar pago</button>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* DEUDORES */}
          {vista === 'deudores' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Familias con deuda pendiente</h3>
                <p className="text-sm text-slate-500">Ordenado por monto pendiente — mayor a menor</p>
              </div>
              {deudores.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-14 text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="text-slate-600 font-semibold">¡No hay familias con deuda este mes!</p>
                  <p className="text-slate-400 text-sm mt-1">Todas las familias están al día en sus pagos.</p>
                </div>
              ) : deudores.map((cobro: any) => {
                const fam = cobro.familia
                const alumno = fam?.alumno
                const pendiente = cobro.monto - cobro.monto_pagado
                const diasMora = cobro.fecha_vencimiento < new Date().toISOString().split('T')[0]
                  ? Math.floor((Date.now() - new Date(cobro.fecha_vencimiento).getTime()) / 86400000)
                  : 0

                return (
                  <div key={cobro.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0 ${
                      diasMora > 60 ? 'bg-red-500' : diasMora > 30 ? 'bg-amber-500' : 'bg-slate-400'
                    }`}>
                      {diasMora > 0 ? `${diasMora}d` : '!'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800">Fam. {fam?.apellido_apoderado}</div>
                      <div className="text-xs text-slate-500">{alumno?.nombre} {alumno?.apellido} · {alumno?.curso}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Venció: {formatFecha(cobro.fecha_vencimiento)} ·
                        {cobro.concepto?.nombre ?? 'Mensualidad'} ·
                        <span className={`ml-1 font-medium ${cobro.estado === 'parcial' ? 'text-amber-600' : 'text-red-600'}`}>
                          {ESTADO_LABELS[cobro.estado] ?? cobro.estado}
                        </span>
                      </div>
                      {cobro.estado === 'parcial' && (
                        <div className="mt-1">
                          <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                            <span>Pagado: {formatMonto(cobro.monto_pagado)}</span>
                            <span>Pendiente: {formatMonto(pendiente)}</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.round(cobro.monto_pagado/cobro.monto*100)}%` }}/>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-display text-lg font-bold ${diasMora > 60 ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatMonto(pendiente)}
                      </div>
                      <div className="text-xs text-slate-400">pendiente</div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => setCobroModal(cobro)} className="btn-primary text-xs py-1 px-3">Registrar pago</button>
                      <button onClick={async () => {
                        const res = await fetch('/api/cobros/avisos', { method: 'POST' })
                        const d = await res.json()
                        toast.success(d.message ?? 'Aviso enviado')
                      }} className="btn-secondary text-xs py-1 px-3">Enviar aviso</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* PLANES */}
          {vista === 'planes' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-800">Planes de cobro</h3>
                  <p className="text-sm text-slate-500">Montos y periodicidad configurados para el colegio</p>
                </div>
                <button onClick={() => setShowPlanModal(true)} className="btn-primary text-sm">
                  <i className="ti ti-plus" aria-hidden="true"/> Nuevo plan
                </button>
              </div>
              {planesData.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <i className="ti ti-settings text-4xl text-slate-300 block mb-3" aria-hidden="true"/>
                  <p className="text-slate-500 text-sm mb-1">No hay planes configurados.</p>
                  <button onClick={() => setShowPlanModal(true)} className="btn-primary mt-2">Crear primer plan</button>
                </div>
              ) : planesData.map((p: any) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{p.nombre}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.periodicidad} · {p.cursos?.join(', ') ?? 'Todos los cursos'}</div>
                    {p.descripcion && <div className="text-xs text-slate-400 mt-0.5">{p.descripcion}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-display text-xl font-bold text-slate-800">{formatMonto(p.monto)}</div>
                    <span className={`tag ${p.activo ? 'tag-ok' : 'tag-gray'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aside */}
        <aside className="w-64 bg-white border-l border-slate-200 p-4 shrink-0">
          <div className="mb-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Morosidad 6 meses</div>
            <MorosidadChart data={historico}/>
          </div>

          {/* Resumen rápido del mes */}
          <div className="mb-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Resumen {mesActual}</div>
            <div className="space-y-2">
              {[
                { label: 'Pagados',   val: cobros.filter(c => c.estado === 'pagado').length,    color: 'text-emerald-600' },
                { label: 'En mora',   val: cobros.filter(c => c.estado === 'mora').length,      color: 'text-red-600' },
                { label: 'Parcial',   val: cobros.filter(c => c.estado === 'parcial').length,   color: 'text-amber-600' },
                { label: 'Pendiente', val: cobros.filter(c => c.estado === 'pendiente').length, color: 'text-slate-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{s.label}</span>
                  <span className={`font-semibold font-display ${s.color}`}>{s.val}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Total</span>
                <span className="font-bold text-slate-800 font-display">{cobros.length}</span>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Acciones rápidas</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { ico: '📩', txt: 'Avisos masivos',   action: handleAvisos },
                { ico: '📊', txt: 'Exportar Excel',   action: handleExportar },
                { ico: '💳', txt: 'Nuevo plan',        action: () => { setVista('planes'); setShowPlanModal(true) } },
                { ico: '➕', txt: 'Registrar pago',   action: () => setCobroModal({} as any) },
              ].map((a, i) => (
                <button key={i} onClick={a.action} className="p-2.5 border border-slate-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="text-lg mb-1">{a.ico}</div>
                  <div className="text-xs text-slate-600 leading-tight font-medium">{a.txt}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Últimos pagos</div>
            {ultimosPagos.length === 0
              ? <p className="text-xs text-slate-400 italic">Sin pagos registrados</p>
              : ultimosPagos.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">Fam. {p.cobro?.familia?.apellido_apoderado ?? '—'}</div>
                    <div className="text-xs text-slate-400">{p.medio_pago ?? 'transferencia'}</div>
                  </div>
                  <div className="text-xs font-bold text-emerald-600">+{formatMonto(p.monto)}</div>
                </div>
              ))
            }
          </div>
        </aside>
      </div>

      {cobroModal && <ModalPago cobro={cobroModal} onClose={() => setCobroModal(null)}/>}
      {showPlanModal && <ModalPlan onClose={() => setShowPlanModal(false)} onGuardar={handleNuevoPlan}/>}
    </div>
  )
}