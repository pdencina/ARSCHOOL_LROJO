'use client'

import { useState } from 'react'
import { formatMonto } from '@/lib/utils'
import Link from 'next/link'

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
}

const HORA = new Date().getHours()
const SALUDO = HORA < 12 ? 'Buenos días' : HORA < 19 ? 'Buenas tardes' : 'Buenas noches'

const ROL_ACCESOS: Record<string, { label: string; href: string; icon: string; color: string; bg: string }[]> = {
  super_admin: [
    { label: 'Colegios',      href: '/super-admin',          icon: 'ti-building-school', color: 'text-red-600',    bg: 'bg-red-50' },
    { label: 'Usuarios',      href: '/super-admin/usuarios', icon: 'ti-users',           color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Comunicados',   href: '/comunicados',          icon: 'ti-speakerphone',    color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Reportes',      href: '/reportes',             icon: 'ti-file-analytics',  color: 'text-emerald-600',bg: 'bg-emerald-50' },
  ],
  admin: [
    { label: 'Comunicados',   href: '/comunicados',    icon: 'ti-speakerphone',     color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Asistencias',   href: '/asistencias',    icon: 'ti-clipboard-check',  color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Calificaciones',href: '/calificaciones', icon: 'ti-chart-bar',        color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Cobranzas',     href: '/contable',       icon: 'ti-cash',             color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Alumnos',       href: '/alumnos',        icon: 'ti-users',            color: 'text-slate-600',  bg: 'bg-slate-50' },
    { label: 'Reportes',      href: '/reportes',       icon: 'ti-file-analytics',   color: 'text-red-600',    bg: 'bg-red-50' },
  ],
  docente: [
    { label: 'Comunicados',   href: '/comunicados',    icon: 'ti-speakerphone',    color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Asistencias',   href: '/asistencias',    icon: 'ti-clipboard-check', color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Calificaciones',href: '/calificaciones', icon: 'ti-chart-bar',       color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Fichas',        href: '/fichas',         icon: 'ti-books',           color: 'text-amber-600',  bg: 'bg-amber-50' },
  ],
  tutor: [
    { label: 'Comunicados',   href: '/portal/comunicados',    icon: 'ti-speakerphone',    color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Asistencias',   href: '/portal/asistencias',    icon: 'ti-clipboard-check', color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Calificaciones',href: '/portal/calificaciones', icon: 'ti-chart-bar',       color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Pagos',         href: '/portal/pagos',          icon: 'ti-cash',            color: 'text-amber-600',  bg: 'bg-amber-50' },
  ],
  alumno: [
    { label: 'Mis notas',     href: '/portal/calificaciones', icon: 'ti-chart-bar',       color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Asistencias',   href: '/portal/asistencias',    icon: 'ti-clipboard-check', color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'Comunicados',   href: '/portal/comunicados',    icon: 'ti-speakerphone',    color: 'text-blue-600',   bg: 'bg-blue-50' },
  ],
}

export default function DashboardInicio({ usuario, rol, stats, notificaciones, ultimosComunicados, mesActual }: Props) {
  const accesos = ROL_ACCESOS[rol] ?? ROL_ACCESOS.admin
  const notifsNoLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div className="p-6 max-w-6xl">
      {/* Saludo */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 font-display">
          {SALUDO}, {usuario?.nombre} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {rol === 'super_admin' ? 'Fundación ARM Global — Vista global' :
           rol === 'docente'     ? `Docente · ${usuario?.colegio?.nombre}` :
           rol === 'tutor'       ? `Apoderado · ${usuario?.colegio?.nombre}` :
           rol === 'alumno'      ? `Estudiante · ${usuario?.colegio?.nombre}` :
           `${usuario?.colegio?.nombre} — Panel de administración`}
        </p>
      </div>

      {/* KPIs — solo admin/super_admin */}
      {(rol === 'admin' || rol === 'super_admin') && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Alumnos activos',  val: stats.totalAlumnos,                icon: 'ti-users',            color: 'text-blue-600',   bg: 'bg-blue-50',   href: '/alumnos' },
            { label: 'Asistencia hoy',   val: stats.pctAsistencia != null ? `${stats.pctAsistencia}%` : '—', icon: 'ti-clipboard-check', color: stats.pctAsistencia != null && stats.pctAsistencia < 85 ? 'text-red-600' : 'text-emerald-600', bg: stats.pctAsistencia != null && stats.pctAsistencia < 85 ? 'bg-red-50' : 'bg-emerald-50', href: '/asistencias' },
            { label: 'Recaudado',        val: formatMonto(stats.recaudado),      icon: 'ti-cash',             color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/contable' },
            { label: 'En mora',          val: formatMonto(stats.enMora),         icon: 'ti-alert-triangle',   color: stats.enMora > 0 ? 'text-red-600' : 'text-slate-400', bg: stats.enMora > 0 ? 'bg-red-50' : 'bg-slate-50', href: '/contable' },
          ].map((k, i) => (
            <Link key={i} href={k.href} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
                <i className={`ti ${k.icon} ${k.color} text-lg`} aria-hidden="true"/>
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-400 mt-0.5">{mesActual}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Accesos rápidos */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-slate-800">Accesos rápidos</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
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

          {/* Últimos comunicados */}
          {ultimosComunicados.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-slate-800">Últimos comunicados</h2>
                <Link href="/comunicados" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
              </div>
              <div className="space-y-2">
                {ultimosComunicados.map((c: any) => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-blue-200 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      c.tipo === 'urgente' ? 'bg-red-50' : c.tipo === 'cobro' ? 'bg-amber-50' : c.tipo === 'evento' ? 'bg-emerald-50' : 'bg-blue-50'
                    }`}>
                      <i className={`ti ${c.tipo === 'urgente' ? 'ti-alert-triangle text-red-500' : c.tipo === 'cobro' ? 'ti-cash text-amber-500' : c.tipo === 'evento' ? 'ti-calendar text-emerald-500' : 'ti-mail text-blue-500'} text-sm`} aria-hidden="true"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm truncate">{c.titulo}</div>
                      <div className="text-xs text-slate-400">{c.enviado_at ? new Date(c.enviado_at).toLocaleDateString('es-CL') : 'Borrador'}</div>
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
            <h2 className="font-display font-semibold text-slate-800">Notificaciones</h2>
            {notifsNoLeidas > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">{notifsNoLeidas}</span>
            )}
          </div>
          <div className="space-y-2">
            {notificaciones.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <i className="ti ti-bell-off text-3xl text-slate-300 block mb-2" aria-hidden="true"/>
                <p className="text-slate-400 text-xs">Sin notificaciones pendientes</p>
              </div>
            ) : notificaciones.map((n: any) => (
              <div key={n.id} className={`rounded-xl p-3 border transition-colors ${n.leida ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.tipo === 'pago' ? 'bg-emerald-100' : n.tipo === 'comunicado' ? 'bg-blue-100' : n.tipo === 'asistencia' ? 'bg-amber-100' : 'bg-slate-100'
                  }`}>
                    <i className={`ti ${n.tipo === 'pago' ? 'ti-cash text-emerald-600' : n.tipo === 'comunicado' ? 'ti-speakerphone text-blue-600' : n.tipo === 'asistencia' ? 'ti-clipboard-check text-amber-600' : 'ti-bell text-slate-600'} text-xs`} aria-hidden="true"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{n.titulo}</div>
                    {n.mensaje && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.mensaje}</div>}
                    <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleDateString('es-CL')}</div>
                  </div>
                  {!n.leida && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"/>}
                </div>
              </div>
            ))}
          </div>

          {/* Alerta mora crítica */}
          {stats.moraCritica > 0 && (rol === 'admin' || rol === 'super_admin') && (
            <Link href="/contable" className="mt-3 block bg-red-50 border border-red-200 rounded-xl p-3 hover:border-red-300 transition-colors">
              <div className="flex items-center gap-2">
                <i className="ti ti-alert-circle text-red-500" aria-hidden="true"/>
                <div>
                  <div className="text-xs font-semibold text-red-800">{stats.moraCritica} familia{stats.moraCritica > 1 ? 's' : ''} en mora crítica</div>
                  <div className="text-xs text-red-600">+2 meses sin pagar · Click para ver</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}