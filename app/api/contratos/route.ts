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

// GET: Generar contrato HTML imprimible
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const matriculaId = searchParams.get('matricula_id')
  const alumnoId = searchParams.get('alumno_id')

  const admin = getAdmin()

  let alumno: any, familia: any, matricula: any, colegio: any

  if (matriculaId) {
    const { data: mat } = await admin.from('matriculas').select('*').eq('id', matriculaId).single()
    matricula = mat
    if (!matricula) return new NextResponse('Matrícula no encontrada', { status: 404 })
    const { data: al } = await admin.from('alumnos').select('*, colegio:colegios(*)').eq('id', matricula.alumno_id).single()
    alumno = al
  } else if (alumnoId) {
    const { data: al } = await admin.from('alumnos').select('*, colegio:colegios(*)').eq('id', alumnoId).single()
    alumno = al
    const { data: mat } = await admin.from('matriculas').select('*').eq('alumno_id', alumnoId).order('created_at', { ascending: false }).limit(1).single()
    matricula = mat
  }

  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })

  colegio = alumno.colegio
  const { data: fam } = await admin.from('familias').select('*').eq('alumno_id', alumno.id).limit(1).single()
  familia = fam

  const anio = matricula?.anio_escolar ?? new Date().getFullYear()
  const montoMat = matricula?.monto_matricula ?? 0
  const fechaMat = matricula?.fecha_matricula ?? new Date().toISOString().split('T')[0]

  // Obtener cobros del alumno para el año
  const { data: cobros } = await admin.from('cobros').select('monto, mes, anio').eq('alumno_id', alumno.id).eq('anio', anio).order('mes')
  const totalMensualidades = (cobros ?? []).reduce((a: number, c: any) => a + c.monto, 0)
  const cantidadCuotas = cobros?.length ?? 0
  const montoCuota = cantidadCuotas > 0 ? (cobros as any[])[0].monto : 0

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Contrato de Matrícula — ${alumno.nombre} ${alumno.apellido}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1a2332; padding: 50px; max-width: 800px; margin: 0 auto; font-size: 13px; line-height: 1.7; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #1a2332; }
    .logo { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .logo small { display: block; font-size: 11px; font-weight: 400; color: #6b7280; margin-top: 2px; }
    .info-right { text-align: right; font-size: 11px; color: #6b7280; }
    h1 { font-size: 18px; text-align: center; margin: 30px 0; text-transform: uppercase; letter-spacing: 0.05em; }
    .section { margin: 24px 0; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; border-bottom: 1px solid #e8eaed; padding-bottom: 6px; margin-bottom: 12px; }
    .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .data-item { display: flex; gap: 8px; }
    .data-label { font-weight: 600; min-width: 120px; color: #4b5563; }
    .data-value { color: #1a2332; }
    .clausulas { counter-reset: clausula; }
    .clausula { counter-increment: clausula; margin-bottom: 12px; padding-left: 24px; position: relative; }
    .clausula::before { content: counter(clausula) "."; position: absolute; left: 0; font-weight: 700; }
    .economics { background: #f8f9fb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .economics table { width: 100%; border-collapse: collapse; }
    .economics th, .economics td { padding: 6px 12px; text-align: left; font-size: 12px; }
    .economics th { font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; border-bottom: 1px solid #e8eaed; }
    .economics td { border-bottom: 1px solid #f3f4f6; }
    .economics .total { font-weight: 700; font-size: 14px; color: #1a2332; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 80px; }
    .firma { text-align: center; }
    .firma-line { border-top: 1px solid #1a2332; padding-top: 8px; margin-top: 60px; font-size: 11px; color: #6b7280; }
    .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e8eaed; padding-top: 16px; }
    .no-print { text-align: center; margin-top: 30px; }
    @media print { .no-print { display: none; } body { padding: 30px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AR SCHOOL<small>${colegio?.nombre ?? 'Gestión Educacional'}</small></div>
    <div class="info-right">
      ${colegio?.rut ? `RUT: ${colegio.rut}<br/>` : ''}
      ${colegio?.direccion ? `${colegio.direccion}<br/>` : ''}
      Contrato N° ${matricula?.id?.slice(0, 8).toUpperCase() ?? '—'}
    </div>
  </div>

  <h1>Contrato de Prestación de Servicios Educacionales</h1>

  <div class="section">
    <div class="section-title">Datos del Establecimiento</div>
    <div class="data-grid">
      <div class="data-item"><span class="data-label">Establecimiento:</span><span class="data-value">${colegio?.nombre ?? 'AR School'}</span></div>
      <div class="data-item"><span class="data-label">RUT:</span><span class="data-value">${colegio?.rut ?? '—'}</span></div>
      <div class="data-item"><span class="data-label">Dirección:</span><span class="data-value">${colegio?.direccion ?? '—'}</span></div>
      <div class="data-item"><span class="data-label">Año escolar:</span><span class="data-value">${anio}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Alumno</div>
    <div class="data-grid">
      <div class="data-item"><span class="data-label">Nombre:</span><span class="data-value">${alumno.nombre} ${alumno.apellido}</span></div>
      <div class="data-item"><span class="data-label">RUT:</span><span class="data-value">${alumno.rut ?? '—'}</span></div>
      <div class="data-item"><span class="data-label">Curso:</span><span class="data-value">${alumno.curso}</span></div>
      <div class="data-item"><span class="data-label">Fecha nacimiento:</span><span class="data-value">${alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : '—'}</span></div>
      <div class="data-item"><span class="data-label">Nacionalidad:</span><span class="data-value">${alumno.nacionalidad ?? 'Chilena'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Apoderado</div>
    <div class="data-grid">
      <div class="data-item"><span class="data-label">Nombre:</span><span class="data-value">${familia?.nombre_apoderado ?? '—'} ${familia?.apellido_apoderado ?? ''}</span></div>
      <div class="data-item"><span class="data-label">RUT:</span><span class="data-value">${familia?.rut ?? '—'}</span></div>
      <div class="data-item"><span class="data-label">Email:</span><span class="data-value">${familia?.email ?? '—'}</span></div>
      <div class="data-item"><span class="data-label">Teléfono:</span><span class="data-value">${familia?.telefono ?? '—'}</span></div>
      <div class="data-item"><span class="data-label">Dirección:</span><span class="data-value">${familia?.direccion ?? '—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Condiciones Económicas</div>
    <div class="economics">
      <table>
        <thead><tr><th>Concepto</th><th>Monto</th><th>Detalle</th></tr></thead>
        <tbody>
          <tr><td>Matrícula</td><td>$${montoMat.toLocaleString('es-CL')}</td><td>Pago único</td></tr>
          <tr><td>Mensualidad</td><td>$${montoCuota.toLocaleString('es-CL')}</td><td>${cantidadCuotas} cuotas</td></tr>
          <tr><td class="total">Total año escolar</td><td class="total">$${(montoMat + totalMensualidades).toLocaleString('es-CL')}</td><td></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cláusulas</div>
    <div class="clausulas">
      <p class="clausula">El apoderado se compromete a cumplir con el pago de la matrícula y las mensualidades en las fechas establecidas.</p>
      <p class="clausula">El establecimiento se compromete a entregar los servicios educacionales correspondientes al nivel y curso indicado.</p>
      <p class="clausula">Los pagos deberán realizarse antes del día 5 de cada mes. Pasado este plazo se considerará en mora.</p>
      <p class="clausula">El apoderado se compromete a mantener actualizados sus datos de contacto.</p>
      <p class="clausula">El presente contrato tiene vigencia por el año escolar ${anio}.</p>
      <p class="clausula">Ambas partes aceptan las condiciones estipuladas en el Reglamento Interno del establecimiento.</p>
    </div>
  </div>

  <div class="firmas">
    <div class="firma">
      <div class="firma-line">Representante del Establecimiento<br/>${colegio?.nombre ?? 'AR School'}</div>
    </div>
    <div class="firma">
      <div class="firma-line">Apoderado/a<br/>${familia?.nombre_apoderado ?? ''} ${familia?.apellido_apoderado ?? ''}</div>
    </div>
  </div>

  <div class="footer">
    Fecha de emisión: ${new Date(fechaMat).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}<br/>
    AR School · ${colegio?.nombre ?? ''} · Fundación ARM Global
  </div>

  <div class="no-print">
    <button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-top:20px;">
      Imprimir / Guardar PDF
    </button>
    <button onclick="window.close()" style="background:white;color:#1a2332;border:1px solid #e8eaed;padding:12px 32px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">
      Cerrar
    </button>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
