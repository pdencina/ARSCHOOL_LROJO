export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from 'react-hot-toast'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ur } = await supabase
    .from('usuarios').select('*, colegio:colegios(*)')
    .eq('id', user.id).single()

  const usuario = ur as any
  const rol = usuario?.rol
  if (!['apoderado','alumno'].includes(rol)) redirect('/inicio')

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right"/>
      <Topbar usuario={usuario}/>
      <div className="flex">
        <Sidebar rol={rol}/>
        <main className="flex-1 min-h-[calc(100vh-56px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}