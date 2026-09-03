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
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
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
    await admin.from('alumnos').update({ activo: true }).eq('id', id)
    return NextResponse.json({ ok: true, estado: 'activo' })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
