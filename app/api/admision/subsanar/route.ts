import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/admision/subsanar — Público, sin auth
// El apoderado corrige documentos/datos y re-envía
export async function POST(request: NextRequest) {
  const admin = getAdmin()
  const body = await request.json()
  const { codigo, documentos, observaciones_apoderado } = body

  if (!codigo) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  // Buscar la pre-admisión
  const { data: pa } = await admin
    .from('pre_admisiones')
    .select('id, estado, documentos, colegio_id, codigo_seguimiento, alumno_nombre, alumno_apellido, curso_solicitado')
    .eq('codigo_seguimiento', codigo.toUpperCase().trim())
    .single()

  if (!pa) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

  if ((pa as any).estado === 'matriculada' || (pa as any).estado === 'rechazada') {
    return NextResponse.json({ error: 'Esta solicitud ya no puede ser modificada' }, { status: 400 })
  }

  // Merge documentos: mantener los existentes + agregar/reemplazar nuevos
  const docsExistentes = (pa as any).documentos || {}
  const docsMerged = { ...docsExistentes, ...documentos }

  // Actualizar
  const { error } = await admin.from('pre_admisiones').update({
    documentos: docsMerged,
    observaciones_apoderado: observaciones_apoderado || null,
    estado: 'pendiente', // Vuelve a pendiente para re-revisión
    updated_at: new Date().toISOString(),
  }).eq('id', (pa as any).id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Avisar al equipo de admisión de la sede que hay correcciones por revisar
  const p = pa as any
  if (p.colegio_id) {
    try {
      const { notificarAdmisionEquipo } = await import('@/lib/notificaciones')
      await notificarAdmisionEquipo(p.colegio_id, {
        tipo: 'corregida',
        codigo: p.codigo_seguimiento,
        alumno: `${p.alumno_nombre ?? ''} ${p.alumno_apellido ?? ''}`.trim(),
        curso: p.curso_solicitado,
      })
    } catch (e) {
      console.error('Error notificando al equipo de admisión:', e)
    }
  }

  return NextResponse.json({ ok: true, mensaje: 'Correcciones recibidas. La solicitud será revisada nuevamente.' })
}
