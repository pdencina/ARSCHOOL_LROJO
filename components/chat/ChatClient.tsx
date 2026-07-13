'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface Props {
  userId: string
  usuario: any
  apoderados: any[]
  cursos: string[]
}

export default function ChatClient({ userId, usuario, apoderados, cursos }: Props) {
  const [conversaciones, setConversaciones] = useState<any[]>([])
  const [convActiva, setConvActiva] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<any[]>([])
  const [convInfo, setConvInfo] = useState<any>(null)
  const [nuevoMsg, setNuevoMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNueva, setShowNueva] = useState(false)
  const [sending, setSending] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar conversaciones
  useEffect(() => {
    fetchConversaciones()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  // Polling de mensajes cada 5s
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (convActiva) {
      fetchMensajes(convActiva)
      pollingRef.current = setInterval(() => fetchMensajes(convActiva), 5000)
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [convActiva])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function fetchConversaciones() {
    setLoading(true)
    const res = await fetch('/api/chat')
    if (res.ok) setConversaciones(await res.json())
    setLoading(false)
  }

  async function fetchMensajes(convId: string) {
    const res = await fetch(`/api/chat/${convId}`)
    if (res.ok) {
      const data = await res.json()
      setMensajes(data.mensajes)
      setConvInfo(data.conversacion)
    }
  }

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoMsg.trim() || !convActiva) return
    setSending(true)
    const res = await fetch(`/api/chat/${convActiva}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido: nuevoMsg }),
    })
    if (res.ok) {
      setNuevoMsg('')
      await fetchMensajes(convActiva)
      fetchConversaciones()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Error al enviar')
    }
    setSending(false)
  }

  async function handleNuevaConv(tipo: string, participanteId?: string, curso?: string) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, participante_id: participanteId, curso }),
    })
    if (res.ok) {
      const conv = await res.json()
      setShowNueva(false)
      await fetchConversaciones()
      setConvActiva(conv.id)
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Error')
    }
  }

  async function toggleChat() {
    if (!convActiva || !convInfo) return
    const res = await fetch(`/api/chat/${convActiva}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_habilitado: !convInfo.chat_habilitado }),
    })
    if (res.ok) {
      const data = await res.json()
      setConvInfo(data)
      toast.success(data.chat_habilitado ? 'Chat habilitado' : 'Chat deshabilitado')
    }
  }

  function getNombreConv(conv: any) {
    if (conv.tipo === 'curso') return conv.titulo ?? `Chat ${conv.curso}`
    const otro = conv.participantes?.find((p: any) => p.nombre !== usuario.nombre || p.apellido !== usuario.apellido)
    return otro ? `${otro.nombre} ${otro.apellido}` : 'Conversación'
  }

  const isStaff = ['super_admin', 'admin', 'tutor'].includes(usuario?.rol)

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Panel izquierdo: conversaciones */}
      <div className="w-80 border-r border-[var(--ar-border)] bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-[var(--ar-border)] flex items-center justify-between">
          <h2 className="font-semibold text-[#1a2332] text-[14px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Mensajes</h2>
          {isStaff && (
            <button onClick={() => setShowNueva(true)} className="w-7 h-7 rounded-lg bg-[#f3f4f6] flex items-center justify-center hover:bg-[#e8eaed] transition-colors">
              <i className="ti ti-plus text-[13px] text-[#6b7280]" aria-hidden="true"/>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[#9ca3af] text-xs">Cargando...</div>
          ) : conversaciones.length === 0 ? (
            <div className="p-6 text-center">
              <i className="ti ti-messages text-2xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
              <p className="text-[#9ca3af] text-xs">Sin conversaciones</p>
            </div>
          ) : conversaciones.map(conv => (
            <button key={conv.id} onClick={() => setConvActiva(conv.id)}
              className={`w-full px-4 py-3 flex items-start gap-3 text-left border-b border-[#f3f4f6] transition-colors ${
                convActiva === conv.id ? 'bg-[#f0f4f8]' : 'hover:bg-[#f9fafb]'
              }`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                conv.tipo === 'curso' ? 'bg-[#fdf8ee] text-[#92400e]' : 'bg-[#f0f4f8] text-[#2c4a6e]'
              }`}>
                {conv.tipo === 'curso' ? <i className="ti ti-users text-sm" aria-hidden="true"/> : getNombreConv(conv).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#1a2332] truncate">{getNombreConv(conv)}</span>
                  {conv.no_leidos > 0 && (
                    <span className="bg-[var(--ar-accent)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{conv.no_leidos}</span>
                  )}
                </div>
                {conv.ultimo_mensaje && (
                  <p className="text-[11px] text-[#9ca3af] truncate mt-0.5">{conv.ultimo_mensaje.contenido}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho: mensajes */}
      <div className="flex-1 flex flex-col bg-[#f8f9fb]">
        {!convActiva ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <i className="ti ti-message-2 text-4xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
              <p className="text-[#9ca3af] text-sm">Selecciona una conversación</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div className="px-5 py-3 bg-white border-b border-[var(--ar-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-[#1a2332] text-[14px]">
                  {convInfo?.titulo ?? (convInfo?.tipo === 'curso' ? `Chat ${convInfo?.curso}` : 'Conversación')}
                </div>
                {convInfo && !convInfo.chat_habilitado && (
                  <span className="tag tag-mora text-[10px]">Chat deshabilitado</span>
                )}
              </div>
              {isStaff && convInfo && (
                <button onClick={toggleChat}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
                    convInfo.chat_habilitado
                      ? 'border-red-200 text-[#c53030] hover:bg-red-50'
                      : 'border-emerald-200 text-[#1a7a4c] hover:bg-emerald-50'
                  }`}>
                  {convInfo.chat_habilitado ? 'Deshabilitar chat' : 'Habilitar chat'}
                </button>
              )}
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {mensajes.map(msg => {
                const esMio = msg.autor_id === userId
                return (
                  <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${esMio ? 'order-2' : ''}`}>
                      {!esMio && (
                        <div className="text-[10px] text-[#9ca3af] mb-0.5 ml-1">
                          {msg.autor?.nombre} {msg.autor?.apellido}
                        </div>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] ${
                        esMio
                          ? 'bg-[#1a2332] text-white rounded-br-md'
                          : 'bg-white border border-[#e8eaed] text-[#1a2332] rounded-bl-md'
                      }`}>
                        {msg.contenido}
                      </div>
                      <div className={`text-[9px] text-[#b0b7c3] mt-0.5 ${esMio ? 'text-right mr-1' : 'ml-1'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={msgEndRef}/>
            </div>

            {/* Input */}
            {convInfo?.chat_habilitado !== false ? (
              <form onSubmit={handleEnviar} className="px-5 py-3 bg-white border-t border-[var(--ar-border)]">
                <div className="flex items-center gap-2">
                  <input
                    value={nuevoMsg}
                    onChange={e => setNuevoMsg(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="input-base flex-1"
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending || !nuevoMsg.trim()} className="btn-primary px-4 disabled:opacity-40">
                    <i className="ti ti-send text-sm" aria-hidden="true"/>
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-5 py-3 bg-[#f9fafb] border-t border-[var(--ar-border)] text-center text-[12px] text-[#9ca3af]">
                Este chat ha sido deshabilitado por administración
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal nueva conversación */}
      {showNueva && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#1a2332] px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-[14px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Nueva conversación</h3>
              <button onClick={() => setShowNueva(false)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Chat individual</div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {apoderados.map(ap => (
                    <button key={ap.id} onClick={() => handleNuevaConv('individual', ap.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f3f4f6] transition-colors text-left">
                      <div className="w-7 h-7 rounded-full bg-[#f0f4f8] flex items-center justify-center text-[10px] font-bold text-[#2c4a6e]">
                        {ap.nombre?.[0]}{ap.apellido?.[0]}
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-[#1a2332]">{ap.nombre} {ap.apellido}</div>
                        <div className="text-[10px] text-[#9ca3af]">{ap.email}</div>
                      </div>
                    </button>
                  ))}
                  {apoderados.length === 0 && <p className="text-[12px] text-[#9ca3af] text-center py-4">No hay apoderados registrados</p>}
                </div>
              </div>

              <div className="border-t border-[#f3f4f6] pt-4">
                <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Chat grupal por curso</div>
                <div className="flex flex-wrap gap-2">
                  {cursos.map(c => (
                    <button key={c} onClick={() => handleNuevaConv('curso', undefined, c)}
                      className="px-3 py-2 rounded-lg border border-[#e8eaed] text-[12px] font-medium text-[#4b5563] hover:border-[#b8860b] hover:bg-[#fdf8ee] transition-all">
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
