'use client'

import { formatMonto } from '@/lib/utils'
import Link from 'next/link'
import CumpleanosWidget from '@/components/dashboard/CumpleanosWidget'

interface Props {
  usuario: any
  rol: string
  stats: {
    totalAlumnos: number
    totalComunicados: number
    recaudado: number
    enMora: number
    pctAsistencia: number | null
    moraCritica: number
  }
  notificaciones: any[]
  ultimosComunicados: any[]
  mesActual: string
  pendientes?: { texto: string; href: string; icon: string; tipo: 'warning' | 'info' | 'action' }[]
}

const HORA = new Date().getHours()
const SALUDO = HORA < 12 ? 'Buenos días' : HORA < 19 ? 'Buenas tardes' : 'Buenas noches'

const ROL_ACCESOS: Record<string, { label: string; href: string; icon: string }[]> = {
  super_admin: [
    { label: 'Establecimientos', href: '/super-admin',          icon: 'ti-building-school' },
    { label: 'Usuarios',         href: '/super-admin/usuarios', icon: 'ti-users' },
    { label: 'Comunicados',      href: '/comunicados',          icon: 'ti-speakerphone' },
    { label: 'Reportes',         href: '/reportes',             icon: 'ti-file-analytics' },
  ],
  admin: [
    { label: 'Comunicados',    href: '/comunicados',    icon: 'ti-speakerphone' },
    { label: 'Asistencias',    href: '/asistencias',    icon: 'ti-clipboard-check' },
    { label: 'Calificaciones', href: '/calificaciones', icon: 'ti-chart-bar' },
    { label: 'Cobranzas',      href: '/contable',       icon: 'ti-cash' },
    { label: 'Alumnos',        href: '/alumnos',        icon: 'ti-users' },
    { label: 'Reportes',       href: '/reportes',       icon: 'ti-file-analytics' },
  ],
  tutor: [
    { label: 'Mis alumnos',      href: '/alumnos',        icon: 'ti-users' },
    { label: 'Asistencias',      href: '/asistencias',    icon: 'ti-clipboard-check' },
    { label: 'Evaluaciones',     href: '/calificaciones', icon: 'ti-chart-bar' },
    { label: 'Planificación',    href: '/planificacion',  icon: 'ti-layout-board' },
    { label: 'Libro de clases',  href: '/libro-clases',   icon: 'ti-notebook' },
    { label: 'Reporte diario',   href: '/reporte-diario', icon: 'ti-clipboard-heart' },
  ],
}

