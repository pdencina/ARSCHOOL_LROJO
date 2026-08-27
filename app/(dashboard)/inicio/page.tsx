export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DashboardInicio from '@/components/dashboard/DashboardInicio'
import { getMesNombre } from '@/lib/utils'

export const metadata = { title: 'Inicio — AR School' }

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdminClient()

  const { data: ur } = await admin
    .from('usuarios')
    .select('*, colegio:colegios(*)')
    .eq('id', user.id)
    .single()

  const usuario  = ur as any
  const colegioId = usuario?.colegio_id ?? ''
  const rol       = usuario?.rol ?? 'admin'
  const ahora     = new Date()
  const hoy       = ahora.toISOString().split('T')[0]

  const { data: ultimoCobro } = await admin
    .from('cobros')
    .select('mes, anio')
    .eq('colegio_id', colegioId)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false })
    .limit(1)
    .single()

  const mes  = ultimoCobro ? (ultimoCobro as any).mes  : ahora.getMonth() + 1
  const anio = ultimoCobro ? (ultimoCobro as any).anio : ahora.getFullYear()

  const [
    { count: totalAlumnos },
    { count: totalComunicados },
    { data: cobros },
    { data: asistenciasHoy },
    { data: notificaciones },
    { data: ultimosComunicados },
  ] = await Promise.all([
    admin.from('alumnos').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId).eq('activo', true),
    admin.from('comunicados').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId),
    admin.from('cobros').select('estado, monto, monto_pagado').eq('colegio_id', colegioId).eq('mes', mes).eq('anio', anio),
    admin.from('asistencias').select('estado').eq('colegio_id', colegioId).eq('fecha', hoy),
    admin.from('notificaciones').select('*').eq('colegio_id', colegioId).eq('leida', false).order('created_at', { ascending: false }).limit(10),
    admin.from('comunicados').select('*').eq('colegio_id', colegioId).order('created_at', { ascending: false }).limit(5),
  ])

  // --- ACCIONES PENDIENTES (contextual) ---
  const pendientes: { texto: string; href: string; icon: string; tipo: 'warning' | 'info' | 'action' }[] = []

  // Horarios en borrador (admin)
  if (['admin', 'super_admin', 'pastor_campus'].includes(rol)) {
    const { count: horariosBorrador } = await admin
      .from('propuestas_horario')
      .select('*', { count: 'exact', head: true })
      .eq('colegio_id', colegioId)
      .eq('estado', 'borrador')
    if (horariosBorrador && horariosBorrador > 0) {
      pendientes.push({
        texto: `${horariosBorrador} horario${horariosBorrador > 1 ? 's' : ''} en borrador sin publicar`,
        href: '/planificacion',
        icon: 'ti-calendar-event',
        tipo: 'action',
      })
    }
  }

  // Tareas por calificar (tutor)
  if (rol === 'tutor') {
    const { data: misTareas } = await admin
      .from('tareas')
      .select('id')
      .eq('tutor_id', user.id)
      .eq('estado', 'activa')
    if (misTareas && misTareas.length > 0) {
      const tareaIds = misTareas.map((t: any) => t.id)
      const { count: entregasPendientes } = await admin
        .from('entregas_tarea')
        .select('*', { count: 'exact', head: true })
        .in('tarea_id', tareaIds)
        .eq('estado', 'entregada')
      if (entregasPendientes && entregasPendientes > 0) {
        pendientes.push({
          texto: `${entregasPendientes} entrega${entregasPendientes > 1 ? 's' : ''} por calificar`,
          href: '/tareas',
          icon: 'ti-star',
          tipo: 'action',
        })
      }
    }
  }

  // Tareas por calificar (admin ve todas)
  if (['admin', 'super_admin', 'pastor_campus'].includes(rol)) {
    const { count: entregasSinCalificar } = await admin
      .from('entregas_tarea')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'entregada')
    if (entregasSinCalificar && entregasSinCalificar > 0) {
      pendientes.push({
        texto: `${entregasSinCalificar} entrega${entregasSinCalificar > 1 ? 's' : ''} de alumnos sin calificar`,
        href: '/tareas',
        icon: 'ti-inbox',
        tipo: 'info',
      })
    }
  }

  // Reporte diario pendiente hoy (tutor)
  if (rol === 'tutor') {
    const { count: reportesHoy } = await admin
      .from('reportes_diarios')
      .select('*', { count: 'exact', head: true })
      .eq('colegio_id', colegioId)
      .eq('fecha', hoy)
      .eq('tutor_id', user.id)
    if (!reportesHoy || reportesHoy === 0) {
      pendientes.push({
        texto: 'Reporte diario de hoy pendiente',
        href: '/reporte-diario',
        icon: 'ti-clipboard-heart',
        tipo: 'warning',
      })
    }
  }

  // Aportes vencidos del mes (admin)
  if (['admin', 'super_admin', 'pastor_campus'].includes(rol)) {
    const aportesVencidos = (cobros ?? []).filter((c: any) => ['pendiente', 'mora'].includes(c.estado)).length
    if (aportesVencidos > 0) {
      pendientes.push({
        texto: `${aportesVencidos} aporte${aportesVencidos > 1 ? 's' : ''} vencido${aportesVencidos > 1 ? 's' : ''} este mes`,
        href: '/contable',
        icon: 'ti-cash',
        tipo: 'warning',
      })
    }

    // Vouchers/comprobantes por validar (solo los pendientes de aprobación)
    const { count: vouchersPendientes } = await admin
      .from('pagos')
      .select('*', { count: 'exact', head: true })
      .not('referencia', 'is', null)
      .eq('medio_pago', 'transferencia')
      .eq('estado', 'pendiente')
    if (vouchersPendientes && vouchersPendientes > 0) {
      pendientes.push({
        texto: `${vouchersPendientes} comprobante${vouchersPendientes > 1 ? 's' : ''} de transferencia por validar`,
        href: '/cobranza',
        icon: 'ti-receipt',
        tipo: 'action',
      })
    }

    // Pre-admisiones pendientes de importar
    const { count: preAdmisionesPendientes } = await admin
      .from('pre_admisiones')
      .select('*', { count: 'exact', head: true })
      .eq('colegio_id', colegioId)
      .eq('estado', 'aprobada')
    if (preAdmisionesPendientes && preAdmisionesPendientes > 0) {
      pendientes.push({
        texto: `${preAdmisionesPendientes} admisión${preAdmisionesPendientes > 1 ? 'es' : ''} aprobada${preAdmisionesPendientes > 1 ? 's' : ''} por matricular`,
        href: '/matricula',
        icon: 'ti-user-plus',
        tipo: 'info',
      })
    }

    // Contratos pendientes de firma
    const { count: contratosPendientes } = await admin
      .from('matriculas')
      .select('*', { count: 'exact', head: true })
      .eq('colegio_id', colegioId)
      .eq('estado', 'activa')
      .is('firma_apoderado', null)
    if (contratosPendientes && contratosPendientes > 0) {
      pendientes.push({
        texto: `${contratosPendientes} contrato${contratosPendientes > 1 ? 's' : ''} pendiente${contratosPendientes > 1 ? 's' : ''} de firma`,
        href: '/matricula',
        icon: 'ti-file-certificate',
        tipo: 'warning',
      })
    }
  }

  // Mensajes sin respuesta >24h (admin/super_admin)
  if (['admin', 'super_admin', 'pastor_campus'].includes(rol)) {
    const { count: sinRespuesta24h } = await admin
      .from('conversaciones')
      .select('*', { count: 'exact', head: true })
      .eq('colegio_id', colegioId)
      .eq('pendiente_respuesta', true)
      .eq('activa', true)
      .lt('ultimo_mensaje_familia_at', new Date(Date.now() - 24 * 3600000).toISOString())

    if (sinRespuesta24h && sinRespuesta24h > 0) {
      pendientes.push({
        texto: `${sinRespuesta24h} mensaje${sinRespuesta24h > 1 ? 's' : ''} de familias sin respuesta hace más de 24h`,
        href: '/mensajes',
        icon: 'ti-message-exclamation',
        tipo: 'warning',
      })
    }
  }

  // Asistencia no tomada hoy (tutor, si no hay registros)
  if (rol === 'tutor' && (!asistenciasHoy || asistenciasHoy.length === 0)) {
    pendientes.push({
      texto: 'Asistencia de hoy sin registrar',
      href: '/asistencias',
      icon: 'ti-clipboard-check',
      tipo: 'action',
    })
  }

  const recaudado = (cobros ?? []).filter((c: any) => c.estado === 'pagado').reduce((a: number, c: any) => a + c.monto, 0)
  const enMora    = (cobros ?? []).filter((c: any) => ['mora','parcial','pendiente'].includes(c.estado)).reduce((a: number, c: any) => a + (c.monto - c.monto_pagado), 0)
  const pctAsistencia = (asistenciasHoy ?? []).length > 0
    ? Math.round((asistenciasHoy ?? []).filter((a: any) => a.estado === 'presente').length / (asistenciasHoy ?? []).length * 100)
    : null

  // --- Programas: contar inscritos por programa ---
  const { data: programas } = await admin.from('programas').select('id, codigo, nombre, nombre_corto, color, icono').eq('activo', true)
  const programaStats: { codigo: string; nombre: string; color: string; icono: string; inscritos: number }[] = []
  if (programas) {
    for (const p of programas as any[]) {
      const { count } = await admin
        .from('inscripciones_programa')
        .select('*', { count: 'exact', head: true })
        .eq('programa_id', p.id)
        .eq('colegio_id', colegioId)
        .eq('estado', 'activa')
      programaStats.push({ codigo: p.codigo, nombre: p.nombre_corto || p.nombre, color: p.color, icono: p.icono, inscritos: count ?? 0 })
    }
  }

  return (
    <DashboardInicio
      usuario={usuario}
      rol={rol}
      stats={{
        totalAlumnos:     totalAlumnos ?? 0,
        totalComunicados: totalComunicados ?? 0,
        recaudado,
        enMora,
        pctAsistencia,
        moraCritica: (cobros ?? []).filter((c: any) => c.estado === 'mora').length,
      }}
      notificaciones={(notificaciones as any[]) ?? []}
      ultimosComunicados={(ultimosComunicados as any[]) ?? []}
      mesActual={`${getMesNombre(mes)} ${anio}`}
      pendientes={pendientes}
      programaStats={programaStats}
    />
  )
}
