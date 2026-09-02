export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import FirmaContratoClient from '@/components/firma/FirmaContratoClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Firma del contrato desde el portal del apoderado.
 *
 * Existe aparte de /matricula/firmar/[id] porque esa ruta vive dentro del
 * grupo (dashboard), cuyo layout redirige a los apoderados al portal.
 */
export default async function PortalFirmarPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = (ur as any)?.rol
  if (!['apoderado', 'alumno'].includes(rol)) redirect('/inicio')

  // La matrícula debe pertenecer a un alumno vinculado a este apoderado
  const { data: vinculos } = await admin
    .from('tutor_alumnos')
    .select('alumno_id')
    .eq('tutor_id', user.id)
  const alumnoIds = (vinculos ?? []).map((v: any) => v.alumno_id)
  if (alumnoIds.length === 0) redirect('/portal/documentos')

  const { data: matricula } = await admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .eq('id', params.id)
    .single()

  if (!matricula) redirect('/portal/documentos')
  const m = matricula as any

  // Seguridad: no permitir firmar contratos de otras familias
  if (!alumnoIds.includes(m.alumno_id)) redirect('/portal/documentos')

  return (
    <FirmaContratoClient
      matriculaId={params.id}
      alumno={m.alumno}
      firmadoContrato={!!m.firma_apoderado}
      firmadoPagare={!!m.firma_pagare}
    />
  )
}