export default function DashboardInicio({ usuario, rol, stats, notificaciones, ultimosComunicados, mesActual, pendientes = [] }: Props) {
  const notifsNoLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div className="p-6 max-w-6xl">
      {/* Saludo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {SALUDO}, {usuario?.nombre}
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          {rol === 'super_admin' ? 'Gestión centralizada de establecimientos' :
           rol === 'tutor'       ? `Docente · ${usuario?.colegio?.nombre ?? ''}` :
           `${usuario?.colegio?.nombre ?? ''} · Panel de administración`}
        </p>
      </div>

      {/* KPIs — Admin */}
      {(rol === 'admin' || rol === 'super_admin') && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Alumnos activos',  val: stats.totalAlumnos.toString(),  sub: mesActual, href: '/alumnos' },
            { label: 'Asistencia hoy',   val: stats.pctAsistencia != null ? `${stats.pctAsistencia}%` : '—', sub: mesActual, href: '/asistencias' },
            { label: 'Recaudado',        val: formatMonto(stats.recaudado), sub: mesActual, href: '/contable' },
            { label: 'En mora',          val: formatMonto(stats.enMora),    sub: stats.enMora > 0 ? 'Requiere atención' : 'Sin pendientes', href: '/contable' },
          ].map((k, i) => (
            <Link key={i} href={k.href} className="bg-white border border-[#e8eaed] rounded-xl p-5 hover:border-[#b8860b]/30 transition-all group">
              <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">{k.label}</div>
              <div className="text-2xl font-bold text-[#1a2332] group-hover:text-[#2c4a6e] transition-colors" style={{ fontFamily: 'DM Sans, sans-serif' }}>{k.val}</div>
              <div className="text-[11px] text-[#9ca3af] mt-1">{k.sub}</div>
            </Link>
          ))}
        </div>
      )}

      {/* KPIs — Tutor (pedagógicos) */}
      {rol === 'tutor' && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Mis alumnos',    val: stats.totalAlumnos.toString(), sub: 'activos en mi curso', href: '/alumnos' },
            { label: 'Asistencia hoy', val: stats.pctAsistencia != null ? `${stats.pctAsistencia}%` : '—', sub: 'de mi curso', href: '/asistencias' },
            { label: 'Comunicados',    val: stats.totalComunicados.toString(), sub: 'enviados', href: '/comunicados' },
          ].map((k, i) => (
            <Link key={i} href={k.href} className="bg-white border border-[var(--ar-border)] rounded-xl p-5 hover:border-[var(--ar-accent)]/30 transition-all group">
              <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">{k.label}</div>
              <div className="text-2xl font-bold text-[#1a2332] group-hover:text-[#2c4a6e] transition-colors" style={{ fontFamily: 'DM Sans, sans-serif' }}>{k.val}</div>
              <div className="text-[11px] text-[#9ca3af] mt-1">{k.sub}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Acciones pendientes */}
        {pendientes.length > 0 && (
          <div className="col-span-3 mb-2">
            <h2 className="font-semibold text-[#1a2332] text-sm mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              <i className="ti ti-alert-circle text-amber-500 mr-1.5" aria-hidden="true"/>
              Acciones pendientes
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {pendientes.map((p, i) => (
                <Link key={i} href={p.href} className={`flex items-center gap-3 rounded-xl p-3 border transition-all hover:scale-[1.01] ${
                  p.tipo === 'warning' ? 'bg-amber-50 border-amber-200 hover:border-amber-300' :
                  p.tipo === 'action'  ? 'bg-blue-50 border-blue-200 hover:border-blue-300' :
                  'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    p.tipo === 'warning' ? 'bg-amber-100' :
                    p.tipo === 'action'  ? 'bg-blue-100' :
                    'bg-slate-100'
                  }`}>
                    <i className={`ti ${p.icon} text-sm ${
                      p.tipo === 'warning' ? 'text-amber-700' :
                      p.tipo === 'action'  ? 'text-blue-700' :
                      'text-slate-600'
                    }`} aria-hidden="true"/>
                  </div>
                  <span className={`text-[12px] font-medium ${
                    p.tipo === 'warning' ? 'text-amber-800' :
                    p.tipo === 'action'  ? 'text-blue-800' :
                    'text-slate-700'
                  }`}>{p.texto}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Últimos comunicados */}
        <div className="col-span-2">
          {ultimosComunicados.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[#1a2332] text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Últimos comunicados</h2>
                <Link href="/comunicados" className="text-[11px] text-[#6b7280] hover:text-[#1a2332] transition-colors">Ver todos →</Link>
              </div>
              <div className="space-y-2">
                {ultimosComunicados.map((c: any) => (
                  <div key={c.id} className="bg-white border border-[#e8eaed] rounded-lg p-3 flex items-center gap-3 hover:border-[#d1d5db] transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      c.tipo === 'urgente' ? 'bg-red-50' : c.tipo === 'cobro' ? 'bg-amber-50' : 'bg-[#f3f4f6]'
                    }`}>
                      <i className={`ti ${c.tipo === 'urgente' ? 'ti-alert-triangle text-[#c53030]' : c.tipo === 'cobro' ? 'ti-cash text-[#b7791f]' : 'ti-mail text-[#6b7280]'} text-sm`} aria-hidden="true"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#1a2332] text-[13px] truncate">{c.titulo}</div>
                      <div className="text-[11px] text-[#9ca3af]">{c.enviado_at ? new Date(c.enviado_at).toLocaleDateString('es-CL') : 'Borrador'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1a2332] text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Notificaciones</h2>
            {notifsNoLeidas > 0 && (
              <span className="bg-[#c53030] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">{notifsNoLeidas}</span>
            )}
          </div>
          <div className="space-y-2">
            {notificaciones.length === 0 ? (
              <div className="bg-white border border-[#e8eaed] rounded-xl p-8 text-center">
                <i className="ti ti-bell-off text-2xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
                <p className="text-[#9ca3af] text-xs">Sin notificaciones pendientes</p>
              </div>
            ) : notificaciones.map((n: any) => (
              <div key={n.id} className={`rounded-lg p-3 border transition-colors ${n.leida ? 'bg-white border-[#e8eaed]' : 'bg-[#fdf8ee] border-[#fde68a]/50'}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-[#1a2332]">{n.titulo}</div>
                    {n.mensaje && <div className="text-[11px] text-[#6b7280] mt-0.5 line-clamp-2">{n.mensaje}</div>}
                    <div className="text-[10px] text-[#9ca3af] mt-1">{new Date(n.created_at).toLocaleDateString('es-CL')}</div>
                  </div>
                  {!n.leida && <div className="w-2 h-2 bg-[#b8860b] rounded-full flex-shrink-0 mt-1"/>}
                </div>
              </div>
            ))}
          </div>

          {/* Alerta mora crítica */}
          {stats.moraCritica > 0 && (rol === 'admin' || rol === 'super_admin') && (
            <Link href="/contable" className="mt-3 block bg-red-50 border border-red-100 rounded-lg p-3 hover:border-red-200 transition-colors">
              <div className="flex items-center gap-2">
                <i className="ti ti-alert-circle text-[#c53030] text-sm" aria-hidden="true"/>
                <div>
                  <div className="text-[11px] font-semibold text-[#c53030]">{stats.moraCritica} familia{stats.moraCritica > 1 ? 's' : ''} en mora crítica</div>
                  <div className="text-[10px] text-[#c53030]/70">+2 meses sin pagar</div>
                </div>
              </div>
            </Link>
          )}

          {/* Widget cumpleaños */}
          <div className="mt-3">
            <CumpleanosWidget />
          </div>
        </div>
      </div>
    </div>
  )
}
