/**
 * Utilidades para el sistema multi-programa.
 * Determina qué programas puede ver un usuario según su rol y programa_ids.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'

export interface Programa {
  id: string
  codigo: string
  nombre: string
  nombre_corto: string
  color: string
  icono: string
  tiene_contrato: boolean
  tiene_pagare: boolean
  tiene_asistencia: boolean
  tiene_evaluaciones: boolean
  meses_cobro_default: number
  sitio_web: string | null
  activo: boolean
}

/**
 * Obtener los programas que un usuario puede gestionar.
 * - super_admin: todos
 * - pastor_campus: todos los de su sede
 * - coordinador con programa_ids: solo esos
 * - otros: los de su sede
 */
export async function getProgramasUsuario(usuario: any, admin: any): Promise<Programa[]> {
  // Si tiene programa_ids específicos, filtrar por esos
  if (usuario.programa_ids && usuario.programa_ids.length > 0) {
    const { data } = await admin
      .from('programas')
      .select('*')
      .in('id', usuario.programa_ids)
      .eq('activo', true)
      .order('nombre')
    return (data ?? []) as Programa[]
  }

  // Super admin y pastor_campus ven todos
  if (['super_admin', 'admin', 'pastor_campus'].includes(usuario.rol)) {
    const { data } = await admin
      .from('programas')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    return (data ?? []) as Programa[]
  }

  // Gestor admisión: AR School + Play (los programas educativos)
  if (usuario.rol === 'gestor_admision') {
    const { data } = await admin
      .from('programas')
      .select('*')
      .in('codigo', ['ar_school', 'play_group'])
      .eq('activo', true)
      .order('nombre')
    return (data ?? []) as Programa[]
  }

  // Default: todos activos
  const { data } = await admin
    .from('programas')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  return (data ?? []) as Programa[]
}

/**
 * Verifica si un usuario tiene acceso a un programa específico.
 */
export function tieneAccesoPrograma(usuario: any, programaId: string): boolean {
  if (['super_admin', 'admin', 'pastor_campus'].includes(usuario.rol)) return true
  if (!usuario.programa_ids || usuario.programa_ids.length === 0) return true
  return usuario.programa_ids.includes(programaId)
}

/**
 * Colores y configuración visual por programa.
 */
export const PROGRAMA_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  ar_school: { color: 'text-[#1B3A5C]', bg: 'bg-[#EDF6FA]', icon: 'ti-school', label: 'AR School' },
  play_group: { color: 'text-[#C45A1A]', bg: 'bg-[#FEF3EC]', icon: 'ti-mood-kid', label: 'Play & Group' },
  lions_soccer: { color: 'text-[#2D5A3F]', bg: 'bg-[#EDF5F0]', icon: 'ti-ball-football', label: 'Lions Soccer' },
  ar_worship: { color: 'text-[#6B4C9A]', bg: 'bg-[#F3EFFE]', icon: 'ti-music', label: 'AR Worship' },
}
