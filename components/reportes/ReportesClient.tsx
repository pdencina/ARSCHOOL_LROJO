'use client'

import { useState } from 'react'
import { formatMonto } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  stats: {
    totalAlumnos: number
    totalEvaluaciones: number
    totalCobros: number
    totalComunicados: number
    pctAsistenciaGlobal: number | null
    promedioGeneral: number | null
    recaudadoMes: number
    moraMes: number
  }
  cursos: string[]
  meses: { mes: number; anio: number; label: string }[]
  mesActual: { mes: number; anio: number }
  resumenPorCurso: { curso: string; alumnos: number; pctAsistencia: number | null; promedio: number | null }[]
}

const MESES_NOMBRE = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ReportesClient({ stats, cursos, meses, mesActual, resumenPorCurso }: Props) {
  const [mesSel, setMesSel] = useState(`${mesActual.anio}-${mesActual.mes}`)
  const [cursoSel, setCursoSel] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  function getMesAnio() {
    const [a, m] = mesSel.split('-')
    return { mes: parseInt(m), anio: parseInt(a) }
  }

  async function descargar(tipo: string, url: string) {
    setLoading(tipo)
    try {
      window.open(url, '_blank')
      toast.success('Descargando reporte...')
    } finally {
      setTimeout(() => setLoading(null), 1500)
    }
  }

  const { mes, anio } = getMesAnio()
  const mesLabel = `${MESES_NOMBRE[mes]} ${anio}`

  const reportes = [
    {
      id: 'asistencia',
      title: 'Asistencia mensual',
      desc: 'Porcentaje de asistencia por alumno y curso en el período seleccionado',
      icon: 'ti-clipboard-check',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      url: `/api/reportes/asistencia?mes=${mes}&anio=${anio}`,
      extra: mesLabel,
    },
    {
      id: 'calificaciones',
      title: 'Calificaciones',
      desc: 'Notas por alumno, evaluación y materia',
      icon: 'ti-chart-bar',
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      url: `/api/reportes/calificaciones${cursoSel ? `?curso=${encodeURIComponent(cursoSel)}` : ''}`,
      extra: cursoSel || 'Todos los cursos',
    },
    {
      id: 'cobros',
      title: 'Cobranzas',
      desc: 'Estado de pagos, deudores y montos por familia',
      icon: 'ti-cash',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      url: `/api/cobros/exportar?mes=${mes}&anio=${anio}`,
      extra: mesLabel,
    },
    {
      id: 'comunicados',
      title: 'Comunicados',
      desc: 'Tasa de lectura y confirmación por comunicado',
      icon: 'ti-speakerphone',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      url: '/api/reportes/comunicados',
      extra: 'Todos los comunicados',
    },
  ]

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Reportes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Exporta datos del colegio en formato CSV</p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Alumnos activos', val: stats.totalAlumnos, icon: 'ti-users', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Asistencia global', val: stats.pctAsistenciaGlobal != null ? `${stats.pctAsistenciaGlobal}%` : '—', icon: 'ti-clipboard-check', color: stats.pctAsistenciaGlobal != null && stats.pctAsistenciaGlobal < 85 ? 'text-red-600' : 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Recaudado (mes)', val: formatMonto(stats.recaudadoMes), icon: 'ti-cash', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Promedio general', val: stats.promedioGeneral ? stats.promedioGeneral.toFixed(1) : '—', icon: 'ti-chart-bar', color: stats.promedioGeneral != null && stats.promedioGeneral >= 4 ? 'text-emerald-600' : 'text-red-600', bg: 'bg-violet-50' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
              <i className={`ti ${k.icon} ${k.color}`} aria-hidden="true"/>
            </div>
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-value ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Resumen por curso */}
      {resumenPorCurso.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-semibold text-slate-800 mb-3">Resumen por curso</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Curso', 'Alumnos', 'Asistencia', 'Promedio notas'].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resumenPorCurso.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.curso}</td>
                    <td className="px-4 py-3 text-slate-600">{r.alumnos}</td>
                    <td className="px-4 py-3">
                      {r.pctAsistencia != null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full ${r.pctAsistencia >= 85 ? 'bg-emerald-400' : r.pctAsistencia >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${r.pctAsistencia}%` }}/>
                          </div>
                          <span className={`text-xs font-semibold ${r.pctAsistencia >= 85 ? 'text-emerald-600' : r.pctAsistencia >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{r.pctAsistencia}%</span>
                        </div>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.promedio != null ? (
                        <span className={`font-display text-base font-bold ${r.promedio >= 4 ? 'text-emerald-600' : 'text-red-600'}`}>{r.promedio.toFixed(1)}</span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Opciones de exportación */}
      <h2 className="font-display font-semibold text-slate-800 mb-4">Exportar reportes</h2>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mes</label>
          <select value={mesSel} onChange={e => setMesSel(e.target.value)} className="select-base">
            {meses.map(m => (
              <option key={`${m.anio}-${m.mes}`} value={`${m.anio}-${m.mes}`}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Curso (para calificaciones)</label>
          <select value={cursoSel} onChange={e => setCursoSel(e.target.value)} className="select-base">
            <option value="">Todos los cursos</option>
            {cursos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {reportes.map(r => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-11 h-11 rounded-xl ${r.bg} flex items-center justify-center flex-shrink-0`}>
                <i className={`ti ${r.icon} ${r.color} text-lg`} aria-hidden="true"/>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm font-display">{r.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <i className="ti ti-filter text-xs mr-1" aria-hidden="true"/>{r.extra}
                </div>
              </div>
            </div>
            <button
              onClick={() => descargar(r.id, r.url)}
              disabled={loading === r.id}
              className="w-full btn-secondary text-sm justify-center disabled:opacity-60"
            >
              {loading === r.id
                ? <><i className="ti ti-loader animate-spin text-sm" aria-hidden="true"/> Descargando...</>
                : <><i className="ti ti-download text-sm" aria-hidden="true"/> Descargar CSV</>
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
