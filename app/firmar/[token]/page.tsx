import { createClient as createAdminClient } from '@supabase/supabase-js'
import FirmaRemotaClient from '@/components/firma/FirmaRemotaClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function FirmarRemotoPage({ params }: { params: { token: string } }) {
  const admin = getAdmin()
  const { token } = params

  // Buscar token
  const { data: firmaToken } = await admin
    .from('firma_tokens')
    .select('id, tipo, estado, expira_at, nombre_completo_esperado, matricula_id')
    .eq('token', token)
    .single()

  if (!firmaToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3] p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-[#1B3A5C] mb-2">Enlace no válido</h1>
          <p className="text-sm text-gray-500">Este enlace de firma no existe o ya no está disponible. Contacte al Centro Educativo para solicitar uno nuevo.</p>
        </div>
      </div>
    )
  }

  const ft = firmaToken as any

  if (ft.estado === 'firmado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3] p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-[#2D5A3F] mb-2">Documento ya firmado</h1>
          <p className="text-sm text-gray-500">Este documento ya fue firmado exitosamente. El Centro Educativo tiene registro de su firma.</p>
        </div>
      </div>
    )
  }

  if (new Date(ft.expira_at) < new Date() || ft.estado === 'expirado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3] p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-[#9A5B00] mb-2">Enlace expirado</h1>
          <p className="text-sm text-gray-500">Este enlace ha expirado. Contacte al Centro Educativo para que le envíen uno nuevo.</p>
        </div>
      </div>
    )
  }

  // Obtener URL del contrato para mostrar (con token para acceso sin auth)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const contratoUrl = `${baseUrl}/api/contratos?matricula_id=${ft.matricula_id}&tipo=${ft.tipo}&token=${token}`

  return (
    <FirmaRemotaClient
      token={token}
      tipo={ft.tipo}
      nombreEsperado={ft.nombre_completo_esperado}
      contratoUrl={contratoUrl}
    />
  )
}
