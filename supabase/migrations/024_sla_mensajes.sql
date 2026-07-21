-- ============================================================
-- MIGRACIÓN 024 — SLA de mensajes internos
-- Tracking de tiempo de respuesta del equipo a familias
-- Mide cuándo un apoderado escribe y cuánto tarda el staff en responder
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Campos SLA en conversaciones
-- ultimo_mensaje_familia_at: cuándo fue el último mensaje de un apoderado/alumno sin respuesta del staff
-- primera_respuesta_staff_at: cuándo respondió el staff a ese mensaje
-- pendiente_respuesta: flag rápido para queries (true = familia escribió y staff no ha respondido)
ALTER TABLE public.conversaciones ADD COLUMN IF NOT EXISTS ultimo_mensaje_familia_at timestamptz;
ALTER TABLE public.conversaciones ADD COLUMN IF NOT EXISTS primera_respuesta_staff_at timestamptz;
ALTER TABLE public.conversaciones ADD COLUMN IF NOT EXISTS pendiente_respuesta boolean NOT NULL DEFAULT false;
ALTER TABLE public.conversaciones ADD COLUMN IF NOT EXISTS asignado_a uuid REFERENCES public.usuarios(id);

-- Tabla de métricas históricas de SLA por conversación
CREATE TABLE IF NOT EXISTS public.sla_respuestas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id   uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  colegio_id        uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  mensaje_familia_at timestamptz NOT NULL,
  respuesta_staff_at timestamptz NOT NULL,
  respondido_por    uuid REFERENCES public.usuarios(id),
  tiempo_respuesta_min integer NOT NULL, -- minutos que tardó en responder
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_respuestas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: select sla_respuestas" ON public.sla_respuestas
  FOR SELECT USING (colegio_id = public.mi_colegio_id());

CREATE INDEX IF NOT EXISTS idx_sla_respuestas_colegio ON public.sla_respuestas(colegio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_pendiente ON public.conversaciones(colegio_id, pendiente_respuesta) WHERE pendiente_respuesta = true;

GRANT ALL ON public.sla_respuestas TO authenticated;
GRANT ALL ON public.sla_respuestas TO service_role;

COMMENT ON COLUMN public.conversaciones.ultimo_mensaje_familia_at IS 'Timestamp del último mensaje de apoderado/alumno que aún no tiene respuesta del staff';
COMMENT ON COLUMN public.conversaciones.pendiente_respuesta IS 'True si el último mensaje es de una familia y el staff no ha respondido';
COMMENT ON COLUMN public.conversaciones.asignado_a IS 'Miembro del staff responsable de responder esta conversación';
COMMENT ON TABLE public.sla_respuestas IS 'Historial de tiempos de respuesta para métricas SLA';
