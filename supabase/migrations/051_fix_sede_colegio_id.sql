-- ============================================================
-- MIGRACIÓN 051 — Corregir colegio_id según la sede real del alumno
--
-- Problema: al matricular, el colegio_id se tomaba del usuario que
-- matriculaba (o del default Santiago), en vez de la sede elegida.
-- Resultado: alumnos con sede='puente_alto' quedaron con colegio_id
-- de Santiago y no aparecían al filtrar por Puente Alto.
--
-- Esta migración alinea colegio_id con el campo de texto 'sede' en
-- alumnos, y propaga el cambio a matrículas, cobros, familias e
-- inscripciones del mismo alumno.
--
-- IDs canónicos de sede:
--   Santiago     = 11111111-1111-1111-1111-111111111111
--   Puente Alto  = 22222222-2222-2222-2222-222222222222
--   Punta Arenas = 33333333-3333-3333-3333-333333333333
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  santiago  uuid := '11111111-1111-1111-1111-111111111111';
  puente    uuid := '22222222-2222-2222-2222-222222222222';
  punta     uuid := '33333333-3333-3333-3333-333333333333';
  r RECORD;
  destino uuid;
BEGIN
  -- Solo corregir cuando el texto de sede es claro y NO coincide con el colegio_id actual
  FOR r IN
    SELECT id, sede, colegio_id
    FROM public.alumnos
    WHERE sede IN ('santiago', 'puente_alto', 'punta_arenas')
  LOOP
    destino := CASE r.sede
      WHEN 'puente_alto'  THEN puente
      WHEN 'punta_arenas' THEN punta
      ELSE santiago
    END;

    IF r.colegio_id IS DISTINCT FROM destino THEN
      -- Alumno
      UPDATE public.alumnos SET colegio_id = destino WHERE id = r.id;
      -- Matrículas del alumno
      UPDATE public.matriculas SET colegio_id = destino WHERE alumno_id = r.id;
      -- Cobros del alumno
      UPDATE public.cobros SET colegio_id = destino WHERE alumno_id = r.id;
      -- Familias del alumno
      UPDATE public.familias SET colegio_id = destino WHERE alumno_id = r.id;
      -- Inscripciones a programa del alumno
      UPDATE public.inscripciones_programa SET colegio_id = destino WHERE alumno_id = r.id;
    END IF;
  END LOOP;
END $$;

-- Verificación: cada sede (texto) debe coincidir con su colegio_id
-- SELECT col.nombre AS sede_colegio, a.sede AS sede_texto, count(*)
-- FROM public.alumnos a
-- LEFT JOIN public.colegios col ON col.id = a.colegio_id
-- GROUP BY col.nombre, a.sede ORDER BY 3 DESC;
