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

// GET /api/control/autorizados?alumno_id=xxx
// Retorna lista de personas autorizadas para retirar al alumno
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')
  if (!alumnoId) return NextResponse.json({ error: 'alumno_id requerido' }, { status: 400 })

  const admin = getAdmin()
  const autorizados: { nombre: string; rut?: string; parentesco?: string }[] = []

  // 1. Familia (apoderado principal)
  const { data: familias } = await admin
    .from('familias')
    .select('nombre_apoderado, apellido_apoderado, rut, telefono')
    .eq('alumno_id', alumnoId)

  if (familias) {
    for (const f of familias as any[]) {
      if (f.nombre_apoderado) {
        autorizados.push({
          nombre: `${f.nombre_apoderado} ${f.apellido_apoderado || ''}`.trim(),
          rut: f.rut || undefined,
          parentesco: 'Apoderado',
        })
      }
    }
  }

  // 2. Personas de retiro registradas
  const { data: retiros } = await admin
    .from('personas_retiro')
    .select('nombre, rut, parentesco')
    .eq('alumno_id', alumnoId)
    .eq('activo', true)

  if (retiros) {
    for (const r of retiros as any[]) {
      if (r.nombre) {
        autorizados.push({
          nombre: r.nombre,
          rut: r.rut || undefined,
          parentesco: r.parentesco || undefined,
        })
      }
    }
  }

  return NextResponse.json(autorizados)
}
