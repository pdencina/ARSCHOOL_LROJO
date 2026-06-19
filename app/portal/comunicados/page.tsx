export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function PortalComunicadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ur } = await supabase.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const u = ur as any

  // Recepciones del usuario actual con comunicado adjunto
  const { data: recepciones } = await supabase
    .from('comunicado_recepciones')
    .select('*, comunicado:comunicados(*)')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const pendientes = (recepciones ?? []).filter((r: any) => r.estado === 'pendiente').length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a2332]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Comunicados</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">Mensajes del colegio</p>
      </div>
      {pendientes > 0 && (
        <div className="bg-[#fdf8ee] border border-[#fde68a]/50 rounded-xl p-4 mb-4 flex items-center gap-3">
          <i className="ti ti-bell text-[#b8860b] text-lg" aria-hidden="true"/>
          <div>
            <div className="font-semibold text-[#92400e] text-sm">{pendientes} comunicado{pendientes > 1 ? 's' : ''} pendiente{pendientes > 1 ? 's' : ''}</div>
            <div className="text-[11px] text-[#92400e]/70">Revisa y confirma los mensajes</div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {(!recepciones || recepciones.length === 0) ? (
          <div className="bg-white border border-[#e8eaed] rounded-xl p-12 text-center">
            <i className="ti ti-mail-opened text-3xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
            <p className="text-[#9ca3af] text-sm">No tienes comunicados recibidos.</p>
          </div>
        ) : (recepciones as any[]).map((r: any) => {
          const com = r.comunicado
          const leido = r.estado !== 'pendiente'
          return (
            <div key={r.id} className={`bg-white border rounded-xl p-4 transition-colors ${leido ? 'border-[#e8eaed]' : 'border-[#fde68a] bg-[#fdf8ee]/30'}`}>
              <div className="flex items-start gap-3">
                {!leido && <div className="w-2 h-2 bg-[#b8860b] rounded-full mt-2 flex-shrink-0"/>}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-sm ${leido ? 'text-[#4b5563]' : 'text-[#1a2332]'}`}>{com?.titulo}</span>
                    {!leido && <span className="tag bg-[#fdf8ee] text-[#92400e] border border-[#fde68a]/50">Pendiente</span>}
                    {r.estado === 'confirmado' && <span className="tag tag-ok">Confirmado</span>}
                  </div>
                  <p className="text-sm text-[#6b7280] mb-3 line-clamp-3">{com?.contenido}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#9ca3af]">{com?.enviado_at ? new Date(com.enviado_at).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' }) : ''}</span>
                    {r.estado !== 'confirmado' && (
                      <form action={async () => {
                        'use server'
                        const supabase2 = createClient()
                        await supabase2.from('comunicado_recepciones').update({ estado: 'confirmado', confirmado_at: new Date().toISOString() }).eq('id', r.id)
                        revalidatePath('/portal/comunicados')
                      }}>
                        <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                          Confirmar lectura
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
