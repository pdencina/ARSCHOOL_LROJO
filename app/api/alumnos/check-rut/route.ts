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

// GET /api/alumnos/check-rut?rut=12.345.678-9
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ existe: false })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id

  const { searchParams } = new URL(request.url)
  const rut = searchParams.get('rut')
  if (!rut) return NextResponse.json({ existe: false })

  const { data: alumno } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, curso, activo')
    .eq('colegio_id', colegioId)
    .eq('rut', rut)
    .limit(1)
    .single()

  if (alumno) {
    return NextResponse.json({ existe: true, alumno })
  }

  return NextResponse.json({ existe: false })
}
