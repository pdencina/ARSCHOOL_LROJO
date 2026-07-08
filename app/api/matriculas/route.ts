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
    observaciones, firma_apoderado,
  } = body

  if (!nombre || !apellido || !curso) {
    return NextResponse.json({ error: 'Nombre, apellido y curso son requeridos' }, { status: 400 })
  }

  try {
    // 1. Crear alumno
    const nivelAuto = curso.toLowerCase().includes('play') || curso.toLowerCase().includes('pre school')
      ? 'PreSchool'
      : curso.toLowerCase().includes('kinder')
        ? 'Kinder'
        : curso.toLowerCase().includes('elementary')
          ? 'Elementary'
          : curso.toLowerCase().includes('middle')
            ? 'Middle School'
            : curso.toLowerCase().includes('high')
              ? 'High School'
              : 'Elementary'

    const { data: alumno, error: errAlumno } = await admin.from('alumnos').insert({
      colegio_id: colegioId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rut: rut || null,
      curso,
      nivel: nivelAuto,
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

    // 3. Crear cuenta apoderado y enviar invitación por Resend (sin SMTP de Supabase)
    let apoderadoUserId = null
    if (crear_cuenta_apoderado && email_apoderado) {
      // Crear usuario con password temporal (el apoderado lo cambiará via link)
      const tempPassword = crypto.randomUUID()
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: email_apoderado.trim(),
        password: tempPassword,
        email_confirm: true, // Marcar email como confirmado
      })

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

        // Generar link de reset password para que el apoderado cree su clave
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: email_apoderado.trim(),
          options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` },
        })

        // El action_link de Supabase tiene formato:
        // https://SUPABASE_URL/auth/v1/verify?token=XXX&type=recovery&redirect_to=...
        // Lo transformamos para que pase por nuestro auth/confirm endpoint
        let linkAcceso = linkData?.properties?.action_link ?? ''
        if (linkAcceso) {
          // Extraer los params del link de Supabase y redirigir via nuestro endpoint
          const url = new URL(linkAcceso)
          const token_hash = url.searchParams.get('token')
          const type = url.searchParams.get('type') || 'recovery'
          // Construir link que pase por nuestro propio endpoint de confirmación
          linkAcceso = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${token_hash}&type=${type}&next=/reset-password`
        }

        // Enviar email de bienvenida con Resend
        if (linkAcceso) {
          const { enviarEmail, templateInvitacionApoderado } = await import('@/lib/email')
          const nombreCompleto = `${nombre_apoderado.trim()} ${(apellido_apoderado || '').trim()}`.trim()
          const alumnoNombre = `${nombre.trim()} ${apellido.trim()}`
          const emailResult = await enviarEmail({
            to: email_apoderado.trim(),
            subject: `Bienvenido/a a AR School - Cuenta creada para ${alumnoNombre}`,
            html: templateInvitacionApoderado(nombreCompleto, alumnoNombre, linkAcceso),
          })
          console.log('Email enviado:', emailResult)
        } else {
          console.error('No se pudo generar link de acceso. linkData:', JSON.stringify(linkData))
        }
      } else if (authErr?.message?.includes('already been registered')) {
        // Si el usuario ya existe, vincularlo Y enviar email de bienvenida
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email_apoderado.trim())
        if (existingUser) {
          apoderadoUserId = existingUser.id
          await admin.from('usuarios').upsert({
            id: existingUser.id,
            email: email_apoderado.trim(),
            nombre: nombre_apoderado.trim(),
            apellido: (apellido_apoderado || '').trim(),
            rol: 'apoderado',
            colegio_id: colegioId,
            activo: true,
          }, { onConflict: 'id' })
          await admin.from('tutor_alumnos').upsert({
            tutor_id: existingUser.id,
            alumno_id: (alumno as any).id,
            parentesco: parentesco || 'apoderado',
          }, { onConflict: 'tutor_id,alumno_id' })

          // Enviar email de bienvenida igual
          const { data: linkData } = await admin.auth.admin.generateLink({
            type: 'recovery',
            email: email_apoderado.trim(),
            options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` },
          })
          let linkAcceso2 = linkData?.properties?.action_link ?? ''
          if (linkAcceso2) {
            const url = new URL(linkAcceso2)
            const token_hash = url.searchParams.get('token')
            const type = url.searchParams.get('type') || 'recovery'
            linkAcceso2 = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${token_hash}&type=${type}&next=/reset-password`
          }
          if (linkAcceso2) {
            const { enviarEmail, templateInvitacionApoderado } = await import('@/lib/email')
            const nombreCompleto = `${nombre_apoderado.trim()} ${(apellido_apoderado || '').trim()}`.trim()
            const alumnoNombre = `${nombre.trim()} ${apellido.trim()}`
            const emailResult = await enviarEmail({
              to: email_apoderado.trim(),
              subject: `Bienvenido/a a AR School - Cuenta creada para ${alumnoNombre}`,
              html: templateInvitacionApoderado(nombreCompleto, alumnoNombre, linkAcceso2),
            })
            console.log('Email enviado (usuario existente):', emailResult)
          } else {
            console.error('No se pudo generar link (usuario existente). linkData:', JSON.stringify(linkData))
          }
        }
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
      monto_mensual: monto_mensual || 0,
      observaciones,
      registrado_por: user.id,
      firma_apoderado: firma_apoderado || null,
      firmado_at: firma_apoderado ? new Date().toISOString() : null,
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
