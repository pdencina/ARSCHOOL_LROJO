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
    sexo, comuna, prevision_salud, contacto_emergencia, telefono_emergencia, tipo_ingreso, jornada, sede,
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
      comuna: comuna || null,
      nacionalidad: nacionalidad || 'Chilena',
      necesidades_especiales: necesidades_especiales || null,
      sexo: sexo || null,
      prevision_salud: prevision_salud || null,
      contacto_emergencia: contacto_emergencia || null,
      telefono_emergencia: telefono_emergencia || null,
      jornada: jornada || 'completa',
      sede: sede || null,
      tipo_ingreso: tipo_ingreso || 'nuevo',
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

    // 4. Generar cobros del año (con beca aplicada)
    const cobrosGenerados = []
    const porcentaje_beca = body.porcentaje_beca || 0
    const factorBeca = 1 - (porcentaje_beca / 100)
    const montoMatFinal = Math.round((monto_matricula || 0) * factorBeca)
    const montoMensFinal = Math.round((monto_mensual || 0) * factorBeca)

    if (monto_mensual && meses_cobro) {
      const anio = new Date().getFullYear()
      const mesInicio = new Date().getMonth() + 1

      // Cobro de aporte inicial (si aplica)
      if (montoMatFinal > 0) {
        const { data: cobroMat } = await admin.from('cobros').insert({
          colegio_id: colegioId,
          familia_id: familiaId,
          alumno_id: (alumno as any).id,
          concepto_id: plan_cobro_id || null,
          monto: montoMatFinal,
          mes: mesInicio,
          anio,
          fecha_vencimiento: new Date().toISOString().split('T')[0],
          estado: 'pendiente',
          tipo_concepto: 'aporte_inicial',
          observaciones: `Aporte inicial ${anio}${porcentaje_beca > 0 ? ` (beca ${porcentaje_beca}%)` : ''}`,
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
          monto: montoMensFinal,
          mes,
          anio: anioC,
          fecha_vencimiento: vencimiento,
          estado: 'pendiente',
          tipo_concepto: 'aporte_mensual',
          observaciones: `Aporte mensual ${mes}/${anioC}${porcentaje_beca > 0 ? ` (beca ${porcentaje_beca}%)` : ''}`,
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

    // 6. Guardar documentos adjuntos
    const documentos = body.documentos as Record<string, string> | undefined
    if (documentos && matricula) {
      const docsToInsert = Object.entries(documentos)
        .filter(([_, url]) => url && url.length > 0)
        .map(([tipo, url]) => ({
          matricula_id: (matricula as any).id,
          alumno_id: (alumno as any).id,
          tipo,
          url,
          nombre_archivo: `${tipo}_${(alumno as any).nombre}_${(alumno as any).apellido}`,
        }))
      if (docsToInsert.length > 0) {
        await admin.from('documentos_matricula').insert(docsToInsert)
      }
    }

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
