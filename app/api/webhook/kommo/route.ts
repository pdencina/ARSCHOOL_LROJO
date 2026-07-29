import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/webhook/kommo
// Recibe notificaciones de Kommo cuando un lead cambia de etapa
// Crea o actualiza un prospecto en AR School
export async function POST(request: NextRequest) {
  // Verificar secret (opcional, configurar en Kommo)
  const secret = request.headers.get('x-kommo-secret')
  if (process.env.KOMMO_WEBHOOK_SECRET && secret !== process.env.KOMMO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Secret inválido' }, { status: 401 })
  }

  const body = await request.json()
  const admin = getAdmin()

  // Kommo puede enviar diferentes formatos, soportar los principales
  const lead = body.leads?.update?.[0] ?? body.leads?.add?.[0] ?? body

  if (!lead) {
    return NextResponse.json({ ok: true, message: 'No lead data' })
  }

  // Extraer datos del lead
  const kommoId = String(lead.id ?? lead.lead_id ?? '')
  const nombre = lead.name ?? lead.nombre ?? ''
  const etapa = mapearEtapaKommo(lead.status_id ?? lead.pipeline_status_id)

  // Extraer campos personalizados (depende de cómo esté configurado Kommo)
  const campos = lead.custom_fields_values ?? lead.custom_fields ?? []
  const email = extraerCampo(campos, 'email') ?? extraerCampo(campos, 'EMAIL') ?? ''
  const telefono = extraerCampo(campos, 'phone') ?? extraerCampo(campos, 'PHONE') ?? ''
  const sede = extraerCampo(campos, 'sede') ?? detectarSede(lead.pipeline_id)
  const nivel = extraerCampo(campos, 'nivel') ?? ''

  // Determinar colegio_id por sede
  const SEDES_COLEGIO: Record<string, string> = {
    santiago: '11111111-1111-1111-1111-111111111111',
    puente_alto: '22222222-2222-2222-2222-222222222222',
    punta_arenas: '33333333-3333-3333-3333-333333333333',
  }
  const colegioId = SEDES_COLEGIO[sede ?? 'santiago'] ?? '11111111-1111-1111-1111-111111111111'

  // Upsert prospecto
  const { data, error } = await admin.from('prospectos').upsert({
    colegio_id: colegioId,
    nombre: nombre.split(' ')[0] || nombre,
    apellido: nombre.split(' ').slice(1).join(' ') || null,
    email: email || null,
    telefono: telefono || null,
    sede: sede || 'santiago',
    nivel_interes: nivel || null,
    etapa,
    origen: 'kommo',
    kommo_lead_id: kommoId,
    fecha_ultima_interaccion: new Date().toISOString(),
    metadata: { raw_lead: lead },
  }, { onConflict: 'kommo_lead_id' }).select().single()

  if (error) {
    console.error('Error webhook Kommo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, prospecto_id: data?.id, etapa })
}

// Mapear status_id de Kommo a nuestras etapas
function mapearEtapaKommo(statusId: number | string | undefined): string {
  // Estos IDs dependen de cómo esté configurado el pipeline en Kommo
  // Se pueden ajustar después de ver la configuración real
  const mapa: Record<string, string> = {
    // IDs genéricos — ajustar con los reales de Kommo
    '142': 'calificado',
    '143': 'informado',
    '144': 'negociacion',
    '145': 'visita',
    '146': 'matricula',
    '143': 'informado',
  }
  return mapa[String(statusId)] ?? 'calificado'
}

function extraerCampo(campos: any[], nombre: string): string | null {
  if (!Array.isArray(campos)) return null
  const campo = campos.find((c: any) =>
    (c.field_name ?? c.name ?? '').toLowerCase().includes(nombre.toLowerCase())
  )
  if (!campo) return null
  return campo.values?.[0]?.value ?? campo.value ?? null
}

function detectarSede(pipelineId: number | string | undefined): string {
  // Mapear pipeline_id de Kommo a sede (ajustar con IDs reales)
  // Por ahora default santiago
  return 'santiago'
}
