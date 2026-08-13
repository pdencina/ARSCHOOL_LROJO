import { createClient as createAdminClient } from '@supabase/supabase-js'
import SubsanarClient from '@/components/admision/SubsanarClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SubsanarPage({ params }: { params: { codigo: string } }) {
  const admin = getAdmin()
  const { codigo } = params

  const { data } = await admin
    .from('pre_admisiones')
    .select('*')
    .eq('codigo_seguimiento', codigo.toUpperCase())
    .single()

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3] p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-[#1B3A5C] mb-2">Código no encontrado</h1>
          <p className="text-sm text-gray-500">No se encontró una solicitud con este código.</p>
        </div>
      </div>
    )
  }

  const pa = data as any

  if (pa.estado === 'matriculada' || pa.estado === 'rechazada') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3] p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">{pa.estado === 'matriculada' ? '✅' : '❌'}</div>
          <h1 className="text-xl font-bold text-[#1B3A5C] mb-2">Solicitud {pa.estado}</h1>
          <p className="text-sm text-gray-500">Esta solicitud ya no puede ser modificada.</p>
        </div>
      </div>
    )
  }

  return <SubsanarClient preAdmision={pa} />
}
