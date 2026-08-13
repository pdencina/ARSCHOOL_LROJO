-- ============================================================
-- MIGRACIÓN 035 — Firma remota por email + Documentos de admisión
--
-- 1. Tokens de firma remota (link único enviado al apoderado)
-- 2. Categorías de documentos obligatorios/opcionales para admisión
-- 3. Tabla de documentos de admisión mejorada
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- =====================
-- 1. TOKENS DE FIRMA REMOTA
-- =====================
CREATE TABLE IF NOT EXISTS public.firma_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'contrato' CHECK (tipo IN ('contrato', 'pagare')),
  email_destino text NOT NULL,
  nombre_completo_esperado text NOT NULL, -- Nombre que debe coincidir con la firma
  rut_esperado text, -- RUT para validación adicional
  -- Estado
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'visto', 'firmado', 'expirado', 'cancelado')),
  visto_at timestamptz,
  firmado_at timestamptz,
  -- Código de verificación integrado
  codigo_verificacion text, -- 6 dígitos, se genera al momento de firmar
  codigo_expira_at timestamptz,
  codigo_intentos integer DEFAULT 0,
  -- Seguridad
  expira_at timestamptz NOT NULL,
  ip_firma text,
  user_agent_firma text,
  -- Auditoría
  created_at timestamptz DEFAULT now(),
  enviado_por uuid REFERENCES public.usuarios(id)
);

-- Acceso público (sin auth) para la página de firma
ALTER TABLE public.firma_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public: select firma_tokens by token" ON public.firma_tokens;
CREATE POLICY "public: select firma_tokens by token" ON public.firma_tokens
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "service: all firma_tokens" ON public.firma_tokens;
CREATE POLICY "service: all firma_tokens" ON public.firma_tokens
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.firma_tokens TO anon;
GRANT ALL ON public.firma_tokens TO authenticated;
GRANT ALL ON public.firma_tokens TO service_role;

CREATE INDEX IF NOT EXISTS idx_firma_tokens_token ON public.firma_tokens(token);
CREATE INDEX IF NOT EXISTS idx_firma_tokens_matricula ON public.firma_tokens(matricula_id, tipo);
CREATE INDEX IF NOT EXISTS idx_firma_tokens_expira ON public.firma_tokens(expira_at) WHERE estado = 'pendiente';

-- =====================
-- 2. CATEGORÍAS DE DOCUMENTOS DE ADMISIÓN
-- =====================
CREATE TABLE IF NOT EXISTS public.documentos_admision_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id uuid REFERENCES public.colegios(id) ON DELETE CASCADE,
  categoria text NOT NULL, -- 'cedula_alumno', 'cert_nacimiento', 'cuenta_servicios', etc.
  nombre_display text NOT NULL, -- 'Cédula de identidad del alumno'
  descripcion text,
  obligatorio boolean DEFAULT true,
  aplica_a text[] DEFAULT ARRAY['todos'], -- 'todos', 'preschool', 'elementary', etc.
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.documentos_admision_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public: select docs config" ON public.documentos_admision_config;
CREATE POLICY "public: select docs config" ON public.documentos_admision_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "service: all docs config" ON public.documentos_admision_config;
CREATE POLICY "service: all docs config" ON public.documentos_admision_config
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.documentos_admision_config TO anon;
GRANT ALL ON public.documentos_admision_config TO authenticated;
GRANT ALL ON public.documentos_admision_config TO service_role;

-- Datos iniciales: documentos requeridos por la fundación
INSERT INTO public.documentos_admision_config (colegio_id, categoria, nombre_display, descripcion, obligatorio, aplica_a, orden) VALUES
  (NULL, 'cedula_alumno_frente', 'CI alumno — Frente', 'Foto clara del frente de la cédula de identidad', true, ARRAY['todos'], 1),
  (NULL, 'cedula_alumno_dorso', 'CI alumno — Dorso', 'Foto clara del reverso de la cédula de identidad', true, ARRAY['todos'], 2),
  (NULL, 'cedula_apoderado_frente', 'CI apoderado — Frente', 'Foto clara del frente de la cédula del apoderado', true, ARRAY['todos'], 3),
  (NULL, 'cedula_apoderado_dorso', 'CI apoderado — Dorso', 'Foto clara del reverso de la cédula del apoderado', true, ARRAY['todos'], 4),
  (NULL, 'cert_nacimiento_alumno', 'Certificado de nacimiento del alumno', 'Original o copia legalizada', true, ARRAY['todos'], 5),
  (NULL, 'cuenta_servicios', 'Cuenta de servicios básicos', 'Luz, agua o gas. Para verificar domicilio (requerido para pagarés)', true, ARRAY['todos'], 6),
  (NULL, 'cert_medico', 'Certificado médico', 'Solo si el alumno tiene alguna patología crónica', false, ARRAY['todos'], 7),
  (NULL, 'cert_diagnostico', 'Certificado de diagnóstico', 'Solo si existe condición neurológica o terapéutica diagnosticada', false, ARRAY['todos'], 8),
  (NULL, 'notas_anteriores', 'Certificado de notas del colegio anterior', 'Últimos 2 años cursados', false, ARRAY['elementary', 'middle', 'high'], 9);

-- =====================
-- 3. TABLA DE DOCUMENTOS SUBIDOS POR ADMISIÓN
-- =====================
CREATE TABLE IF NOT EXISTS public.documentos_admision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid REFERENCES public.matriculas(id) ON DELETE CASCADE,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  categoria text NOT NULL, -- Coincide con documentos_admision_config.categoria
  nombre_archivo text,
  url text NOT NULL,
  content_type text,
  tamano_bytes integer,
  -- Validación
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  revisado_por uuid REFERENCES public.usuarios(id),
  revisado_at timestamptz,
  observacion_rechazo text,
  -- Metadata
  subido_por uuid REFERENCES public.usuarios(id),
  subido_via text DEFAULT 'web' CHECK (subido_via IN ('web', 'qr', 'email', 'portal')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.documentos_admision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colegio: all documentos_admision" ON public.documentos_admision;
CREATE POLICY "colegio: all documentos_admision" ON public.documentos_admision
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

-- Apoderados pueden ver sus propios documentos
DROP POLICY IF EXISTS "apoderado: select own docs" ON public.documentos_admision;
CREATE POLICY "apoderado: select own docs" ON public.documentos_admision
  FOR SELECT USING (
    alumno_id IN (SELECT alumno_id FROM public.tutor_alumnos WHERE tutor_id = auth.uid())
  );

GRANT ALL ON public.documentos_admision TO authenticated;
GRANT ALL ON public.documentos_admision TO service_role;

CREATE INDEX IF NOT EXISTS idx_docs_admision_matricula ON public.documentos_admision(matricula_id);
CREATE INDEX IF NOT EXISTS idx_docs_admision_alumno ON public.documentos_admision(alumno_id, categoria);
