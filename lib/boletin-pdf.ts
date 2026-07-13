/**
 * Genera una ventana imprimible con el boletín de calificaciones de un alumno.
 */

interface Calificacion {
  nota: number
  evaluacion: {
    nombre: string
    materia: string
    fecha: string
    ponderacion?: number
  }
}

interface DatosAlumno {
  nombre: string
  apellido: string
  curso: string
  colegio: string
}

export function exportarBoletinPDF(alumno: DatosAlumno, calificaciones: Calificacion[]) {
  const fecha = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  // Agrupar calificaciones por materia
  const porMateria: Record<string, { notas: { nombre: string; nota: number; fecha: string }[]; promedio: number }> = {}

  calificaciones.forEach(c => {
    const materia = c.evaluacion?.materia ?? 'Sin materia'
    if (!porMateria[materia]) porMateria[materia] = { notas: [], promedio: 0 }
    porMateria[materia].notas.push({
      nombre: c.evaluacion?.nombre ?? 'Evaluación',
      nota: c.nota,
      fecha: c.evaluacion?.fecha ?? '',
    })
  })

  // Calcular promedios por materia
  Object.values(porMateria).forEach(m => {
    m.promedio = m.notas.length > 0
      ? Math.round((m.notas.reduce((a, b) => a + b.nota, 0) / m.notas.length) * 10) / 10
      : 0
  })

  // Promedio general
  const todasLasNotas = calificaciones.map(c => c.nota)
  const promedioGeneral = todasLasNotas.length > 0
    ? Math.round((todasLasNotas.reduce((a, b) => a + b, 0) / todasLasNotas.length) * 10) / 10
    : 0

  // Ordenar materias
  const materias = Object.entries(porMateria).sort((a, b) => a[0].localeCompare(b[0]))

  let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Boletín — ${alumno.nombre} ${alumno.apellido}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a2332; padding: 40px; font-size: 12px; max-width: 800px; margin: 0 auto; }
.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a2332; padding-bottom: 20px; }
.header h1 { font-size: 20px; color: #1a2332; margin-bottom: 4px; }
.header .colegio { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; }
.alumno-info { display: flex; justify-content: space-between; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; padding: 14px 18px; border: 1px solid #e2e8f0; }
.alumno-info .dato { }
.alumno-info .dato-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
.alumno-info .dato-value { font-size: 14px; font-weight: 700; color: #1a2332; }
.materia-section { margin-bottom: 18px; }
.materia-title { font-size: 13px; font-weight: 700; color: #1a2332; padding: 6px 10px; background: #f1f5f9; border-left: 3px solid #3b82f6; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
.materia-promedio { font-size: 14px; font-weight: 800; }
.promedio-alto { color: #059669; }
.promedio-medio { color: #d97706; }
.promedio-bajo { color: #dc2626; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th { background: #f8fafc; padding: 5px 10px; text-align: left; font-size: 9px; text-transform: uppercase; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
td { padding: 5px 10px; border-bottom: 1px solid #f1f5f9; }
.nota-cell { font-weight: 700; text-align: center; width: 60px; }
.nota-alta { color: #059669; }
.nota-media { color: #d97706; }
.nota-baja { color: #dc2626; }
.resumen { margin-top: 24px; background: #1a2332; color: white; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
.resumen-label { font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
.resumen-valor { font-size: 28px; font-weight: 800; }
.resumen-sub { font-size: 11px; opacity: 0.6; }
.footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 9px; border-top: 1px solid #e8eaed; padding-top: 12px; }
.no-print { margin-top: 30px; text-align: center; }
@media print { .no-print { display: none; } body { padding: 20px; } }
@page { size: portrait; margin: 15mm; }
</style></head><body>`

  // Header
  html += `<div class="header"><div class="colegio">${alumno.colegio}</div><h1>Boletín de Calificaciones</h1></div>`

  // Info alumno
  html += `<div class="alumno-info">
    <div class="dato"><div class="dato-label">Alumno</div><div class="dato-value">${alumno.nombre} ${alumno.apellido}</div></div>
    <div class="dato"><div class="dato-label">Curso</div><div class="dato-value">${alumno.curso}</div></div>
    <div class="dato"><div class="dato-label">Evaluaciones</div><div class="dato-value">${calificaciones.length}</div></div>
    <div class="dato"><div class="dato-label">Promedio General</div><div class="dato-value ${getPromedioClass(promedioGeneral)}">${promedioGeneral}</div></div>
  </div>`

  // Materias
  materias.forEach(([materia, data]) => {
    html += `<div class="materia-section">`
    html += `<div class="materia-title"><span>${materia}</span><span class="materia-promedio ${getPromedioClass(data.promedio)}">${data.promedio}</span></div>`
    html += `<table><thead><tr><th>Evaluación</th><th>Fecha</th><th style="text-align:center;">Nota</th></tr></thead><tbody>`

    data.notas.forEach(n => {
      const fechaStr = n.fecha ? new Date(n.fecha + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '—'
      html += `<tr><td>${n.nombre}</td><td>${fechaStr}</td><td class="nota-cell ${getNotaClass(n.nota)}">${n.nota}</td></tr>`
    })

    html += `</tbody></table></div>`
  })

  // Resumen
  html += `<div class="resumen">
    <div><div class="resumen-label">Promedio general</div><div class="resumen-valor">${promedioGeneral}</div></div>
    <div style="text-align:center;"><div class="resumen-label">Total evaluaciones</div><div class="resumen-valor">${calificaciones.length}</div></div>
    <div style="text-align:right;"><div class="resumen-label">Materias</div><div class="resumen-valor">${materias.length}</div></div>
  </div>`

  // Footer
  html += `<div class="footer">AR School Global · Boletín generado el ${fecha} · Este documento es informativo</div>`
  html += `<div class="no-print"><button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button> <button onclick="window.close()" style="background:white;color:#1a2332;border:1.5px solid #e2e8f0;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button></div>`
  html += `</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

function getNotaClass(nota: number): string {
  if (nota >= 5.5) return 'nota-alta'
  if (nota >= 4.0) return 'nota-media'
  return 'nota-baja'
}

function getPromedioClass(promedio: number): string {
  if (promedio >= 5.5) return 'promedio-alto'
  if (promedio >= 4.0) return 'promedio-medio'
  return 'promedio-bajo'
}
