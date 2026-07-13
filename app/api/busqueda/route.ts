import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/busqueda?q=texto
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any
  if (!u?.colegio_id) return NextResponse.json({ resultados: [] })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ resultados: [] })

  const colegioId = u.colegio_id
  const busqueda = `%${q}%`

  // Buscar en paralelo
  const [
    { data: alumnos },
    { data: comunicados },
    { data: tareas },
    { data: usuarios },
  ] = await Promise.all([
    admin.from('alumnos')
      .select('id, nombre, apellido, curso')
      .eq('colegio_id', colegioId)
      .eq('activo', true)
      .or(`nombre.ilike.${busqueda},apellido.ilike.${busqueda},rut.ilike.${busqueda}`)
      .limit(5),
    admin.from('comunicados')
      .select('id, titulo, tipo, enviado_at')
      .eq('colegio_id', colegioId)
      .ilike('titulo', busqueda)
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('tareas')
      .select('id, titulo, curso, materia')
      .eq('colegio_id', colegioId)
      .ilike('titulo', busqueda)
      .order('created_at', { ascending: false })
      .limit(5),
    ['super_admin', 'admin'].includes(u.rol)
      ? admin.from('usuarios')
          .select('id, nombre, apellido, email, rol')
          .eq('colegio_id', colegioId)
          .or(`nombre.ilike.${busqueda},apellido.ilike.${busqueda},email.ilike.${busqueda}`)
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const resultados: { tipo: string; id: string; titulo: string; subtitulo: string; href: string; icon: string }[] = []

  // Alumnos
  ;(alumnos ?? []).forEach((a: any) => {
    resultados.push({
      tipo: 'alumno',
      id: a.id,
      titulo: `${a.nombre} ${a.apellido}`,
      subtitulo: a.curso,
      href: `/alumnos/${a.id}`,
      icon: 'ti-user',
    })
  })

  // Comunicados
  ;(comunicados ?? []).forEach((c: any) => {
    resultados.push({
      tipo: 'comunicado',
      id: c.id,
      titulo: c.titulo,
      subtitulo: c.tipo ?? 'general',
      href: '/comunicados',
      icon: 'ti-speakerphone',
    })
  })

  // Tareas
  ;(tareas ?? []).forEach((t: any) => {
    resultados.push({
      tipo: 'tarea',
      id: t.id,
      titulo: t.titulo,
      subtitulo: `${t.curso}${t.materia ? ' · ' + t.materia : ''}`,
      href: `/tareas/${t.id}`,
      icon: 'ti-checklist',
    })
  })

  // Usuarios
  ;((usuarios as any[]) ?? []).forEach((u: any) => {
    resultados.push({
      tipo: 'usuario',
      id: u.id,
      titulo: `${u.nombre} ${u.apellido}`,
      subtitulo: `${u.rol} · ${u.email}`,
      href: '/super-admin/usuarios',
      icon: 'ti-user-cog',
    })
  })

  return NextResponse.json({ resultados })
}
