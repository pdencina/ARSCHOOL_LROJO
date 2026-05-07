export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Super Admin — AR School Global' }

export default async function SuperAdminPage() {
  const supabase = createClient()

  const { data: colegios } = await supabase
    .from('colegios')
    .select('id, nombre, rut, plan, created_at')
    .order('nombre')

  const colegioIds = (colegios ?? []).map((c: any) => c.id)

  // Contar alumnos y usuarios por colegio
  const [{ data: alumnos }, { data: usuarios }] = await Promise.all([
    supabase.from('alumnos').select('colegio_id').in('colegio_id', colegioIds).eq('activo', true),
    supabase.from('usuarios').select('colegio_id, rol').in('colegio_id', colegioIds),
  ])

  const alumnosPor: Record<string, number> = {}
  const usuariosPor: Record<string, number> = {}
  ;(alumnos ?? []).forEach((a: any) => { alumnosPor[a.colegio_id] = (alumnosPor[a.colegio_id] ?? 0) + 1 })
  ;(usuarios ?? []).forEach((u: any) => { usuariosPor[u.colegio_id] = (usuariosPor[u.colegio_id] ?? 0) + 1 })

  const totalAlumnos = Object.values(alumnosPor).reduce((a, b) => a + b, 0)
  const totalUsuarios = Object.values(usuariosPor).reduce((a, b) => a + b, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium mb-2">
            <i className="ti ti-shield-check text-xs" aria-hidden="true"/> Fundación ARM Global
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Colegios AR School</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vista global de todos los establecimientos</p>
        </div>
        <Link href="/super-admin/colegios/nuevo" className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nuevo colegio
        </Link>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Colegios', val: colegios?.length ?? 0, icon: 'ti-building-school', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total alumnos', val: totalAlumnos, icon: 'ti-users', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total usuarios', val: totalUsuarios, icon: 'ti-user-cog', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Planes activos', val: (colegios ?? []).filter((c: any) => c.plan !== 'basico').length, icon: 'ti-star', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${k.icon} ${k.color}`} aria-hidden="true"/>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla colegios */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Colegio','RUT','Plan','Alumnos','Usuarios','Creado','Acciones'].map(h => (
                <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!colegios || colegios.length === 0) ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <i className="ti ti-building-school text-4xl text-slate-300 block mb-2" aria-hidden="true"/>
                <p className="text-slate-400 text-sm">No hay colegios registrados.</p>
              </td></tr>
            ) : (colegios as any[]).map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                      {c.nombre?.[0]}
                    </div>
                    <span className="font-semibold text-slate-800">{c.nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.rut ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`tag ${c.plan === 'enterprise' ? 'tag-mora' : c.plan === 'profesional' ? 'tag-blue' : 'tag-gray'}`}>
                    {c.plan}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{alumnosPor[c.id] ?? 0}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{usuariosPor[c.id] ?? 0}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('es-CL')}</td>
                <td className="px-4 py-3">
                  <Link href={`/super-admin/usuarios?colegio=${c.id}`} className="text-xs text-blue-600 hover:underline mr-3">
                    Ver usuarios
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}