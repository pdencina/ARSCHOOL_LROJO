'use client'
import Link from 'next/link'

interface Props {
  usuario: any
  alumno: any
  rol: string
  stats: { pctAsist: number|null; promedio: string|null; totalNotas: number; deuda: number; totalAsistencias: number }
  comunicados: any[]
  pendientesFirma?: number
}

export default function PortalInicio({ usuario, alumno, rol, stats, comunicados, pendientesFirma = 0 }: Props) {
  const esApoderado = rol === 'apoderado'
  const HORA = new Date().getHours()
  const SALUDO = HORA < 12 ? 'Buenos días' : HORA < 19 ? 'Buenas tardes' : 'Buenas noches'

  const accesos = esApoderado ? [
    { label: 'Comunicados',   href: '/portal/comunicados',   icon: 'ti-speakerphone',    color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Asistencias',   href: '/portal/asistencias',   icon: 'ti-clipboard-check', color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Calificaciones',href: '/portal/calificaciones',icon: 'ti-chart-bar',       color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Estado de pagos',href: '/portal/pagos',        icon: 'ti-cash',            color: 'text-amber-600',  bg: 'bg-amber-50' },
  ] : [
    { label: 'Mis notas',     href: '/portal/calificaciones',icon: 'ti-chart-bar',       color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Asistencias',   href: '/portal/asistencias',   icon: 'ti-clipboard-check', color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Tareas',        href: '/portal/tareas',        icon: 'ti-checklist',       color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Comunicados',   href: '/portal/comunicados',   icon: 'ti-speakerphone',    color: 'text-slate-600',  bg: 'bg-slate-50' },
  ]

  return (
    <div className="p-6 max-w-4xl">
      {/* Saludo */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 font-display">
          {SALUDO}, {usuario?.nombre} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {esApoderado ? 'Portal familiar' : 'Portal del alumno'} · {usuario?.colegio?.nombre}
        </p>
      </div>

      {/* Alerta firmas pendientes */}
      {pendientesFirma > 0 && (
        <Link href="/portal/documentos" className="block mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:border-amber-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ti ti-alert-triangle text-amber-600 text-lg" aria-hidden="true"/>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-amber-800">
                {pendientesFirma === 1 ? 'Tienes 1 contrato pendiente de firma' : `Tienes ${pendientesFirma} contratos pendientes de firma`}
              </div>
              <div className="text-[11px] text-amber-700">Ir a Documentos para revisar y firmar →</div>
            </div>
          </div>
        </Link>
      )}

      {/* Tarjeta alumno */}
      {alumno && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-display text-xl font-bold">
              {alumno.nombre?.[0]}{alumno.apellido?.[0]}
            </div>
            <div>
              <div className="font-display text-xl font-bold">{alumno.nombre} {alumno.apellido}</div>
              <div className="text-blue-200 text-sm">{alumno.curso} · {alumno.rut ?? 'Sin RUT'}</div>
              {esApoderado && alumno.familias?.[0] && (
                <div className="text-blue-200 text-xs mt-0.5">
                  Apoderado: {alumno.familias[0].nombre_apoderado} {alumno.familias[0].apellido_apoderado}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className={`grid ${esApoderado ? 'grid-cols-4' : 'grid-cols-3'} gap-4 mb-8`}>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Asistencia</div>
          <div className={`font-display text-3xl font-bold ${stats.pctAsist != null && stats.pctAsist < 85 ? 'text-red-600' : 'text-emerald-600'}`}>
            {stats.pctAsist != null ? `${stats.pctAsist}%` : '—'}
          </div>
          <div className="text-xs text-slate-400">{stats.totalAsistencias} días registrados</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Promedio general</div>
          <div className={`font-display text-3xl font-bold ${stats.promedio && parseFloat(stats.promedio) >= 4 ? 'text-emerald-600' : stats.promedio ? 'text-red-600' : 'text-slate-400'}`}>
            {stats.promedio ?? '—'}
          </div>
          <div className="text-xs text-slate-400">{stats.totalNotas} evaluaciones</div>
        </div>
        {esApoderado && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Deuda este mes</div>
            <div className={`font-display text-2xl font-bold ${stats.deuda > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {stats.deuda > 0 ? `$${stats.deuda.toLocaleString('es-CL')}` : 'Al día'}
            </div>
            <div className="text-xs text-slate-400">Estado de pagos</div>
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Comunicados</div>
          <div className="font-display text-3xl font-bold text-blue-600">{comunicados.length}</div>
          <div className="text-xs text-slate-400">recibidos</div>
        </div>
      </div>

      {/* Grid accesos + comunicados */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h2 className="font-display font-semibold text-slate-800 mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            {accesos.map((a, i) => (
              <Link key={i} href={a.href}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <i className={`ti ${a.icon} ${a.color} text-lg`} aria-hidden="true"/>
                </div>
                <div className="font-semibold text-slate-700 text-sm">{a.label}</div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display font-semibold text-slate-800 mb-4">Últimos comunicados</h2>
          <div className="space-y-2">
            {comunicados.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <i className="ti ti-mail-opened text-3xl text-slate-300 block mb-2" aria-hidden="true"/>
                <p className="text-xs text-slate-400">Sin comunicados</p>
              </div>
            ) : comunicados.map((c: any) => (
              <Link key={c.id} href="/portal/comunicados"
                className={`block bg-white border rounded-xl p-3 hover:border-blue-200 transition-colors ${c.tipo === 'urgente' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start gap-2">
                  <i className={`ti ${c.tipo === 'urgente' ? 'ti-alert-triangle text-red-500' : c.tipo === 'cobro' ? 'ti-cash text-amber-500' : 'ti-mail text-blue-500'} text-sm flex-shrink-0 mt-0.5`} aria-hidden="true"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{c.titulo}</div>
                    <div className="text-xs text-slate-400">{c.enviado_at ? new Date(c.enviado_at).toLocaleDateString('es-CL') : ''}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {stats.deuda > 0 && esApoderado && (
            <Link href="/portal/pagos" className="mt-3 block bg-red-50 border border-red-200 rounded-xl p-3 hover:border-red-300 transition-colors">
              <div className="flex items-center gap-2">
                <i className="ti ti-alert-circle text-red-500" aria-hidden="true"/>
                <div>
                  <div className="text-xs font-semibold text-red-800">Pago pendiente</div>
                  <div className="text-xs text-red-600">${stats.deuda.toLocaleString('es-CL')} sin regularizar</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}