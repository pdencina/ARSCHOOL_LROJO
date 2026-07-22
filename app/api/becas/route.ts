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

// GET: Listar becas del colegio (filtrable por año y estado)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const anio = searchParams.get('anio')
  const estado = searchParams.get('estado')

  let query = admin
    .from('becas')
    .select('*, alumno:alumnos(nombre, apellido, curso, rut), familia:familias(nombre_apoderado, apellido_apoderado, email)')
    .eq('colegio_id', (ur as any).colegio_id)
    .order('created_at', { ascending: false })

  if (anio) query = query.eq('anio_escolar', parseInt(anio))
  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: Crear/postular nueva beca
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { alumno_id, tipo, porcentaje, anio_escolar, observaciones } = body

  if (!alumno_id || !tipo || !porcentaje || !anio_escolar) {
    return NextResponse.json({ error: 'Datos incompletos: alumno, tipo, porcentaje y año son requeridos' }, { status: 400 })
  }

  if (porcentaje <= 0 || porcentaje > 100) {
    return NextResponse.json({ error: 'Porcentaje debe ser entre 1 y 100' }, { status: 400 })
  }

  // Obtener familia_id del alumno
  const { data: familia } = await admin
    .from('familias')
    .select('id')
    .eq('alumno_id', alumno_id)
    .limit(1)
    .single()

  const { data, error } = await admin.from('becas').insert({
    colegio_id: (ur as any).colegio_id,
    alumno_id,
    familia_id: familia?.id ?? null,
    tipo,
    porcentaje,
    anio_escolar,
    estado: tipo === 'especial' ? 'aprobada' : 'postulada',
    observaciones: observaciones || null,
    // Si es especial, se aprueba automáticamente por quien la crea
    ...(tipo === 'especial' ? {
      aprobado_por: user.id,
      fecha_resolucion: new Date().toISOString(),
    } : {}),
  }).select().single()

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return NextResponse.json({ error: `Este alumno ya tiene una beca para el año ${anio_escolar}` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PUT: Cambiar estado de beca (aprobar, rechazar, revocar, activar)
export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Solo admin o pastor de campus pueden gestionar becas' }, { status: 403 })
  }

  const body = await request.json()
  const { beca_id, accion, motivo, porcentaje } = body

  if (!beca_id || !accion) {
    return NextResponse.json({ error: 'beca_id y accion son requeridos' }, { status: 400 })
  }

  const acciones: Record<string, any> = {
    revisar: {
      estado: 'en_revision',
      revisado_por: user.id,
      fecha_revision: new Date().toISOString(),
    },
    aprobar: {
      estado: 'aprobada',
      aprobado_por: user.id,
      fecha_resolucion: new Date().toISOString(),
      ...(porcentaje ? { porcentaje } : {}),
    },
    rechazar: {
      estado: 'rechazada',
      aprobado_por: user.id,
      fecha_resolucion: new Date().toISOString(),
      motivo_resolucion: motivo || null,
    },
    activar: {
      estado: 'vigente',
    },
    revocar: {
      estado: 'revocada',
      motivo_resolucion: motivo || null,
    },
    vencer: {
      estado: 'vencida',
    },
  }

  if (!acciones[accion]) {
    return NextResponse.json({ error: `Acción inválida: ${accion}. Válidas: revisar, aprobar, rechazar, activar, revocar, vencer` }, { status: 400 })
  }

  const { data, error } = await admin
    .from('becas')
    .update(acciones[accion])
    .eq('id', beca_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: Eliminar postulación (solo si está en estado postulada)
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  // Solo se puede eliminar si está en estado postulada
  const { data: beca } = await admin.from('becas').select('estado').eq('id', id).single()
  if (!beca) return NextResponse.json({ error: 'Beca no encontrada' }, { status: 404 })
  if ((beca as any).estado !== 'postulada') {
    return NextResponse.json({ error: 'Solo se pueden eliminar becas en estado "postulada"' }, { status: 400 })
  }

  const { error } = await admin.from('becas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
