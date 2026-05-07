'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props { comunicados: any[]; colegioId: string; cursos: string[] }

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  general:  { label: 'General',  color: 'text-blue-700',   bg: 'bg-blue-50',   icon: 'ti-mail' },
  cobro:    { label: 'Cobro',    color: 'text-amber-700',  bg: 'bg-amber-50',  icon: 'ti-cash' },
  evento:   { label: 'Evento',   color: 'text-emerald-700',bg: 'bg-emerald-50',icon: 'ti-calendar-event' },
  urgente:  { label: 'Urgente',  color: 'text-red-700',    bg: 'bg-red-50',    icon: 'ti-alert-triangle' },
}

export default function ComunicadosClient({ comunicados, colegioId, cursos }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [detalle, setDetalle] = useState<any>(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState({ titulo: '', contenido: '', tipo: 'general', cursos: [] as string[], urgente: false })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const comunicadosFiltrados = useMemo(() =>
    comunicados.filter(c => {
      const matchTipo = !filtroTipo || c.tipo === filtroTipo
      const matchText = !busqueda || c.titulo.toLowerCase().includes(busqueda.toLowerCase())
      return matchTipo && matchText
    }),
    [comunicados, filtroTipo, busqueda]
  )

  function calcStats(rec: any[]) {
    const total = rec.length
    const conf = rec.filter(r => r.estado === 'confirmado').length
    const abierto = rec.filter(r => r.estado === 'abierto').length
    const sinAbrir = total - conf - abierto
    return { total, conf, abierto, sinAbrir,
      pctConf: total ? Math.round(conf/total*100) : 0,
      pctAbierto: total ? Math.round(abierto/total*100) : 0,
      pctSin: total ? Math.round(sinAbrir/total*100) : 0,
    }
  }

  async function handleEnviar() {
    if (!form.titulo || !form.contenido) { toast.error('Titulo y contenido son requeridos'); return }
    setLoading(true)
    const { error } = await supabase.from('comunicados').insert({
      colegio_id: colegioId,
      titulo: form.titulo,
      contenido: form.contenido,
      tipo: form.urgente ? 'urgente' : form.tipo,
      cursos: form.cursos.length > 0 ? form.cursos : null,
      enviado_at: new Date().toISOString(),
    })
    if (error) { toast.error('Error al enviar comunicado'); setLoading(false); return }
    toast.success('Comunicado enviado a todas las familias')
    setShowModal(false)
    setForm({ titulo: '', contenido: '', tipo: 'general', cursos: [], urgente: false })
    setLoading(false)
    window.location.reload()
  }

  const totalConf = comunicados.reduce((a, c) => a + (c.recepciones?.filter((r: any) => r.estado === 'confirmado').length ?? 0), 0)
  const totalRec  = comunicados.reduce((a, c) => a + (c.recepciones?.length ?? 0), 0)
  const tasaLect  = totalRec ? Math.round(totalConf / totalRec * 100) : 0

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Comunicados</h1>
          <p className="text-sm text-slate-500 mt-0.5">Mensajes a familias con seguimiento de lectura</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nuevo comunicado
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Enviados', val: comunicados.length, sub: 'este periodo', icon: 'ti-send', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Confirmados', val: totalConf, sub: 'familias', icon: 'ti-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Sin abrir', val: comunicados.reduce((a, c) => a + (c.recepciones?.filter((r: any) => r.estado === 'enviado').length ?? 0), 0), sub: 'pendientes', icon: 'ti-mail', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Tasa lectura', val: `${tasaLect}%`, sub: 'promedio global', icon: 'ti-eye', color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${k.icon} ${k.color}`} aria-hidden="true"/>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-400">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="input-base pl-9" placeholder="Buscar comunicado..."/>
        </div>
        <div className="flex gap-1">
          {['', 'general', 'cobro', 'evento', 'urgente'].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroTipo === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t === '' ? 'Todos' : TIPO_CONFIG[t]?.label ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {comunicadosFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <i className="ti ti-speakerphone text-4xl text-slate-300 block mb-3" aria-hidden="true"/>
            <p className="text-slate-400 text-sm">No hay comunicados todavía. Crea el primero.</p>
          </div>
        ) : comunicadosFiltrados.map((com: any) => {
          const stats = calcStats(com.recepciones ?? [])
          const cfg = TIPO_CONFIG[com.tipo] ?? TIPO_CONFIG.general
          return (
            <div key={com.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors cursor-pointer" onClick={() => setDetalle(detalle?.id === com.id ? null : com)}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                  <i className={`ti ${cfg.icon} ${cfg.color}`} aria-hidden="true"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800 text-sm">{com.titulo}</span>
                    <span className={`tag text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {com.cursos && <span className="text-xs text-slate-400">{com.cursos.join(', ')}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mb-2 line-clamp-1">{com.contenido}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">{com.enviado_at ? new Date(com.enviado_at).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' }) : 'Borrador'}</span>
                    {stats.total > 0 && (
                      <>
                        <span className="text-emerald-600 font-medium"><i className="ti ti-check text-xs"/> {stats.conf} confirmados</span>
                        <span className="text-blue-500"><i className="ti ti-eye text-xs"/> {stats.abierto} abiertos</span>
                        <span className="text-slate-400"><i className="ti ti-clock text-xs"/> {stats.sinAbrir} sin abrir</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Mini rings */}
                {stats.total > 0 && (
                  <div className="flex gap-2 flex-shrink-0">
                    {[
                      { pct: stats.pctConf,    label: 'Conf.',   color: '#10B981', bg: '#D1FAE5' },
                      { pct: stats.pctAbierto, label: 'Abierto', color: '#3B82F6', bg: '#DBEAFE' },
                      { pct: stats.pctSin,     label: 'Sin abrir',color: '#94A3B8', bg: '#F1F5F9' },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: s.color, color: s.color, background: s.bg }}>
                          {s.pct}%
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5" style={{ fontSize: '9px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detalle expandido */}
              {detalle?.id === com.id && stats.total > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detalle por familia</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(com.recepciones ?? []).slice(0, 9).map((r: any, i: number) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${r.estado === 'confirmado' ? 'bg-emerald-50' : r.estado === 'abierto' ? 'bg-blue-50' : 'bg-slate-50'}`}>
                        <i className={`ti ${r.estado === 'confirmado' ? 'ti-check text-emerald-500' : r.estado === 'abierto' ? 'ti-eye text-blue-500' : 'ti-clock text-slate-400'} text-xs`} aria-hidden="true"/>
                        <span className="text-slate-600 truncate">Familia {i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal nuevo comunicado */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nuevo comunicado</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo urgente toggle */}
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <input type="checkbox" id="urgente" checked={form.urgente} onChange={e => setForm(p => ({...p, urgente: e.target.checked}))} className="w-4 h-4 accent-red-500"/>
                <label htmlFor="urgente" className="text-sm font-medium text-red-700 cursor-pointer flex items-center gap-1.5">
                  <i className="ti ti-alert-triangle" aria-hidden="true"/> Marcar como urgente
                </label>
              </div>

              {!form.urgente && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
                  <div className="flex gap-2">
                    {['general','cobro','evento'].map(t => {
                      const cfg = TIPO_CONFIG[t]
                      return (
                        <button key={t} onClick={() => setForm(p => ({...p, tipo: t}))}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.tipo === t ? `${cfg.bg} ${cfg.color} border-current` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <i className={`ti ${cfg.icon} block text-lg mb-0.5`} aria-hidden="true"/>{cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Título</label>
                <input value={form.titulo} onChange={e => setForm(p => ({...p, titulo: e.target.value}))} className="input-base" placeholder="Asunto del comunicado"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mensaje</label>
                <textarea value={form.contenido} onChange={e => setForm(p => ({...p, contenido: e.target.value}))} className="input-base resize-none" rows={4} placeholder="Escribe el mensaje para las familias..."/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dirigido a (opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {cursos.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, cursos: p.cursos.includes(c) ? p.cursos.filter(x => x !== c) : [...p.cursos, c] }))}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.cursos.includes(c) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                      {c}
                    </button>
                  ))}
                  {cursos.length === 0 && <span className="text-xs text-slate-400">Sin cursos registrados</span>}
                </div>
                <p className="text-xs text-slate-400 mt-1">{form.cursos.length === 0 ? 'Se enviará a todos los cursos' : `Enviando a: ${form.cursos.join(', ')}`}</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleEnviar} disabled={loading} className={`btn-primary disabled:opacity-60 ${form.urgente ? 'bg-red-500 hover:bg-red-600' : ''}`}>
                {loading ? 'Enviando...' : `Enviar${form.urgente ? ' urgente' : ''} a familias`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}