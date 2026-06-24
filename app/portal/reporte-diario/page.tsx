export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const metadata = { title: 'Reporte del día — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ALIMENTACION_LABEL: Record<string, string> = { todo: 'Todo', casi_todo: 'Casi todo', poco: 'Poco', nada: 'Nada', no_aplica: '—' }
const ANIMO_LABEL: Record<string, { label: string; icon: string }> = {
  feliz: { label: 'Feliz', icon: '😊' }, tranquilo: { label: 'Tranquilo', icon: '😌' },
  irritable: { label: 'Irritable', icon: '😤' }, lloron: { label: 'Llorón', icon: '😢' },
  variable: { label: 'Variable', icon: '🔄' },
}

export default async function PortalReporteDiarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = (ur as any)?.rol

  let alumnoIds: string[] = []
  if (rol === 'alumno') {
    const { data } = await admin.from('usuario_alumno').select('alumno_id').eq('usuario_id', user.id)
    alumnoIds = (data ?? []).map((r: any) => r.alumno_id)
  } else {
    const { data } = await admin.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id)
    alumnoIds = (data ?? []).map((r: any) => r.alumno_id)
  }

  if (alumnoIds.length === 0) {
    return (
      <div className="p-6">
        <h1 className="page-title">Reporte del día</h1>
        <div className="mt-8 bg-white border border-[var(--ar-border)] rounded-xl p-10 text-center">
          <i className="ti ti-clipboard-heart text-3xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
          <p className="text-[#9ca3af] text-sm">No hay alumnos vinculados.</p>
        </div>
      </div>
    )
  }

  const { data: reportes } = await admin
    .from('reportes_diarios')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .in('alumno_id', alumnoIds)
    .eq('publicado', true)
    .order('fecha', { ascending: false })
    .limit(14)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="page-title">Reporte del día</h1>
        <p className="page-subtitle">Cómo estuvo tu hijo/a en el colegio</p>
      </div>

      {(!reportes || reportes.length === 0) ? (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-12 text-center">
          <i className="ti ti-clipboard-heart text-3xl text-[#d1d5db] block mb-3" aria-hidden="true"/>
          <p className="text-[#9ca3af] text-sm">Aún no hay reportes publicados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(reportes as any[]).map((r: any) => {
            const animo = ANIMO_LABEL[r.estado_animo] ?? { label: '—', icon: '' }
            return (
              <div key={r.id} className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-[#f9fafb] border-b border-[var(--ar-border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#f0f4f8] flex items-center justify-center text-[11px] font-bold text-[#2c4a6e]">
                      {r.alumno?.nombre?.[0]}{r.alumno?.apellido?.[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1a2332] text-[13px]">{r.alumno?.nombre} {r.alumno?.apellido}</div>
                      <div className="text-[11px] text-[#9ca3af]">{r.alumno?.curso}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#9ca3af]">
                    {new Date(r.fecha + 'T12:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                </div>

                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Alimentación */}
                  <div>
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Alimentación</div>
                    <div className="space-y-1 text-[12px] text-[#4b5563]">
                      {r.desayuno !== 'no_aplica' && <div>Desayuno: <strong>{ALIMENTACION_LABEL[r.desayuno]}</strong></div>}
                      {r.almuerzo !== 'no_aplica' && <div>Almuerzo: <strong>{ALIMENTACION_LABEL[r.almuerzo]}</strong></div>}
                      {r.snack !== 'no_aplica' && <div>Snack: <strong>{ALIMENTACION_LABEL[r.snack]}</strong></div>}
                    </div>
                  </div>

                  {/* Siesta */}
                  <div>
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Siesta</div>
                    <div className="text-[12px] text-[#4b5563]">
                      {r.siesta ? `Durmió ${r.siesta_minutos ?? 0} min` : 'No durmió'}
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Estado</div>
                    <div className="text-[12px] text-[#4b5563]">{animo.icon} {animo.label}</div>
                  </div>

                  {/* Higiene */}
                  <div>
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">Higiene</div>
                    <div className="text-[12px] text-[#4b5563] space-y-0.5">
                      {r.cambios_panal > 0 && <div>{r.cambios_panal} cambio{r.cambios_panal > 1 ? 's' : ''} pañal</div>}
                      {r.idas_bano > 0 && <div>{r.idas_bano} ida{r.idas_bano > 1 ? 's' : ''} al baño</div>}
                      {r.deposiciones > 0 && <div>{r.deposiciones} deposición{r.deposiciones > 1 ? 'es' : ''}</div>}
                    </div>
                  </div>
                </div>

                {/* Alertas de salud */}
                {(r.llego_con_golpe || r.fiebre || r.medicamento) && (
                  <div className="px-5 pb-3">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                      <i className="ti ti-alert-triangle text-[#c53030] text-sm mt-0.5" aria-hidden="true"/>
                      <div className="text-[12px] text-[#c53030] space-y-0.5">
                        {r.llego_con_golpe && <div>Llegó con golpe visible</div>}
                        {r.fiebre && <div>Presentó fiebre</div>}
                        {r.medicamento && <div>Se administró medicamento: {r.medicamento_detalle || '(sin detalle)'}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actividades y observaciones */}
                {((r.actividades?.length > 0) || r.observaciones) && (
                  <div className="px-5 pb-4 space-y-2">
                    {r.actividades?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.actividades.map((a: string) => (
                          <span key={a} className="tag bg-[#fdf8ee] text-[#92400e] border border-[#fde68a]/50">{a}</span>
                        ))}
                      </div>
                    )}
                    {r.observaciones && (
                      <p className="text-[12px] text-[#6b7280] italic">{r.observaciones}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
