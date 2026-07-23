import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/seed — Crear tutores de prueba con auth + generar horario
// Solo ejecutar en desarrollo, requiere super_admin
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Solo super_admin puede ejecutar seed' }, { status: 403 })
  }

  const colegioId = '11111111-1111-1111-1111-111111111111'
  const resultados: any[] = []

  // Tutores a crear
  const tutores = [
    { nombre: 'María', apellido: 'Fernández', email: 'maria.fernandez@arschoolglobal.com' },
    { nombre: 'Carlos', apellido: 'Sánchez', email: 'carlos.sanchez@arschoolglobal.com' },
    { nombre: 'Andrea', apellido: 'Morales', email: 'andrea.morales@arschoolglobal.com' },
    { nombre: 'Roberto', apellido: 'Silva', email: 'roberto.silva@arschoolglobal.com' },
    { nombre: 'Patricia', apellido: 'Vásquez', email: 'patricia.vasquez@arschoolglobal.com' },
  ]

  for (const tutor of tutores) {
    // Crear usuario auth
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: tutor.email,
      password: 'arschool2027',
      email_confirm: true,
    })

    if (authErr && !authErr.message.includes('already')) {
      resultados.push({ ...tutor, status: 'error', error: authErr.message })
      continue
    }

    const userId = authData?.user?.id
    if (!userId) {
      // Ya existe, buscar
      const { data: existingUsers } = await admin.auth.admin.listUsers()
      const existing = existingUsers?.users?.find(u => u.email === tutor.email)
      if (existing) {
        await admin.from('usuarios').upsert({
          id: existing.id,
          colegio_id: colegioId,
          email: tutor.email,
          nombre: tutor.nombre,
          apellido: tutor.apellido,
          rol: 'tutor',
          activo: true,
        }, { onConflict: 'id' })
        resultados.push({ ...tutor, status: 'existed', id: existing.id })
      }
      continue
    }

    // Crear en tabla usuarios
    await admin.from('usuarios').upsert({
      id: userId,
      colegio_id: colegioId,
      email: tutor.email,
      nombre: tutor.nombre,
      apellido: tutor.apellido,
      rol: 'tutor',
      activo: true,
    }, { onConflict: 'id' })

    resultados.push({ ...tutor, status: 'created', id: userId })
  }

  // Generar horario publicado con los tutores
  const tutoresDB = await admin.from('usuarios').select('id, nombre, apellido').eq('colegio_id', colegioId).eq('rol', 'tutor').eq('activo', true)
  const tutoresList = (tutoresDB.data ?? []) as any[]

  const experiencias = [
    'Lenguaje y Comunicación', 'Matemáticas', 'Ciencias Naturales',
    'Historia y Cultura', 'Inglés', 'Deportes / Motricidad',
    'Música / Arte', 'Taller de Valores', 'Devocional / Espiritual', 'Tecnología'
  ]

  const cursos = ['Play Group (2-3 años)', 'Elementary 1 (Ciclo 1)', 'Elementary 3 (Ciclo 3)', 'Middle School 5 (Ciclo 5)']
  const bloquesDia = ['08:00 - 09:30', '10:00 - 11:30', '12:00 - 13:30', '14:00 - 15:30']
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  const espacios = ['Sala A', 'Sala B', 'Sala C', 'Patio', 'Biblioteca']

  // Generar horario rotativo
  const horario: Record<string, any[]> = {}

  dias.forEach((dia, diaIdx) => {
    horario[dia] = []
    cursos.forEach((curso, cursoIdx) => {
      bloquesDia.forEach((bloque, bloqueIdx) => {
        const tutorIdx = (diaIdx + cursoIdx + bloqueIdx) % tutoresList.length
        const expIdx = (diaIdx * bloquesDia.length + bloqueIdx + cursoIdx * 3) % experiencias.length
        const tutor = tutoresList[tutorIdx]
        const espacioIdx = (cursoIdx + bloqueIdx) % espacios.length

        horario[dia].push({
          hora: bloque,
          grupo: `Grupo ${String.fromCharCode(65 + cursoIdx)}`,
          experiencia: experiencias[expIdx],
          tutor: `${tutor?.nombre ?? 'Sin'} ${tutor?.apellido ?? 'asignar'}`,
          espacio: experiencias[expIdx].includes('Deporte') ? 'Patio' : espacios[espacioIdx],
        })
      })
    })
  })

  // Guardar horario publicado
  await admin.from('propuestas_horario').upsert({
    id: 'h0000001-0001-0001-0001-000000000001',
    colegio_id: colegioId,
    sede: 'santiago',
    anio: new Date().getFullYear(),
    periodo: 'semanal',
    estado: 'publicado',
    propuesta: {
      titulo: `Horario Semanal — Santiago ${new Date().getFullYear()}`,
      sede: 'santiago',
      grupos: cursos.map((c, i) => ({
        nombre: `Grupo ${String.fromCharCode(65 + i)}`,
        curso: c,
        alumnos: i === 0 ? 6 : 8,
        tutor: tutoresList[i] ? `${tutoresList[i].nombre} ${tutoresList[i].apellido}` : 'Sin asignar',
      })),
      horario,
      notas: ['Horario generado para pruebas'],
    },
  }, { onConflict: 'id' })

  return NextResponse.json({
    ok: true,
    tutores_creados: resultados,
    horario: 'publicado',
    mensaje: 'Ahora ejecuta seed_data_pruebas.sql en Supabase para crear alumnos y experiencias. Password de todos los tutores: arschool2027',
  })
}
