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

export default async function FirmarContratoPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()

  // Verificar que el usuario tiene rol para gestionar firmas
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador'].includes(usuario?.rol)) redirect('/inicio')

  const { data: matricula } = await admin.from('matriculas').select('*, alumno:alumnos(nombre, apellido, curso)').eq('id', params.id).single()
  if (!matricula) redirect('/matricula')

  // Coordinador: solo puede firmar matrículas de su programa y sede
  if (usuario?.rol === 'coordinador') {
    const m = matricula as any
    const progOk = !usuario.programa_ids?.length || (m.programa_id && usuario.programa_ids.includes(m.programa_id))
    const sedes = [usuario.colegio_id, ...(usuario.sedes_ids || [])].filter(Boolean)
    const sedeOk = sedes.length === 0 || sedes.includes(m.colegio_id)
    if (!progOk || !sedeOk) redirect('/inicio')
  }

  const m = matricula as any

  return (
    <FirmaContratoClient
      matriculaId={params.id}
      alumno={m.alumno}
      firmadoContrato={!!m.firma_apoderado}
      firmadoPagare={!!m.firma_pagare}
    />
  )
}
