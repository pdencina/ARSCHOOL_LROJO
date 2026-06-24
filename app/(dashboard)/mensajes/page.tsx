export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ChatClient from '@/components/chat/ChatClient'

export const metadata = { title: 'Mensajes — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function MensajesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol, nombre, apellido').eq('id', user.id).single()
  const usuario = ur as any

  // Obtener apoderados del colegio para crear nuevas conversaciones
  const { data: apoderados } = await admin
    .from('usuarios')
    .select('id, nombre, apellido, email, rol')
    .eq('colegio_id', usuario.colegio_id)
    .in('rol', ['apoderado', 'alumno'])
    .eq('activo', true)
    .order('apellido')

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, curso')
    .eq('colegio_id', usuario.colegio_id)
    .eq('activo', true)

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return (
    <ChatClient
      userId={user.id}
      usuario={usuario}
      apoderados={(apoderados as any[]) ?? []}
      cursos={cursos}
    />
  )
}
