export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'

export default async function PortalCalificacionesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user!.id).single()
  const rol = (ur as any)?.rol

  let alumnoIds: string[] = []
  if (rol === 'alumno') {
    const { data: va } = await supabase.from('usuario_alumno').select('alumno_id').eq('usuario_id', user!.id)
    alumnoIds = (va ?? []).map((r: any) => r.alumno_id)
  } else {
    const { data: ta } = await supabase.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user!.id)
    alumnoIds = (ta ?? []).map((r: any) => r.alumno_id)
  }

  const { data: calificaciones } = await supabase
    .from('calificaciones')
    .select('*, evaluacion:evaluaciones(nombre,materia,fecha,curso), alumno:alumnos(nombre,apellido)')
    .in('alumno_id', alumnoIds)
    .order('created_at', { ascending: false })

  const materias = [...new Set((calificaciones ?? []).map((c: any) => c.evaluacion?.materia))]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Calificaciones</h1>
        <p className="text-sm text-slate-500 mt-0.5">Notas y evaluaciones del periodo actual</p>
      </div>

      {materias.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <i className="ti ti-chart-bar text-4xl text-slate-300 block mb-3" aria-hidden="true"/>
          <p className="text-slate-400 text-sm">Sin calificaciones registradas todavía.</p>
        </div>
      ) : materias.map(materia => {
        const notas = (calificaciones ?? []).filter((c: any) => c.evaluacion?.materia === materia)
        const prom = notas.length ? (notas.reduce((a: number, c: any) => a + (c.nota ?? 0), 0) / notas.length).toFixed(1) : null
        return (
          <div key={materia} className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-display font-semibold text-slate-800">{materia}</span>
              {prom && (
                <span className={`font-display text-lg font-bold ${parseFloat(prom) >= 4 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Promedio: {prom}
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 text-left">Evaluación</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 text-left">Fecha</th>
                  <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2 text-left">Nota</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.evaluacion?.nombre}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.evaluacion?.fecha ? new Date(c.evaluacion.fecha + 'T12:00').toLocaleDateString('es-CL') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-display text-base font-bold ${c.nota >= 4 ? 'text-emerald-600' : 'text-red-600'}`}>{c.nota ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}