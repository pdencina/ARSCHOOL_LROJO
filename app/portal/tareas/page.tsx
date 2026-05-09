export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PortalTareasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ur } = await supabase.from('usuarios').select('colegio_id, rol').eq('id', user.id).single()
  const u = ur as any
  if (u?.rol !== 'alumno') redirect('/portal')

  const { data: va } = await supabase.from('usuario_alumno').select('alumno_id, alumno:alumnos(curso)').eq('usuario_id', user.id).single()
  const alumnoId = (va as any)?.alumno_id
  const curso = (va as any)?.alumno?.curso ?? ''

  const { data: tareas } = await supabase
    .from('tareas')
    .select('*')
    .eq('colegio_id', u.colegio_id)
    .eq('curso', curso)
    .order('fecha_entrega', { ascending: true })

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Mis tareas</h1>
        <p className="text-sm text-slate-500 mt-0.5">{curso} · Actividades y trabajos pendientes</p>
      </div>

      {(!tareas || tareas.length === 0) ? (
        <div className="bg-white border border-slate-200 rounded-xl p-14 text-center">
          <i className="ti ti-checklist text-5xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-500">No hay tareas asignadas todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(tareas as any[]).map((t: any) => {
            const vencida = t.fecha_entrega < hoy && t.estado === 'activa'
            return (
              <div key={t.id} className={`bg-white border rounded-xl p-4 ${vencida ? 'border-red-200' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.estado === 'revisada' ? 'bg-emerald-50' : vencida ? 'bg-red-50' : 'bg-blue-50'
                  }`}>
                    <i className={`ti ${t.estado === 'revisada' ? 'ti-check text-emerald-600' : vencida ? 'ti-alert-triangle text-red-600' : 'ti-clipboard-list text-blue-600'} text-base`} aria-hidden="true"/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{t.titulo}</span>
                      <span className="tag tag-gray text-xs">{t.materia}</span>
                      {vencida && <span className="tag bg-red-50 text-red-700 text-xs">Vencida</span>}
                      {t.estado === 'revisada' && <span className="tag tag-ok text-xs">Revisada</span>}
                    </div>
                    {t.descripcion && <p className="text-sm text-slate-600 mb-2">{t.descripcion}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span><i className="ti ti-calendar text-xs mr-1" aria-hidden="true"/>
                        Entrega: {new Date(t.fecha_entrega + 'T12:00').toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' })}
                      </span>
                      {t.puntaje_max && <span><i className="ti ti-star text-xs mr-1" aria-hidden="true"/>Puntaje máx: {t.puntaje_max}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}