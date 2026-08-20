import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdminClient()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data } = await admin.from('usuarios').select('*, colegio:colegios(nombre)').order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdminClient()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { nombre, apellido, email, rol, colegio_id } = await request.json()
  if (!email || !nombre || !colegio_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Verificar si ya existe en public.usuarios
  const { data: existente } = await admin.from('usuarios').select('id').eq('email', email).single()
  if (existente) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
  }

  // 1. Crear usuario en Supabase Auth con password temporal
  const tempPassword = crypto.randomUUID()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError) {
    // Si ya existe en auth pero no en usuarios, recuperar el ID
    if (authError.message?.includes('already been registered')) {
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find((u: any) => u.email === email)
      if (existing) {
        const { data: nuevoUsuario, error: dbError } = await admin.from('usuarios').upsert({
          id: existing.id, email, nombre: nombre.trim(), apellido: apellido?.trim() ?? '',
          rol, colegio_id, activo: true,
        }, { onConflict: 'id' }).select().single()
        if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
        return NextResponse.json(nuevoUsuario, { status: 201 })
      }
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. Insertar en tabla usuarios
  const { data: nuevoUsuario, error: dbError } = await admin.from('usuarios').upsert({
    id: authData.user.id,
    email,
    nombre: nombre.trim(),
    apellido: apellido?.trim() ?? '',
    rol,
    colegio_id,
    programa_ids: body.programa_ids || null,
    sedes_ids: body.sedes_ids || null,
    activo: true,
  }, { onConflict: 'id' }).select().single()

  if (dbError) {
    // Rollback: eliminar usuario de auth
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // 3. Generar link de reset password y enviar email de bienvenida
  try {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` },
    })

    let linkAcceso = linkData?.properties?.action_link ?? ''
    if (linkAcceso) {
      const url = new URL(linkAcceso)
      const token_hash = url.searchParams.get('token')
      const type = url.searchParams.get('type') || 'recovery'
      linkAcceso = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${token_hash}&type=${type}&next=/reset-password`
    }

    if (linkAcceso) {
      const { enviarEmail } = await import('@/lib/email')
      const nombreCompleto = `${nombre.trim()} ${(apellido || '').trim()}`.trim()
      const rolDisplay: Record<string, string> = {
        super_admin: 'Administrador General',
        admin: 'Administrador',
        pastor_campus: 'Pastor de Campus',
        gestor_admision: 'Gestor de Admisión',
        tutor: 'Tutor / Docente',
        apoderado: 'Apoderado',
      }

      await enviarEmail({
        to: email,
        subject: 'Bienvenido/a a AR School — Tu cuenta ha sido creada',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:550px;margin:0 auto;padding:0;">
            <!-- Header -->
            <div style="background:#1B3A5C;padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;">
              <img src="${process.env.NEXT_PUBLIC_SITE_URL}/logo-fundacion.png" alt="AR School" style="height:40px;margin-bottom:12px;"/>
              <h1 style="color:white;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.02em;">Bienvenido/a a AR School</h1>
              <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:6px 0 0;">Plataforma de Gestión Educacional</p>
            </div>

            <!-- Body -->
            <div style="background:white;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;">
              <p style="color:#1B3A5C;font-size:15px;font-weight:600;margin:0 0 8px;">Hola ${nombreCompleto},</p>
              <p style="color:#4b5563;font-size:13px;line-height:1.7;margin:0 0 20px;">
                Se ha creado tu cuenta en la plataforma AR School. Desde aquí podrás gestionar todos los procesos educacionales del Centro Educativo.
              </p>

              <!-- Info card -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:0 0 24px;">
                <div style="display:flex;margin-bottom:8px;">
                  <span style="color:#6b7280;font-size:11px;width:60px;">Email:</span>
                  <span style="color:#1B3A5C;font-size:11px;font-weight:600;">${email}</span>
                </div>
                <div style="display:flex;">
                  <span style="color:#6b7280;font-size:11px;width:60px;">Rol:</span>
                  <span style="color:#1B3A5C;font-size:11px;font-weight:600;">${rolDisplay[rol] || rol}</span>
                </div>
              </div>

              <p style="color:#4b5563;font-size:13px;line-height:1.6;margin:0 0 24px;">
                Para comenzar, crea tu contraseña haciendo clic en el siguiente botón:
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${linkAcceso}" style="display:inline-block;background:#1B3A5C;color:white;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">
                  Crear mi contraseña
                </a>
              </div>

              <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0 0 16px;">
                Este enlace expira en 24 horas. Si no solicitaste esta cuenta, puedes ignorar este mensaje.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;"/>

              <!-- What you can do -->
              <p style="color:#1B3A5C;font-size:12px;font-weight:600;margin:0 0 8px;">¿Qué puedes hacer en AR School?</p>
              <ul style="color:#6b7280;font-size:11px;line-height:1.8;margin:0;padding-left:16px;">
                <li>Gestionar matrículas y admisiones</li>
                <li>Firmar contratos digitalmente</li>
                <li>Seguimiento de asistencia y evaluaciones</li>
                <li>Comunicación directa con apoderados</li>
                <li>Panel de cobranza y reportes</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="background:#f9fafb;padding:20px 24px;text-align:center;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <p style="color:#9ca3af;font-size:10px;margin:0;line-height:1.6;">
                Fundación Educacional AR Ministries · RUT 65.168.392-0<br/>
                Victoria 52, Santiago · www.arschoolglobal.com
              </p>
            </div>
          </div>
        `,
      })
    }
  } catch (emailErr) {
    console.error('Error enviando email de bienvenida:', emailErr)
    // No fallar la creación del usuario si el email falla
  }

  return NextResponse.json(nuevoUsuario, { status: 201 })
}