-- ============================================================
-- MIGRACIÓN 006 — Reporte Diario PreSchool
-- Las educadoras registran el estado diario del niño
-- El apoderado lo ve en su portal sin necesidad de feedback verbal
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reportes_diarios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id      uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_id       uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha           date NOT NULL DEFAULT current_date,
  
  -- Alimentación
  desayuno        text CHECK (desayuno IN ('todo','casi_todo','poco','nada','no_aplica')),
  almuerzo        text CHECK (almuerzo IN ('todo','casi_todo','poco','nada','no_aplica')),
  snack           text CHECK (snack IN ('todo','casi_todo','poco','nada','no_aplica')),
  
  -- Siesta
  siesta          boolean DEFAULT false,
  siesta_minutos  integer,
  
  -- Higiene
  cambios_panal   integer DEFAULT 0,
  deposiciones    integer DEFAULT 0,
  idas_bano       integer DEFAULT 0,
  
  -- Estado emocional
  estado_animo    text CHECK (estado_animo IN ('feliz','tranquilo','irritable','lloron','variable')),
  
  -- Salud
  llego_con_golpe boolean DEFAULT false,
  fiebre          boolean DEFAULT false,
  medicamento     boolean DEFAULT false,
  medicamento_detalle text,
  
  -- Actividades
  actividades     text[],  -- array: musica, arte, motricidad, lectura, juego_libre, etc.
  
  -- Observaciones
  observaciones   text,
  
  -- Meta
  registrado_por  uuid REFERENCES public.usuarios(id),
  publicado       boolean NOT NULL DEFAULT false,
  publicado_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(alumno_id, fecha)
);

ALTER TABLE public.reportes_diarios ENABLE ROW LEVEL SECURITY;

-- Educadores del colegio pueden ver/crear reportes
CREATE POLICY "colegio: all reportes_diarios" ON public.reportes_diarios
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

-- Apoderados pueden ver reportes de sus alumnos
CREATE POLICY "portal: select reportes_diarios" ON public.reportes_diarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tutor_alumnos ta
      WHERE ta.tutor_id = auth.uid() AND ta.alumno_id = reportes_diarios.alumno_id
    )
    OR EXISTS (
      SELECT 1 FROM public.usuario_alumno ua
      WHERE ua.usuario_id = auth.uid() AND ua.alumno_id = reportes_diarios.alumno_id
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_reportes_diarios_alumno_fecha ON public.reportes_diarios(alumno_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_diarios_colegio_fecha ON public.reportes_diarios(colegio_id, fecha DESC);

-- Trigger updated_at
DROP TRIGGER IF EXISTS tr_reportes_diarios_updated_at ON public.reportes_diarios;
CREATE TRIGGER tr_reportes_diarios_updated_at BEFORE UPDATE ON public.reportes_diarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
