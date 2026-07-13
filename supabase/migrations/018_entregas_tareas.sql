-- ============================================================
-- MIGRACIÓN 018 — Entregas de tareas por alumnos
-- Permite que alumnos suban archivos y tutores califiquen
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entregas_tarea (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tarea_id uuid NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  archivo_url text,
  archivo_nombre text,
  comentario_alumno text,
  -- Calificación del tutor
  puntaje integer,
  comentario_tutor text,
  calificado_por uuid REFERENCES public.usuarios(id),
  calificado_at timestamptz,
  -- Estado
  estado text NOT NULL DEFAULT 'entregada' CHECK (estado IN ('entregada', 'calificada', 'devuelta')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Un alumno solo puede entregar una vez por tarea
  UNIQUE(tarea_id, alumno_id)
);

GRANT ALL ON public.entregas_tarea TO authenticated;
GRANT ALL ON public.entregas_tarea TO service_role;

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_entregas_tarea_tarea ON public.entregas_tarea(tarea_id);
CREATE INDEX IF NOT EXISTS idx_entregas_tarea_alumno ON public.entregas_tarea(alumno_id);
