export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getMesNombre } from '@/lib/utils'

export default async function PortalAsistenciasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user!.id).single()
  const rol = (ur as any)?.rol

  let alumnoIds: string[] = []
  if (rol === 'alumno') {
    const { data: va } = await supabase.from('usuario_alumno').select('alumno_id').eq('usuario_id', user!.id)
    alumnoIds = (va ?? []).map((r: any) => r.alumno_id)
  } else {
    const { data: ta } = await supabase.from('tutor_alumnos').select('alumno_id, alumno:alumnos(nombre,apellido,curso)').eq('tutor_id', user!.id)
    alumnoIds = (ta ?? []).map((r: any) => r.alumno_id)
  }

  const { data: asistencias } = await supabase
    .from('asistencias').select('*, alumno:alumnos(nombre,apellido,curso)')
    .in('alumno_id', alumnoIds).order('fecha', { ascending: false }).limit(60)

  const { data: alumnos } = await supabase.from('alumnos').select('*').in('id', alumnoIds)

  const totalDias = (asistencias ?? []).length
  const presentes = (asistencias ?? []).filter((a: any) => a.estado === 'presente').length
  const pct = totalDias > 0 ? Math.round(presentes / totalDias * 100) : 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Asistencias</h1>
        <p className="text-sm text-slate-500 mt-0.5">Historial de asistencia de {rol === 'alumno' ? 'tu hijo/a' : 'tus hijos'}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Días registrados', val: totalDias, color: 'text-slate-800' },
          { label: 'Presentes', val: presentes, color: 'text-emerald-600' },
          { label: 'Asistencia', val: `${pct}%`, color: pct >= 85 ? 'text-emerald-600' : 'text-red-600' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{k.label}</div>
            <div className={`text-2xl font-bold font-display ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Fecha','Alumno','Estado','Observación'].map(h => (
                <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!asistencias || asistencias.length === 0) ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">Sin registros de asistencia todavía.</td></tr>
            ) : (asistencias as any[]).map((a: any) => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{new Date(a.fecha + 'T12:00').toLocaleDateString('es-CL')}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{a.alumno?.nombre} {a.alumno?.apellido}</td>
                <td className="px-4 py-3">
                  <span className={`tag ${a.estado === 'presente' ? 'tag-ok' : a.estado === 'tardanza' ? 'tag-pend' : a.estado === 'justificado' ? 'tag-blue' : 'tag-mora'}`}>
                    {a.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{a.observacion ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}