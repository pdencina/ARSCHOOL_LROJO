export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'

export default async function PortalPerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('*, colegio:colegios(nombre)').eq('id', user!.id).single()
  const u = ur as any

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Mi perfil</h1>
        <p className="text-sm text-slate-500 mt-0.5">Información de tu cuenta</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-display text-2xl font-bold">
            {u?.nombre?.[0]}{u?.apellido?.[0]}
          </div>
          <div>
            <div className="font-display text-xl font-bold text-slate-900">{u?.nombre} {u?.apellido}</div>
            <div className="text-sm text-slate-500">{u?.email}</div>
            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              u?.rol === 'tutor' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {u?.rol === 'tutor' ? 'Apoderado' : 'Alumno'}
            </span>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
          {[
            { label: 'Colegio', val: u?.colegio?.nombre ?? '—' },
            { label: 'Email', val: u?.email ?? '—' },
          ].map((f, i) => (
            <div key={i}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{f.label}</div>
              <div className="text-sm text-slate-700">{f.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}