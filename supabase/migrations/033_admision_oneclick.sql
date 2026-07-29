-- ============================================================
-- MIGRACIÓN 033 — Pipeline de Admisión + Oneclick (cobro recurrente)
-- 1. Tabla prospectos (leads que vienen de Kommo pre-matrícula)
-- 2. Metas de admisión por sede/año
-- 3. Soporte Oneclick (tokenización de tarjeta para cobro recurrente)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- =====================
-- 1. PROSPECTOS (leads pre-matrícula, recibidos vía webhook de Kommo)
-- =====================
CREATE TABLE IF NOT EXISTS public.prospectos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id      uuid REFERENCES public.colegios(id) ON DELETE CASCADE,
  -- Datos del lead
  nombre          text NOT NULL,
  apellido        text,
  email           text,
  telefono        text,
  sede            text, -- santiago, puente_alto, punta_arenas
  nivel_interes   text, -- playgroup, preschool, elementary, middle, high
  -- Pipeline
  etapa           text NOT NULL DEFAULT 'calificado'
                  CHECK (etapa IN ('calificado', 'informado', 'negociacion', 'visita', 'matricula', 'perdido')),
  -- Origen
  origen          text DEFAULT 'kommo', -- kommo, web, referido, manual
  kommo_lead_id   text, -- ID del lead en Kommo (para sincronizar)
  -- Seguimiento
  asignado_a      uuid REFERENCES public.usuarios(id),
  fecha_primer_contacto timestamptz,
  fecha_ultima_interaccion timestamptz,
  motivo_perdida  text,
  observaciones   text,
  metadata        jsonb,
  -- Convertido
  matricula_id    uuid REFERENCES public.matriculas(id), -- NULL si aún no matricula
  convertido_at   timestamptz,
  --
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colegio: all prospectos" ON public.prospectos
  FOR ALL USING (colegio_id = public.mi_colegio_id() OR colegio_id IS NULL)
  WITH CHECK (colegio_id = public.mi_colegio_id() OR colegio_id IS NULL);

GRANT ALL ON public.prospectos TO authenticated;
GRANT ALL ON public.prospectos TO service_role;

CREATE INDEX IF NOT EXISTS idx_prospectos_colegio_etapa ON public.prospectos(colegio_id, etapa);
CREATE INDEX IF NOT EXISTS idx_prospectos_sede ON public.prospectos(sede);
CREATE INDEX IF NOT EXISTS idx_prospectos_kommo ON public.prospectos(kommo_lead_id);

DROP TRIGGER IF EXISTS tr_prospectos_updated_at ON public.prospectos;
CREATE TRIGGER tr_prospectos_updated_at BEFORE UPDATE ON public.prospectos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================
-- 2. METAS DE ADMISIÓN POR SEDE
-- =====================
CREATE TABLE IF NOT EXISTS public.metas_admision (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  uuid REFERENCES public.colegios(id) ON DELETE CASCADE,
  sede        text NOT NULL,
  anio        integer NOT NULL,
  meta_matriculas integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(colegio_id, sede, anio)
);

ALTER TABLE public.metas_admision ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colegio: all metas_admision" ON public.metas_admision
  FOR ALL USING (colegio_id = public.mi_colegio_id() OR colegio_id IS NULL);

GRANT ALL ON public.metas_admision TO authenticated;
GRANT ALL ON public.metas_admision TO service_role;

-- Metas iniciales 2027
INSERT INTO public.metas_admision (colegio_id, sede, anio, meta_matriculas) VALUES
  ('11111111-1111-1111-1111-111111111111', 'santiago', 2027, 60),
  ('22222222-2222-2222-2222-222222222222', 'puente_alto', 2027, 40),
  ('33333333-3333-3333-3333-333333333333', 'punta_arenas', 2027, 30)
ON CONFLICT (colegio_id, sede, anio) DO NOTHING;

-- =====================
-- 3. ONECLICK — Tarjetas tokenizadas para cobro recurrente
-- =====================
CREATE TABLE IF NOT EXISTS public.tarjetas_recurrentes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id      uuid NOT NULL REFERENCES public.familias(id) ON DELETE CASCADE,
  alumno_id       uuid REFERENCES public.alumnos(id),
  -- Token de Transbank Oneclick
  tbk_user        text NOT NULL, -- username registrado en Oneclick
  tbk_token       text, -- token de la tarjeta (se obtiene después de inscribir)
  -- Datos de referencia (no sensibles)
  card_type       text, -- VISA, MASTERCARD, AMEX
  card_last_four  text, -- últimos 4 dígitos
  -- Estado
  activa          boolean NOT NULL DEFAULT false, -- true cuando token está confirmado
  fecha_inscripcion timestamptz,
  -- Historial
  ultimo_cobro_at timestamptz,
  cobros_exitosos integer DEFAULT 0,
  cobros_fallidos integer DEFAULT 0,
  --
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tarjetas_recurrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "familia: select tarjetas" ON public.tarjetas_recurrentes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.familias f WHERE f.id = familia_id AND f.colegio_id = public.mi_colegio_id())
  );
CREATE POLICY "service: all tarjetas" ON public.tarjetas_recurrentes
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.tarjetas_recurrentes TO authenticated;
GRANT ALL ON public.tarjetas_recurrentes TO service_role;

CREATE INDEX IF NOT EXISTS idx_tarjetas_familia ON public.tarjetas_recurrentes(familia_id);

COMMENT ON TABLE public.prospectos IS 'Leads pre-matrícula recibidos de Kommo u otros canales. Pipeline de admisión.';
COMMENT ON TABLE public.metas_admision IS 'Metas de matrículas por sede y año para el dashboard de admisión.';
COMMENT ON TABLE public.tarjetas_recurrentes IS 'Tarjetas tokenizadas vía Transbank Oneclick para cobro automático mensual.';
