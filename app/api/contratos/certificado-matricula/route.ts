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

// GET /api/contratos/certificado-matricula?alumno_id=xxx
// Genera un "Certificado de Matrícula" (NO "certificado de alumno regular")
// Disponible para apoderados en su portal
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')
  if (!alumnoId) return new NextResponse('alumno_id requerido', { status: 400 })

  const admin = getAdmin()

  // Verificar que el usuario tiene acceso al alumno
  const { data: vinculo } = await admin
    .from('tutor_alumnos')
    .select('id')
    .eq('tutor_id', user.id)
    .eq('alumno_id', alumnoId)
    .limit(1)
    .single()

  // Si no es apoderado vinculado, verificar que sea admin
  if (!vinculo) {
    const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
    if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) {
      return new NextResponse('Sin permisos para ver este certificado', { status: 403 })
    }
  }

  // Obtener datos del alumno y matrícula
  const { data: alumno } = await admin
    .from('alumnos')
    .select('*, colegio:colegios(nombre)')
    .eq('id', alumnoId)
    .single()

  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })
  const al = alumno as any

  const { data: matricula } = await admin
    .from('matriculas')
    .select('*')
    .eq('alumno_id', alumnoId)
    .eq('estado', 'activa')
    .order('anio_escolar', { ascending: false })
    .limit(1)
    .single()

  if (!matricula) return new NextResponse('No hay matrícula activa para este alumno', { status: 404 })
  const m = matricula as any

  // Marcar certificado como generado
  await admin.from('matriculas').update({
    certificado_generado: true,
    certificado_generado_at: new Date().toISOString(),
  }).eq('id', m.id)

  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Certificado de Matrícula</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Times New Roman',serif; color:#1a2332; padding:60px; max-width:700px; margin:0 auto; font-size:13px; line-height:1.8; }
.header { text-align:center; margin-bottom:40px; }
.header h1 { font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:4px; }
.header .org { font-size:12px; color:#4b5563; }
.titulo { text-align:center; font-size:18px; font-weight:bold; text-transform:uppercase; letter-spacing:0.1em; margin:30px 0; border-bottom:2px solid #1a2332; padding-bottom:10px; }
.cuerpo { margin:30px 0; text-align:justify; }
.cuerpo p { margin-bottom:16px; }
.datos { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px 20px; margin:20px 0; }
.datos .row { display:flex; margin-bottom:6px; }
.datos .label { width:180px; font-weight:bold; color:#374151; flex-shrink:0; }
.datos .value { color:#1a2332; }
.firma-section { margin-top:60px; text-align:center; }
.firma-section .linea { border-top:1px solid #1a2332; width:250px; margin:0 auto; padding-top:8px; }
.firma-section .nombre { font-weight:bold; font-size:12px; }
.firma-section .cargo { font-size:11px; color:#6b7280; }
.aviso { margin-top:40px; background:#fef3ec; border:1px solid #fed7aa; border-radius:8px; padding:12px 16px; font-size:11px; color:#9a3412; }
.footer { margin-top:40px; text-align:center; color:#9ca3af; font-size:9px; border-top:1px solid #e8eaed; padding-top:12px; }
.no-print { margin-top:30px; text-align:center; }
@media print { .no-print { display:none; } .aviso { display:none; } body { padding:40px; } }
</style></head><body>

<div class="header">
  <h1>Fundación Educacional AR Ministries</h1>
  <div class="org">RUT 65.168.392-0 · ${al.colegio?.nombre ?? 'AR School Global'}</div>
</div>

<div class="titulo">Certificado de Matrícula</div>

<div class="cuerpo">
  <p>La Fundación Educacional AR Ministries certifica que el/la alumno/a cuyos datos se indican a continuación se encuentra <strong>debidamente matriculado/a</strong> en nuestro establecimiento educacional para el año escolar <strong>${m.anio_escolar}</strong>:</p>

  <div class="datos">
    <div class="row"><div class="label">Nombre completo:</div><div class="value">${al.nombre} ${al.apellido}</div></div>
    ${al.rut ? `<div class="row"><div class="label">RUT:</div><div class="value">${al.rut}</div></div>` : ''}
    ${al.fecha_nacimiento ? `<div class="row"><div class="label">Fecha de nacimiento:</div><div class="value">${new Date(al.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL')}</div></div>` : ''}
    <div class="row"><div class="label">Curso:</div><div class="value">${al.curso}</div></div>
    <div class="row"><div class="label">Nivel:</div><div class="value">${al.nivel}</div></div>
    <div class="row"><div class="label">Jornada:</div><div class="value">${al.jornada === 'completa' ? 'Completa' : 'Media jornada'}</div></div>
    <div class="row"><div class="label">Sede:</div><div class="value">${(al.sede ?? 'santiago').replace('_', ' ').replace(/^./, (c: string) => c.toUpperCase())}</div></div>
    <div class="row"><div class="label">Fecha de matrícula:</div><div class="value">${new Date(m.fecha_matricula + 'T12:00').toLocaleDateString('es-CL')}</div></div>
    <div class="row"><div class="label">Año escolar:</div><div class="value">${m.anio_escolar}</div></div>
  </div>

  <p>Se extiende el presente certificado a petición del interesado para los fines que estime convenientes.</p>
</div>

<div class="firma-section">
  <div class="linea">
    <div class="nombre">Dirección Académica</div>
    <div class="cargo">Fundación Educacional AR Ministries</div>
  </div>
</div>

<div class="aviso">
  <strong>Nota importante:</strong> Este documento certifica únicamente la matrícula del alumno. La Fundación Educacional AR Ministries, al no ser un establecimiento reconocido oficialmente por el Ministerio de Educación, no emite certificados de alumno regular. Este certificado tiene validez interna y para efectos contractuales con la institución.
</div>

<div class="footer">
  Santiago, ${fechaHoy}<br/>
  Fundación Educacional AR Ministries · RUT 65.168.392-0<br/>
  ID Matrícula: ${m.id}
</div>

<div class="no-print">
  <button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Imprimir / Guardar PDF</button>
  <button onclick="window.close()" style="background:white;color:#1a2332;border:1.5px solid #e2e8f0;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button>
</div>

</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
