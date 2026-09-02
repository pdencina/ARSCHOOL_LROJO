import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { calcularHermano } from '@/lib/descuentos-hermanos'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function limpiarRut(rut?: string | null): string {
  return (rut || '').replace(/[.\-\s]/g, '').toUpperCase()
}

// POST /api/matriculas/hermanos
// Detecta cuántos hermanos ya están matriculados para un apoderado y calcula
// qué matrícula y aporte mensual corresponde al nuevo alumno según la política 2x1.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { rut_apoderado, email_apoderado, monto_matricula, monto_mensual } = await request.json()

  if (!rut_apoderado && !email_apoderado) {
    return NextResponse.json({ error: 'Se requiere RUT o email del apoderado' }, { status: 400 })
  }

  // Buscar familias del mismo apoderado (por RUT o email) en la sede
  const { data: familias } = await admin
    .from('familias')
    .select('id, alumno_id, rut, email, nombre_apoderado, apellido_apoderado, alumno:alumnos(nombre, apellido, curso, activo)')
    .eq('colegio_id', usuario.colegio_id)

  const rutBuscar = limpiarRut(rut_apoderado)
  const emailBuscar = (email_apoderado || '').trim().toLowerCase()

  const hermanos = (familias ?? []).filter((f: any) => {
    const coincideRut = rutBuscar && limpiarRut(f.rut) === rutBuscar
    const coincideEmail = emailBuscar && (f.email || '').trim().toLowerCase() === emailBuscar
    // Solo alumnos activos cuentan para la promoción
    return (coincideRut || coincideEmail) && f.alumno?.activo !== false
  })

  // El nuevo alumno ocupa la posición siguiente
  const yaMatriculados = hermanos.length
  const orden = yaMatriculados + 1

  const base = calcularHermano(
    orden,
    Number(monto_matricula) || 0,
    Number(monto_mensual) || 0
  )

  return NextResponse.json({
    // Hermanos ya matriculados
    hermanos: hermanos.map((f: any) => ({
      nombre: `${f.alumno?.nombre ?? ''} ${f.alumno?.apellido ?? ''}`.trim(),
      curso: f.alumno?.curso ?? null,
    })),
    yaMatriculados,
    // Qué corresponde al nuevo alumno
    orden,
    pagaMatricula: base.pagaMatricula,
    montoMatriculaSugerido: base.montoMatricula,
    montoMensualSugerido: base.montoMensual,
    descuentoMensual: base.descuentoMensual,
    detalle: base.detalle,
  })
}
