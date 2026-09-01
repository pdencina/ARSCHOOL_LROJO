-- ============================================================
-- MIGRACIÓN 049 — Corregir programa_id en alumnos y matrículas
--
-- La migración 037 asignó TODOS los alumnos que no eran Play Group
-- al programa 'ar_school' (incluyendo Lions Soccer y AR Worship).
-- Como la generación del contrato ahora usa programa_id como fuente
-- principal para elegir la plantilla (Lions / Worship / Play / AR School),
-- hay que corregir esos registros según el curso real.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  ar_id uuid;
  play_id uuid;
  lions_id uuid;
  worship_id uuid;
BEGIN
  SELECT id INTO ar_id      FROM public.programas WHERE codigo = 'ar_school';
  SELECT id INTO play_id    FROM public.programas WHERE codigo = 'play_group';
  SELECT id INTO lions_id   FROM public.programas WHERE codigo = 'lions_soccer';
  SELECT id INTO worship_id FROM public.programas WHERE codigo = 'ar_worship';

  -- ===== ALUMNOS =====
  -- Lions Soccer (corrige incluso si quedó marcado como ar_school)
  UPDATE public.alumnos SET programa_id = lions_id
  WHERE (curso ILIKE '%lions%' OR curso ILIKE '%soccer%')
    AND (programa_id IS NULL OR programa_id <> lions_id);

  -- AR Worship / Music and Play
  UPDATE public.alumnos SET programa_id = worship_id
  WHERE (curso ILIKE '%worship%' OR curso ILIKE '%music%')
    AND (programa_id IS NULL OR programa_id <> worship_id);

  -- Play Group / Pre School (excluye los de Worship "Music and Play")
  UPDATE public.alumnos SET programa_id = play_id
  WHERE (curso ILIKE '%play group%' OR curso ILIKE '%pre school%')
    AND curso NOT ILIKE '%worship%'
    AND (programa_id IS NULL OR programa_id <> play_id);

  -- Resto sin programa → AR School
  UPDATE public.alumnos SET programa_id = ar_id WHERE programa_id IS NULL;

  -- ===== MATRÍCULAS =====
  -- Heredar el programa del alumno cuando falta o difiere
  UPDATE public.matriculas m
     SET programa_id = a.programa_id
    FROM public.alumnos a
   WHERE m.alumno_id = a.id
     AND a.programa_id IS NOT NULL
     AND (m.programa_id IS NULL OR m.programa_id <> a.programa_id);

  -- ===== INSCRIPCIONES A PROGRAMA =====
  -- Asegurar que los alumnos de Lions/Worship tengan su inscripción
  -- (necesaria para que el coordinador los vea en Alumnos y su módulo)
  INSERT INTO public.inscripciones_programa (alumno_id, programa_id, colegio_id, estado, nivel)
  SELECT a.id, a.programa_id, a.colegio_id, 'activa', a.curso
  FROM public.alumnos a
  WHERE a.programa_id IN (lions_id, worship_id)
    AND a.activo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.inscripciones_programa i
      WHERE i.alumno_id = a.id AND i.programa_id = a.programa_id
    );
END $$;

-- Verificación:
-- SELECT p.codigo, count(*) FROM public.alumnos a
-- JOIN public.programas p ON p.id = a.programa_id
-- GROUP BY p.codigo ORDER BY 2 DESC;
