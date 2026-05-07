export const dynamic = 'force-dynamic'
export const metadata = { title: 'Calendario — AR School' }

export default function CalendarioPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Calendario</h1>
        <p className="text-sm text-slate-500 mt-0.5">Eventos, reuniones y planificacion academica</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2 font-display">Modulo de Calendario</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Agenda de eventos escolares, reuniones de apoderados y planificacion por curso. Proximamente disponible.
        </p>
      </div>
    </div>
  )
}