export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Topbar from '@/components/layout/Topbar'
import SidebarWrapper from '@/components/layout/SidebarWrapper'
import CommandPalette from '@/components/layout/CommandPalette'
import AsistenciaBanner from '@/components/layout/AsistenciaBanner'
import { SEDE_COOKIE, SEDE_TODAS } from '@/lib/colegioScope'
import { Toaster } from 'react-hot-toast'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: usuarioRaw } = await admin
    .from('usuarios')
    .select('*, colegio:colegios(*)')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as any
  if (!usuario) redirect('/login')

  // Apoderados y alumnos van al portal, no al dashboard admin
  if (['apoderado', 'alumno'].includes(usuario.rol)) redirect('/portal')

  // Cargar permisos del rol (super_admin ve todo)
  let modulosHabilitados: string[] | null = null
  if (usuario.rol !== 'super_admin') {
    const { data: permisos } = await admin
      .from('permisos_rol')
      .select('modulo, habilitado')
      .is('colegio_id', null)
      .eq('rol', usuario.rol)

    if (permisos && permisos.length > 0) {
      modulosHabilitados = permisos.filter((p: any) => p.habilitado).map((p: any) => p.modulo)
    }
  }

  // Multi-sede: cargar sedes y sede activa (solo para super_admin)
  let colegios: { id: string; nombre: string }[] = []
  let sedeActiva = SEDE_TODAS
  if (usuario.rol === 'super_admin') {
    const { data: cols } = await admin.from('colegios').select('id, nombre').order('nombre')
    colegios = (cols as any[]) ?? []
    sedeActiva = cookies().get(SEDE_COOKIE)?.value ?? SEDE_TODAS
  }

  // Coordinador: solo mostrar en el menú los programas que gestiona
  let programaCodigos: string[] | null = null
  if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0) {
    const { data: progs } = await admin
      .from('programas')
      .select('codigo')
      .in('id', usuario.programa_ids)
    programaCodigos = (progs ?? []).map((p: any) => p.codigo)
  }

  return (
    <div className="min-h-screen bg-[var(--ar-bg)]">
      <Toaster position="top-right"/>
      <CommandPalette/>
      <Topbar usuario={usuario} colegios={colegios} sedeActiva={sedeActiva}/>
      <AsistenciaBanner rol={usuario.rol} userId={user.id} colegioId={usuario.colegio_id}/>
      <div className="flex h-[calc(100vh-56px)]">
        <SidebarWrapper rol={usuario.rol} modulosHabilitadosInicial={modulosHabilitados} programaCodigos={programaCodigos}/>
        <main className="flex-1 w-full h-[calc(100vh-56px)] overflow-auto animate-[fadeIn_0.2s_ease-out]">
          {children}
        </main>
      </div>
    </div>
  )
}
