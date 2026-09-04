/**
 * Fuente única de aranceles por programa.
 *
 * Hasta ahora los montos de Lions y Worship vivían hardcodeados dentro del
 * generador de contratos (app/api/contratos/route.ts). Eso hacía que la
 * generación de cobros no tuviera de dónde sacar los montos y quedaran alumnos
 * sin aportes. Este helper centraliza los aranceles para que TANTO el contrato
 * COMO la generación de cobros usen los mismos valores.
 *
 * AR School y Play Group siguen resolviéndose contra la tabla `tabla_aportes`
 * (vía /api/aportes/consultar), que soporta variación por sede/jornada/año.
 * Este helper cubre el fallback y los programas Lions/Worship que no están en
 * esa tabla.
 *
 * Aranceles oficiales 2026:
 *   Music & Play (AR Worship 0-7 años): inicial $25.000 · mensual $40.000 · 9 meses
 *   AR Worship School (8-99):           inicial $50.000 · mensual $60.000 · 9 meses
 *   Lions Soccer:                       inicial $45.000 · mensual $40.000 · 12 meses
 *   AR School (default):                inicial $130.000 · mensual $275.000 · 10 meses
 *   Play Group / Preschool:             12 meses corridos
 */

export interface Arancel {
  montoInicial: number
  montoMensual: number
  meses: number
  /** Etiqueta legible del tramo detectado, útil para logs/UI */
  etiqueta: string
}

export type ProgramaCodigo = 'ar_school' | 'ar_worship' | 'lions_soccer' | 'play_group' | string

/**
 * Resuelve el arancel de un alumno según su programa y curso.
 *
 * @param programaCodigo  Código del programa (ar_school | ar_worship | lions_soccer | play_group)
 * @param curso           Texto del curso/nivel (ej: "AR Worship - Music and Play (0-4 años)", "Lions Soccer - Sub-14", "Kinder (Ciclo 0)")
 */
export function resolverArancel(programaCodigo: ProgramaCodigo | null | undefined, curso: string | null | undefined): Arancel {
  const c = (curso || '').toLowerCase()

  // Detección por código de programa, con fallback al texto del curso
  const esLions = programaCodigo === 'lions_soccer' || c.includes('lions') || c.includes('soccer')
  const esWorship = programaCodigo === 'ar_worship' || c.includes('worship') || c.includes('música') || c.includes('music')
  const esPlay = programaCodigo === 'play_group' || c.includes('play') || c.includes('sala cuna')

  // Dentro de Worship: Music & Play (0-7) vs AR Worship School (8+)
  const esMusicAndPlay = esWorship && (c.includes('music') || c.includes('play') || c.includes('0-4') || c.includes('0-7'))

  if (esLions) {
    return { montoInicial: 45000, montoMensual: 40000, meses: 12, etiqueta: 'Lions Soccer' }
  }
  if (esWorship) {
    return esMusicAndPlay
      ? { montoInicial: 25000, montoMensual: 40000, meses: 9, etiqueta: 'AR Worship — Music & Play' }
      : { montoInicial: 50000, montoMensual: 60000, meses: 9, etiqueta: 'AR Worship School' }
  }
  if (esPlay) {
    // Play Group: 12 meses corridos. Monto referencial (se recomienda confirmar en tabla_aportes).
    return { montoInicial: 80000, montoMensual: 260000, meses: 12, etiqueta: 'Play Group' }
  }
  // AR School (default): Preschool a High School
  return { montoInicial: 130000, montoMensual: 275000, meses: 10, etiqueta: 'AR School' }
}

/**
 * Calcula cuántos meses de cobro corresponden desde una fecha de inicio,
 * respetando la lógica de cada programa.
 *  - Play/Preschool: 12 meses corridos desde el ingreso.
 *  - Lions: hasta enero del año siguiente (13 - mesInicio).
 *  - Worship: 9 meses (año escolar acotado).
 *  - Otros: hasta diciembre (12 - mesInicio + 1).
 */
export function mesesDesdeInicio(programaCodigo: ProgramaCodigo | null | undefined, curso: string | null | undefined, mesInicio: number): number {
  const c = (curso || '').toLowerCase()
  const esLions = programaCodigo === 'lions_soccer' || c.includes('lions') || c.includes('soccer')
  const esWorship = programaCodigo === 'ar_worship' || c.includes('worship') || c.includes('music')
  const esPlay = programaCodigo === 'play_group' || c.includes('play') || c.includes('sala cuna')

  if (esPlay) return 12
  if (esLions) return Math.max(1, 13 - mesInicio)
  if (esWorship) return Math.min(9, Math.max(1, 12 - mesInicio + 1))
  return Math.max(1, 12 - mesInicio + 1)
}
