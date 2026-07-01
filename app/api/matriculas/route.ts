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

// POST: Proceso completo de matrícula
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const colegioId = (ur as any).colegio_id
  const body = await request.json()
  const {
    // Datos alumno
    nombre, apellido, rut, curso, fecha_nacimiento, direccion, nacionalidad, necesidades_especiales,
    // Datos apoderado
    nombre_apoderado, apellido_apoderado, email_apoderado, telefono_apoderado, rut_apoderado, direccion_apoderado, parentesco,
    // Plan de cobro
    plan_cobro_id, monto_matricula, meses_cobro, monto_mensual,
    // Config
    crear_cuenta_apoderado, password_apoderado,
    observaciones,
  } = body

  if (!nombre || !apellido || !curso) {
    return NextResponse.json({ error: 'Nombre, apellido y curso son requeridos' }, { status: 400 })
  }

  try {
    // 1. Crear alumno
    const { data: alumno, error: errAlumno } = await admin.from('alumnos').insert({
      colegio_id: colegioId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rut: rut || null,
      curso,
      nivel: curso.toLowerCase().includes('play') || curso.toLowerCase().includes('pre') ? 'PreSchool' : 'Básico',
      fecha_nacimiento: fecha_nacimiento || null,
      direccion: direccion || null,
      nacionalidad: nacionalidad || 'Chilena',
      necesidades_especiales: necesidades_especiales || null,
      activo: true,
    }).select().single()

    if (errAlumno) return NextResponse.json({ error: `Error al crear alumno: ${errAlumno.message}` }, { status: 500 })

    // 2. Crear familia
    let familiaId = null
    if (nombre_apoderado && email_apoderado) {
      const { data: familia, error: errFam } = await admin.from('familias').insert({
        colegio_id: colegioId,
        alumno_id: (alumno as any).id,
        nombre_apoderado: nombre_apoderado.trim(),
        apellido_apoderado: (apellido_apoderado || '').trim(),
        email: email_apoderado.trim(),
        telefono: telefono_apoderado || null,
        rut: rut_apoderado || null,
        direccion: direccion_apoderado || null,
      }).select().single()

      if (!errFam) familiaId = (familia as any).id
    }

    // 3. Crear cuenta apoderado (invitación por email para que defina su password)
    let apoderadoUserId = null
    if (crear_cuenta_apoderado && email_apoderado) {
      // Usar inviteUserByEmail — Supabase envía email para que el usuario cree su password
      const { data: authData, error: authErr } = await admin.auth.admin.inviteUserByEmail(
        email_apoderado.trim(),
        { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` }
      )

      if (!authErr && authData.user) {
        apoderadoUserId = authData.user.id
        await admin.from('usuarios').upsert({
          id: authData.user.id,
          email: email_apoderado.trim(),
          nombre: nombre_apoderado.trim(),
          apellido: (apellido_apoderado || '').trim(),
          rol: 'apoderado',
          colegio_id: colegioId,
          activo: true,
        }, { onConflict: 'id' })

        // Vincular apoderado al alumno
        await admin.from('tutor_alumnos').upsert({
          tutor_id: authData.user.id,
          alumno_id: (alumno as any).id,
          parentesco: parentesco || 'apoderado',
        }, { onConflict: 'tutor_id,alumno_id' })
      }
    }

    // 4. Generar cobros del año
    const cobrosGenerados = []
    if (monto_mensual && meses_cobro) {
      const anio = new Date().getFullYear()
      const mesInicio = new Date().getMonth() + 1

      // Cobro de matrícula (si aplica)
      if (monto_matricula && monto_matricula > 0) {
        const { data: cobroMat } = await admin.from('cobros').insert({
          colegio_id: colegioId,
          familia_id: familiaId,
          alumno_id: (alumno as any).id,
          concepto_id: plan_cobro_id || null,
          monto: monto_matricula,
          mes: mesInicio,
          anio,
          fecha_vencimiento: new Date().toISOString().split('T')[0],
          estado: 'pendiente',
          observaciones: 'Matrícula ' + anio,
        }).select().single()
        if (cobroMat) cobrosGenerados.push(cobroMat)
      }

      // Cobros mensuales
      for (let i = 0; i < meses_cobro; i++) {
        const mes = ((mesInicio - 1 + i) % 12) + 1
        const anioC = mesInicio + i > 12 ? anio + 1 : anio
        const vencimiento = `${anioC}-${String(mes).padStart(2, '0')}-05`

        const { data: cobro } = await admin.from('cobros').insert({
          colegio_id: colegioId,
          familia_id: familiaId,
          alumno_id: (alumno as any).id,
          concepto_id: plan_cobro_id || null,
          monto: monto_mensual,
          mes,
          anio: anioC,
          fecha_vencimiento: vencimiento,
          estado: 'pendiente',
          observaciones: `Mensualidad ${mes}/${anioC}`,
        }).select().single()
        if (cobro) cobrosGenerados.push(cobro)
      }
    }

    // 5. Crear registro de matrícula
    const { data: matricula } = await admin.from('matriculas').insert({
      colegio_id: colegioId,
      alumno_id: (alumno as any).id,
      familia_id: familiaId,
      plan_cobro_id: plan_cobro_id || null,
      monto_matricula: monto_matricula || 0,
      observaciones,
      registrado_por: user.id,
    }).select().single()

    return NextResponse.json({
      ok: true,
      alumno,
      familia_id: familiaId,
      apoderado_user_id: apoderadoUserId,
      cobros_generados: cobrosGenerados.length,
      matricula,
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error interno' }, { status: 500 })
  }
}

// GET: Listar matrículas del colegio
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data } = await admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido, curso, rut), familia:familias(nombre_apoderado, apellido_apoderado, email)')
    .eq('colegio_id', (ur as any).colegio_id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
