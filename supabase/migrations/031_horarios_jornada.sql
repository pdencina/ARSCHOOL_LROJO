-- ============================================================
-- MIGRACIÓN 031 — Horarios de jornada autoadministrables
-- Permite al admin/gestor configurar horarios de ingreso/salida
-- por nivel y día de la semana. Mismo para todas las sedes.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.horarios_jornada (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  uuid REFERENCES public.colegios(id) ON DELETE CASCADE,
  nivel       text NOT NULL, -- 'Preschool', 'Ciclo 1 a High School'
  dia         text NOT NULL CHECK (dia IN ('lunes','martes','miercoles','jueves','viernes')),
  hora_ingreso text NOT NULL, -- '08:30'
  hora_salida  text NOT NULL, -- '16:00'
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(colegio_id, nivel, dia)
);

ALTER TABLE public.horarios_jornada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all horarios_jornada" ON public.horarios_jornada
  FOR ALL USING (colegio_id = public.mi_colegio_id() OR colegio_id IS NULL)
  WITH CHECK (colegio_id = public.mi_colegio_id() OR colegio_id IS NULL);

GRANT ALL ON public.horarios_jornada TO authenticated;
GRANT ALL ON public.horarios_jornada TO service_role;

-- =====================
-- DATOS INICIALES (info de Claudia — igual para todas las sedes)
-- NULL en colegio_id = aplica globalmente
-- =====================

-- Preschool (Ciclo 0): Lun-Vie 08:30 a 12:45
INSERT INTO public.horarios_jornada (colegio_id, nivel, dia, hora_ingreso, hora_salida) VALUES
  (NULL, 'Preschool', 'lunes', '08:30', '12:45'),
  (NULL, 'Preschool', 'martes', '08:30', '12:45'),
  (NULL, 'Preschool', 'miercoles', '08:30', '12:45'),
  (NULL, 'Preschool', 'jueves', '08:30', '12:45'),
  (NULL, 'Preschool', 'viernes', '08:30', '12:45'),
  -- Ciclo 1 a High School: Lun-Mar-Jue 08:30-16:00, Mié-Vie 08:30-13:40
  (NULL, 'Ciclo 1 a High School', 'lunes', '08:30', '16:00'),
  (NULL, 'Ciclo 1 a High School', 'martes', '08:30', '16:00'),
  (NULL, 'Ciclo 1 a High School', 'miercoles', '08:30', '13:40'),
  (NULL, 'Ciclo 1 a High School', 'jueves', '08:30', '16:00'),
  (NULL, 'Ciclo 1 a High School', 'viernes', '08:30', '13:40')
ON CONFLICT (colegio_id, nivel, dia) DO UPDATE SET hora_ingreso = EXCLUDED.hora_ingreso, hora_salida = EXCLUDED.hora_salida;
