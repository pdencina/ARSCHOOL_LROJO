'use client'

import { useState } from 'react'
import type { KpiContable, MorosidadMes, CobroConFamilia } from '@/types'
import { formatMonto, formatFecha, ESTADO_CONFIG } from '@/lib/utils'
import MorosidadChart from './MorosidadChart'
import ModalPago from './ModalPago'

interface Props {
  cobros: CobroConFamilia[]
  kpis: KpiContable
  historico: MorosidadMes[]
  ultimosPagos: any[]
  mesActual: string
  planes?: any[]
}

type FiltroEstado = 'todos' | 'pagado' | 'mora' | 'pendiente' | 'parcial'

export default function ContableClient({ cobros, kpis, historico, ultimosPagos, mesActual, planes = [] }: Props) {
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')
  const [cobroModal, setCobroModal] = useState<CobroConFamilia | null>(null)
  const [vista, setVista] = useState<'cobros' | 'deudores' | 'planes'>('cobros')
  const [busqueda, setBusqueda] = useState('')

  const cobrosVisibles = cobros
    .filter(c => filtro === 'todos' || c.estado === filtro)
    .filter(c => {
      if (!busqueda) return true
      const fam = c.familia as any
      return `${fam?.apellido_apoderado} ${fam?.alumno?.nombre} ${fam?.alumno?.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
    })

  const deudores = cobros.filter(c => c.estado === 'mora' || c.estado === 'parcial')
    .sort((a, b) => (b.dias_mora ?? 0) - (a.dias_mora ?? 0))

  const pctRecaudado = kpis.proyectado > 0 ? Math.round((kpis.recaudado / kpis.proyectado) * 100) : 0

  const kpiData = [
    { label: 'Recaudado', val: formatMonto(kpis.recaudado), sub: `${pctRecaudado}% del proyectado`, color: 'text-emerald-600', bar: 'bg-emerald-500', pct: pctRecaudado },
    { label: 'En mora', val: formatMonto(kpis.enMora), sub: `${cobros.filter(c => c.estado === 'mora').length} familias`, color: 'text-amber-600', bar: 'bg-amber-500', pct: kpis.proyectado > 0 ? Math.round(kpis.enMora / kpis.proyectado * 100) : 0 },
    { label: 'Mora crítica', val: String(kpis.moraCritica), sub: '+2 meses sin pagar', color: 'text-red-600', bar: 'bg-red-500', pct: 0 },
    { label: 'Al día', val: String(kpis.familiasAlDia), sub: `de ${kpis.totalFamilias} familias`, color: 'text-blue-600', bar: 'bg-blue-500', pct: kpis.totalFamilias > 0 ? Math.round(kpis.familiasAlDia / kpis.totalFamilias * 100) : 0 },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <div className="bg-[#0F1B2D] px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium mb-2">
              <i className="ti ti-cash text-xs" aria-hidden="true"/> Módulo contable
            </div>
            <h2 className="font-display text-xl font-bold text-white">Gestión de cobranzas</h2>
            <p className="text-white/50 text-sm mt-0.5">{mesActual} · {cobros.length} familias registradas</p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-semibold rounded-lg transition-colors" onClick={() => setCobroModal(null)}>
              <i className="ti ti-plus text-sm" aria-hidden="true"/> Registrar pago
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors">
              <i className="ti ti-send text-sm" aria-hidden="true"/> Avisos de cobro
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors">
              <i className="ti ti-download text-sm" aria-hidden="true"/> Exportar Excel
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-3">
          {kpiData.map((k, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-white/40 text-xs mt-0.5">{k.sub}</div>
              {k.pct > 0 && (
                <div className="mt-2 bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className={`h-full rounded-full ${k.bar}`} style={{ width: `${Math.min(k.pct, 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-0">
        {[
          { key: 'cobros', label: 'Estado de cuentas', icon: 'ti-list' },
          { key: 'deudores', label: `Deudores (${deudores.length})`, icon: 'ti-alert-triangle' },
          { key: 'planes', label: 'Planes de cobro', icon: 'ti-settings' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setVista(t.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              vista === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className={`ti ${t.icon} text-sm`} aria-hidden="true"/> {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1">
        {/* Main */}
        <div className="flex-1 p-5 overflow-auto">
          {/* VISTA: COBROS */}
          {vista === 'cobros' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input-base pl-9 text-sm" placeholder="Buscar familia o alumno..."/>
                </div>
                <div className="flex gap-1">
                  {(['todos','pagado','mora','pendiente','parcial'] as FiltroEstado[]).map(f => (
                    <button key={f} onClick={() => setFiltro(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {f === 'todos' ? 'Todos' : ESTADO_CONFIG[f]?.label ?? f}
                    </button>
                  ))}
                </div>
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
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                        {cobros.length === 0 ? 'No hay cobros registrados. Ejecuta el SQL de migración en Supabase.' : 'Sin resultados para ese filtro.'}
                      </td></tr>
                    ) : cobrosVisibles.map((cobro: any) => {
                      const fam = cobro.familia
                      const diasMora = cobro.dias_mora ?? 0
                      return (
                        <tr key={cobro.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">Fam. {fam?.apellido_apoderado}</div>
                            <div className="text-xs text-slate-400">{fam?.alumno?.nombre} {fam?.alumno?.apellido} · {fam?.alumno?.curso}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{cobro.concepto?.nombre ?? 'Mensualidad'}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold font-display ${cobro.estado === 'pagado' ? 'text-emerald-600' : cobro.estado === 'mora' ? 'text-red-600' : 'text-amber-600'}`}>
                              {formatMonto(cobro.monto)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(cobro.fecha_vencimiento)}</td>
                          <td className="px-4 py-3">
                            {diasMora > 0 ? (
                              <span className={`text-xs font-semibold ${diasMora > 60 ? 'text-red-600' : diasMora > 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                                {diasMora}d
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`tag ${cobro.estado === 'pagado' ? 'tag-ok' : cobro.estado === 'mora' ? 'tag-mora' : cobro.estado === 'parcial' ? 'tag-par' : 'tag-pend'}`}>
                              {ESTADO_CONFIG[cobro.estado]?.label ?? cobro.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cobro.estado === 'pagado'
                              ? <button className="text-xs text-blue-600 hover:underline">Boleta</button>
                              : <button onClick={() => setCobroModal(cobro)} className="btn-primary text-xs py-1 px-3">Cobrar</button>
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

          {/* VISTA: DEUDORES */}
          {vista === 'deudores' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Familias en mora</h3>
                <p className="text-sm text-slate-500">Ordenado por días de mora — mayor a menor</p>
              </div>
              {deudores.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-slate-500 text-sm">No hay familias en mora este mes.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deudores.map((cobro: any) => {
                    const fam = cobro.familia
                    const dias = cobro.dias_mora ?? 0
                    return (
                      <div key={cobro.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0 ${dias > 60 ? 'bg-red-500' : dias > 30 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                          {dias}d
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">Fam. {fam?.apellido_apoderado}</div>
                          <div className="text-xs text-slate-500">{fam?.alumno?.nombre} {fam?.alumno?.apellido} · {fam?.alumno?.curso}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Vence: {formatFecha(cobro.fecha_vencimiento)} · {cobro.concepto?.nombre ?? 'Mensualidad'}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-display text-lg font-bold ${dias > 60 ? 'text-red-600' : 'text-amber-600'}`}>{formatMonto(cobro.monto - cobro.monto_pagado)}</div>
                          <div className="text-xs text-slate-400">pendiente</div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button onClick={() => setCobroModal(cobro)} className="btn-primary text-xs py-1 px-3">Registrar pago</button>
                          <button className="btn-secondary text-xs py-1 px-3">Enviar aviso</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA: PLANES */}
          {vista === 'planes' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-800">Planes de cobro</h3>
                  <p className="text-sm text-slate-500">Configura los conceptos de cobro del colegio</p>
                </div>
                <button className="btn-primary text-sm"><i className="ti ti-plus" aria-hidden="true"/> Nuevo plan</button>
              </div>
              {planes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <i className="ti ti-settings text-4xl text-slate-300 block mb-3" aria-hidden="true"/>
                  <p className="text-slate-500 text-sm mb-3">No hay planes configurados todavía.</p>
                  <p className="text-xs text-slate-400">Los planes definen los montos y periodicidad de cobro por curso.</p>
                </div>
              ) : planes.map((p: any) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{p.nombre}</div>
                    <div className="text-xs text-slate-500">{p.periodicidad} · {p.cursos?.join(', ') ?? 'Todos los cursos'}</div>
                  </div>
                  <div className="font-display text-xl font-bold text-slate-800">{formatMonto(p.monto)}</div>
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
          <div className="mb-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Acciones rápidas</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { ico: '🧾', txt: 'Emitir facturas' },
                { ico: '📩', txt: 'Avisos masivos' },
                { ico: '📊', txt: 'Informe caja' },
                { ico: '💳', txt: 'Pago online' },
              ].map((a, i) => (
                <button key={i} className="p-2.5 border border-slate-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="text-lg mb-1">{a.ico}</div>
                  <div className="text-xs text-slate-600 leading-tight font-medium">{a.txt}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">Últimos pagos</div>
            {ultimosPagos.length === 0
              ? <p className="text-xs text-slate-400 italic">Sin pagos aún</p>
              : ultimosPagos.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">Fam. {p.cobro?.familia?.apellido_apoderado}</div>
                    <div className="text-xs text-slate-400">{p.medio_pago}</div>
                  </div>
                  <div className="text-xs font-bold text-emerald-600">+{formatMonto(p.monto)}</div>
                </div>
              ))
            }
          </div>
        </aside>
      </div>

      {cobroModal && <ModalPago cobro={cobroModal} onClose={() => setCobroModal(null)}/>}
    </div>
  )
}