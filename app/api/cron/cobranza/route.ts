import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail } from '@/lib/email'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/cron/cobranza
// Ejecutar diariamente (via Vercel Cron o llamada manual)
// 1. Calcula días de atraso para cobros vencidos
// 2. Actualiza semáforo de morosidad
// 3. Envía recordatorios pre-vencimiento (5, 3, 1 días antes)
// 4. Envía alertas post-vencimiento escalonadas (día 6, 10, 15, 20)
// 5. Notifica al admin sobre morosidad
export async function POST(request: NextRequest) {
  // Verificar que viene de cron autorizado o admin
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'arschool-cron-2027'
  if (authHeader !== `Bearer ${cronSecret}`) {
    // Permitir también si es un usuario super_admin
    const admin = getAdmin()
    // Si no hay auth header válido, rechazar
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const admin = getAdmin()
  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]

  const resultados = {
    cobros_actualizados: 0,
    recordatorios_pre: 0,
    recordatorios_post: 0,
    alertas_admin: 0,
  }

  // =====================
  // 1. ACTUALIZAR DÍAS DE ATRASO Y SEMÁFORO
  // =====================
  const { data: cobrosPendientes } = await admin
    .from('cobros')
    .select('id, colegio_id, familia_id, alumno_id, fecha_vencimiento, estado, monto, monto_pagado, mes, anio, tipo_concepto, interes_mora')
    .in('estado', ['pendiente', 'mora', 'parcial'])

  // Cargar config de mora por colegio
  const { data: configsMora } = await admin.from('config_mora').select('*').eq('activo', true)
  const moraMap = new Map((configsMora ?? []).map((c: any) => [c.colegio_id, c]))

  for (const cobro of (cobrosPendientes ?? [])) {
    const vencimiento = new Date(cobro.fecha_vencimiento + 'T00:00:00')
    const diffMs = hoy.getTime() - vencimiento.getTime()
    const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    const diasParaVencer = Math.max(0, Math.floor(-diffMs / (1000 * 60 * 60 * 24)))

    // Calcular semáforo
    let semaforo = 'verde'
    let nuevoEstado = cobro.estado

    if (diasAtraso > 15) {
      semaforo = 'rojo'
      nuevoEstado = 'mora'
    } else if (diasAtraso > 0) {
      semaforo = 'naranja'
      nuevoEstado = 'mora'
    } else if (diasParaVencer <= 5) {
      semaforo = 'amarillo'
    }

    // Calcular interés por mora (3% diario desde día configurado)
    const configMora = moraMap.get(cobro.colegio_id) as any
    let interesMora = 0
    if (configMora && diasAtraso >= configMora.dia_inicio_mora) {
      const tiposAplican = configMora.aplica_a || ['aporte_mensual']
      if (tiposAplican.includes(cobro.tipo_concepto)) {
        const diasConInteres = diasAtraso - configMora.dia_inicio_mora + 1
        const tasaDiaria = configMora.interes_diario / 100
        interesMora = Math.round(cobro.monto * tasaDiaria * diasConInteres)
        // Aplicar tope si existe
        if (configMora.monto_maximo_interes && interesMora > configMora.monto_maximo_interes) {
          interesMora = configMora.monto_maximo_interes
        }
      }
    }

    // Actualizar cobro
    const updates: any = {
      dias_atraso: diasAtraso,
      semaforo,
      interes_mora: interesMora,
      monto_total_con_interes: cobro.monto + interesMora,
    }
    if (nuevoEstado !== cobro.estado && cobro.estado !== 'parcial') {
      updates.estado = nuevoEstado
    }

    await admin.from('cobros').update(updates).eq('id', cobro.id)
    resultados.cobros_actualizados++
  }

  // =====================
  // 2. RECORDATORIOS PRE-VENCIMIENTO (5, 3, 1 días antes)
  // =====================
  const diasPre = [5, 3, 1]
  for (const diasAntes of diasPre) {
    const fechaObjetivo = new Date(hoy)
    fechaObjetivo.setDate(fechaObjetivo.getDate() + diasAntes)
    const fechaStr = fechaObjetivo.toISOString().split('T')[0]

    const { data: cobrosProximos } = await admin
      .from('cobros')
      .select('id, colegio_id, familia_id, alumno_id, monto, mes, anio, fecha_vencimiento, recordatorios_enviados, familia:familias(email, nombre_apoderado)')
      .eq('estado', 'pendiente')
      .eq('fecha_vencimiento', fechaStr)
      .lt('recordatorios_enviados', 3) // Max 3 recordatorios pre

    for (const cobro of (cobrosProximos ?? [])) {
      const c = cobro as any
      const email = c.familia?.email
      if (!email) continue

      // Enviar email de recordatorio
      try {
        await enviarEmail({
          to: email,
          subject: `AR School — Recordatorio: aporte vence el ${new Date(c.fecha_vencimiento + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#1a2332;">Recordatorio de pago</h2>
              <p>Estimado/a ${c.familia?.nombre_apoderado ?? 'Apoderado'},</p>
              <p>Le recordamos que su aporte mensual de <strong>$${c.monto.toLocaleString('es-CL')}</strong> vence en <strong>${diasAntes} día${diasAntes > 1 ? 's' : ''}</strong> (${new Date(c.fecha_vencimiento + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}).</p>
              <p>Puede realizar el pago desde la plataforma AR School o mediante transferencia bancaria.</p>
              <div style="background:#f8f9fb;border-radius:8px;padding:12px;margin:16px 0;font-size:13px;">
                <strong>Datos para transferencia:</strong><br/>
                Banco: BancoEstado · Cta. Cte. 291-0-008051-4<br/>
                RUT: 65.168.392-0 · Fund. Educacional AR Ministries<br/>
                Email: adm@arschoolglobal.com
              </div>
              <p style="font-size:12px;color:#9ca3af;">Este es un recordatorio automático de AR School Global.</p>
            </div>
          `,
        })

        // Registrar en log
        await admin.from('log_cobranza').insert({
          colegio_id: c.colegio_id,
          cobro_id: c.id,
          alumno_id: c.alumno_id,
          familia_id: c.familia_id,
          tipo: 'recordatorio_pre_vencimiento',
          detalle: `Recordatorio enviado ${diasAntes} días antes del vencimiento`,
          metadata: { dias_antes: diasAntes, email },
        })

        // Actualizar contador
        await admin.from('cobros').update({
          recordatorios_enviados: (c.recordatorios_enviados ?? 0) + 1,
          ultimo_recordatorio_at: new Date().toISOString(),
        }).eq('id', c.id)

        resultados.recordatorios_pre++
      } catch (err) {
        console.error('Error enviando recordatorio:', err)
      }
    }
  }

  // =====================
  // 3. ALERTAS POST-VENCIMIENTO (día 6, 10, 15, 20 de atraso)
  // =====================
  const diasAlerta = [1, 5, 10, 15, 20]

  const { data: cobrosVencidos } = await admin
    .from('cobros')
    .select('id, colegio_id, familia_id, alumno_id, monto, dias_atraso, ultimo_recordatorio_at, familia:familias(email, nombre_apoderado), alumno:alumnos(nombre, apellido)')
    .in('estado', ['mora'])
    .gt('dias_atraso', 0)

  for (const cobro of (cobrosVencidos ?? [])) {
    const c = cobro as any
    if (!c.familia?.email) continue

    // Solo enviar si los días de atraso coinciden con un día de alerta
    if (!diasAlerta.includes(c.dias_atraso)) continue

    // No enviar si ya se envió hoy
    if (c.ultimo_recordatorio_at) {
      const ultimoEnvio = new Date(c.ultimo_recordatorio_at).toISOString().split('T')[0]
      if (ultimoEnvio === hoyStr) continue
    }

    try {
      await enviarEmail({
        to: c.familia.email,
        subject: `AR School — Aporte vencido (${c.dias_atraso} días de atraso)`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#c53030;">Aporte vencido</h2>
            <p>Estimado/a ${c.familia?.nombre_apoderado ?? 'Apoderado'},</p>
            <p>Su aporte mensual de <strong>$${c.monto.toLocaleString('es-CL')}</strong> presenta <strong>${c.dias_atraso} día${c.dias_atraso > 1 ? 's' : ''} de atraso</strong>.</p>
            <p>Le solicitamos regularizar a la brevedad para mantener al día la cuenta del alumno <strong>${c.alumno?.nombre ?? ''} ${c.alumno?.apellido ?? ''}</strong>.</p>
            <div style="background:#fef3ec;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#9a3412;">
              El incumplimiento reiterado (2 o más plazos vencidos) puede generar la pérdida de beneficios según el contrato de prestación de servicios.
            </div>
            <p style="font-size:12px;color:#9ca3af;">Este es un recordatorio automático de AR School Global.</p>
          </div>
        `,
      })

      await admin.from('log_cobranza').insert({
        colegio_id: c.colegio_id,
        cobro_id: c.id,
        alumno_id: c.alumno_id,
        familia_id: c.familia_id,
        tipo: 'recordatorio_post_vencimiento',
        detalle: `Alerta de atraso enviada (${c.dias_atraso} días)`,
        metadata: { dias_atraso: c.dias_atraso, email: c.familia.email },
      })

      await admin.from('cobros').update({
        ultimo_recordatorio_at: new Date().toISOString(),
        recordatorios_enviados: (c.recordatorios_enviados ?? 0) + 1,
      }).eq('id', c.id)

      resultados.recordatorios_post++
    } catch (err) {
      console.error('Error alerta post-vencimiento:', err)
    }
  }

  // =====================
  // 4. NOTIFICACIONES DE VENCIMIENTO DE CONTRATO (Play/sala cuna)
  // =====================
  const enUnMes = new Date(hoy)
  enUnMes.setDate(enUnMes.getDate() + 30)
  const enUnMesStr = enUnMes.toISOString().split('T')[0]

  const { data: contratosProxVencer } = await admin
    .from('matriculas')
    .select('id, colegio_id, alumno_id, fecha_fin_contrato, familia_id, alumno:alumnos(nombre, apellido), familia:familias(email, nombre_apoderado)')
    .eq('estado', 'activa')
    .not('fecha_fin_contrato', 'is', null)
    .lte('fecha_fin_contrato', enUnMesStr)
    .gte('fecha_fin_contrato', hoyStr)

  for (const mat of (contratosProxVencer ?? [])) {
    const m = mat as any
    if (!m.familia?.email) continue
    const diasParaVencer = Math.ceil((new Date(m.fecha_fin_contrato).getTime() - hoy.getTime()) / (1000*60*60*24))
    // Solo notificar a 30, 15 y 7 días
    if (![30, 15, 7].includes(diasParaVencer)) continue

    try {
      await enviarEmail({
        to: m.familia.email,
        subject: `AR School — Contrato próximo a vencer (${diasParaVencer} días)`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1a2332;">Contrato próximo a vencer</h2>
            <p>Estimado/a ${m.familia.nombre_apoderado ?? 'Apoderado'},</p>
            <p>Le informamos que el contrato de servicios educacionales del alumno <strong>${m.alumno?.nombre ?? ''} ${m.alumno?.apellido ?? ''}</strong> vence en <strong>${diasParaVencer} días</strong> (${new Date(m.fecha_fin_contrato).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}).</p>
            <p>Para renovar, por favor contacte a la administración del colegio o espere indicaciones sobre el proceso de re-matrícula.</p>
            <p style="font-size:12px;color:#9ca3af;">Este es un recordatorio automático de AR School Global.</p>
          </div>
        `,
      })
      resultados.alertas_admin++
    } catch (err) {
      console.error('Error notificación vencimiento contrato:', err)
    }
  }

  return NextResponse.json({
    ok: true,
    fecha: hoyStr,
    resultados,
  })
}
