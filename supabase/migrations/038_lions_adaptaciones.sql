-- ============================================================
-- MIGRACIÓN 038 — Adaptaciones Lions Soccer School
--
-- 1. Estado "prueba" en inscripciones
-- 2. Asistencia por sesión (no diaria)
-- 3. Docs específicos para Lions
-- ============================================================

-- =====================
-- 1. ESTADO "PRUEBA" EN INSCRIPCIONES
-- =====================
ALTER TABLE public.inscripciones_programa 
  DROP CONSTRAINT IF EXISTS inscripciones_programa_estado_check;
ALTER TABLE public.inscripciones_programa 
  ADD CONSTRAINT inscripciones_programa_estado_check 
  CHECK (estado IN ('prueba', 'activa', 'suspendida', 'finalizada'));

-- Fecha de prueba y conversión
ALTER TABLE public.inscripciones_programa ADD COLUMN IF NOT EXISTS fecha_prueba date;
ALTER TABLE public.inscripciones_programa ADD COLUMN IF NOT EXISTS convertida_at timestamptz;

COMMENT ON COLUMN public.inscripciones_programa.estado IS 'prueba: clase de prueba | activa: inscrito | suspendida: pausado | finalizada: retirado';

-- =====================
-- 2. ASISTENCIA POR SESIÓN
-- =====================
CREATE TABLE IF NOT EXISTS public.asistencias_sesion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id uuid NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio time,
  hora_fin time,
  estado text NOT NULL DEFAULT 'presente' CHECK (estado IN ('presente', 'ausente', 'tardanza', 'justificado')),
  sesion_tipo text, -- 'entrenamiento', 'partido', 'ensayo', 'clase'
  observacion text,
  registrado_por uuid REFERENCES public.usuarios(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.asistencias_sesion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all asistencias_sesion" ON public.asistencias_sesion
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

GRANT ALL ON public.asistencias_sesion TO authenticated;
GRANT ALL ON public.asistencias_sesion TO service_role;

CREATE INDEX IF NOT EXISTS idx_asistencias_sesion_programa ON public.asistencias_sesion(programa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_sesion_alumno ON public.asistencias_sesion(alumno_id, fecha);

-- =====================
-- 3. DOCS PARA LIONS (en documentos_admision_config)
-- =====================
INSERT INTO public.documentos_admision_config (colegio_id, categoria, nombre_display, descripcion, obligatorio, aplica_a, orden) VALUES
  (NULL, 'cedula_alumno_frente_lions', 'CI alumno — Frente', 'Cédula de identidad del alumno (frente)', true, ARRAY['lions_soccer'], 1),
  (NULL, 'cedula_alumno_dorso_lions', 'CI alumno — Dorso', 'Cédula de identidad del alumno (dorso)', true, ARRAY['lions_soccer'], 2),
  (NULL, 'cedula_apoderado_frente_lions', 'CI apoderado — Frente', 'Cédula de identidad del apoderado (frente)', true, ARRAY['lions_soccer'], 3),
  (NULL, 'cedula_apoderado_dorso_lions', 'CI apoderado — Dorso', 'Cédula de identidad del apoderado (dorso)', true, ARRAY['lions_soccer'], 4),
  (NULL, 'cert_medico_deportivo', 'Certificado médico deportivo', 'Acredita aptitud para actividad física. Se puede entregar después de la inscripción.', false, ARRAY['lions_soccer'], 5)
ON CONFLICT DO NOTHING;
