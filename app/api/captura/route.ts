import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST: Crear sesión de captura
export async function POST() {
  const admin = getAdmin()
  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
  
  const { data, error } = await admin.from('sesiones_captura').insert({
    codigo,
    documentos: {},
    expira_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codigo, id: (data as any).id })
}

// GET: Obtener estado de sesión (polling)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const codigo = searchParams.get('codigo')
  if (!codigo) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const admin = getAdmin()
  const { data } = await admin
    .from('sesiones_captura')
    .select('*')
    .eq('codigo', codigo.toUpperCase())
    .gt('expira_at', new Date().toISOString())
    .single()

  if (!data) return NextResponse.json({ error: 'Sesión no encontrada o expirada' }, { status: 404 })
  return NextResponse.json(data)
}

// PUT: Agregar documento a la sesión (desde el celular)
export async function PUT(request: NextRequest) {
  const { codigo, tipo, url } = await request.json()
  if (!codigo || !tipo || !url) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const admin = getAdmin()
  
  // Obtener sesión actual
  const { data: sesion } = await admin
    .from('sesiones_captura')
    .select('*')
    .eq('codigo', codigo.toUpperCase())
    .gt('expira_at', new Date().toISOString())
    .single()

  if (!sesion) return NextResponse.json({ error: 'Sesión expirada' }, { status: 404 })

  // Subir imagen a Supabase Storage
  let publicUrl = url // Fallback: guardar base64 si falla el upload

  if (url.startsWith('data:')) {
    try {
      // Extraer el base64 y el content type
      const matches = url.match(/^data:(.+);base64,(.+)$/)
      if (matches) {
        const contentType = matches[1]
        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, 'base64')
        const extension = contentType.includes('png') ? 'png' : contentType.includes('pdf') ? 'pdf' : 'jpg'
        const fileName = `capturas/${codigo.toUpperCase()}/${tipo}_${Date.now()}.${extension}`

        const { data: uploadData, error: uploadError } = await admin.storage
          .from('documentos')
          .upload(fileName, buffer, { contentType, upsert: true })

        if (!uploadError && uploadData) {
          const { data: urlData } = admin.storage.from('documentos').getPublicUrl(uploadData.path)
          publicUrl = urlData.publicUrl
        }
      }
    } catch {
      // Si falla el upload, se queda con el base64 como fallback
    }
  }

  // Actualizar documentos en la sesión
  const docs = (sesion as any).documentos || {}
  docs[tipo] = publicUrl

  const { error } = await admin
    .from('sesiones_captura')
    .update({ documentos: docs })
    .eq('id', (sesion as any).id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, total: Object.keys(docs).length })
}
