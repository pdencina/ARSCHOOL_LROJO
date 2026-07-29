import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/cobranza/dashboard — Datos del panel de cobranza
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const colegioId = (ur as any).colegio_id
  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const anioActual = hoy.getFullYear()

  // Todos los cobros del colegio para el año
  const { data: todosCobrosx } = await admin
    .from('cobros')
    .select('id, estado, monto, monto_pagado, mes, anio, dias_atraso, semaforo, fecha_vencimiento, fecha_pago, alumno_id, familia_id')
    .eq('colegio_id', colegioId)
    .eq('anio', anioActual)

  const todosCobros = (todosCobrosx ?? []) as any[]

  // KPIs generales
  const totalAlumnos = new Set(todosCobros.map(c => c.alumno_id)).size
  const totalCuotas = todosCobros.length
  const totalRecaudado = todosCobros.filter(c => c.estado === 'pagado').reduce((a, c) => a + c.monto, 0)
  const totalPorRecaudar = todosCobros.filter(c => c.estado !== 'pagado').reduce((a, c) => a + (c.monto - (c.monto_pagado ?? 0)), 0)
  const totalMorosidad = todosCobros.filter(c => c.estado === 'mora').reduce((a, c) => a + (c.monto - (c.monto_pagado ?? 0)), 0)
  const alumnosConDeuda = new Set(todosCobros.filter(c => c.estado === 'mora').map(c => c.alumno_id)).size
  const pctMorosidad = totalCuotas > 0 ? Math.round(todosCobros.filter(c => c.estado === 'mora').length / totalCuotas * 100) : 0

  // Cobros del mes actual
  const cobrosMes = todosCobros.filter(c => c.mes === mesActual)
  const recaudadoMes = cobrosMes.filter(c => c.estado === 'pagado').reduce((a, c) => a + c.monto, 0)
  const pendientesMes = cobrosMes.filter(c => c.estado !== 'pagado').length

  // Pagos de hoy
  const hoyStr = hoy.toISOString().split('T')[0]
  const pagosHoy = todosCobros.filter(c => c.fecha_pago === hoyStr).length
  const montoPagosHoy = todosCobros.filter(c => c.fecha_pago === hoyStr).reduce((a, c) => a + c.monto, 0)

  // Semáforo resumen
  const semaforo = {
    verde: todosCobros.filter(c => c.semaforo === 'verde' && c.estado !== 'pagado').length,
    amarillo: todosCobros.filter(c => c.semaforo === 'amarillo').length,
    naranja: todosCobros.filter(c => c.semaforo === 'naranja').length,
    rojo: todosCobros.filter(c => c.semaforo === 'rojo').length,
  }

  // Próximos vencimientos (próximos 7 días)
  const en7Dias = new Date(hoy)
  en7Dias.setDate(en7Dias.getDate() + 7)
  const proximosVencimientos = todosCobros
    .filter(c => c.estado === 'pendiente' && new Date(c.fecha_vencimiento) <= en7Dias && new Date(c.fecha_vencimiento) >= hoy)
    .length

  // Evolución mensual (recaudación por mes)
  const evolucion = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1
    const cobrosM = todosCobros.filter(c => c.mes === mes)
    return {
      mes,
      recaudado: cobrosM.filter(c => c.estado === 'pagado').reduce((a, c) => a + c.monto, 0),
      pendiente: cobrosM.filter(c => c.estado !== 'pagado').reduce((a, c) => a + (c.monto - (c.monto_pagado ?? 0)), 0),
      mora: cobrosM.filter(c => c.estado === 'mora').length,
    }
  })

  // Top morosos (alumnos con más días de atraso)
  const { data: topMorosos } = await admin
    .from('cobros')
    .select('alumno_id, dias_atraso, monto, monto_pagado, alumno:alumnos(nombre, apellido, curso), familia:familias(nombre_apoderado, apellido_apoderado)')
    .eq('colegio_id', colegioId)
    .eq('estado', 'mora')
    .gt('dias_atraso', 0)
    .order('dias_atraso', { ascending: false })
    .limit(20)

  return NextResponse.json({
    kpis: {
      totalAlumnos,
      totalCuotas,
      totalRecaudado,
      totalPorRecaudar,
      totalMorosidad,
      alumnosConDeuda,
      pctMorosidad,
      recaudadoMes,
      pendientesMes,
      pagosHoy,
      montoPagosHoy,
      proximosVencimientos,
    },
    semaforo,
    evolucion,
    topMorosos: topMorosos ?? [],
  })
}
