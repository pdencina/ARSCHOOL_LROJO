export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
export const metadata = { title: 'Configuracion — AR School' }

export default async function ConfiguracionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('*, colegio:colegios(*)').eq('id', user!.id).single()
  const usuario = ur as any

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Configuracion</h1>
        <p className="text-sm text-slate-500 mt-0.5">Datos del colegio y cuenta</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 font-display">Informacion del colegio</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Nombre', val: usuario?.colegio?.nombre ?? '—' },
              { label: 'RUT', val: usuario?.colegio?.rut ?? '—' },
              { label: 'Direccion', val: usuario?.colegio?.direccion ?? '—' },
              { label: 'Plan', val: usuario?.colegio?.plan ?? '—' },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</div>
                <div className="text-slate-800 font-medium">{f.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 font-display">Mi cuenta</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Nombre', val: `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}` },
              { label: 'Email', val: usuario?.email ?? '—' },
              { label: 'Rol', val: usuario?.rol ?? '—' },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</div>
                <div className="text-slate-800 font-medium">{f.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <i className="ti ti-info-circle mr-2" aria-hidden="true" />
          Para modificar los datos del colegio contacta al equipo de AR School Global.
        </div>
      </div>
    </div>
  )
}