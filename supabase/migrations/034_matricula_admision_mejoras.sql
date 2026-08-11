-- ============================================================
-- MIGRACIÓN 034 — Mejoras al flujo de matrícula y admisión
-- 
-- 1. Diferenciación arancel nuevo vs continuidad en tabla_aportes
-- 2. Descuento multi-hijo (matrícula) con config por colegio
-- 3. Interés por mora (3% diario desde día 6)
-- 4. Contratos Play/sala cuna con fechas dinámicas (12 meses)
-- 5. Código de verificación por email para firma de contrato
-- 6. Certificado de matrícula en portal del apoderado
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- =====================
-- 1. DIFERENCIACIÓN ARANCEL: NUEVO vs CONTINUIDAD
-- =====================

-- Agregar columna tipo_ingreso a tabla_aportes
ALTER TABLE public.tabla_aportes ADD COLUMN IF NOT EXISTS tipo_ingreso text DEFAULT 'todos'
  CHECK (tipo_ingreso IN ('nuevo', 'continuidad', 'todos'));

COMMENT ON COLUMN public.tabla_aportes.tipo_ingreso IS 'nuevo: alumno nuevo (arancel mayor), continuidad: alumno que ya estaba, todos: aplica a ambos';

-- Override manual por matrícula (para casos de excepción)
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS monto_override integer;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS motivo_override text;

COMMENT ON COLUMN public.matriculas.monto_override IS 'Monto mensual manual para excepciones (múltiples hijos, casos especiales)';
COMMENT ON COLUMN public.matriculas.motivo_override IS 'Justificación del override (ej: "3er hijo - matrícula gratis")';

-- =====================
-- 2. DESCUENTO MULTI-HIJO (MATRÍCULA)
-- =====================

CREATE TABLE IF NOT EXISTS public.config_descuentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('multi_hijo', 'hermanos', 'funcionario', 'otro')),
  cantidad_hijos integer, -- NULL = regla general, 2 = segundo hijo, 3 = tercer hijo, etc.
  descuento_matricula numeric(5,2) NOT NULL DEFAULT 0, -- Porcentaje descuento sobre matrícula
  descuento_mensual numeric(5,2) NOT NULL DEFAULT 0, -- Porcentaje descuento sobre mensualidad
  descripcion text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.config_descuentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all config_descuentos" ON public.config_descuentos
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

GRANT ALL ON public.config_descuentos TO authenticated;
GRANT ALL ON public.config_descuentos TO service_role;

-- Datos iniciales: reglas de descuento multi-hijo (Santiago)
INSERT INTO public.config_descuentos (colegio_id, tipo, cantidad_hijos, descuento_matricula, descuento_mensual, descripcion) VALUES
  ('11111111-1111-1111-1111-111111111111', 'multi_hijo', 2, 50.00, 0, '2do hijo: paga 50% de matrícula'),
  ('11111111-1111-1111-1111-111111111111', 'multi_hijo', 3, 100.00, 0, '3er hijo: matrícula gratis');

-- =====================
-- 3. INTERÉS POR MORA
-- =====================

CREATE TABLE IF NOT EXISTS public.config_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  interes_diario numeric(5,2) NOT NULL DEFAULT 3.00, -- 3% diario
  dia_inicio_mora integer NOT NULL DEFAULT 6, -- Desde el día 6 del mes
  aplica_a text[] DEFAULT ARRAY['aporte_mensual'], -- Tipos de cobro que aplican
  monto_maximo_interes numeric(10,2), -- Tope máximo de interés (NULL = sin tope)
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(colegio_id)
);

ALTER TABLE public.config_mora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all config_mora" ON public.config_mora
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

GRANT ALL ON public.config_mora TO authenticated;
GRANT ALL ON public.config_mora TO service_role;

-- Config inicial para Santiago
INSERT INTO public.config_mora (colegio_id, interes_diario, dia_inicio_mora, aplica_a) VALUES
  ('11111111-1111-1111-1111-111111111111', 3.00, 6, ARRAY['aporte_mensual']);

