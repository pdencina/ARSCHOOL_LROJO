import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/chat/sla — Métricas de SLA de mensajes para admin
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const colegioId = usuario.colegio_id
  const ahora = new Date()

  // 1. Conversaciones pendientes de respuesta (staff no ha respondido)
  const { data: pendientes } = await admin
    .from('conversaciones')
    .select('id, ultimo_mensaje_familia_at, titulo, tipo, curso')
    .eq('colegio_id', colegioId)
    .eq('pendiente_respuesta', true)
    .eq('activa', true)
    .order('ultimo_mensaje_familia_at', { ascending: true })

  // Clasificar por urgencia
  const conversacionesPendientes = (pendientes ?? []).map((c: any) => {
    const esperaMs = ahora.getTime() - new Date(c.ultimo_mensaje_familia_at).getTime()
    const esperaHoras = Math.round(esperaMs / 3600000 * 10) / 10
    const esperaMin = Math.round(esperaMs / 60000)
    let urgencia: 'critica' | 'alta' | 'media' | 'normal' = 'normal'
    if (esperaHoras >= 48) urgencia = 'critica'
    else if (esperaHoras >= 24) urgencia = 'alta'
    else if (esperaHoras >= 12) urgencia = 'media'

    return { ...c, espera_horas: esperaHoras, espera_min: esperaMin, urgencia }
  })

  const sinRespuesta24h = conversacionesPendientes.filter(c => c.espera_horas >= 24).length
  const sinRespuesta12h = conversacionesPendientes.filter(c => c.espera_horas >= 12).length
  const totalPendientes = conversacionesPendientes.length

  // 2. Métricas históricas (últimos 30 días)
  const hace30dias = new Date(ahora.getTime() - 30 * 24 * 3600000).toISOString()
  const { data: historial } = await admin
    .from('sla_respuestas')
    .select('tiempo_respuesta_min, respondido_por, respuesta_staff_at')
    .eq('colegio_id', colegioId)
    .gte('created_at', hace30dias)
    .order('created_at', { ascending: false })

  const tiempos = (historial ?? []).map((h: any) => h.tiempo_respuesta_min)
  const promedioMin = tiempos.length > 0 ? Math.round(tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length) : 0
  const medianaMin = tiempos.length > 0 ? tiempos.sort((a: number, b: number) => a - b)[Math.floor(tiempos.length / 2)] : 0
  const dentroSla = tiempos.filter((t: number) => t <= 1440).length // Respondidos en <24h
  const cumplimientoSla = tiempos.length > 0 ? Math.round(dentroSla / tiempos.length * 100) : 100

  // 3. Ranking por miembro del equipo (últimos 30 días)
  const porUsuario: Record<string, { total: number; sumaMin: number }> = {}
  ;(historial ?? []).forEach((h: any) => {
    if (!h.respondido_por) return
    if (!porUsuario[h.respondido_por]) porUsuario[h.respondido_por] = { total: 0, sumaMin: 0 }
    porUsuario[h.respondido_por].total++
    porUsuario[h.respondido_por].sumaMin += h.tiempo_respuesta_min
  })

  const userIds = Object.keys(porUsuario)
  let ranking: any[] = []
  if (userIds.length > 0) {
    const { data: usuarios } = await admin
      .from('usuarios')
      .select('id, nombre, apellido, rol')
      .in('id', userIds)

    ranking = (usuarios ?? []).map((u: any) => ({
      id: u.id,
      nombre: `${u.nombre} ${u.apellido}`,
      rol: u.rol,
      respuestas: porUsuario[u.id].total,
      promedio_min: Math.round(porUsuario[u.id].sumaMin / porUsuario[u.id].total),
    })).sort((a: any, b: any) => a.promedio_min - b.promedio_min)
  }

  return NextResponse.json({
    resumen: {
      total_pendientes: totalPendientes,
      sin_respuesta_12h: sinRespuesta12h,
      sin_respuesta_24h: sinRespuesta24h,
      promedio_respuesta_min: promedioMin,
      mediana_respuesta_min: medianaMin,
      cumplimiento_sla_pct: cumplimientoSla,
      total_respuestas_30d: tiempos.length,
    },
    pendientes: conversacionesPendientes,
    ranking,
  })
}
