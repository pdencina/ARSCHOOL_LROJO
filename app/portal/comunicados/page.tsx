export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function PortalComunicadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id, rol').eq('id', user!.id).single()
  const u = ur as any

  const { data: recepciones } = await supabase
    .from('comunicado_recepciones')
    .select('*, comunicado:comunicados(*)')
    .order('created_at', { ascending: false })
    .limit(20)

  const pendientes = (recepciones ?? []).filter((r: any) => r.estado === 'enviado').length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Mis comunicados</h1>
        <p className="text-sm text-slate-500 mt-0.5">Mensajes del colegio hacia tu familia</p>
      </div>
      {pendientes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <i className="ti ti-bell text-amber-600 text-xl" aria-hidden="true"/>
          <div>
            <div className="font-semibold text-amber-800 text-sm">Tienes {pendientes} comunicado{pendientes > 1 ? 's' : ''} sin leer</div>
            <div className="text-xs text-amber-600">Por favor revisa y confirma los mensajes pendientes</div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {(!recepciones || recepciones.length === 0) ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <i className="ti ti-mail-opened text-4xl text-slate-300 block mb-3" aria-hidden="true"/>
            <p className="text-slate-400 text-sm">No tienes comunicados recibidos todavía.</p>
          </div>
        ) : (recepciones as any[]).map((r: any) => {
          const com = r.comunicado
          const leido = r.estado !== 'enviado'
          return (
            <div key={r.id} className={`bg-white border rounded-xl p-4 transition-colors ${leido ? 'border-slate-200' : 'border-amber-300 bg-amber-50/30'}`}>
              <div className="flex items-start gap-3">
                {!leido && <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"/>}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-sm ${leido ? 'text-slate-700' : 'text-slate-900'}`}>{com?.titulo}</span>
                    {!leido && <span className="tag bg-amber-100 text-amber-700 text-xs">Sin leer</span>}
                    {r.estado === 'confirmado' && <span className="tag bg-emerald-100 text-emerald-700 text-xs"><i className="ti ti-check text-xs"/> Confirmado</span>}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{com?.contenido}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{com?.enviado_at ? new Date(com.enviado_at).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' }) : ''}</span>
                    {r.estado !== 'confirmado' && (
                      <form action={async () => {
                        'use server'
                        const supabase2 = createClient()
                        await supabase2.from('comunicado_recepciones').update({ estado: 'confirmado', confirmado_at: new Date().toISOString() }).eq('id', r.id)
                        revalidatePath('/portal/comunicados')
                      }}>
                        <button type="submit" className="btn-primary text-xs py-1 px-3">
                          <i className="ti ti-check text-xs" aria-hidden="true"/> Confirmar lectura
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