// ============================================================
// Utilidades de validación y formateo — AR School
// ============================================================

/**
 * Capitaliza la primera letra de cada palabra
 * "juan pedro" → "Juan Pedro"
 */
export function capitalizarNombre(valor: string): string {
  return valor
    .toLowerCase()
    .split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/**
 * Formatea RUT chileno mientras se escribe
 * "123456789" → "12.345.678-9"
 */
export function formatearRut(valor: string): string {
  // Remover todo excepto números y K/k
  let limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase()
  if (!limpio) return ''

  // Separar cuerpo y DV
  const dv = limpio.slice(-1)
  const cuerpo = limpio.slice(0, -1)

  if (!cuerpo) return limpio

  // Formatear con puntos
  let formateado = ''
  let count = 0
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    formateado = cuerpo[i] + formateado
    count++
    if (count % 3 === 0 && i > 0) formateado = '.' + formateado
  }

  return `${formateado}-${dv}`
}

/**
 * Valida si un RUT chileno es correcto (módulo 11)
 */
export function validarRut(rut: string): boolean {
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return false

  const cuerpo = limpio.slice(0, -1)
  const dvIngresado = limpio.slice(-1)

  let suma = 0
  let multiplicador = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const resto = suma % 11
  const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : String(11 - resto)

  return dvIngresado === dvCalculado
}

/**
 * Formatea teléfono con prefijo internacional editable.
 * Si no tiene prefijo, asume +56 (Chile).
 * Acepta: "+56 9 1234 5678", "+58 412 123 4567", "+1 305 123 4567", "+54 9 11 1234 5678"
 */
export function formatearTelefono(valor: string): string {
  // Permitir el signo + al inicio
  const tienePrefix = valor.startsWith('+')
  let nums = valor.replace(/[^0-9]/g, '')

  if (!nums) return tienePrefix ? '+' : ''

  // Si el usuario escribió + manualmente, respetar el prefijo completo
  if (tienePrefix) {
    nums = nums.slice(0, 14) // Max 14 dígitos total (E.164)

    // Detectar código de país para formatear correctamente
    // +1 (USA/Canadá): 1 dígito de código país
    if (nums.startsWith('1')) {
      const cc = nums.slice(0, 1)
      const rest = nums.slice(1)
      if (rest.length <= 3) return `+${cc} ${rest}`
      if (rest.length <= 6) return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3)}`
      return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`
    }

    // +56 (Chile): formato 9 XXXX XXXX
    if (nums.startsWith('56')) {
      const rest = nums.slice(2)
      if (!rest) return '+56'
      if (rest.length <= 1) return `+56 ${rest}`
      if (rest.length <= 5) return `+56 ${rest[0]} ${rest.slice(1)}`
      return `+56 ${rest[0]} ${rest.slice(1, 5)} ${rest.slice(5, 9)}`
    }

    // +58 (Venezuela): formato XXX XXX XXXX
    if (nums.startsWith('58')) {
      const rest = nums.slice(2)
      if (!rest) return '+58'
      if (rest.length <= 3) return `+58 ${rest}`
      if (rest.length <= 6) return `+58 ${rest.slice(0, 3)} ${rest.slice(3)}`
      return `+58 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`
    }

    // +54 (Argentina): formato X XX XXXX XXXX
    if (nums.startsWith('54')) {
      const rest = nums.slice(2)
      if (!rest) return '+54'
      if (rest.length <= 2) return `+54 ${rest}`
      if (rest.length <= 4) return `+54 ${rest.slice(0, 1)} ${rest.slice(1)}`
      if (rest.length <= 8) return `+54 ${rest.slice(0, 1)} ${rest.slice(1, 3)} ${rest.slice(3)}`
      return `+54 ${rest.slice(0, 1)} ${rest.slice(1, 3)} ${rest.slice(3, 7)} ${rest.slice(7, 11)}`
    }

    // Genérico: +XX XXX XXX XXXX (código de 2 dígitos por defecto)
    if (nums.length <= 2) return `+${nums}`
    const cc = nums.slice(0, 2)
    const rest = nums.slice(2)
    if (rest.length <= 3) return `+${cc} ${rest}`
    if (rest.length <= 6) return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3)}`
    return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 10)}`
  }

  // Sin prefijo: asumir Chile (+56)
  if (nums.startsWith('56')) nums = nums.slice(2)
  if (!nums) return '+56 '
  if (nums.length <= 1) return `+56 ${nums}`
  if (nums.length <= 5) return `+56 ${nums[0]} ${nums.slice(1)}`
  nums = nums.slice(0, 9)
  if (nums.length <= 9) return `+56 ${nums[0]} ${nums.slice(1, 5)} ${nums.slice(5)}`
  return `+56 ${nums[0]} ${nums.slice(1, 5)} ${nums.slice(5)}`
}

/**
 * Valida email básico
 */
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Formatea fecha mientras se escribe (DD-MM-AAAA)
 * "25062026" → "25-06-2026"
 * Retorna { display: "25-06-2026", value: "2026-06-25" }
 */
export function formatearFecha(valor: string): { display: string; value: string } {
  // Solo números
  const nums = valor.replace(/[^0-9]/g, '').slice(0, 8)
  
  let display = ''
  if (nums.length <= 2) display = nums
  else if (nums.length <= 4) display = `${nums.slice(0, 2)}-${nums.slice(2)}`
  else display = `${nums.slice(0, 2)}-${nums.slice(2, 4)}-${nums.slice(4)}`

  // Convertir a formato ISO para la BD (YYYY-MM-DD)
  let value = ''
  if (nums.length === 8) {
    const dia = nums.slice(0, 2)
    const mes = nums.slice(2, 4)
    const anio = nums.slice(4, 8)
    value = `${anio}-${mes}-${dia}`
  }

  return { display, value }
}

/**
 * Convierte fecha ISO (YYYY-MM-DD) a display (DD-MM-AAAA)
 */
export function fechaISOaDisplay(iso: string): string {
  if (!iso || iso.length !== 10) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}-${mes}-${anio}`
}

/**
 * Formatea número como monto mientras se escribe
 * "1600000" → "1.600.000"
 */
export function formatearMontoInput(valor: string): { display: string; value: number } {
  const nums = valor.replace(/[^0-9]/g, '')
  const numValue = parseInt(nums) || 0
  const display = numValue > 0 ? numValue.toLocaleString('es-CL') : ''
  return { display, value: numValue }
}

/**
 * Formatea montos CLP
 * 150000 → "$150.000"
 */
export function formatearMontoCLP(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(valor)
}
