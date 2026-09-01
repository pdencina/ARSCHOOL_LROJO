-- ============================================================
-- MIGRACIÓN 048 — Permisos de módulos para el rol coordinador
--
-- La migración 039 creó el rol 'coordinador' pero nunca insertó
-- sus filas en permisos_rol. Como el Sidebar oculta cualquier ítem
-- cuyo módulo no esté habilitado, el coordinador no veía Matrículas.
--
-- Menú acotado: solo lo que necesita para gestionar su programa.
--   Inicio · Admisiones · Matrículas · Alumnos · Cobranza · su Programa
-- (Admisiones no se lista aquí porque el Sidebar no la mapea a un
--  módulo, así que siempre se muestra a los roles autorizados.)
--
-- Nota: se evita ON CONFLICT porque el índice UNIQUE incluye colegio_id
-- y en Postgres los NULL se consideran distintos entre sí.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  -- Módulos habilitados para el coordinador (menú acotado)
  permitidos text[] := ARRAY[
    'inicio',
    'matricula',    -- Matrículas: contratos, pagaré y firma electrónica
    'alumnos',      -- Ficha de los alumnos de su programa
    'cobranzas',    -- Aportes / Cobranza de sus alumnos
    'lions_soccer', -- Módulo del programa
    'ar_worship'    -- Módulo del programa
  ];
  m text;
BEGIN
  -- 1. Habilitar (o crear) los módulos permitidos
  FOREACH m IN ARRAY permitidos LOOP
    UPDATE public.permisos_rol
      SET habilitado = true
      WHERE rol = 'coordinador' AND colegio_id IS NULL AND modulo = m;

    IF NOT EXISTS (
      SELECT 1 FROM public.permisos_rol
      WHERE rol = 'coordinador' AND colegio_id IS NULL AND modulo = m
    ) THEN
      INSERT INTO public.permisos_rol (colegio_id, rol, modulo, habilitado)
      VALUES (NULL, 'coordinador', m, true);
    END IF;
  END LOOP;

  -- 2. Deshabilitar cualquier otro módulo del coordinador (menú acotado)
  UPDATE public.permisos_rol
    SET habilitado = false
    WHERE rol = 'coordinador'
      AND colegio_id IS NULL
      AND NOT (modulo = ANY(permitidos));
END $$;

-- Verificación:
-- SELECT modulo, habilitado FROM public.permisos_rol
-- WHERE rol = 'coordinador' AND colegio_id IS NULL ORDER BY habilitado DESC, modulo;
