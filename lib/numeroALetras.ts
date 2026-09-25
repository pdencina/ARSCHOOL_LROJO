/**
 * Monto en palabras para los contratos (ej. 40000 -> "cuarenta mil").
 * Soporta hasta 999.999.999, suficiente para aportes y matrículas.
 */

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function hasta999(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100)
  const r = n % 100
  let texto = CENTENAS[c]
  if (r > 0) {
    const resto = r < 30 ? UNIDADES[r] : `${DECENAS[Math.floor(r / 10)]}${r % 10 ? ` y ${UNIDADES[r % 10]}` : ''}`
    texto = texto ? `${texto} ${resto}` : resto
  }
  return texto
}

// "uno" se apocopa delante de "mil"/"millones" ("veintiún mil", "un millón")
const apocope = (s: string) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un')

export function numeroALetras(monto: number): string {
  const n = Math.round(Math.abs(monto))
  if (n === 0) return 'cero'
  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000
  const partes: string[] = []
  if (millones) partes.push(millones === 1 ? 'un millón' : `${apocope(hasta999(millones))} millones`)
  if (miles) partes.push(miles === 1 ? 'mil' : `${apocope(hasta999(miles))} mil`)
  if (resto) partes.push(hasta999(resto))
  return partes.join(' ')
}

/** "cuarenta mil pesos chilenos ($40.000 CLP)" */
export function montoConLetras(monto: number): string {
  return `${numeroALetras(monto)} pesos chilenos ($${Math.round(monto).toLocaleString('es-CL')} CLP)`
}
