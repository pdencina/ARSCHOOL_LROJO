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

// GET: Generar boletín HTML para un alumno (imprimible como PDF)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')
  if (!alumnoId) return new NextResponse('alumno_id requerido', { status: 400 })

  const admin = getAdmin()

  // Datos del alumno
  const { data: alumno } = await admin.from('alumnos').select('*, colegio:colegios(nombre)').eq('id', alumnoId).single()
  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })

  // Calificaciones del alumno con evaluaciones
  const { data: calificaciones } = await admin
    .from('calificaciones')
    .select('nota, evaluacion:evaluaciones(nombre, materia, fecha)')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })

  // Asistencias
  const { data: asistencias } = await admin
    .from('asistencias')
    .select('estado')
    .eq('alumno_id', alumnoId)

  const totalAsist = asistencias?.length ?? 0
  const presentes = asistencias?.filter((a: any) => a.estado === 'presente').length ?? 0
  const pctAsist = totalAsist > 0 ? Math.round(presentes / totalAsist * 100) : 0

  // Agrupar por materia
  const porMateria: Record<string, number[]> = {}
  ;(calificaciones ?? []).forEach((c: any) => {
    const materia = c.evaluacion?.materia ?? 'Otro'
    if (!porMateria[materia]) porMateria[materia] = []
    porMateria[materia].push(c.nota)
  })

  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  const al = alumno as any

  // Generar HTML del boletín
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Boletín - ${al.nombre} ${al.apellido}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1a2332; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #1a2332; }
    .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .logo small { display: block; font-size: 11px; font-weight: 400; color: #6b7280; letter-spacing: 0.05em; }
    .info { text-align: right; font-size: 12px; color: #6b7280; }
    .student { background: #f8f9fb; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .student h2 { font-size: 18px; margin-bottom: 4px; }
    .student p { font-size: 13px; color: #6b7280; }
    .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 24px 0 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; padding: 8px 12px; border-bottom: 1px solid #e8eaed; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .pct { font-weight: 700; font-size: 15px; }
    .pct.high { color: #1a7a4c; }
    .pct.mid { color: #b7791f; }
    .pct.low { color: #c53030; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; }
    .summary-card { flex: 1; background: #f8f9fb; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card .val { font-size: 24px; font-weight: 700; }
    .summary-card .lbl { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8eaed; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AR SCHOOL<small>${al.colegio?.nombre ?? 'Gestión Educacional'}</small></div>
    <div class="info">Boletín de evaluación<br/>${fecha}</div>
  </div>

  <div class="student">
    <h2>${al.nombre} ${al.apellido}</h2>
    <p>${al.curso} · ${al.rut ?? ''}</p>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="val">${Object.keys(porMateria).length > 0 ? Math.round(Object.values(porMateria).flat().reduce((a, b) => a + b, 0) / Object.values(porMateria).flat().length) + '%' : '—'}</div>
      <div class="lbl">Logro general</div>
    </div>
    <div class="summary-card">
      <div class="val">${pctAsist}%</div>
      <div class="lbl">Asistencia</div>
    </div>
    <div class="summary-card">
      <div class="val">${Object.values(porMateria).flat().length}</div>
      <div class="lbl">Evaluaciones</div>
    </div>
  </div>

  <div class="section-title">Resultados por materia</div>
  <table>
    <thead><tr><th>Materia</th><th>Evaluaciones</th><th>Promedio de logro</th></tr></thead>
    <tbody>
      ${Object.entries(porMateria).map(([materia, notas]) => {
        const prom = Math.round(notas.reduce((a, b) => a + b, 0) / notas.length)
        const cls = prom >= 80 ? 'high' : prom >= 60 ? 'mid' : 'low'
        return `<tr><td>${materia}</td><td>${notas.length}</td><td><span class="pct ${cls}">${prom}%</span></td></tr>`
      }).join('')}
      ${Object.keys(porMateria).length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:20px;">Sin evaluaciones registradas</td></tr>' : ''}
    </tbody>
  </table>

  <div class="section-title">Asistencia</div>
  <table>
    <thead><tr><th>Total días</th><th>Presentes</th><th>Ausentes</th><th>Asistencia</th></tr></thead>
    <tbody>
      <tr>
        <td>${totalAsist}</td>
        <td>${presentes}</td>
        <td>${totalAsist - presentes}</td>
        <td><span class="pct ${pctAsist >= 85 ? 'high' : pctAsist >= 70 ? 'mid' : 'low'}">${pctAsist}%</span></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    AR School · ${al.colegio?.nombre ?? ''} · Generado el ${fecha}
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
      Imprimir / Guardar PDF
    </button>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
