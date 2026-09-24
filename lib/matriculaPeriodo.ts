/**
 * Período de una matrícula en la línea de tiempo de cobros.
 *
 * Los cobros no guardan a qué matrícula pertenecen (solo alumno_id, mes y año), así
 * que el recálculo de cobros y la tabla de aportes del contrato deben acotarse al
 * período de la matrícula; si no, mezclan cobros de otros años del mismo alumno.
 *
 * Período = desde el mes de inicio del contrato hasta (sin incluir) el inicio de la
 * siguiente matrícula del mismo alumno. Si no hay una siguiente, no tiene tope.
 */

/** Índice absoluto de mes (para comparar períodos que cruzan de año). */
export function idxMes(anio: number, mes: number): number {
  return anio * 12 + (mes - 1)
}

export function idxDeFecha(iso: string): number {
  const d = new Date(`${iso.slice(0, 10)}T12:00`)
  return idxMes(d.getFullYear(), d.getMonth() + 1)
}

/** Fecha de inicio de una matrícula (contrato > fecha de matrícula > creación). */
export function inicioMatricula(m: any): string | null {
  const f = m?.fecha_inicio_contrato || m?.fecha_matricula || m?.created_at
  return f ? String(f).slice(0, 10) : null
}

/**
 * Índice de mes (exclusivo) donde empieza la siguiente matrícula del alumno, o
 * Infinity si no hay. Solo cuenta matrículas de un año escolar posterior, o que
 * empiezan después de `desdeIdx`.
 */
export async function limiteSiguienteMatricula(admin: any, mat: any, desdeIdx: number): Promise<number> {
  const { data: otras } = await admin
    .from('matriculas')
    .select('id, anio_escolar, fecha_inicio_contrato, fecha_matricula, created_at')
    .eq('alumno_id', mat.alumno_id)
    .neq('id', mat.id)
  let limite = Infinity
  for (const o of (otras as any[]) ?? []) {
    const ini = inicioMatricula(o)
    if (!ini) continue
    let idx = idxDeFecha(ini)
    // Renovación de un año escolar posterior sin fecha de inicio de contrato (datos
    // antiguos): se asume que parte en marzo de su año, para no cortar el año en curso
    // (ej. un Play de 12 meses que termina en febrero).
    if (!o.fecha_inicio_contrato && o.anio_escolar && mat.anio_escolar && o.anio_escolar > mat.anio_escolar) {
      idx = Math.max(idx, idxMes(o.anio_escolar, 3))
    }
    const posterior = (o.anio_escolar && mat.anio_escolar && o.anio_escolar > mat.anio_escolar) || idx > desdeIdx
    if (posterior && idx > desdeIdx && idx < limite) limite = idx
  }
  return limite
}
