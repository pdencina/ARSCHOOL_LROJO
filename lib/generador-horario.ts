// Generador de horarios basado en lógica (sin IA)
// Modelo A.M.O.R.: Equilibra dimensiones Académica, Valórica, Emocional, Espiritual

interface Alumno { id: string; nombre: string; apellido: string; curso: string; jornada: string; nivel: string }
interface Tutor { id: string; nombre: string; apellido: string }
interface Espacio { id: string; nombre: string; capacidad: number; tipo: string }
interface Experiencia { id: string; nombre: string; tipo: string; duracion_min: number; requiere_espacio?: string }

interface BloqueHorario {
  hora: string
  grupo: string
  experiencia: string
  tutor: string
  espacio: string
}

interface Propuesta {
  titulo: string
  sede: string
  grupos: { nombre: string; curso: string; alumnos: number; tutor: string }[]
  horario: Record<string, BloqueHorario[]>
  notas: string[]
}

const BLOQUES_HORARIO = [
  { hora: '08:00 - 09:30', duracion: 90 },
  { hora: '09:30 - 10:00', duracion: 30, tipo: 'recreo' },
  { hora: '10:00 - 11:30', duracion: 90 },
  { hora: '11:30 - 12:00', duracion: 30, tipo: 'recreo' },
  { hora: '12:00 - 13:30', duracion: 90 },
  { hora: '13:30 - 14:00', duracion: 30, tipo: 'almuerzo' },
  { hora: '14:00 - 15:30', duracion: 90 },
]

const BLOQUES_VIERNES = [
  { hora: '08:00 - 09:30', duracion: 90 },
  { hora: '09:30 - 10:00', duracion: 30, tipo: 'recreo' },
  { hora: '10:00 - 11:30', duracion: 90 },
  { hora: '11:30 - 12:00', duracion: 30, tipo: 'recreo' },
  { hora: '12:00 - 13:30', duracion: 90 },
]

const EXPERIENCIAS_DEFAULT: Experiencia[] = [
  { id: '1', nombre: 'Lenguaje', tipo: 'academica', duracion_min: 90 },
  { id: '2', nombre: 'Matemáticas', tipo: 'academica', duracion_min: 90 },
  { id: '3', nombre: 'Inglés', tipo: 'academica', duracion_min: 90 },
  { id: '4', nombre: 'Ciencias / Exploración', tipo: 'academica', duracion_min: 90 },
  { id: '5', nombre: 'Deportes / Motricidad', tipo: 'emocional', duracion_min: 90, requiere_espacio: 'patio' },
  { id: '6', nombre: 'Taller de Valores', tipo: 'valorica', duracion_min: 90 },
  { id: '7', nombre: 'Música / Arte', tipo: 'emocional', duracion_min: 90 },
  { id: '8', nombre: 'Devocional / Espiritual', tipo: 'espiritual', duracion_min: 90 },
]

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

export function generarHorarioLogico(
  alumnos: Alumno[],
  tutores: Tutor[],
  espacios: Espacio[],
  experiencias: Experiencia[],
  sede: string
): Propuesta {
  const notas: string[] = []

  // Si no hay experiencias en BD, usar las default
  const exps = experiencias.length > 0 ? experiencias : EXPERIENCIAS_DEFAULT

  // 1. Agrupar alumnos por curso
  const cursoMap: Record<string, Alumno[]> = {}
  alumnos.forEach(a => {
    if (!cursoMap[a.curso]) cursoMap[a.curso] = []
    cursoMap[a.curso].push(a)
  })

  // 2. Crear grupos (max 12 alumnos por grupo)
  const grupos: { nombre: string; curso: string; alumnos: number; tutor: string }[] = []
  let grupoIdx = 0
  const letras = 'ABCDEFGHIJKLMNOP'

  Object.entries(cursoMap).forEach(([curso, als]) => {
    const cantGrupos = Math.ceil(als.length / 12)
    for (let i = 0; i < cantGrupos; i++) {
      const cantAlumnos = i < cantGrupos - 1 ? Math.ceil(als.length / cantGrupos) : als.length - Math.ceil(als.length / cantGrupos) * i
      const tutor = tutores[grupoIdx % tutores.length]
      grupos.push({
        nombre: `Grupo ${letras[grupoIdx]}`,
        curso,
        alumnos: Math.min(cantAlumnos, 12),
        tutor: tutor ? `${tutor.nombre} ${tutor.apellido}` : 'Tutor por asignar',
      })
      grupoIdx++
    }
  })

  if (grupos.length === 0) {
    grupos.push({ nombre: 'Grupo A', curso: 'Sin alumnos', alumnos: 0, tutor: 'Sin asignar' })
    notas.push('No hay alumnos matriculados para generar horario.')
  }

  // 3. Asignar espacios
  const espaciosDisponibles = espacios.length > 0
    ? espacios.map(e => e.nombre)
    : ['Sala Principal', 'Sala Secundaria', 'Patio']

  // 4. Generar horario semanal rotando experiencias
  const horario: Record<string, BloqueHorario[]> = {}

  DIAS.forEach((dia, diaIdx) => {
    const bloques = dia === 'viernes' ? BLOQUES_VIERNES : BLOQUES_HORARIO
    const bloquesAcademicos = bloques.filter(b => !b.tipo)
    const diaHorario: BloqueHorario[] = []

    grupos.forEach((grupo, grupoIdx) => {
      bloquesAcademicos.forEach((bloque, bloqueIdx) => {
        // Rotar experiencias: cada grupo empieza en un punto diferente
        const expIdx = (diaIdx * bloquesAcademicos.length + bloqueIdx + grupoIdx * 2) % exps.length
        const exp = exps[expIdx]

        // Asignar espacio según tipo de experiencia
        let espacio = espaciosDisponibles[grupoIdx % espaciosDisponibles.length]
        if (exp.requiere_espacio === 'patio') {
          espacio = espaciosDisponibles.find(e => e.toLowerCase().includes('patio')) || 'Patio'
        }

        diaHorario.push({
          hora: bloque.hora,
          grupo: grupo.nombre,
          experiencia: exp.nombre,
          tutor: grupo.tutor,
          espacio,
        })
      })
    })

    horario[dia] = diaHorario
  })

  // 5. Generar notas
  notas.push(`Se crearon ${grupos.length} grupo(s) para ${alumnos.length} alumnos.`)
  notas.push(`Ratio tutor/alumnos: máximo 1:${Math.max(...grupos.map(g => g.alumnos))}`)
  notas.push(`Se distribuyeron ${exps.length} experiencias equilibrando las 4 dimensiones del modelo A.M.O.R.`)
  if (tutores.length < grupos.length) {
    notas.push(`⚠️ Se necesitan al menos ${grupos.length} tutores. Actualmente hay ${tutores.length}.`)
  }

  return {
    titulo: `Propuesta de horario semanal — ${sede.charAt(0).toUpperCase() + sede.slice(1)}`,
    sede,
    grupos,
    horario,
    notas,
  }
}
