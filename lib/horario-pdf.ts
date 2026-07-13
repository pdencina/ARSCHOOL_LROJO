/**
 * Genera una ventana imprimible con el horario semanal formateado como tabla.
 * El usuario puede usar "Imprimir" o "Guardar como PDF" desde el diálogo del navegador.
 */

interface BloqueHorario {
  hora: string
  grupo: string
  experiencia: string
  tutor: string
  espacio: string
}

interface Propuesta {
  titulo?: string
  sede?: string
  grupos?: { nombre: string; curso: string; alumnos: number; tutor: string }[]
  horario: Record<string, BloqueHorario[]>
  notas?: string[]
}

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes',
}
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

/**
 * Exportar horario completo (vista admin) — todos los grupos, todos los días.
 */
export function exportarHorarioCompleto(propuesta: Propuesta) {
  const fecha = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  // Extraer horas únicas ordenadas
  const horasSet = new Set<string>()
  DIAS.forEach(dia => {
    ;(propuesta.horario[dia] ?? []).forEach(b => horasSet.add(b.hora))
  })
  const horas = Array.from(horasSet).sort()

  // Extraer grupos
  const gruposNombres = propuesta.grupos?.map(g => g.nombre) ?? [...new Set(
    DIAS.flatMap(dia => (propuesta.horario[dia] ?? []).map(b => b.grupo))
  )].sort()

  let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${propuesta.titulo ?? 'Horario semanal'}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a2332; padding: 30px; font-size: 11px; }
h1 { font-size: 18px; text-align: center; margin-bottom: 4px; color: #1a2332; }
.subtitle { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 20px; }
.dia-title { font-size: 13px; font-weight: 700; color: #1a2332; margin: 18px 0 6px; padding: 4px 8px; background: #f1f5f9; border-left: 3px solid #1a2332; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
th { background: #1a2332; color: white; padding: 5px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
td { border: 1px solid #e2e8f0; padding: 4px 8px; vertical-align: top; }
tr:nth-child(even) { background: #f8fafc; }
.grupo-badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 4px; }
.notas { margin-top: 20px; background: #fef3ec; border: 1px solid #f8c9a4; border-radius: 6px; padding: 12px; }
.notas-title { font-size: 10px; font-weight: 700; color: #e8722a; text-transform: uppercase; margin-bottom: 6px; }
.notas li { font-size: 10px; color: #6b4d3a; margin-bottom: 3px; }
.grupos-resumen { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.grupo-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 10px; }
.grupo-card strong { color: #1a2332; }
.footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 9px; border-top: 1px solid #e8eaed; padding-top: 12px; }
.no-print { margin-top: 30px; text-align: center; }
@media print {
  .no-print { display: none; }
  body { padding: 15px; }
  .dia-title { break-before: auto; }
}
@page { size: landscape; margin: 15mm; }
</style></head><body>`

  html += `<h1>${propuesta.titulo ?? 'Horario semanal'}</h1>`
  html += `<div class="subtitle">${propuesta.sede ? `Sede: ${propuesta.sede.charAt(0).toUpperCase() + propuesta.sede.slice(1)} · ` : ''}Generado: ${fecha}</div>`

  // Resumen de grupos
  if (propuesta.grupos && propuesta.grupos.length > 0) {
    html += `<div class="grupos-resumen">`
    propuesta.grupos.forEach(g => {
      html += `<div class="grupo-card"><strong>${g.nombre}</strong> · ${g.curso} · ${g.alumnos} alumnos · ${g.tutor}</div>`
    })
    html += `</div>`
  }

  // Horario por día
  DIAS.forEach(dia => {
    const bloques = propuesta.horario[dia]
    if (!bloques || bloques.length === 0) return

    html += `<div class="dia-title">${DIAS_LABEL[dia]}</div>`
    html += `<table><thead><tr><th>Hora</th><th>Grupo</th><th>Experiencia</th><th>Tutor</th><th>Espacio</th></tr></thead><tbody>`

    bloques.forEach(b => {
      html += `<tr><td style="font-weight:600;white-space:nowrap;">${b.hora}</td><td><span class="grupo-badge">${b.grupo}</span></td><td>${b.experiencia}</td><td>${b.tutor}</td><td>${b.espacio}</td></tr>`
    })

    html += `</tbody></table>`
  })

  // Notas
  if (propuesta.notas && propuesta.notas.length > 0) {
    html += `<div class="notas"><div class="notas-title">Notas</div><ul>`
    propuesta.notas.forEach(n => { html += `<li>• ${n}</li>` })
    html += `</ul></div>`
  }

  html += `<div class="footer">AR School Global · Documento generado el ${fecha}</div>`
  html += `<div class="no-print"><button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button> <button onclick="window.close()" style="background:white;color:#1a2332;border:1.5px solid #e2e8f0;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button></div>`
  html += `</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

/**
 * Exportar horario personal de un tutor — solo sus bloques.
 */
export function exportarHorarioTutor(propuesta: Propuesta, nombreTutor: string) {
  const fecha = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Mi horario — ${nombreTutor}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a2332; padding: 30px; font-size: 11px; }
h1 { font-size: 18px; text-align: center; margin-bottom: 4px; color: #1a2332; }
.subtitle { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 20px; }
.dia-title { font-size: 13px; font-weight: 700; color: #1a2332; margin: 18px 0 6px; padding: 4px 8px; background: #f1f5f9; border-left: 3px solid #3b82f6; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
th { background: #1e40af; color: white; padding: 6px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
td { border: 1px solid #e2e8f0; padding: 5px 10px; }
tr:nth-child(even) { background: #f8fafc; }
.footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 9px; border-top: 1px solid #e8eaed; padding-top: 12px; }
.no-print { margin-top: 30px; text-align: center; }
@media print { .no-print { display: none; } body { padding: 15px; } }
@page { size: portrait; margin: 20mm; }
</style></head><body>`

  html += `<h1>Mi horario semanal</h1>`
  html += `<div class="subtitle">${nombreTutor} · ${propuesta.titulo ?? ''} · ${fecha}</div>`

  DIAS.forEach(dia => {
    const bloques = (propuesta.horario[dia] ?? []).filter(
      b => b.tutor.toLowerCase().trim() === nombreTutor.toLowerCase().trim()
    )
    if (bloques.length === 0) return

    html += `<div class="dia-title">${DIAS_LABEL[dia]}</div>`
    html += `<table><thead><tr><th>Hora</th><th>Grupo</th><th>Experiencia</th><th>Espacio</th></tr></thead><tbody>`

    bloques.forEach(b => {
      html += `<tr><td style="font-weight:600;white-space:nowrap;">${b.hora}</td><td>${b.grupo}</td><td>${b.experiencia}</td><td>${b.espacio}</td></tr>`
    })

    html += `</tbody></table>`
  })

  html += `<div class="footer">AR School Global · Horario personal · ${fecha}</div>`
  html += `<div class="no-print"><button onclick="window.print()" style="background:#1e40af;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button> <button onclick="window.close()" style="background:white;color:#1e40af;border:1.5px solid #e2e8f0;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button></div>`
  html += `</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
