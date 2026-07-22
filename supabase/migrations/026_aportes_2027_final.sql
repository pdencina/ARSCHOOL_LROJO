-- ============================================================
-- MIGRACIÓN 026 — Aportes 2027 montos finales (tabla comparativa sedes)
-- Reemplaza datos 2027 anteriores con montos definitivos
-- Fuente: Tabla comparativa sedes AR School 2026-2027
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar datos 2027 anteriores (pueden tener montos desactualizados)
DELETE FROM public.tabla_aportes WHERE anio = 2027;

-- =====================
-- APORTES INICIALES 2027
-- =====================
INSERT INTO public.tabla_aportes (nivel, modalidad, jornada, tipo, anio, sede, monto) VALUES
  -- Playgroup - Inicial
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'santiago', 90000),
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'punta_arenas', 90000),
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'puente_alto', 64000),
  -- Preschool a High School - Inicial
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'santiago', 140000),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'punta_arenas', 140000),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'puente_alto', 104000),
  ('Preschool a High School', 'online', NULL, 'inicial', 2027, 'santiago', 140000),
  ('Preschool a High School', 'online', NULL, 'inicial', 2027, 'punta_arenas', 140000),
  ('Preschool a High School', 'online', NULL, 'inicial', 2027, 'puente_alto', 104000);

-- =====================
-- APORTES MENSUALES 2027
-- =====================
INSERT INTO public.tabla_aportes (nivel, modalidad, jornada, tipo, anio, sede, monto) VALUES
  -- Playgroup Jornada Completa
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'santiago', 286000),
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'punta_arenas', 286000),
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'puente_alto', 208000),
  -- Playgroup Media Jornada
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'santiago', 214500),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'punta_arenas', 214500),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'puente_alto', 156000),
  -- Preschool a High School Presencial
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'santiago', 302500),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'punta_arenas', 302500),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'puente_alto', 220500),
  -- Preschool a High School Online (solo continuidad, no nuevos postulantes)
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'santiago', 242000),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'punta_arenas', 242000),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'puente_alto', 242000);
