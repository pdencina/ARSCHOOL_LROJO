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

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')
  if (!alumnoId) return new NextResponse('alumno_id requerido', { status: 400 })

  const admin = getAdmin()
  const { data: alumno } = await admin.from('alumnos').select('*, colegio:colegios(nombre)').eq('id', alumnoId).single()
  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })

  const a = alumno as any

  // Buscar familia/apoderado
  const { data: familia } = await admin.from('familias').select('*').eq('alumno_id', alumnoId).limit(1).single()
  const f = familia as any

  // Calcular edad
  let edad = '—'
  if (a.fecha_nacimiento) {
    const parts = a.fecha_nacimiento.split('-')
    const anioNac = parseInt(parts[0])
    const hoy = new Date()
    edad = `${hoy.getFullYear() - anioNac} años`
  }

  const fechaNac = a.fecha_nacimiento ? new Date(a.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : '—'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Ficha de Emergencia — ${a.nombre} ${a.apellido}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, Arial, sans-serif; color: #1B3A5C; padding: 20px; max-width: 800px; margin: 0 auto; font-size: 12px; }
h1 { font-size: 16px; text-align: center; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.subtitle { text-align: center; color: #6b7280; font-size: 11px; margin-bottom: 16px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E8722A; padding-bottom: 12px; margin-bottom: 16px; }
.logo { font-weight: 900; font-size: 14px; }
.badge { background: #E8722A; color: white; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.card { border: 1.5px solid #e8eaed; border-radius: 8px; padding: 12px; }
.card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #E8722A; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
.card-danger .card-title { color: #c53030; }
.card-danger { border-color: #fecaca; background: #fef2f2; }
.row { display: flex; justify-content: space-between; margin-bottom: 4px; }
.row .label { color: #6b7280; font-size: 11px; }
.row .value { font-weight: 600; font-size: 11px; text-align: right; max-width: 60%; }
.full-width { grid-column: 1 / -1; }
.alert-box { background: #fef2f2; border: 2px solid #c53030; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
.alert-box h3 { color: #c53030; font-size: 12px; margin-bottom: 6px; }
.alert-box p { font-size: 11px; color: #4b5563; }
.footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 9px; }
.no-print { text-align: center; margin-top: 20px; }
@media print { .no-print { display: none; } body { padding: 10px; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo">AR SCHOOL GLOBAL</div>
  <div class="badge">FICHA DE EMERGENCIA</div>
</div>

<h1>${a.nombre} ${a.apellido}</h1>
<div class="subtitle">${a.curso ?? '—'} · ${a.colegio?.nombre ?? 'AR School'} · Edad: ${edad}</div>

<div class="grid">
  <!-- Datos personales -->
  <div class="card">
    <div class="card-title">Datos personales</div>
    <div class="row"><span class="label">RUT / Pasaporte</span><span class="value">${a.rut ?? '—'}</span></div>
    <div class="row"><span class="label">Fecha nacimiento</span><span class="value">${fechaNac}</span></div>
    <div class="row"><span class="label">Sexo</span><span class="value">${a.sexo ? a.sexo.charAt(0).toUpperCase() + a.sexo.slice(1) : '—'}</span></div>
    <div class="row"><span class="label">Nacionalidad</span><span class="value">${a.nacionalidad ?? '—'}</span></div>
    <div class="row"><span class="label">Dirección</span><span class="value">${a.direccion ?? '—'}${a.comuna ? ', ' + a.comuna : ''}</span></div>
    <div class="row"><span class="label">Previsión salud</span><span class="value">${a.prevision_salud ? a.prevision_salud.toUpperCase() : '—'}</span></div>
  </div>

  <!-- Datos médicos -->
  <div class="card card-danger">
    <div class="card-title">Información médica</div>
    <div class="row"><span class="label">Grupo sanguíneo</span><span class="value">${a.grupo_sanguineo ?? 'No informado'}</span></div>
    <div class="row"><span class="label">Alergias</span><span class="value">${a.alergias ?? 'Ninguna conocida'}</span></div>
    <div class="row"><span class="label">Medicamentos</span><span class="value">${a.medicamentos ?? 'Ninguno'}</span></div>
    <div class="row"><span class="label">Condiciones</span><span class="value">${a.condiciones_medicas ?? 'Ninguna'}</span></div>
    <div class="row"><span class="label">Centro de salud</span><span class="value">${a.centro_salud ?? 'No informado'}</span></div>
    <div class="row"><span class="label">Seguro escolar</span><span class="value">${a.seguro_escolar ?? 'No informado'}</span></div>
  </div>

  <!-- Contacto emergencia 1 -->
  <div class="card">
    <div class="card-title">Contacto emergencia 1</div>
    <div class="row"><span class="label">Nombre</span><span class="value">${a.contacto_emergencia ?? '—'}</span></div>
    <div class="row"><span class="label">Teléfono</span><span class="value" style="font-size:13px;font-weight:800;">${a.telefono_emergencia ?? '—'}</span></div>
    <div class="row"><span class="label">Parentesco</span><span class="value">${a.parentesco_emergencia ?? '—'}</span></div>
  </div>

  <!-- Contacto emergencia 2 -->
  <div class="card">
    <div class="card-title">Contacto emergencia 2</div>
    <div class="row"><span class="label">Nombre</span><span class="value">${a.contacto_emergencia_2 ?? '—'}</span></div>
    <div class="row"><span class="label">Teléfono</span><span class="value" style="font-size:13px;font-weight:800;">${a.telefono_emergencia_2 ?? '—'}</span></div>
    <div class="row"><span class="label">Parentesco</span><span class="value">${a.parentesco_emergencia_2 ?? '—'}</span></div>
  </div>

  <!-- Apoderado -->
  <div class="card">
    <div class="card-title">Apoderado titular</div>
    <div class="row"><span class="label">Nombre</span><span class="value">${f?.nombre_apoderado ?? '—'} ${f?.apellido_apoderado ?? ''}</span></div>
    <div class="row"><span class="label">RUT</span><span class="value">${f?.rut ?? '—'}</span></div>
    <div class="row"><span class="label">Teléfono</span><span class="value" style="font-size:13px;font-weight:800;">${f?.telefono ?? '—'}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${f?.email ?? '—'}</span></div>
  </div>

  <!-- Autorizaciones -->
  <div class="card">
    <div class="card-title">Autorizaciones</div>
    <div class="row"><span class="label">Traslado a centro de salud</span><span class="value">${a.autoriza_traslado !== false ? '✅ Autorizado' : '❌ No autorizado'}</span></div>
    <div class="row"><span class="label">Administrar medicamentos</span><span class="value">${a.autoriza_medicamentos ? '✅ Autorizado' : '❌ No autorizado'}</span></div>
  </div>
</div>

${(a.alergias || a.condiciones_medicas) ? `
<div class="alert-box">
  <h3>⚠️ ATENCIÓN — Información crítica</h3>
  ${a.alergias ? `<p><strong>Alergias:</strong> ${a.alergias}</p>` : ''}
  ${a.condiciones_medicas ? `<p><strong>Condiciones:</strong> ${a.condiciones_medicas}</p>` : ''}
  ${a.medicamentos ? `<p><strong>Medicamentos:</strong> ${a.medicamentos}</p>` : ''}
</div>
` : ''}

<div class="footer">
  Ficha generada por AR School Global · ${new Date().toLocaleDateString('es-CL')} · Fundación Educacional AR Ministries
</div>

<div class="no-print">
  <button onclick="window.print()" style="background:#1B3A5C;color:white;border:none;padding:10px 30px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">🖨️ Imprimir ficha</button>
  <button onclick="window.close()" style="background:white;color:#1B3A5C;border:1.5px solid #e8eaed;padding:10px 30px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button>
</div>

</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
