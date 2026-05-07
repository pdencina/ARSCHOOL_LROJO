import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

// Rutas permitidas por rol
const ROLE_ROUTES: Record<string, string[]> = {
  super_admin: ['/super-admin', '/fichas', '/comunicados', '/asistencias', '/calificaciones', '/contable', '/alumnos', '/calendario', '/reportes', '/configuracion'],
  admin:       ['/fichas', '/comunicados', '/asistencias', '/calificaciones', '/contable', '/alumnos', '/calendario', '/reportes', '/configuracion'],
  docente:     ['/fichas', '/comunicados', '/asistencias', '/calificaciones', '/alumnos'],
  tutor:       ['/portal'],
  alumno:      ['/portal'],
}

const DEFAULT_ROUTE: Record<string, string> = {
  super_admin: '/super-admin',
  admin:       '/fichas',
  docente:     '/fichas',
  tutor:       '/portal',
  alumno:      '/portal',
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api')
  const isPublic = pathname.startsWith('/_next') || pathname.startsWith('/icon')

  if (isPublic || isApiRoute) return supabaseResponse

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    // Obtener rol para redirigir al destino correcto
    const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    const rol = (ur as any)?.rol ?? 'admin'
    const url = request.nextUrl.clone()
    url.pathname = DEFAULT_ROUTE[rol] ?? '/fichas'
    return NextResponse.redirect(url)
  }

  // Verificar permisos si está logueado
  if (user && !isAuthPage) {
    const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    const rol = (ur as any)?.rol ?? 'admin'
    const permitidas = ROLE_ROUTES[rol] ?? []
    const tieneAcceso = permitidas.some(r => pathname.startsWith(r)) || pathname === '/'

    if (!tieneAcceso) {
      const url = request.nextUrl.clone()
      url.pathname = DEFAULT_ROUTE[rol] ?? '/fichas'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}