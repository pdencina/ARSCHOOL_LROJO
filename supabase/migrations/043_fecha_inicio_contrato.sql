-- ============================================================
-- MIGRACIÓN 043 — Campo fecha_inicio_contrato en matrículas
-- Permite indicar cuándo inicia realmente el contrato
-- (para alumnos que ingresan a mitad de año)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Agregar campo fecha_inicio_contrato (fecha real de inicio, puede diferir de fecha_matricula)
ALTER TABLE public.matriculas 
  ADD COLUMN IF NOT EXISTS fecha_inicio_contrato date;

-- Agregar campo sede para override (si difiere del colegio del usuario)
ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS sede text;

-- Por defecto toma la fecha de matrícula si no se especifica
COMMENT ON COLUMN public.matriculas.fecha_inicio_contrato IS 'Fecha real de inicio del contrato. Si es NULL, se usa fecha_matricula. Permite contratos proporcionales para ingresos a mitad de año.';
COMMENT ON COLUMN public.matriculas.sede IS 'Sede override: santiago, puente_alto, punta_arenas. Si NULL, se usa la sede del colegio_id.';
