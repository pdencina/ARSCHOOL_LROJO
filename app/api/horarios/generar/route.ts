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

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const colegioId = (ur as any).colegio_id
  const body = await request.json()
  const { sede, restricciones_extra } = body

  // 1. Obtener alumnos activos por curso
  let queryAlumnos = admin.from('alumnos').select('id, nombre, apellido, curso, jornada, nivel').eq('activo', true)
  if (colegioId) queryAlumnos = queryAlumnos.eq('colegio_id', colegioId)
  if (sede) queryAlumnos = queryAlumnos.eq('sede', sede)
  const { data: alumnos } = await queryAlumnos

  // 2. Obtener tutores
  let queryTutores = admin.from('usuarios').select('id, nombre, apellido').eq('rol', 'tutor').eq('activo', true)
  if (colegioId) queryTutores = queryTutores.eq('colegio_id', colegioId)
  const { data: tutores } = await queryTutores

  // 3. Obtener espacios
  let queryEspacios = admin.from('espacios').select('*').eq('activo', true)
  if (colegioId) queryEspacios = queryEspacios.eq('colegio_id', colegioId)
  if (sede) queryEspacios = queryEspacios.eq('sede', sede)
  const { data: espacios } = await queryEspacios

  // 4. Obtener experiencias
  let queryExp = admin.from('experiencias').select('*').eq('activo', true)
  if (colegioId) queryExp = queryExp.eq('colegio_id', colegioId)
  const { data: experiencias } = await queryExp

  // Resumen por curso
  const cursos: Record<string, number> = {}
  ;(alumnos ?? []).forEach((a: any) => { cursos[a.curso] = (cursos[a.curso] || 0) + 1 })

  // 5. Construir prompt para OpenAI
  const prompt = `Eres un coordinador académico de AR School Global, un Centro Educacional Alternativo con Modelo Educativo A.M.O.R (Aprender con libertad, Madurar con propósito, Observar y maravillarse, Relacionarse en comunidad).

Genera una propuesta de horario semanal (lunes a viernes) considerando:

ALUMNOS POR CURSO:
${Object.entries(cursos).map(([curso, cant]) => `- ${curso}: ${cant} alumnos`).join('\n')}

TUTORES DISPONIBLES:
${(tutores ?? []).map((t: any) => `- ${t.nombre} ${t.apellido}`).join('\n') || '- Sin tutores registrados (asignar como "Tutor por definir")'}

ESPACIOS:
${(espacios ?? []).map((e: any) => `- ${e.nombre} (capacidad: ${e.capacidad}, tipo: ${e.tipo})`).join('\n') || '- Sala Principal (capacidad: 25)\n- Sala Secundaria (capacidad: 15)\n- Patio (capacidad: 40)'}

EXPERIENCIAS DE APRENDIZAJE:
${(experiencias ?? []).map((e: any) => `- ${e.nombre} (${e.tipo}, ${e.duracion_min} min)`).join('\n') || '- Lenguaje (90 min)\n- Matemáticas (90 min)\n- Inglés (90 min)\n- Ciencias/Exploración (90 min)\n- Deportes/Motricidad (60 min)\n- Taller de Valores (60 min)\n- Música/Arte (60 min)'}

HORARIO BASE:
- Santiago/Puente Alto: Lun-Jue 08:00-16:00, Vie 08:00-13:40
- Punta Arenas: Lun-Jue 07:45-16:00, Vie 07:45-13:40
- Recreos: 10:00-10:30 y 12:30-13:30 (almuerzo)
- Sede: ${sede || 'Santiago'}

RESTRICCIONES:
- Máximo ratio 1 tutor por cada 12 alumnos
- Cada grupo debe tener al menos 2 experiencias diarias
- Deportes solo en espacios tipo "patio"
- Equilibrar las 4 dimensiones del modelo A.M.O.R. durante la semana
${restricciones_extra || ''}

Responde SOLO con un JSON válido con esta estructura:
{
  "titulo": "Propuesta de horario semanal",
  "sede": "${sede || 'santiago'}",
  "grupos": [
    { "nombre": "Grupo A", "curso": "...", "alumnos": 10, "tutor": "..." }
  ],
  "horario": {
    "lunes": [
      { "hora": "08:00-09:30", "grupo": "Grupo A", "experiencia": "...", "tutor": "...", "espacio": "..." }
    ],
    "martes": [...],
    "miercoles": [...],
    "jueves": [...],
    "viernes": [...]
  },
  "notas": ["observación 1", "observación 2"]
}`

  // 6. Llamar a OpenAI
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      console.error('OpenAI error:', err)
      return NextResponse.json({ error: 'Error al generar propuesta' }, { status: 500 })
    }

    const openaiData = await openaiRes.json()
    const contenido = openaiData.choices[0]?.message?.content ?? ''

    // Parsear JSON de la respuesta
    let propuesta: any
    try {
      const jsonMatch = contenido.match(/\{[\s\S]*\}/)
      propuesta = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: contenido }
    } catch {
      propuesta = { raw: contenido }
    }

    // 7. Guardar propuesta en BD
    const { data: saved } = await admin.from('propuestas_horario').insert({
      colegio_id: colegioId,
      sede: sede || 'santiago',
      anio: new Date().getFullYear(),
      periodo: 'semanal',
      estado: 'borrador',
      propuesta,
      restricciones: { cursos, tutores: (tutores ?? []).length, espacios: (espacios ?? []).length, extra: restricciones_extra },
      generado_por: user.id,
    }).select().single()

    return NextResponse.json({ ok: true, propuesta, id: (saved as any)?.id })
  } catch (e: any) {
    console.error('Error generando horario:', e)
    return NextResponse.json({ error: e.message ?? 'Error interno' }, { status: 500 })
  }
}
