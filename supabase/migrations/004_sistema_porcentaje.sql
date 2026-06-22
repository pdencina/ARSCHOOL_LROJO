-- ============================================================
-- MIGRACIÓN 004 — Sistema de evaluación por porcentaje (sin notas)
-- AR School usa porcentaje de logro (0-100%) en vez de notas 1.0-7.0
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Cambiar constraint de calificaciones: de nota 1.0-7.0 a porcentaje 0-100
ALTER TABLE public.calificaciones DROP CONSTRAINT IF EXISTS calificaciones_nota_check;
ALTER TABLE public.calificaciones ADD CONSTRAINT calificaciones_nota_check
  CHECK (nota >= 0 AND nota <= 100);

-- 2. Renombrar columna para claridad (opcional pero recomendado)
-- No renombramos para no romper queries existentes, pero el campo "nota" ahora significa "porcentaje de logro"

-- 3. Actualizar datos existentes si los hay (convertir notas 1-7 a porcentaje)
-- Solo ejecutar si ya tienes datos con notas en escala 1-7:
UPDATE public.calificaciones
SET nota = ROUND(((nota - 1) / 6) * 100)
WHERE nota >= 1 AND nota <= 7;

-- ============================================================
-- NOTA: El campo "nota" en la tabla calificaciones ahora representa
-- el porcentaje de logro (0-100). La app mostrará "85%" en vez de "5.5"
-- ============================================================
