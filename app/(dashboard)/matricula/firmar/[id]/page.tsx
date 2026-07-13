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
  const { data: matricula } = await admin.from('matriculas').select('*, alumno:alumnos(nombre, apellido, curso)').eq('id', params.id).single()
  if (!matricula) redirect('/matricula')

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
