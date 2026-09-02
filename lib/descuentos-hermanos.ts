/**
 * Política de descuentos por hermanos (AR School / Play / Lions / Worship).
 *
 * MATRÍCULA — promoción "2 por 1":
 *   Cada par de hermanos paga una sola matrícula.
 *     1 hermano  → paga 1
 *     2 hermanos → paga 1 (el 2° va gratis)
 *     3 hermanos → paga 2 (el 3° queda exento del par siguiente)
 *     4 hermanos → paga 2
 *   Es decir: matrículas a pagar = techo(n / 2).
 *   En la práctica: los hermanos en posición par (2°, 4°, ...) no pagan matrícula.
 *
 * APORTE MENSUAL — descuento progresivo:
 *   1° hermano  → 100% del aporte
 *   2° hermano  → 30% de descuento (paga 70%)
 *   3° y más    → monto fijo de $40.000
 */

export const MONTO_MENSUAL_HERMANO_ADICIONAL = 40000
export const DESCUENTO_SEGUNDO_HERMANO = 30 // %

export interface ResultadoHermano {
  /** Posición del hermano en la familia (1 = primero) */
  orden: number
  /** Si debe pagar matrícula (por la promoción 2x1) */
  pagaMatricula: boolean
  /** Monto de matrícula que corresponde pagar */
  montoMatricula: number
  /** Monto mensual que corresponde pagar */
  montoMensual: number
  /** % de descuento aplicado sobre el mensual (0 si no aplica) */
  descuentoMensual: number
  /** Explicación legible para mostrar en la UI y en el contrato */
  detalle: string
}

/**
 * Calcula matrícula y aporte mensual de un hermano según su posición.
 *
 * @param orden           Posición del hermano (1 = primero de la familia)
 * @param montoMatricula  Matrícula base del programa
 * @param montoMensual    Aporte mensual base del programa
 */
export function calcularHermano(
  orden: number,
  montoMatricula: number,
  montoMensual: number
): ResultadoHermano {
  // Matrícula: los hermanos en posición par no pagan (promoción 2x1)
  const pagaMatricula = orden % 2 !== 0
  const matriculaFinal = pagaMatricula ? montoMatricula : 0

  // Aporte mensual según posición
  let mensualFinal = montoMensual
  let descuento = 0
  let detalleMensual = 'Aporte mensual completo'

  if (orden === 2) {
    descuento = DESCUENTO_SEGUNDO_HERMANO
    mensualFinal = Math.round(montoMensual * (1 - DESCUENTO_SEGUNDO_HERMANO / 100))
    detalleMensual = `${DESCUENTO_SEGUNDO_HERMANO}% de descuento por segundo hermano`
  } else if (orden >= 3) {
    mensualFinal = MONTO_MENSUAL_HERMANO_ADICIONAL
    descuento = montoMensual > 0
      ? Math.round((1 - MONTO_MENSUAL_HERMANO_ADICIONAL / montoMensual) * 100)
      : 0
    detalleMensual = `Tarifa de hermano adicional ($${MONTO_MENSUAL_HERMANO_ADICIONAL.toLocaleString('es-CL')})`
  }

  const detalleMatricula = pagaMatricula
    ? 'Paga matrícula'
    : 'Matrícula exenta (promoción 2x1 por hermanos)'

  return {
    orden,
    pagaMatricula,
    montoMatricula: matriculaFinal,
    montoMensual: mensualFinal,
    descuentoMensual: descuento,
    detalle: `${ordinal(orden)} hermano · ${detalleMatricula} · ${detalleMensual}`,
  }
}

/**
 * Calcula el desglose para todo un grupo de hermanos.
 * Útil para mostrar el total familiar antes de matricular.
 */
export function calcularGrupoHermanos(
  cantidad: number,
  montoMatricula: number,
  montoMensual: number
): { hermanos: ResultadoHermano[]; totalMatricula: number; totalMensual: number; matriculasPagadas: number } {
  const hermanos: ResultadoHermano[] = []
  for (let i = 1; i <= cantidad; i++) {
    hermanos.push(calcularHermano(i, montoMatricula, montoMensual))
  }
  return {
    hermanos,
    totalMatricula: hermanos.reduce((s, h) => s + h.montoMatricula, 0),
    totalMensual: hermanos.reduce((s, h) => s + h.montoMensual, 0),
    matriculasPagadas: hermanos.filter(h => h.pagaMatricula).length,
  }
}

function ordinal(n: number): string {
  const map: Record<number, string> = { 1: 'Primer', 2: 'Segundo', 3: 'Tercer', 4: 'Cuarto', 5: 'Quinto' }
  return map[n] ?? `${n}°`
}
