import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from 'react-hot-toast'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, colegio:colegios(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-crema">
      <Toaster position="top-right" />
      <Topbar usuario={usuario} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-[calc(100vh-57px)] papel-rayado">
          {children}
        </main>
      </div>
    </div>
  )
}
