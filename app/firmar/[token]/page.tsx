import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import FirmaRemotaClient from '@/components/firma/FirmaRemotaClient'
import { documentoPendiente, tokenVigente, ETIQUETA_DOCUMENTO, type TipoDocumento } from '@/lib/firmaSiguiente'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function Aviso({ icono, titulo, color = '#1B3A5C', children }: { icono: string; titulo: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3] p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">{icono}</div>
        <h1 className="text-xl font-bold mb-2" style={{ color }}>{titulo}</h1>
        {children}
      </div>
    </div>
  )
}

// Bloque "falta firmar el otro documento", con botón si hay un enlace vigente
function FaltaFirmar({ pendiente }: { pendiente: { tipo: TipoDocumento; etiqueta: string; token: string | null } }) {
  return (
    <div className="mt-5 rounded-xl border-2 border-[#E8722A]/40 bg-[#FEF3EC] p-4 text-left">
      <div className="text-sm font-bold text-[#9a3412]">Falta firmar: {pendiente.etiqueta}</div>
      <p className="text-xs text-[#9a3412]/80 mt-1">
        {pendiente.token
          ? 'Para completar la matrícula, firme también este documento.'
          : 'Para completar la matrícula falta este documento. Solicite al Centro Educacional que le envíe el enlace.'}
      </p>
      {pendiente.token && (
        <a href={`/firmar/${pendiente.token}`} className="mt-3 flex items-center justify-center w-full py-3 bg-[#1B3A5C] text-white text-sm font-semibold rounded-xl hover:bg-[#143050]">
          Continuar con el {pendiente.tipo === 'pagare' ? 'pagaré' : 'contrato'} →
        </a>
      )}
    </div>
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
      <Aviso icono="❌" titulo="Enlace no válido">
        <p className="text-sm text-gray-500">Este enlace de firma no existe o ya no está disponible. Contacte al Centro Educacional para solicitar uno nuevo.</p>
      </Aviso>
    )
  }

  const ft = firmaToken as any
  const tipo = ft.tipo as TipoDocumento

  // ¿Este documento ya está firmado (por este enlace, por otro o en persona)?
  const { data: mat } = await admin.from('matriculas').select('firmado_at, firmado_pagare_at').eq('id', ft.matricula_id).maybeSingle()
  const yaFirmado = ft.estado === 'firmado' || !!(tipo === 'pagare' ? (mat as any)?.firmado_pagare_at : (mat as any)?.firmado_at)

  if (yaFirmado) {
    const pendiente = await documentoPendiente(admin, ft.matricula_id, tipo)
    return (
      <Aviso icono="✅" titulo={`${ETIQUETA_DOCUMENTO[tipo]} ya firmado`} color="#2D5A3F">
        <p className="text-sm text-gray-500">Este documento ya fue firmado. El Centro Educacional tiene registro de su firma.</p>
        {pendiente && <FaltaFirmar pendiente={pendiente}/>}
      </Aviso>
    )
  }

  // Enlace reemplazado por un envío más reciente: llevar al enlace vigente
  if (ft.estado === 'cancelado') {
    const vigente = await tokenVigente(admin, ft.matricula_id, tipo)
    if (vigente && vigente !== token) redirect(`/firmar/${vigente}`)
    return (
      <Aviso icono="🔄" titulo="Enlace reemplazado">
        <p className="text-sm text-gray-500">Este enlace fue reemplazado por uno más reciente. Revise el último correo recibido o contacte al Centro Educacional para que le envíen uno nuevo.</p>
      </Aviso>
    )
  }

  if (new Date(ft.expira_at) < new Date() || ft.estado === 'expirado') {
    const vigente = await tokenVigente(admin, ft.matricula_id, tipo)
    if (vigente && vigente !== token) redirect(`/firmar/${vigente}`)
    return (
      <Aviso icono="⏰" titulo="Enlace expirado" color="#9A5B00">
        <p className="text-sm text-gray-500">Este enlace ha expirado. Contacte al Centro Educacional para que le envíen uno nuevo.</p>
      </Aviso>
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
