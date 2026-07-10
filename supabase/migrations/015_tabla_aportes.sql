-- ============================================================
-- MIGRACIÓN 015 — Tabla de aportes por nivel, modalidad y sede
-- Configurable por el super_admin (Patricio Burgos)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tabla_aportes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nivel text NOT NULL, -- 'Playgroup', 'Preschool a High School'
  modalidad text NOT NULL, -- 'presencial', 'online'
  jornada text, -- 'completa', 'media', null (para todos)
  tipo text NOT NULL, -- 'inicial', 'mensual'
  anio integer NOT NULL, -- 2026, 2027
  sede text, -- 'santiago', 'punta_arenas', 'puente_alto', null (= todas)
  monto integer NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT ALL ON public.tabla_aportes TO authenticated;
GRANT ALL ON public.tabla_aportes TO service_role;

-- Datos iniciales 2026 (todas las sedes)
INSERT INTO public.tabla_aportes (nivel, modalidad, jornada, tipo, anio, sede, monto) VALUES
  ('Playgroup', 'presencial', 'completa', 'inicial', 2026, NULL, 80000),
  ('Playgroup', 'presencial', 'media', 'inicial', 2026, NULL, 80000),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2026, NULL, 130000),
  ('Preschool a High School', 'online', NULL, 'inicial', 2026, NULL, 130000),
  ('Playgroup', 'presencial', 'completa', 'mensual', 2026, NULL, 260000),
  ('Playgroup', 'presencial', 'media', 'mensual', 2026, NULL, 195000),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2026, NULL, 275000),
  ('Preschool a High School', 'online', NULL, 'mensual', 2026, NULL, 220000);

-- Datos 2027 por sede
INSERT INTO public.tabla_aportes (nivel, modalidad, jornada, tipo, anio, sede, monto) VALUES
  -- Iniciales 2027
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'santiago', 90000),
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'punta_arenas', 90000),
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'puente_alto', 72000),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'santiago', 140000),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'punta_arenas', 140000),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'puente_alto', 117000),
  -- Mensuales 2027
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'santiago', 286000),
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'punta_arenas', 286000),
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'puente_alto', 234000),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'santiago', 214500),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'punta_arenas', 214500),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'puente_alto', 175500),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'santiago', 302500),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'punta_arenas', 302500),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'puente_alto', 247500),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'santiago', 242000),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'punta_arenas', 242000),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'puente_alto', 242000);
