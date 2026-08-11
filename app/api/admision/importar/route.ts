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

// POST /api/admision/importar
// Convierte una pre-admisión en datos pre-llenados para el formulario de matrícula
// O directamente ejecuta la matrícula completa
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { pre_admision_id, accion } = await request.json()
  if (!pre_admision_id) return NextResponse.json({ error: 'pre_admision_id requerido' }, { status: 400 })

  const { data: preAdm } = await admin.from('pre_admisiones').select('*').eq('id', pre_admision_id).single()
  if (!preAdm) return NextResponse.json({ error: 'Pre-admisión no encontrada' }, { status: 404 })
  const pa = preAdm as any

  // Acción: cambiar estado
  if (accion === 'aprobar') {
    await admin.from('pre_admisiones').update({ estado: 'aprobada', revisado_por: user.id, revisado_at: new Date().toISOString() }).eq('id', pre_admision_id)
    return NextResponse.json({ ok: true, estado: 'aprobada' })
  }

  if (accion === 'rechazar') {
    const { motivo } = await request.json().catch(() => ({ motivo: '' }))
    await admin.from('pre_admisiones').update({ estado: 'rechazada', motivo_rechazo: motivo || 'Sin cupo disponible', revisado_por: user.id, revisado_at: new Date().toISOString() }).eq('id', pre_admision_id)
    return NextResponse.json({ ok: true, estado: 'rechazada' })
  }

  // Acción por defecto: devolver datos formateados para pre-llenar matrícula
  const datosMatricula = {
    // Alumno
    nombre: pa.alumno_nombre,
    apellido: pa.alumno_apellido,
    rut: pa.alumno_rut,
    fecha_nacimiento: pa.alumno_fecha_nacimiento,
    sexo: pa.alumno_sexo,
    curso: pa.curso_solicitado,
    jornada: pa.jornada,
    sede: pa.sede,
    modalidad: pa.modalidad,
    nacionalidad: pa.alumno_nacionalidad,
    pais_natal: pa.alumno_pais_natal,
    direccion: pa.alumno_direccion,
    comuna: pa.alumno_comuna,
    tipo_ingreso: 'nuevo',
    // Salud
    prevision_salud: pa.prevision_salud,
    alergia_alimentaria: pa.alergia_alimentaria,
    alergia_medicamento: pa.alergia_medicamento,
    enfermedad_cronica: pa.enfermedad_cronica,
    centro_salud_emergencia: pa.centro_salud_emergencia,
    diagnostico: pa.diagnostico,
    contacto_especialista: pa.contacto_especialista,
    // Académico
    jardin_previo: pa.jardin_previo,
    ultimo_anio_aprobado: pa.ultimo_anio_aprobado,
    ha_reprobado: pa.ha_reprobado,
    curso_reprobado: pa.curso_reprobado,
    // Emergencia
    contacto_emergencia: pa.contacto_emergencia,
    telefono_emergencia: pa.telefono_emergencia,
    // Apoderado
    nombre_apoderado: pa.apoderado_nombre,
    apellido_apoderado: pa.apoderado_apellido,
    rut_apoderado: pa.apoderado_rut,
    email_apoderado: pa.apoderado_email,
    telefono_apoderado: pa.apoderado_telefono,
    direccion_apoderado: pa.apoderado_direccion,
    parentesco: pa.apoderado_parentesco,
    // Padre
    nombre_padre: pa.padre_nombre,
    apellido_padre: pa.padre_apellido,
    rut_padre: pa.padre_rut,
    telefono_padre: pa.padre_telefono,
    email_padre: pa.padre_email,
    direccion_padre: pa.padre_direccion,
    // Retiro
    retiro_nombre: pa.retiro_nombre,
    retiro_parentesco: pa.retiro_parentesco,
    retiro_rut: pa.retiro_rut,
    retiro_telefono: pa.retiro_telefono,
    // Documentos ya subidos
    documentos: pa.documentos || {},
    // ID de pre-admisión para actualizar estado después
    _pre_admision_id: pre_admision_id,
  }

  // Marcar como en revisión
  await admin.from('pre_admisiones').update({ estado: 'en_revision', revisado_por: user.id, revisado_at: new Date().toISOString() }).eq('id', pre_admision_id)

  return NextResponse.json({ ok: true, datos: datosMatricula })
}
