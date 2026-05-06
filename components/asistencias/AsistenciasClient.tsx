'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props { comunicados: any[]; colegioId: string }

const TIPO_COLOR: Record<string, string> = {
  general:  'bg-azul-claro text-azul',
  cobro:    'bg-amarillo-claro text-yellow-800',
  evento:   'bg-verde-claro text-verde',
  urgente:  'bg-rojo-claro text-rojo',
}
const TIPO_LABEL: Record<string, string> = {
  general: 'General', cobro: 'Cobro', evento: 'Evento', urgente: 'Urgente'
}

export default function ComunicadosClient({ comunicados, colegioId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [tipo, setTipo] = useState('general')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleEnviar() {
    if (!titulo || !contenido) { toast.error('Completa todos los campos'); return }
    setLoading(true)
    const { error } = await supabase.from('comunicados').insert({
      colegio_id: colegioId, titulo, contenido, tipo, enviado_at: new Date().toISOString()
    })
    if (error) { toast.error('Error al enviar'); setLoading(false); return }
    toast.success('Comunicado enviado correctamente')
    setShowModal(false); setTitulo(''); setContenido('')
    setLoading(false)
    window.location.reload()
  }

  function calcStats(recepciones: any[]) {
    const total = recepciones.length
    const confirmados = recepciones.filter(r => r.estado === 'confirmado').length
    const abiertos = recepciones.filter(r => r.estado === 'abierto').length
    const sinAbrir = total - confirmados - abiertos
    return { total, confirmados, abiertos, sinAbrir }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-tinta">Comunicados</h1>
          <p className="text-sm text-tinta-s italic mt-0.5">Mensajes a familias con confirmacion de lectura</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <i className="ti ti-plus text-sm" aria-hidden="true" /> Nuevo comunicado
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total enviados', val: comunicados.length, sub: 'este mes' },
          { label: 'Confirmados', val: comunicados.reduce((a, c) => a + (c.recepciones?.filter((r: any) => r.estado === 'confirmado').length ?? 0), 0), sub: 'familias' },
          { label: 'Sin abrir', val: comunicados.reduce((a, c) => a + (c.recepciones?.filter((r: any) => r.estado === 'enviado').length ?? 0), 0), sub: 'pendientes' },
          { label: 'Tasa lectura', val: comunicados.length ? Math.round((comunicados.reduce((a, c) => a + (c.recepciones?.filter((r: any) => r.estado !== 'enviado').length ?? 0), 0) / Math.max(1, comunicados.reduce((a, c) => a + (c.recepciones?.length ?? 0), 0))) * 100) + '%' : '0%', sub: 'promedio' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-sm p-4">
            <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1">{k.label}</div>
            <div className="font-playfair text-2xl font-bold text-tinta">{k.val}</div>
            <div className="font-mono text-xs text-tinta-s mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {comunicados.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-sm p-12 text-center text-tinta-s">
            <i className="ti ti-speakerphone text-4xl block mb-3 opacity-30" aria-hidden="true" />
            <p className="font-lora italic">No hay comunicados todavia.</p>
          </div>
        ) : comunicados.map((com: any) => {
          const stats = calcStats(com.recepciones ?? [])
          return (
            <div key={com.id} className="bg-white border border-gray-100 rounded-sm p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded bg-azul-claro flex items-center justify-center flex-shrink-0">
                  <i className={`ti ${com.tipo === 'cobro' ? 'ti-cash' : com.tipo === 'evento' ? 'ti-calendar' : com.tipo === 'urgente' ? 'ti-alert-triangle' : 'ti-mail'} text-azul text-lg`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-tinta">{com.titulo}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${TIPO_COLOR[com.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TIPO_LABEL[com.tipo] ?? com.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-tinta-s mb-2 line-clamp-1">{com.contenido}</p>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-tinta-s">{com.enviado_at ? new Date(com.enviado_at).toLocaleDateString('es-CL') : 'Borrador'}</span>
                    {stats.total > 0 && (
                      <>
                        <span className="text-verde"><i className="ti ti-check text-xs" /> {stats.confirmados} confirmados</span>
                        <span className="text-azul"><i className="ti ti-eye text-xs" /> {stats.abiertos} abiertos</span>
                        <span className="text-tinta-s"><i className="ti ti-clock text-xs" /> {stats.sinAbrir} sin abrir</span>
                      </>
                    )}
                  </div>
                </div>
                {stats.total > 0 && (
                  <div className="flex gap-3 flex-shrink-0">
                    {[
                      { pct: stats.total ? Math.round(stats.confirmados / stats.total * 100) : 0, label: 'Conf.', color: '#639922' },
                      { pct: stats.total ? Math.round(stats.abiertos / stats.total * 100) : 0, label: 'Abierto', color: '#378ADD' },
                      { pct: stats.total ? Math.round(stats.sinAbrir / stats.total * 100) : 0, label: 'Sin abrir', color: '#888780' },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono font-semibold" style={{ borderColor: s.color, color: s.color }}>
                          {s.pct}%
                        </div>
                        <div className="text-xs text-tinta-s mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-azul/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-lg shadow-xl overflow-hidden">
            <div className="bg-azul px-5 py-4 flex items-center justify-between">
              <h3 className="font-playfair text-lg font-bold text-white">Nuevo comunicado</h3>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white">
                <i className="ti ti-x text-lg" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="select-base w-full">
                  <option value="general">General</option>
                  <option value="cobro">Cobro</option>
                  <option value="evento">Evento</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">Titulo</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} className="input-base" placeholder="Asunto del comunicado" />
              </div>
              <div>
                <label className="font-mono text-xs tracking-widest uppercase text-tinta-s block mb-1.5">Contenido</label>
                <textarea value={contenido} onChange={e => setContenido(e.target.value)} className="input-base resize-none" rows={4} placeholder="Mensaje para las familias..." />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleEnviar} disabled={loading} className="btn-primary disabled:opacity-60">
                {loading ? 'Enviando...' : 'Enviar a todas las familias'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}