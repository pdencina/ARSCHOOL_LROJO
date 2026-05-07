export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
export const metadata = { title: 'Reportes — AR School' }

export default async function ReportesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const [{ count: totalAlumnos }, { count: totalFichas }, { count: totalCobros }] = await Promise.all([
    supabase.from('alumnos').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId).eq('activo', true),
    supabase.from('fichas').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId),
    supabase.from('cobros').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId),
  ])

  const stats = [
    { label: 'Total alumnos activos', val: totalAlumnos ?? 0, icon: 'ti-users', color: 'bg-blue-50 text-blue-600' },
    { label: 'Fichas pedagogicas', val: totalFichas ?? 0, icon: 'ti-books', color: 'bg-violet-50 text-violet-600' },
    { label: 'Cobros registrados', val: totalCobros ?? 0, icon: 'ti-cash', color: 'bg-emerald-50 text-emerald-600' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Reportes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen general del colegio</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <i className={`ti ${s.icon} text-lg`} aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-display">{s.val}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: 'Reporte de asistencia mensual', desc: 'Porcentaje de asistencia por curso y alumno', icon: 'ti-clipboard-check', color: 'text-blue-500' },
          { title: 'Reporte de calificaciones', desc: 'Promedios por materia, curso y periodo', icon: 'ti-chart-bar', color: 'text-violet-500' },
          { title: 'Reporte de cobranzas', desc: 'Estado de pagos, deudores y proyeccion mensual', icon: 'ti-cash', color: 'text-emerald-500' },
          { title: 'Reporte de comunicados', desc: 'Tasa de lectura y confirmacion por familia', icon: 'ti-speakerphone', color: 'text-amber-500' },
        ].map((r, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-start gap-4">
              <i className={`ti ${r.icon} text-2xl ${r.color} flex-shrink-0 mt-0.5`} aria-hidden="true" />
              <div>
                <div className="font-semibold text-slate-800 text-sm mb-1 font-display">{r.title}</div>
                <div className="text-xs text-slate-500">{r.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}