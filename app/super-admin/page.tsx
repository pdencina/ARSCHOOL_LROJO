export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Super Admin — AR School Global' }

export default async function SuperAdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user!.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/fichas')

  const { data: colegios } = await supabase
    .from('colegios').select('*, usuarios(count), alumnos(count)').order('nombre')

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium mb-2">
            <i className="ti ti-shield-check text-xs" aria-hidden="true"/> Super Admin · Fundación ARM Global
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Todos los colegios AR School</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vista global de la fundación</p>
        </div>
        <button className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true"/> Nuevo colegio
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Colegios activos', val: colegios?.length ?? 0, icon: 'ti-building-school', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total alumnos', val: (colegios ?? []).reduce((a: number, c: any) => a + (c.alumnos?.[0]?.count ?? 0), 0), icon: 'ti-users', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total usuarios', val: (colegios ?? []).reduce((a: number, c: any) => a + (c.usuarios?.[0]?.count ?? 0), 0), icon: 'ti-user-cog', color: 'text-violet-600', bg: 'bg-violet-50' },
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Colegio','RUT','Plan','Alumnos','Usuarios','Estado','Acciones'].map(h => (
                <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!colegios || colegios.length === 0) ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">No hay colegios registrados.</td></tr>
            ) : (colegios as any[]).map((c: any) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                      {c.nombre?.[0]}
                    </div>
                    <div className="font-semibold text-slate-800">{c.nombre}</div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.rut ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`tag ${c.plan === 'enterprise' ? 'tag-mora' : c.plan === 'profesional' ? 'tag-blue' : 'tag-gray'}`}>
                    {c.plan}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{c.alumnos?.[0]?.count ?? 0}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{c.usuarios?.[0]?.count ?? 0}</td>
                <td className="px-4 py-3"><span className="tag tag-ok">Activo</span></td>
                <td className="px-4 py-3">
                  <button className="text-xs text-blue-600 hover:underline">Gestionar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}