/**
 * Documentos de admisión: etiquetas y obligatorios por programa.
 * Debe coincidir con lo que pide cada formulario público:
 *  - AR School / Play Group: components/admision/PreAdmisionForm.tsx (DOCS_OBL)
 *  - Lions Soccer: app/lions/inscripcion/page.tsx (DOCS_LIONS)
 *  - AR Worship: no pide documentos
 */

export const DOCS_LABELS: Record<string, string> = {
  cedula_alumno_frente: 'CI alumno (frente)',
  cedula_alumno_dorso: 'CI alumno (dorso)',
  cedula_alumno: 'Cédula alumno',
  cedula_apoderado_frente: 'CI apoderado (frente)',
  cedula_apoderado_dorso: 'CI apoderado (dorso)',
  cedula_apoderado: 'Cédula apoderado',
  cert_nacimiento_alumno: 'Cert. nacimiento alumno',
  cert_nacimiento_apoderado: 'Cert. nacimiento apoderado',
  cuenta_servicios: 'Cuenta servicios',
  cert_medico: 'Cert. médico',
  cert_diagnostico: 'Cert. diagnóstico',
  notas_anteriores: 'Notas anteriores',
  cedula_alumno_frente_lions: 'CI alumno (frente)',
  cedula_alumno_dorso_lions: 'CI alumno (dorso)',
  cedula_apoderado_frente_lions: 'CI apoderado (frente)',
  cedula_apoderado_dorso_lions: 'CI apoderado (dorso)',
}

const DOCS_AR_SCHOOL = ['cedula_alumno_frente', 'cedula_alumno_dorso', 'cedula_apoderado_frente', 'cedula_apoderado_dorso', 'cert_nacimiento_alumno', 'cuenta_servicios']
const DOCS_LIONS = ['cedula_alumno_frente_lions', 'cedula_alumno_dorso_lions', 'cedula_apoderado_frente_lions', 'cedula_apoderado_dorso_lions']

export const DOCS_REQUERIDOS: Record<string, string[]> = {
  ar_school: DOCS_AR_SCHOOL,
  play_group: DOCS_AR_SCHOOL,
  lions_soccer: DOCS_LIONS,
  ar_worship: [],
  otros: [],
}

// Solicitudes antiguas guardaban la cédula en una sola clave (sin frente/dorso).
const ALIAS: Record<string, string[]> = {
  cedula_alumno_frente: ['cedula_alumno'],
  cedula_alumno_dorso: ['cedula_alumno'],
  cedula_apoderado_frente: ['cedula_apoderado'],
  cedula_apoderado_dorso: ['cedula_apoderado'],
}

/** Código de programa de una solicitud: primero el join, si no el texto del curso. */
export function codigoPrograma(pa: any): string {
  if (pa?.programa?.codigo) return pa.programa.codigo
  const c = (pa?.curso_solicitado || '').toLowerCase()
  if (c.includes('lions') || c.includes('soccer')) return 'lions_soccer'
  if (c.includes('worship') || c.includes('music')) return 'ar_worship'
  if (c.includes('play')) return 'play_group'
  if (c.includes('kinder') || c.includes('school') || c.includes('elementary') || c.includes('middle') || c.includes('high') || c.includes('ciclo')) return 'ar_school'
  return 'otros'
}

export function tieneDoc(docs: Record<string, any> | null | undefined, key: string): boolean {
  const d = docs || {}
  return !!d[key] || (ALIAS[key] ?? []).some(k => !!d[k])
}

/** Documentos obligatorios del programa de la solicitud (clave + si está). */
export function checklistDocs(pa: any): { key: string; label: string; ok: boolean }[] {
  const requeridos = DOCS_REQUERIDOS[codigoPrograma(pa)] ?? []
  return requeridos.map(key => ({ key, label: DOCS_LABELS[key] ?? key, ok: tieneDoc(pa?.documentos, key) }))
}

export function docsFaltantes(pa: any): string[] {
  return checklistDocs(pa).filter(d => !d.ok).map(d => d.label)
}
