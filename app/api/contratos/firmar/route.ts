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

// POST: Guardar firma digital en la matrícula
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { matricula_id, firma_data } = await request.json()
  if (!matricula_id || !firma_data) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const admin = getAdmin()

  // Guardar firma en la matrícula
  const { error } = await admin.from('matriculas').update({
    firma_apoderado: firma_data,
    firmado_at: new Date().toISOString(),
  }).eq('id', matricula_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
