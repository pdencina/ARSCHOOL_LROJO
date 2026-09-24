import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { autorizarMatricula } from '@/lib/matriculaAcceso'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/matriculas/[id]/pagos/ver?comprobante=<id> | ?pago=<id>
// Abre un voucher. Los del equipo (bucket privado) con un enlace firmado de 5 minutos;
// los que subió el apoderado desde el portal (pagos.referencia en base64) como archivo.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const admin = getAdmin()
  const auth = await autorizarMatricula(admin, user.id, params.id)
  if ('error' in auth) return new NextResponse(auth.error, { status: auth.status })

  const { data: mat } = await admin.from('matriculas').select('alumno_id').eq('id', params.id).single()
  const alumnoId = (mat as any)?.alumno_id
  if (!alumnoId) return new NextResponse('Matrícula no encontrada', { status: 404 })

  const sp = new URL(request.url).searchParams
  const compId = sp.get('comprobante')
  const pagoId = sp.get('pago')

  if (compId) {
    const { data } = await admin.from('cobro_comprobantes').select('archivo_path, alumno_id').eq('id', compId).maybeSingle()
    const c = data as any
    if (!c || c.alumno_id !== alumnoId) return new NextResponse('Comprobante no encontrado', { status: 404 })
    const { data: firmado, error } = await admin.storage.from('comprobantes').createSignedUrl(c.archivo_path, 300)
    if (error || !firmado?.signedUrl) return new NextResponse('No se pudo abrir el comprobante', { status: 500 })
    return NextResponse.redirect(firmado.signedUrl)
  }

  if (pagoId) {
    const { data } = await admin.from('pagos').select('referencia, cobro:cobros(alumno_id)').eq('id', pagoId).maybeSingle()
    const p = data as any
    if (!p || p.cobro?.alumno_id !== alumnoId) return new NextResponse('Pago no encontrado', { status: 404 })
    const ref: string = p.referencia || ''
    if (ref.startsWith('http')) return NextResponse.redirect(ref)
    const m = ref.match(/^data:([^;]+);base64,(.+)$/)
    if (!m) return new NextResponse('Este pago no tiene comprobante adjunto', { status: 404 })
    return new NextResponse(Buffer.from(m[2], 'base64'), {
      headers: { 'Content-Type': m[1], 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline' },
    })
  }

  return new NextResponse('Falta el comprobante', { status: 400 })
}
