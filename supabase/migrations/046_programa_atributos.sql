-- ============================================================
-- MIGRACIÓN 046 — Atributos estructurados por programa
-- Hasta ahora instrumento/ciclo/categoria/posicion se guardaban
-- como texto dentro de nivel/observaciones, lo que impedía
-- filtrar y agrupar. Se agregan columnas de primera clase.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- AR Worship: instrumento + ciclo
ALTER TABLE public.inscripciones_programa ADD COLUMN IF NOT EXISTS instrumento text;
ALTER TABLE public.inscripciones_programa ADD COLUMN IF NOT EXISTS ciclo text;

-- Lions Soccer: categoría + posición
ALTER TABLE public.inscripciones_programa ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.inscripciones_programa ADD COLUMN IF NOT EXISTS posicion text;

-- Music and Play: rango de edad
ALTER TABLE public.inscripciones_programa ADD COLUMN IF NOT EXISTS rango_edad text;

COMMENT ON COLUMN public.inscripciones_programa.instrumento IS 'AR Worship: Guitarra, Bajo, Teclado, etc.';
COMMENT ON COLUMN public.inscripciones_programa.ciclo IS 'AR Worship: Ciclo 1 (Sáb 09:30) | Ciclo 2 (Sáb 11:20)';
COMMENT ON COLUMN public.inscripciones_programa.categoria IS 'Lions Soccer: Sub-6, Sub-8, ..., Juvenil';
COMMENT ON COLUMN public.inscripciones_programa.posicion IS 'Lions Soccer: Arquero, Defensa, Mediocampista, Delantero';
COMMENT ON COLUMN public.inscripciones_programa.rango_edad IS 'Music and Play: 0-4 años | 4-7 años';

CREATE INDEX IF NOT EXISTS idx_inscripciones_instrumento ON public.inscripciones_programa(programa_id, instrumento);
CREATE INDEX IF NOT EXISTS idx_inscripciones_categoria ON public.inscripciones_programa(programa_id, categoria);
