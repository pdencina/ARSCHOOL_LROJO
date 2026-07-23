-- ============================================================
-- SEED: Tutores + Horario publicado (ejecutar en Supabase SQL Editor)
-- Los tutores se crean en tabla usuarios con IDs fijos.
-- Para que puedan loguearse, créalos manualmente desde el dashboard de Supabase Auth
-- con los emails listados abajo y password: arschool2027
-- ============================================================

-- =====================
-- TUTORES (insertar en tabla usuarios)
-- NOTA: Para que puedan hacer login, ve a Authentication > Users en Supabase Dashboard
-- y crea cada email con password "arschool2027"
-- =====================
INSERT INTO public.usuarios (id, colegio_id, email, nombre, apellido, rol, activo) VALUES
  ('f0000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'maria.fernandez@arschoolglobal.com', 'María', 'Fernández', 'tutor', true),
  ('f0000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'carlos.sanchez@arschoolglobal.com', 'Carlos', 'Sánchez', 'tutor', true),
  ('f0000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'andrea.morales@arschoolglobal.com', 'Andrea', 'Morales', 'tutor', true),
  ('f0000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'roberto.silva@arschoolglobal.com', 'Roberto', 'Silva', 'tutor', true),
  ('f0000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'patricia.vasquez@arschoolglobal.com', 'Patricia', 'Vásquez', 'tutor', true)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- HORARIO PUBLICADO (con bloques asignados a tutores)
-- Cada día tiene 4 bloques x 4 cursos = 16 bloques por día
-- =====================
INSERT INTO public.propuestas_horario (id, colegio_id, sede, anio, periodo, estado, propuesta) VALUES
  ('a0000001-0001-0001-0001-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'santiago', 2026, 'semanal', 'publicado', '{
    "titulo": "Horario Semanal — Santiago 2026",
    "sede": "santiago",
    "grupos": [
      {"nombre": "Grupo A", "curso": "Play Group (2-3 años)", "alumnos": 6, "tutor": "María Fernández"},
      {"nombre": "Grupo B", "curso": "Elementary 1 (Ciclo 1)", "alumnos": 8, "tutor": "Carlos Sánchez"},
      {"nombre": "Grupo C", "curso": "Elementary 3 (Ciclo 3)", "alumnos": 8, "tutor": "Andrea Morales"},
      {"nombre": "Grupo D", "curso": "Middle School 5 (Ciclo 5)", "alumnos": 8, "tutor": "Roberto Silva"}
    ],
    "horario": {
      "lunes": [
        {"hora": "08:00 - 09:30", "grupo": "Grupo A", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Sala A"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo B", "experiencia": "Matemáticas", "tutor": "Carlos Sánchez", "espacio": "Sala B"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo C", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo D", "experiencia": "Historia y Cultura", "tutor": "Roberto Silva", "espacio": "Biblioteca"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo A", "experiencia": "Deportes / Motricidad", "tutor": "Patricia Vásquez", "espacio": "Patio"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo B", "experiencia": "Inglés", "tutor": "María Fernández", "espacio": "Sala A"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo C", "experiencia": "Taller de Valores", "tutor": "Carlos Sánchez", "espacio": "Sala B"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo D", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo A", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo B", "experiencia": "Devocional / Espiritual", "tutor": "Patricia Vásquez", "espacio": "Sala A"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo C", "experiencia": "Matemáticas", "tutor": "Roberto Silva", "espacio": "Sala B"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo D", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Biblioteca"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo B", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo C", "experiencia": "Inglés", "tutor": "Carlos Sánchez", "espacio": "Sala B"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo D", "experiencia": "Tecnología", "tutor": "Patricia Vásquez", "espacio": "Biblioteca"}
      ],
      "martes": [
        {"hora": "08:00 - 09:30", "grupo": "Grupo A", "experiencia": "Matemáticas", "tutor": "Carlos Sánchez", "espacio": "Sala A"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo B", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Sala B"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo C", "experiencia": "Historia y Cultura", "tutor": "Roberto Silva", "espacio": "Sala C"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo D", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Biblioteca"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo A", "experiencia": "Taller de Valores", "tutor": "Patricia Vásquez", "espacio": "Sala A"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo B", "experiencia": "Deportes / Motricidad", "tutor": "Roberto Silva", "espacio": "Patio"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo C", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Sala C"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo D", "experiencia": "Inglés", "tutor": "Carlos Sánchez", "espacio": "Sala B"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo A", "experiencia": "Devocional / Espiritual", "tutor": "María Fernández", "espacio": "Sala A"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo B", "experiencia": "Taller de Valores", "tutor": "Patricia Vásquez", "espacio": "Sala B"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo C", "experiencia": "Deportes / Motricidad", "tutor": "Carlos Sánchez", "espacio": "Patio"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo D", "experiencia": "Matemáticas", "tutor": "Roberto Silva", "espacio": "Biblioteca"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo B", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Sala B"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo C", "experiencia": "Tecnología", "tutor": "Patricia Vásquez", "espacio": "Sala C"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo D", "experiencia": "Devocional / Espiritual", "tutor": "María Fernández", "espacio": "Biblioteca"}
      ],
      "miercoles": [
        {"hora": "08:00 - 09:30", "grupo": "Grupo A", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Sala A"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo B", "experiencia": "Historia y Cultura", "tutor": "Roberto Silva", "espacio": "Sala B"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo C", "experiencia": "Matemáticas", "tutor": "Carlos Sánchez", "espacio": "Sala C"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo D", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Biblioteca"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo A", "experiencia": "Inglés", "tutor": "Carlos Sánchez", "espacio": "Sala A"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo B", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Sala B"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo C", "experiencia": "Devocional / Espiritual", "tutor": "Patricia Vásquez", "espacio": "Sala C"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo D", "experiencia": "Deportes / Motricidad", "tutor": "Roberto Silva", "espacio": "Patio"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo A", "experiencia": "Taller de Valores", "tutor": "Patricia Vásquez", "espacio": "Sala A"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo B", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Sala B"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo C", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo D", "experiencia": "Taller de Valores", "tutor": "Carlos Sánchez", "espacio": "Biblioteca"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo B", "experiencia": "Tecnología", "tutor": "Patricia Vásquez", "espacio": "Sala B"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo C", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo D", "experiencia": "Inglés", "tutor": "Carlos Sánchez", "espacio": "Biblioteca"}
      ],
      "jueves": [
        {"hora": "08:00 - 09:30", "grupo": "Grupo A", "experiencia": "Deportes / Motricidad", "tutor": "Patricia Vásquez", "espacio": "Patio"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo B", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Sala B"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo C", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Sala C"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo D", "experiencia": "Matemáticas", "tutor": "Carlos Sánchez", "espacio": "Biblioteca"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo A", "experiencia": "Historia y Cultura", "tutor": "Roberto Silva", "espacio": "Sala A"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo B", "experiencia": "Taller de Valores", "tutor": "Patricia Vásquez", "espacio": "Sala B"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo C", "experiencia": "Tecnología", "tutor": "Carlos Sánchez", "espacio": "Sala C"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo D", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Biblioteca"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo A", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Sala A"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo B", "experiencia": "Matemáticas", "tutor": "Carlos Sánchez", "espacio": "Sala B"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo C", "experiencia": "Historia y Cultura", "tutor": "Roberto Silva", "espacio": "Sala C"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo D", "experiencia": "Devocional / Espiritual", "tutor": "Patricia Vásquez", "espacio": "Biblioteca"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo B", "experiencia": "Inglés", "tutor": "María Fernández", "espacio": "Sala B"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo C", "experiencia": "Deportes / Motricidad", "tutor": "Patricia Vásquez", "espacio": "Patio"},
        {"hora": "14:00 - 15:30", "grupo": "Grupo D", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Biblioteca"}
      ],
      "viernes": [
        {"hora": "08:00 - 09:30", "grupo": "Grupo A", "experiencia": "Devocional / Espiritual", "tutor": "Patricia Vásquez", "espacio": "Sala A"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo B", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Sala B"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo C", "experiencia": "Inglés", "tutor": "Carlos Sánchez", "espacio": "Sala C"},
        {"hora": "08:00 - 09:30", "grupo": "Grupo D", "experiencia": "Taller de Valores", "tutor": "Roberto Silva", "espacio": "Biblioteca"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo A", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Sala A"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo B", "experiencia": "Matemáticas", "tutor": "Carlos Sánchez", "espacio": "Sala B"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo C", "experiencia": "Ciencias Naturales", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "10:00 - 11:30", "grupo": "Grupo D", "experiencia": "Lenguaje y Comunicación", "tutor": "María Fernández", "espacio": "Biblioteca"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo A", "experiencia": "Matemáticas", "tutor": "Carlos Sánchez", "espacio": "Sala A"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo B", "experiencia": "Deportes / Motricidad", "tutor": "Roberto Silva", "espacio": "Patio"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo C", "experiencia": "Música / Arte", "tutor": "Andrea Morales", "espacio": "Sala C"},
        {"hora": "12:00 - 13:30", "grupo": "Grupo D", "experiencia": "Tecnología", "tutor": "Patricia Vásquez", "espacio": "Biblioteca"}
      ]
    },
    "notas": ["Horario de prueba generado para seed de desarrollo. Play Group (Grupo A) tiene jornada media, sale a las 13:30."]
  }'::jsonb)
ON CONFLICT (id) DO UPDATE SET propuesta = EXCLUDED.propuesta, estado = 'publicado';
