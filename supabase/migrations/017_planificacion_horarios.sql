-- ============================================================
-- MIGRACIÓN 017 — Planificación de horarios con IA
-- Tutores, espacios, experiencias y propuestas generadas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Espacios/salas disponibles por sede
CREATE TABLE IF NOT EXISTS public.espacios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  colegio_id uuid REFERENCES public.colegios(id),
  nombre text NOT NULL,
  capacidad integer DEFAULT 20,
  tipo text DEFAULT 'sala', -- sala, patio, laboratorio, biblioteca
  sede text, -- santiago, puente_alto, punta_arenas
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Experiencias de aprendizaje (materias/talleres)
CREATE TABLE IF NOT EXISTS public.experiencias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  colegio_id uuid REFERENCES public.colegios(id),
  nombre text NOT NULL,
  tipo text DEFAULT 'academica', -- academica, valorica, emocional, espiritual
  duracion_min integer DEFAULT 90, -- duración en minutos
  requiere_espacio text, -- tipo de espacio requerido (patio, sala, etc)
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Propuestas de horario generadas por IA
CREATE TABLE IF NOT EXISTS public.propuestas_horario (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  colegio_id uuid REFERENCES public.colegios(id),
  sede text,
  anio integer NOT NULL,
  periodo text, -- 'semestre_1', 'semestre_2', 'semanal'
  estado text DEFAULT 'borrador', -- borrador, publicado, archivado
  propuesta jsonb NOT NULL, -- la propuesta completa generada por IA
  restricciones jsonb, -- restricciones usadas para generar
  generado_por uuid,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.espacios TO authenticated;
GRANT ALL ON public.espacios TO service_role;
GRANT ALL ON public.experiencias TO authenticated;
GRANT ALL ON public.experiencias TO service_role;
GRANT ALL ON public.propuestas_horario TO authenticated;
GRANT ALL ON public.propuestas_horario TO service_role;
