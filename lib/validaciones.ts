/**
 * Utilidades de validación y formateo para formularios chilenos.
 * RUT, teléfonos con código de área, email, campos obligatorios.
 */

// =====================
// RUT CHILENO
// =====================

/**
 * Valida un RUT chileno (formato XX.XXX.XXX-X o sin puntos).
 * Retorna true si es válido, false si no.
 */
export function validarRut(rut: string): boolean {
  if (!rut || rut.length < 3) return false

  // Limpiar: quitar puntos, espacios, guiones extras
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '').toUpperCase()
  if (limpio.length < 2) return false

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)

  // Verificar que el cuerpo sea numérico
  if (!/^\d+$/.test(cuerpo)) return false
  if (parseInt(cuerpo) < 1000000) return false // Mínimo 1.000.000

  // Calcular dígito verificador
  const dvCalculado = calcularDV(parseInt(cuerpo))
  return dv === dvCalculado
}

function calcularDV(rut: number): string {
  let suma = 0
  let multiplicador = 2
  let rutStr = rut.toString()

  for (let i = rutStr.length - 1; i >= 0; i--) {
    suma += parseInt(rutStr[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const resto = suma % 11
  const dv = 11 - resto

  if (dv === 11) return '0'
  if (dv === 10) return 'K'
  return dv.toString()
}

/**
 * Formatea un RUT a XX.XXX.XXX-X
 */
export function formatearRut(valor: string): string {
  // Limpiar todo excepto números y K
  let limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase()
  if (!limpio) return ''

  // Separar cuerpo y DV
  if (limpio.length > 1) {
    const dv = limpio.slice(-1)
    const cuerpo = limpio.slice(0, -1)

    // Formatear cuerpo con puntos
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${cuerpoFormateado}-${dv}`
  }

  return limpio
}

/**
 * Limpia un RUT para almacenamiento (sin puntos, con guión)
 */
export function limpiarRut(rut: string): string {
  const limpio = rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase()
  // Asegurar formato con guión
  if (!limpio.includes('-') && limpio.length > 1) {
    return limpio.slice(0, -1) + '-' + limpio.slice(-1)
  }
  return limpio
}

// =====================
// TELÉFONOS
// =====================

export interface CodigoPais {
  codigo: string
  pais: string
  bandera: string
  formato: string // placeholder de ejemplo
  largo: number // dígitos después del código (sin espacios)
}

export const CODIGOS_PAIS: CodigoPais[] = [
  { codigo: '+56', pais: 'Chile', bandera: '🇨🇱', formato: '9 1234 5678', largo: 9 },
  { codigo: '+58', pais: 'Venezuela', bandera: '🇻🇪', formato: '412 123 4567', largo: 10 },
  { codigo: '+57', pais: 'Colombia', bandera: '🇨🇴', formato: '310 123 4567', largo: 10 },
  { codigo: '+51', pais: 'Perú', bandera: '🇵🇪', formato: '999 123 456', largo: 9 },
  { codigo: '+54', pais: 'Argentina', bandera: '🇦🇷', formato: '11 1234 5678', largo: 10 },
  { codigo: '+55', pais: 'Brasil', bandera: '🇧🇷', formato: '11 91234 5678', largo: 11 },
  { codigo: '+593', pais: 'Ecuador', bandera: '🇪🇨', formato: '99 123 4567', largo: 9 },
  { codigo: '+591', pais: 'Bolivia', bandera: '🇧🇴', formato: '7 123 4567', largo: 8 },
  { codigo: '+1', pais: 'EE.UU. / Canadá', bandera: '🇺🇸', formato: '555 123 4567', largo: 10 },
]

/**
 * Formatea número de teléfono según país.
 * Solo permite dígitos, agrega espacios para legibilidad.
 */
export function formatearTelefono(valor: string, codigoPais: string): string {
  const soloDigitos = valor.replace(/\D/g, '')
  const config = CODIGOS_PAIS.find(c => c.codigo === codigoPais)

  if (!config) return soloDigitos

  // Chile: 9 1234 5678
  if (codigoPais === '+56' && soloDigitos.length > 0) {
    if (soloDigitos.length <= 1) return soloDigitos
    if (soloDigitos.length <= 5) return `${soloDigitos.slice(0, 1)} ${soloDigitos.slice(1)}`
    return `${soloDigitos.slice(0, 1)} ${soloDigitos.slice(1, 5)} ${soloDigitos.slice(5, 9)}`
  }

  // Venezuela/Colombia: XXX XXX XXXX
  if (['+58', '+57'].includes(codigoPais)) {
    if (soloDigitos.length <= 3) return soloDigitos
    if (soloDigitos.length <= 6) return `${soloDigitos.slice(0, 3)} ${soloDigitos.slice(3)}`
    return `${soloDigitos.slice(0, 3)} ${soloDigitos.slice(3, 6)} ${soloDigitos.slice(6, 10)}`
  }

  // Default: XXX XXXX XXXX
  if (soloDigitos.length <= 3) return soloDigitos
  if (soloDigitos.length <= 7) return `${soloDigitos.slice(0, 3)} ${soloDigitos.slice(3)}`
  return `${soloDigitos.slice(0, 3)} ${soloDigitos.slice(3, 7)} ${soloDigitos.slice(7)}`
}

/**
 * Valida largo del teléfono según país
 */
export function validarTelefono(numero: string, codigoPais: string): boolean {
  const soloDigitos = numero.replace(/\D/g, '')
  const config = CODIGOS_PAIS.find(c => c.codigo === codigoPais)
  if (!config) return soloDigitos.length >= 7
  return soloDigitos.length === config.largo
}

/**
 * Construye teléfono completo para almacenamiento
 */
export function telefonoCompleto(codigoPais: string, numero: string): string {
  const limpio = numero.replace(/\D/g, '')
  return `${codigoPais} ${limpio}`
}

// =====================
// EMAIL
// =====================

/**
 * Valida formato de email
 */
export function validarEmail(email: string): boolean {
  if (!email) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email.trim())
}

// =====================
// HELPERS GENERALES
// =====================

/**
 * Valida que un campo obligatorio no esté vacío
 */
export function campoRequerido(valor: string | undefined | null): boolean {
  return !!valor && valor.trim().length > 0
}

/**
 * Calcula edad a partir de fecha de nacimiento
 */
export function calcularEdad(fechaNacimiento: string): { anios: number; meses: number } {
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T12:00')
  let anios = hoy.getFullYear() - nac.getFullYear()
  let meses = hoy.getMonth() - nac.getMonth()

  if (meses < 0 || (meses === 0 && hoy.getDate() < nac.getDate())) {
    anios--
    meses += 12
  }
  if (hoy.getDate() < nac.getDate()) meses--

  return { anios, meses: Math.max(0, meses) }
}

/**
 * Retorna errores de validación para todo el formulario.
 * Retorna un objeto { campo: "mensaje de error" }
 */
export function validarFormularioAdmision(form: any, paso: number): Record<string, string> {
  const errores: Record<string, string> = {}

  if (paso === 1) {
    if (!campoRequerido(form.alumno_nombre)) errores.alumno_nombre = 'Primer nombre es obligatorio'
    if (!campoRequerido(form.alumno_apellido)) errores.alumno_apellido = 'Apellido paterno es obligatorio'
    if (!campoRequerido(form.alumno_apellido_materno)) errores.alumno_apellido_materno = 'Apellido materno es obligatorio'
    if (!form.curso_solicitado) errores.curso_solicitado = 'Seleccione un nivel/ciclo'
    if (!form.alumno_fecha_nacimiento) errores.alumno_fecha_nacimiento = 'Fecha de nacimiento es obligatoria'
    if (form.alumno_rut && !validarRut(form.alumno_rut)) errores.alumno_rut = 'RUT inválido'
    if (!form.alumno_sexo) errores.alumno_sexo = 'Seleccione sexo'
  }

  if (paso === 2) {
    if (!campoRequerido(form.apoderado_nombre)) errores.apoderado_nombre = 'Primer nombre es obligatorio'
    if (!campoRequerido(form.apoderado_apellido)) errores.apoderado_apellido = 'Apellido paterno es obligatorio'
    if (!campoRequerido(form.apoderado_apellido_materno)) errores.apoderado_apellido_materno = 'Apellido materno es obligatorio'
    if (!form.apoderado_email || !validarEmail(form.apoderado_email)) errores.apoderado_email = 'Email válido es obligatorio'
    if (!form.apoderado_telefono_num) errores.apoderado_telefono = 'Teléfono es obligatorio'
    else if (!validarTelefono(form.apoderado_telefono_num, form.apoderado_telefono_cod || '+56')) errores.apoderado_telefono = 'Teléfono incompleto'
    if (form.apoderado_rut && !validarRut(form.apoderado_rut)) errores.apoderado_rut = 'RUT inválido'
    if (!campoRequerido(form.apoderado_direccion)) errores.apoderado_direccion = 'Dirección es obligatoria'
    if (!campoRequerido(form.apoderado_comuna)) errores.apoderado_comuna = 'Comuna es obligatoria'
    // Padre: validar RUT si se ingresó
    if (form.padre_rut && !validarRut(form.padre_rut)) errores.padre_rut = 'RUT inválido'
  }

  if (paso === 3) {
    if (!campoRequerido(form.contacto_emergencia)) errores.contacto_emergencia = 'Contacto de emergencia es obligatorio'
    if (!form.telefono_emergencia_num) errores.telefono_emergencia = 'Teléfono de emergencia es obligatorio'
  }

  return errores
}

// =====================
// EXPORTS ADICIONALES (usados por MatriculaClient)
// =====================

/**
 * Capitaliza primera letra de cada palabra
 */
export function capitalizarNombre(s: string): string {
  if (!s) return ''
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Formatea fecha ISO a dd/mm/yyyy
 */
export function formatearFecha(fecha: string): string {
  if (!fecha) return ''
  const d = new Date(fecha + 'T12:00')
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
