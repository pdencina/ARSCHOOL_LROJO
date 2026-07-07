import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as any
  const next = searchParams.get('next') ?? '/inicio'

  const redirectTo = new URL(next, request.url)

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Token válido, redirigir a la página de reset password
      return NextResponse.redirect(redirectTo)
    }

    console.error('Error verificando OTP:', error.message)
  }

  // Si falla, redirigir a login con error descriptivo
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('error', 'link_expired')
  loginUrl.searchParams.set('message', 'El enlace ha expirado. Solicita uno nuevo.')
  return NextResponse.redirect(loginUrl)
}
