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

// GET /api/control/hermanos?alumno_id=xxx
// Retorna hermanos del alumno (comparten apoderado por email o RUT en familias)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')
  if (!alumnoId) return NextResponse.json({ error: 'alumno_id requerido' }, { status: 400 })

  const admin = getAdmin()

  // Obtener datos de familia del alumno seleccionado
  const { data: familiaAlumno } = await admin
    .from('familias')
    .select('email, rut')
    .eq('alumno_id', alumnoId)
    .limit(1)
    .single()

  if (!familiaAlumno) return NextResponse.json([])

  const fam = familiaAlumno as any
  const condiciones: string[] = []

  // Buscar otros alumnos con mismo email o RUT de apoderado
  let hermanoIds: string[] = []

  if (fam.email) {
    const { data: porEmail } = await admin
      .from('familias')
      .select('alumno_id')
      .eq('email', fam.email)
      .neq('alumno_id', alumnoId)
    if (porEmail) hermanoIds.push(...(porEmail as any[]).map(f => f.alumno_id))
  }

  if (fam.rut) {
    const { data: porRut } = await admin
      .from('familias')
      .select('alumno_id')
      .eq('rut', fam.rut)
      .neq('alumno_id', alumnoId)
    if (porRut) {
      const nuevos = (porRut as any[]).map(f => f.alumno_id).filter(id => !hermanoIds.includes(id))
      hermanoIds.push(...nuevos)
    }
  }

  if (hermanoIds.length === 0) return NextResponse.json([])

  // Obtener datos de los hermanos (solo activos)
  const { data: hermanos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, curso')
    .in('id', hermanoIds)
    .eq('activo', true)
    .order('apellido')

  return NextResponse.json(hermanos ?? [])
}
