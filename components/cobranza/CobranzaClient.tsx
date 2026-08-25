'use client'

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const SEMAFORO_CONFIG: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  verde:    { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Al día', emoji: '🟢' },
  amarillo: { color: 'text-yellow-700',  bg: 'bg-yellow-100',  label: 'Próximo a vencer', emoji: '🟡' },
  naranja:  { color: 'text-orange-700',  bg: 'bg-orange-100',  label: '1-15 días atraso', emoji: '🟠' },
  rojo:     { color: 'text-red-700',     bg: 'bg-red-100',     label: '+15 días atraso', emoji: '🔴' },
}

interface Props {
  cobros: any[]
  logReciente: any[]
  anio: number
  pagosConVoucher?: any[]
}

export default function CobranzaClient({ cobros, logReciente, anio, pagosConVoucher = [] }: Props) {
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('')
  const [filtroCurso, setFiltroCurso] = useState<string>('')
  const [vista, setVista] = useState<'tabla' | 'log'>('tabla')

  // KPIs
  const totalAlumnos = new Set(cobros.map(c => c.alumno_id)).size
  const totalCuotas = cobros.length
  const cuotasPendientes = cobros.filter(c => c.estado !== 'pagado').length
  const totalRecaudado = cobros.filter(c => c.estado === 'pagado').reduce((a: number, c: any) => a + c.monto, 0)
  const totalPorRecaudar = cobros.filter(c => c.estado !== 'pagado').reduce((a: number, c: any) => a + (c.monto - (c.monto_pagado ?? 0)), 0)
  const totalMorosidad = cobros.filter(c => c.estado === 'mora').reduce((a: number, c: any) => a + (c.monto - (c.monto_pagado ?? 0)), 0)
  const alumnosConDeuda = new Set(cobros.filter(c => c.estado === 'mora').map(c => c.alumno_id)).size
  const pctMorosidad = totalCuotas > 0 ? Math.round(cobros.filter(c => c.estado === 'mora').length / totalCuotas * 100) : 0

  // Pagos del mes actual
  const mesActual = new Date().getMonth() + 1
  const cobrosMes = cobros.filter(c => c.mes === mesActual)
  const recaudadoMes = cobrosMes.filter(c => c.estado === 'pagado').reduce((a: number, c: any) => a + c.monto, 0)

  // Semáforo resumen
  const semaforo = {
    verde: cobros.filter(c => (c.semaforo === 'verde' || !c.semaforo) && c.estado === 'pagado').length,
    amarillo: cobros.filter(c => c.semaforo === 'amarillo').length,
    naranja: cobros.filter(c => c.semaforo === 'naranja').length,
    rojo: cobros.filter(c => c.semaforo === 'rojo').length,
  }

  // Cursos únicos
  const cursos = [...new Set(cobros.map(c => c.alumno?.curso).filter(Boolean))].sort()

  // Filtrar cobros pendientes/mora para la tabla
  const cobrosFiltrados = useMemo(() => {
    let filtered = cobros.filter(c => c.estado !== 'pagado')
    if (filtroSemaforo) filtered = filtered.filter(c => c.semaforo === filtroSemaforo)
    if (filtroCurso) filtered = filtered.filter(c => c.alumno?.curso === filtroCurso)
    return filtered.sort((a: any, b: any) => (b.dias_atraso ?? 0) - (a.dias_atraso ?? 0))
  }, [cobros, filtroSemaforo, filtroCurso])

  // Ranking de cursos con mayor morosidad
  const rankingCursos = useMemo(() => {
    const porCurso: Record<string, { mora: number; total: number; monto: number }> = {}
    cobros.forEach((c: any) => {
      const curso = c.alumno?.curso ?? 'Sin curso'
      if (!porCurso[curso]) porCurso[curso] = { mora: 0, total: 0, monto: 0 }
      porCurso[curso].total++
      if (c.estado === 'mora') {
        porCurso[curso].mora++
        porCurso[curso].monto += (c.monto - (c.monto_pagado ?? 0))
      }
    })
    return Object.entries(porCurso)
      .map(([curso, data]) => ({ curso, ...data, pct: data.total > 0 ? Math.round(data.mora / data.total * 100) : 0 }))
      .filter(r => r.mora > 0)
      .sort((a, b) => b.pct - a.pct)
  }, [cobros])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Panel de Cobranza {anio}</h1>
          <p className="page-subtitle">Control de pagos, morosidad y seguimiento financiero</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVista('tabla')} className={`text-[12px] px-3 py-1.5 rounded-lg font-medium ${vista === 'tabla' ? 'bg-[#1a2332] text-white' : 'bg-slate-100 text-slate-600'}`}>
            Cobros
          </button>
          <button onClick={() => setVista('log')} className={`text-[12px] px-3 py-1.5 rounded-lg font-medium ${vista === 'log' ? 'bg-[#1a2332] text-white' : 'bg-slate-100 text-slate-600'}`}>
            Actividad
          </button>
        </div>
      </div>

      {/* KPIs ejecutivos */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="kpi-card"><div className="kpi-label">Recaudado {anio}</div><div className="kpi-value text-emerald-600">${totalRecaudado.toLocaleString('es-CL')}</div><div className="kpi-sub">{cobros.filter(c => c.estado === 'pagado').length} cuotas pagadas</div></div>
        <div className="kpi-card"><div className="kpi-label">Por recaudar</div><div className="kpi-value text-[#1a2332]">${totalPorRecaudar.toLocaleString('es-CL')}</div><div className="kpi-sub">{cuotasPendientes} cuotas pendientes</div></div>
        <div className="kpi-card"><div className="kpi-label">Morosidad</div><div className="kpi-value text-red-600">${totalMorosidad.toLocaleString('es-CL')}</div><div className="kpi-sub">{alumnosConDeuda} alumno{alumnosConDeuda !== 1 ? 's' : ''} · {pctMorosidad}%</div></div>
        <div className="kpi-card"><div className="kpi-label">Mes actual</div><div className="kpi-value text-blue-600">${recaudadoMes.toLocaleString('es-CL')}</div><div className="kpi-sub">{MESES[mesActual - 1]} — {cobrosMes.filter(c => c.estado === 'pagado').length}/{cobrosMes.length}</div></div>
      </div>

      {/* Semáforo visual */}
      <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4 mb-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Semáforo de morosidad</div>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(SEMAFORO_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFiltroSemaforo(filtroSemaforo === key ? '' : key)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${filtroSemaforo === key ? `${cfg.bg} border-current ${cfg.color}` : 'border-transparent hover:bg-slate-50'}`}
            >
              <span className="text-xl">{cfg.emoji}</span>
              <div className="text-left">
                <div className={`text-[18px] font-bold ${cfg.color}`}>{semaforo[key as keyof typeof semaforo]}</div>
                <div className="text-[10px] text-slate-500">{cfg.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {vista === 'tabla' && (
        <>
          {/* Filtros */}
          <div className="flex gap-2 mb-4 items-center">
            <select value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)} className="select-base text-[12px]">
              <option value="">Todos los cursos</option>
              {cursos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(filtroSemaforo || filtroCurso) && (
              <button onClick={() => { setFiltroSemaforo(''); setFiltroCurso('') }} className="text-[11px] text-[#6b7280] hover:text-[#1a2332]">
                Limpiar filtros ✕
              </button>
            )}
            <span className="text-[11px] text-[#9ca3af] ml-auto">{cobrosFiltrados.length} cobros pendientes</span>
          </div>

          {/* Tabla principal */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                  {['', 'Alumno', 'Apoderado', 'Curso', 'Cuota', 'Monto', 'Vencimiento', 'Atraso', 'Estado'].map(h => (
                    <th key={h} className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wider px-3 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cobrosFiltrados.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-[#9ca3af] text-sm">
                    <i className="ti ti-mood-happy text-2xl block mb-2" aria-hidden="true"/>
                    No hay cobros pendientes{filtroSemaforo ? ` con semáforo ${filtroSemaforo}` : ''}
                  </td></tr>
                ) : cobrosFiltrados.slice(0, 50).map((c: any) => {
                  const sem = SEMAFORO_CONFIG[c.semaforo ?? 'verde']
                  return (
                    <tr key={c.id} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc]">
                      <td className="px-3 py-2.5"><span className="text-base">{sem.emoji}</span></td>
                      <td className="px-3 py-2.5 font-medium text-[#1a2332]">{c.alumno?.nombre} {c.alumno?.apellido}</td>
                      <td className="px-3 py-2.5 text-[#6b7280]">{c.familia?.nombre_apoderado} {c.familia?.apellido_apoderado}</td>
                      <td className="px-3 py-2.5 text-[#6b7280]">{c.alumno?.curso}</td>
                      <td className="px-3 py-2.5">{MESES[(c.mes ?? 1) - 1]}</td>
                      <td className="px-3 py-2.5 font-bold text-[#1a2332]">${(c.monto - (c.monto_pagado ?? 0)).toLocaleString('es-CL')}</td>
                      <td className="px-3 py-2.5 text-[#6b7280]">{new Date(c.fecha_vencimiento + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</td>
                      <td className="px-3 py-2.5">
                        {(c.dias_atraso ?? 0) > 0 ? (
                          <span className={`font-bold ${(c.dias_atraso ?? 0) > 15 ? 'text-red-600' : 'text-orange-600'}`}>{c.dias_atraso} días</span>
                        ) : (
                          <span className="text-[#9ca3af]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${sem.bg} ${sem.color}`}>{c.estado}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Ranking de cursos */}
          {rankingCursos.length > 0 && (
            <div className="mt-6 bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Ranking morosidad por curso</div>
              <div className="space-y-2">
                {rankingCursos.slice(0, 8).map((r, i) => (
                  <div key={r.curso} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-[#9ca3af] w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-[#1a2332]">{r.curso}</span>
                        <span className="text-[11px] text-red-600 font-bold">{r.pct}% · ${r.monto.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(r.pct, 100)}%` }}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Vista: Log de actividad */}
      {vista === 'log' && (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Actividad reciente de cobranza</div>
          {logReciente.length === 0 ? (
            <p className="text-[#9ca3af] text-sm text-center py-8">Sin actividad registrada aún. El cron de cobranza se ejecuta diariamente.</p>
          ) : (
            <div className="space-y-2">
              {logReciente.map((log: any) => {
                const icons: Record<string, string> = {
                  recordatorio_pre_vencimiento: 'ti-bell text-blue-500',
                  recordatorio_post_vencimiento: 'ti-alert-triangle text-orange-500',
                  pago_confirmado: 'ti-check text-emerald-500',
                  cobro_generado: 'ti-file-plus text-violet-500',
                  estado_actualizado: 'ti-refresh text-slate-500',
                  alerta_admin: 'ti-bell-ringing text-red-500',
                  contrato_firmado: 'ti-signature text-blue-600',
                  matricula_pagada: 'ti-cash text-emerald-600',
                }
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-[#f5f6f7] last:border-0">
                    <i className={`ti ${icons[log.tipo] ?? 'ti-point text-slate-400'} text-sm mt-0.5`} aria-hidden="true"/>
                    <div className="flex-1">
                      <div className="text-[12px] text-[#1a2332]">{log.detalle}</div>
                      <div className="text-[10px] text-[#9ca3af]">{new Date(log.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Comprobantes de transferencia por revisar */}
      {pagosConVoucher.length > 0 && (
        <div className="mt-6 bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3 border-b border-[var(--ar-border)] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--ar-text)]">
              <i className="ti ti-receipt text-sm mr-1.5" aria-hidden="true"/>Comprobantes de transferencia
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{pagosConVoucher.length} por revisar</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {pagosConVoucher.map((p: any) => (
              <div key={p.id} className="p-4 flex gap-4 hover:bg-gray-50">
                {/* Voucher image */}
                {p.referencia && (
                  <a href={p.referencia} target="_blank" className="flex-shrink-0">
                    <img src={p.referencia} alt="Comprobante" className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"/>
                  </a>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--ar-text)]">
                    {p.cobro?.alumno?.nombre} {p.cobro?.alumno?.apellido}
                  </div>
                  <div className="text-[10px] text-[var(--ar-muted)]">
                    {p.cobro?.familia?.nombre_apoderado} · {p.cobro?.alumno?.curso}
                  </div>
                  <div className="text-xs font-bold text-[#2D5A3F] mt-1">
                    ${p.monto?.toLocaleString('es-CL')} CLP
                  </div>
                  <div className="text-[9px] text-[var(--ar-muted)] mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-1.5">
                  {p.referencia && (
                    <a href={p.referencia} target="_blank" className="text-[10px] text-[var(--ar-accent)] hover:underline font-medium">
                      Ver comprobante →
                    </a>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('¿Confirmar este pago como recibido?')) return
                      try {
                        const res = await fetch('/api/pagos/confirmar', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ pago_id: p.id, cobro_id: p.cobro_id }),
                        })
                        if (res.ok) { toast.success('Pago confirmado'); window.location.reload() }
                        else toast.error('Error al confirmar')
                      } catch { toast.error('Error') }
                    }}
                    className="text-[10px] bg-[#2D5A3F] text-white px-2.5 py-1 rounded-md font-semibold hover:bg-[#245234]"
                  >
                    ✓ Confirmar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
