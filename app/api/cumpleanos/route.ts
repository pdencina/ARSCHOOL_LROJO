import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET: Obtener cumpleaños del día/semana
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rango = searchParams.get('rango') || 'hoy' // hoy | semana | mes
  const colegioId = searchParams.get('colegio_id')

  const admin = getAdmin()
  const hoy = new Date()
  const mesHoy = hoy.getMonth() + 1
  const diaHoy = hoy.getDate()

  // Obtener todos los alumnos activos con fecha de nacimiento
  let query = admin.from('alumnos').select('id, nombre, apellido, curso, fecha_nacimiento, colegio_id').eq('activo', true).not('fecha_nacimiento', 'is', null)
  if (colegioId) query = query.eq('colegio_id', colegioId)

  const { data: alumnos } = await query

  if (!alumnos) return NextResponse.json([])

  const cumpleaneros = (alumnos as any[]).filter(a => {
    const fecha = new Date(a.fecha_nacimiento + 'T12:00')
    const mes = fecha.getMonth() + 1
    const dia = fecha.getDate()

    if (rango === 'hoy') return mes === mesHoy && dia === diaHoy
    if (rango === 'semana') {
      const inicio = new Date(hoy)
      const fin = new Date(hoy)
      fin.setDate(fin.getDate() + 7)
      const cumple = new Date(hoy.getFullYear(), mes - 1, dia)
      return cumple >= inicio && cumple <= fin
    }
    if (rango === 'mes') return mes === mesHoy
    return false
  }).map(a => {
    const fecha = new Date(a.fecha_nacimiento + 'T12:00')
    const edad = hoy.getFullYear() - fecha.getFullYear()
    return { ...a, edad, dia_cumple: fecha.getDate(), mes_cumple: fecha.getMonth() + 1 }
  }).sort((a, b) => a.dia_cumple - b.dia_cumple)

  return NextResponse.json(cumpleaneros)
}

// POST: Enviar emails de cumpleaños (llamado por cron)
export async function POST(request: NextRequest) {
  // Verificar secret para cron
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && secret !== 'manual') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = getAdmin()
  const hoy = new Date()
  const mesHoy = hoy.getMonth() + 1
  const diaHoy = hoy.getDate()

  // Buscar alumnos que cumplen años hoy
  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, curso, fecha_nacimiento, colegio_id')
    .eq('activo', true)
    .not('fecha_nacimiento', 'is', null)

  if (!alumnos || alumnos.length === 0) return NextResponse.json({ enviados: 0 })

  const cumpleaneros = (alumnos as any[]).filter(a => {
    const fecha = new Date(a.fecha_nacimiento + 'T12:00')
    return fecha.getMonth() + 1 === mesHoy && fecha.getDate() === diaHoy
  })

  let enviados = 0

  for (const alumno of cumpleaneros) {
    // Buscar apoderado vinculado
    const { data: vinculo } = await admin.from('tutor_alumnos').select('tutor_id').eq('alumno_id', alumno.id).limit(1).single()
    if (!vinculo) continue

    const { data: usuario } = await admin.from('usuarios').select('email, nombre').eq('id', (vinculo as any).tutor_id).single()
    if (!usuario || !(usuario as any).email) continue

    // Calcular edad
    const nacimiento = new Date(alumno.fecha_nacimiento + 'T12:00')
    const edad = hoy.getFullYear() - nacimiento.getFullYear()

    // Enviar email
    try {
      const { enviarEmail } = await import('@/lib/email')
      await enviarEmail({
        to: (usuario as any).email,
        subject: `🎂 ¡Feliz cumpleaños ${alumno.nombre}! — AR School`,
        html: templateCumpleanos(alumno.nombre, alumno.apellido, edad, (usuario as any).nombre),
      })
      enviados++
    } catch (e) {
      console.error(`Error enviando cumpleaños a ${(usuario as any).email}:`, e)
    }
  }

  return NextResponse.json({ enviados, total_cumpleaneros: cumpleaneros.length })
}

function templateCumpleanos(nombre: string, apellido: string, edad: number, nombreApoderado: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #1B3A5C; padding-bottom: 16px; margin-bottom: 24px;">
        <strong style="font-size: 16px; color: #1B3A5C;">AR SCHOOL GLOBAL</strong>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 60px; margin-bottom: 12px;">🎂</div>
        <h1 style="color: #1B3A5C; font-size: 24px; margin: 0 0 8px;">¡Feliz cumpleaños, ${nombre}!</h1>
        <p style="color: #E8722A; font-size: 18px; font-weight: bold; margin: 0;">¡Hoy cumple ${edad} años!</p>
      </div>
      <div style="background: #FEF3EC; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
          Estimado/a <strong>${nombreApoderado}</strong>,
        </p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 12px 0 0;">
          Desde la familia de AR School queremos enviar un cariñoso saludo a <strong>${nombre} ${apellido}</strong> en este día tan especial. 
          Que este nuevo año de vida esté lleno de aprendizajes, aventuras y mucho amor.
        </p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 12px 0 0;">
          <em>"Que tu meta más alta sea siempre el amor."</em>
        </p>
      </div>
      <p style="color: #4b5563; font-size: 14px; text-align: center; margin-top: 20px;">
        Con cariño,<br/><strong style="color: #1B3A5C;">Equipo AR School Global</strong>
      </p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8eaed; color: #9ca3af; font-size: 11px; text-align: center;">
        Fundación Educacional AR Ministries · Modelo Educativo A.M.O.R.
      </div>
    </div>
  `
}
