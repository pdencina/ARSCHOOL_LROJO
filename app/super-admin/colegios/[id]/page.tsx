export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GestionarColegioClient from '@/components/admin/GestionarColegioClient'

export default async function GestionarColegioPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/super-admin')

  const [{ data: colegio }, { data: usuarios }, { data: alumnos }] = await Promise.all([
    supabase.from('colegios').select('*').eq('id', params.id).single(),
    supabase.from('usuarios').select('*').eq('colegio_id', params.id).order('rol'),
    supabase.from('alumnos').select('id, nombre, apellido, curso, activo').eq('colegio_id', params.id).eq('activo', true).order('apellido'),
  ])

  if (!colegio) redirect('/super-admin')

  return (
    <GestionarColegioClient
      colegio={colegio as any}
      usuarios={(usuarios as any[]) ?? []}
      alumnos={(alumnos as any[]) ?? []}
    />
  )
}