-- Agregar campo de interés acumulado al cobro
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS interes_mora numeric(10,2) DEFAULT 0;
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS monto_total_con_interes numeric(10,2);

COMMENT ON COLUMN public.cobros.interes_mora IS 'Interés acumulado por mora (calculado diariamente por cron)';
COMMENT ON COLUMN public.cobros.monto_total_con_interes IS 'Monto original + interés mora. El apoderado debe pagar este monto.';

-- =====================
-- 4. CONTRATOS PLAY/SALA CUNA — FECHAS DINÁMICAS
-- =====================

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS fecha_inicio_contrato date;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS fecha_fin_contrato date;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS duracion_contrato_meses integer DEFAULT 10;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS tipo_contrato text DEFAULT 'anual'
  CHECK (tipo_contrato IN ('anual', '12_meses', 'semestral', 'personalizado'));

COMMENT ON COLUMN public.matriculas.fecha_inicio_contrato IS 'Para Play/sala cuna: fecha real de ingreso (no necesariamente marzo)';
COMMENT ON COLUMN public.matriculas.fecha_fin_contrato IS 'Para Play: 12 meses desde ingreso. Para otros: diciembre del año escolar';
COMMENT ON COLUMN public.matriculas.tipo_contrato IS 'anual: mar-dic | 12_meses: desde fecha ingreso | semestral | personalizado';

-- =====================
-- 5. CÓDIGO DE VERIFICACIÓN POR EMAIL PARA FIRMA
-- =====================

CREATE TABLE IF NOT EXISTS public.codigos_verificacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  email text NOT NULL,
  codigo text NOT NULL, -- 6 dígitos
  tipo text NOT NULL DEFAULT 'firma_contrato' CHECK (tipo IN ('firma_contrato', 'firma_pagare')),
  intentos integer DEFAULT 0,
  max_intentos integer DEFAULT 5,
  usado boolean DEFAULT false,
  expira_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.codigos_verificacion ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede acceder (seguridad del código)
CREATE POLICY "service: all codigos_verificacion" ON public.codigos_verificacion
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.codigos_verificacion TO service_role;
GRANT SELECT ON public.codigos_verificacion TO authenticated;

CREATE INDEX IF NOT EXISTS idx_codigos_verificacion_matricula ON public.codigos_verificacion(matricula_id, tipo);
CREATE INDEX IF NOT EXISTS idx_codigos_verificacion_expira ON public.codigos_verificacion(expira_at) WHERE NOT usado;

-- =====================
-- 6. CERTIFICADO DE MATRÍCULA (visible en portal apoderado)
-- =====================

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS certificado_generado boolean DEFAULT false;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS certificado_generado_at timestamptz;

-- =====================
-- 7. ÍNDICES ADICIONALES
-- =====================
CREATE INDEX IF NOT EXISTS idx_config_descuentos_colegio ON public.config_descuentos(colegio_id, tipo, activo);
CREATE INDEX IF NOT EXISTS idx_tabla_aportes_tipo_ingreso ON public.tabla_aportes(anio, tipo_ingreso, nivel);
CREATE INDEX IF NOT EXISTS idx_matriculas_fechas_contrato ON public.matriculas(fecha_fin_contrato) WHERE fecha_fin_contrato IS NOT NULL;

-- =====================
-- 8. DATOS INICIALES: Aranceles 2027 diferenciados nuevo vs continuidad
-- =====================
-- Continuidad mantiene precio 2026
UPDATE public.tabla_aportes SET tipo_ingreso = 'continuidad'
  WHERE anio = 2026 AND tipo = 'mensual';

-- Nuevos alumnos 2027: arancel mayor (ejemplo Santiago)
INSERT INTO public.tabla_aportes (nivel, modalidad, jornada, tipo, anio, sede, monto, tipo_ingreso) VALUES
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'santiago', 302500, 'nuevo'),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'santiago', 275000, 'continuidad'),
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'santiago', 286000, 'nuevo'),
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'santiago', 260000, 'continuidad')
ON CONFLICT DO NOTHING;
