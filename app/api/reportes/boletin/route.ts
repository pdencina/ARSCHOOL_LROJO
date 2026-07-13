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

  // Obtener alumno
  const { data: alumno } = await admin
    .from('alumnos')
    .select('*, colegio:colegios(nombre)')
    .eq('id', alumnoId)
    .single()

  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })
  const al = alumno as any

  // Obtener calificaciones con evaluación
  const { data: calificaciones } = await admin
    .from('calificaciones')
    .select('nota, observacion, evaluacion:evaluaciones(nombre, materia, fecha, ponderacion)')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: true })

  const cals = (calificaciones ?? []) as any[]

  // Agrupar por materia
  const porMateria: Record<string, { notas: { nombre: string; nota: number; fecha: string }[]; promedio: number }> = {}

  cals.forEach(c => {
    const materia = c.evaluacion?.materia ?? 'Sin materia'
    if (!porMateria[materia]) porMateria[materia] = { notas: [], promedio: 0 }
    porMateria[materia].notas.push({
      nombre: c.evaluacion?.nombre ?? 'Evaluación',
      nota: c.nota,
      fecha: c.evaluacion?.fecha ?? '',
    })
  })

  Object.values(porMateria).forEach(m => {
    m.promedio = m.notas.length > 0
      ? Math.round((m.notas.reduce((a, b) => a + b.nota, 0) / m.notas.length) * 10) / 10
      : 0
  })

  const todasNotas = cals.map(c => c.nota)
  const promedioGeneral = todasNotas.length > 0
    ? Math.round((todasNotas.reduce((a: number, b: number) => a + b, 0) / todasNotas.length) * 10) / 10
    : 0

  const materias = Object.entries(porMateria).sort((a, b) => a[0].localeCompare(b[0]))
  const fecha = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  // Generar HTML
  const html = generarBoletinHTML({
    alumno: { nombre: al.nombre, apellido: al.apellido, curso: al.curso, colegio: al.colegio?.nombre ?? 'AR School' },
    materias,
    promedioGeneral,
    totalEvaluaciones: cals.length,
    fecha,
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function generarBoletinHTML(params: {
  alumno: { nombre: string; apellido: string; curso: string; colegio: string }
  materias: [string, { notas: { nombre: string; nota: number; fecha: string }[]; promedio: number }][]
  promedioGeneral: number
  totalEvaluaciones: number
  fecha: string
}) {
  const { alumno, materias, promedioGeneral, totalEvaluaciones, fecha } = params

  function notaClass(nota: number) {
    if (nota >= 5.5) return 'color:#059669;'
    if (nota >= 4.0) return 'color:#d97706;'
    return 'color:#dc2626;'
  }

  let materiasHTML = ''
  materias.forEach(([materia, data]) => {
    materiasHTML += `<div style="margin-bottom:18px;">`
    materiasHTML += `<div style="font-size:13px;font-weight:700;color:#1a2332;padding:6px 10px;background:#f1f5f9;border-left:3px solid #3b82f6;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
      <span>${materia}</span><span style="font-size:14px;font-weight:800;${notaClass(data.promedio)}">${data.promedio}</span>
    </div>`
    materiasHTML += `<table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr><th style="background:#f8fafc;padding:5px 10px;text-align:left;font-size:9px;text-transform:uppercase;color:#6b7280;font-weight:600;border-bottom:1px solid #e2e8f0;">Evaluación</th>
      <th style="background:#f8fafc;padding:5px 10px;text-align:left;font-size:9px;text-transform:uppercase;color:#6b7280;font-weight:600;border-bottom:1px solid #e2e8f0;">Fecha</th>
      <th style="background:#f8fafc;padding:5px 10px;text-align:center;font-size:9px;text-transform:uppercase;color:#6b7280;font-weight:600;border-bottom:1px solid #e2e8f0;width:60px;">Nota</th></tr></thead><tbody>`

    data.notas.forEach(n => {
      const fechaStr = n.fecha ? new Date(n.fecha + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '—'
      materiasHTML += `<tr><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;">${n.nombre}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;">${fechaStr}</td>
        <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:700;text-align:center;${notaClass(n.nota)}">${n.nota}</td></tr>`
    })
    materiasHTML += `</tbody></table></div>`
  })

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Boletín — ${alumno.nombre} ${alumno.apellido}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#1a2332; padding:40px; font-size:12px; max-width:800px; margin:0 auto; }
.no-print { margin-top:30px; text-align:center; }
@media print { .no-print { display:none; } body { padding:20px; } }
@page { size:portrait; margin:15mm; }
</style></head><body>

<div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #1a2332;padding-bottom:20px;">
  <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">${alumno.colegio}</div>
  <h1 style="font-size:20px;color:#1a2332;margin-top:4px;">Boletín de Calificaciones</h1>
</div>

<div style="display:flex;justify-content:space-between;margin-bottom:24px;background:#f8fafc;border-radius:8px;padding:14px 18px;border:1px solid #e2e8f0;">
  <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Alumno</div><div style="font-size:14px;font-weight:700;color:#1a2332;">${alumno.nombre} ${alumno.apellido}</div></div>
  <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Curso</div><div style="font-size:14px;font-weight:700;color:#1a2332;">${alumno.curso}</div></div>
  <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Evaluaciones</div><div style="font-size:14px;font-weight:700;color:#1a2332;">${totalEvaluaciones}</div></div>
  <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Promedio General</div><div style="font-size:14px;font-weight:700;${notaClass(promedioGeneral)}">${promedioGeneral}</div></div>
</div>

${materiasHTML}

${materias.length === 0 ? '<div style="text-align:center;padding:40px;color:#9ca3af;">No hay calificaciones registradas para este alumno.</div>' : ''}

<div style="margin-top:24px;background:#1a2332;color:white;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
  <div><div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:0.05em;">Promedio general</div><div style="font-size:28px;font-weight:800;">${promedioGeneral}</div></div>
  <div style="text-align:center;"><div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:0.05em;">Total evaluaciones</div><div style="font-size:28px;font-weight:800;">${totalEvaluaciones}</div></div>
  <div style="text-align:right;"><div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:0.05em;">Materias</div><div style="font-size:28px;font-weight:800;">${materias.length}</div></div>
</div>

<div style="margin-top:30px;text-align:center;color:#9ca3af;font-size:9px;border-top:1px solid #e8eaed;padding-top:12px;">
  AR School Global · Boletín generado el ${fecha} · Este documento es informativo
</div>

<div class="no-print">
  <button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
  <button onclick="window.close()" style="background:white;color:#1a2332;border:1.5px solid #e2e8f0;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button>
</div>

</body></html>`
}
