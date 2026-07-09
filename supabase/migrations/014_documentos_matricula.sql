-- ============================================================
-- MIGRACIÓN 014 — Documentos adjuntos de matrícula
-- Fotos de CI, foto alumno, certificados, comprobantes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla para almacenar documentos adjuntos de la matrícula
CREATE TABLE IF NOT EXISTS public.documentos_matricula (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula_id uuid REFERENCES public.matriculas(id) ON DELETE CASCADE,
  alumno_id uuid REFERENCES public.alumnos(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- ci_frente, ci_reverso, foto_alumno, certificado_nacimiento, cuenta_servicios, certificado_medico, ci_apoderado_frente, ci_apoderado_reverso
  url text NOT NULL, -- base64 data URL o URL de storage
  nombre_archivo text,
  created_at timestamptz DEFAULT now()
);

-- Permisos
GRANT ALL ON public.documentos_matricula TO authenticated;
GRANT ALL ON public.documentos_matricula TO service_role;

-- Renombrar cobros conceptualmente (agregar campo tipo_concepto)
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS tipo_concepto text DEFAULT 'aporte_mensual';

-- Tabla para registros de pago (webhook / manual)
CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cobro_id uuid REFERENCES public.cobros(id) ON DELETE SET NULL,
  alumno_id uuid REFERENCES public.alumnos(id),
  colegio_id uuid REFERENCES public.colegios(id),
  monto integer NOT NULL,
  metodo text NOT NULL, -- transbank, sumup, transferencia, efectivo
  referencia text, -- número de transacción o comprobante
  comprobante_url text, -- imagen del comprobante si aplica
  estado text DEFAULT 'confirmado', -- confirmado, pendiente, rechazado
  fecha_pago timestamptz DEFAULT now(),
  registrado_por uuid,
  observaciones text,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.pagos TO authenticated;
GRANT ALL ON public.pagos TO service_role;
