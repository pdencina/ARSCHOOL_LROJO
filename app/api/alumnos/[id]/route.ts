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

// PUT: Actualizar datos del alumno
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'gestor_admision', 'tutor'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  
  // Campos editables
  const camposPermitidos = [
    'nombre', 'apellido', 'rut', 'curso', 'fecha_nacimiento', 'sexo',
    'direccion', 'comuna', 'nacionalidad', 'prevision_salud',
    'contacto_emergencia', 'telefono_emergencia', 'parentesco_emergencia',
    'contacto_emergencia_2', 'telefono_emergencia_2', 'parentesco_emergencia_2',
    'grupo_sanguineo', 'alergias', 'medicamentos', 'condiciones_medicas',
    'centro_salud', 'seguro_escolar', 'necesidades_especiales',
    'autoriza_traslado', 'autoriza_medicamentos',
    'jornada', 'sede', 'tipo_ingreso',
  ]

  const updates: Record<string, any> = {}
  for (const key of camposPermitidos) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { data, error } = await admin.from('alumnos').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
