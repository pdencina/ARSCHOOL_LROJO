import type { Database } from './database.types'

export type Colegio = Database['public']['Tables']['colegios']['Row']
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Ficha = Database['public']['Tables']['fichas']['Row']
export type Alumno = Database['public']['Tables']['alumnos']['Row']
export type Familia = Database['public']['Tables']['familias']['Row']
export type Cobro = Database['public']['Tables']['cobros']['Row']
export type Pago = Database['public']['Tables']['pagos']['Row']
export type ConceptoCobro = Database['public']['Tables']['conceptos_cobro']['Row']

export type CobroConFamilia = Cobro & {
  familia: Familia & { alumno: Alumno }
  concepto: ConceptoCobro
}

export type EstadoCobro = Cobro['estado']
export type Materia = Ficha['materia']
export type RolUsuario = Usuario['rol']

export interface KpiContable {
  recaudado: number
  enMora: number
  moraCritica: number
  familiasAlDia: number
  totalFamilias: number
  proyectado: number
}

export interface MorosidadMes {
  mes: string
  porcentaje: number
  monto: number
}

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}
