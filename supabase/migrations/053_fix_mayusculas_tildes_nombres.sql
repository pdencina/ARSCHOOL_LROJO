-- ============================================================
-- MIGRACIÓN 053 — Corregir mayúsculas erróneas tras una tilde
--
-- Problema: el autoformato de nombres usaba /\b\w/ y en JavaScript las
-- letras con tilde no cuentan como \w, así que la letra siguiente quedaba
-- en mayúscula: "Joaquín" -> "JoaquíN", "Sáez" -> "SáEz", "Oyarzún" -> "OyarzúN".
--
-- Esta migración recorre las columnas de nombre/apellido de las tablas
-- indicadas y aplica initcap() SOLO a los valores que tengan una vocal con
-- tilde (o ñ/ü) seguida de una mayúscula. El resto no se toca.
--
-- Ejecutar en Supabase SQL Editor. Primero deja el resultado en NOTICE
-- (cantidad por tabla/columna) y luego aplica el cambio.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  n bigint;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name IN ('pre_admisiones', 'alumnos', 'matriculas', 'familias', 'usuarios')
      AND c.data_type = 'text'
      AND (c.column_name ILIKE '%nombre%' OR c.column_name ILIKE '%apellido%')
      AND c.column_name NOT ILIKE '%email%'
      AND c.column_name NOT ILIKE '%archivo%'
      AND c.column_name NOT ILIKE '%url%'
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET %I = initcap(%I) WHERE %I ~ ''[áéíóúüñÁÉÍÓÚÜÑ][A-Z]''',
      r.table_name, r.column_name, r.column_name, r.column_name
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      RAISE NOTICE '%.%: % filas corregidas', r.table_name, r.column_name, n;
    END IF;
  END LOOP;
END $$;
