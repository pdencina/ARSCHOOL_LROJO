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

// POST /api/alumnos/[id]/estado — Retirar o reactivar un alumno
// body: { accion: 'retirar' | 'reactivar', motivo?, fecha? }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, programa_ids').eq('id', user.id).single()
  // Retirar/reactivar es sensible: solo administración y coordinador
  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = params
  const { accion, motivo, fecha } = await request.json()

  const { data: alumno } = await admin.from('alumnos').select('id, nombre, apellido, activo').eq('id', id).single()
  if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

  if (accion === 'retirar') {
    const fechaRetiro = fecha || new Date().toISOString().split('T')[0]

    // Desactivar alumno
    await admin.from('alumnos').update({ activo: false }).eq('id', id)

    // Finalizar inscripciones a programas
    await admin.from('inscripciones_programa')
      .update({ estado: 'finalizada', fecha_fin: fechaRetiro })
      .eq('alumno_id', id)
      .in('estado', ['activa', 'prueba'])

    // Anular cobros PENDIENTES (no los pagados)
    const nota = `[Retiro ${fechaRetiro}]${motivo ? ' ' + motivo : ''}`
    await admin.from('cobros')
      .update({ estado: 'anulado', observaciones: nota })
      .eq('alumno_id', id)
      .in('estado', ['pendiente', 'mora', 'parcial'])

    // Registrar el motivo en la ficha del alumno (campo de notas del coordinador)
    if (motivo) {
      const { data: a } = await admin.from('alumnos').select('notas_coordinador').eq('id', id).single()
      const previo = (a as any)?.notas_coordinador || ''
      const linea = `Retiro (${fechaRetiro}): ${motivo}`
      await admin.from('alumnos')
        .update({ notas_coordinador: previo ? `${previo}\n${linea}` : linea })
        .eq('id', id)
        .then(() => {}, () => {})
    }

    return NextResponse.json({ ok: true, estado: 'retirado', fecha: fechaRetiro })
  }

  if (accion === 'reactivar') {
    const { error } = await admin.from('alumnos').update({ activo: true }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Reabrir las inscripciones cerradas en la última baja (si no, el alumno sigue sin
    // aparecer en su programa). El coordinador reabre solo las de sus programas.
    const { data: finalizadas } = await admin
      .from('inscripciones_programa')
      .select('id, programa_id, fecha_fin')
      .eq('alumno_id', id)
      .eq('estado', 'finalizada')
    let reabrir = (finalizadas as any[]) ?? []
    const progCoord: string[] = (ur as any)?.rol === 'coordinador' ? ((ur as any)?.programa_ids ?? []) : []
    if (progCoord.length) {
      reabrir = reabrir.filter(i => progCoord.includes(i.programa_id))
    } else if (reabrir.length) {
      const ultima = reabrir.map(i => i.fecha_fin ?? '').sort().pop()
      reabrir = reabrir.filter(i => (i.fecha_fin ?? '') === ultima)
    }
    if (reabrir.length) {
      const { error: eInsc } = await admin
        .from('inscripciones_programa')
        .update({ estado: 'activa', fecha_fin: null })
        .in('id', reabrir.map(i => i.id))
      if (eInsc) return NextResponse.json({ error: `Alumno reactivado, pero no se reabrió su inscripción: ${eInsc.message}` }, { status: 500 })
    }
    return NextResponse.json({ ok: true, estado: 'activo', inscripciones_reabiertas: reabrir.length })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
