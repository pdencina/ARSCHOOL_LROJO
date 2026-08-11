-- ============================================================
-- MIGRACIÓN 036 — Pre-admisiones públicas
--
-- El apoderado completa un formulario público (sin login) con todos
-- los datos del alumno, familia, y documentos adjuntos.
-- El gestor de admisión luego revisa y convierte en matrícula.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pre_admisiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  codigo_seguimiento text NOT NULL UNIQUE, -- Ej: "ADM-2026-A3F7"
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_revision', 'aprobada', 'matriculada', 'rechazada', 'desistida')),

  -- ==================
  -- DATOS DEL ALUMNO
  -- ==================
  alumno_nombre text NOT NULL,
  alumno_apellido text NOT NULL,
  alumno_rut text,
  alumno_fecha_nacimiento date,
  alumno_sexo text CHECK (alumno_sexo IN ('masculino', 'femenino', 'otro')),
  alumno_nacionalidad text DEFAULT 'Chilena',
  alumno_pais_natal text DEFAULT 'Chile',
  alumno_direccion text,
  alumno_comuna text,
  curso_solicitado text NOT NULL,
  jornada text DEFAULT 'completa' CHECK (jornada IN ('completa', 'media')),
  sede text DEFAULT 'santiago',
  modalidad text DEFAULT 'presencial' CHECK (modalidad IN ('presencial', 'online', 'hibrido')),

  -- Salud
  prevision_salud text,
  alergia_alimentaria text,
  alergia_medicamento text,
  enfermedad_cronica text,
  centro_salud_emergencia text,
  diagnostico text,
  contacto_especialista text,

  -- Académico
  jardin_previo text,
  ultimo_anio_aprobado text,
  ha_reprobado boolean DEFAULT false,
  curso_reprobado text,

  -- Contacto emergencia
  contacto_emergencia text,
  telefono_emergencia text,

  -- ==================
  -- DATOS APODERADO
  -- ==================
  apoderado_nombre text NOT NULL,
  apoderado_apellido text NOT NULL,
  apoderado_rut text,
  apoderado_email text NOT NULL,
  apoderado_telefono text,
  apoderado_direccion text,
  apoderado_comuna text,
  apoderado_parentesco text DEFAULT 'madre/padre',

  -- ==================
  -- DATOS PADRE/SEGUNDO APODERADO (opcional)
  -- ==================
  padre_nombre text,
  padre_apellido text,
  padre_rut text,
  padre_telefono text,
  padre_email text,
  padre_direccion text,

  -- ==================
  -- PERSONA AUTORIZADA RETIRO
  -- ==================
  retiro_nombre text,
  retiro_parentesco text,
  retiro_rut text,
  retiro_telefono text,

  -- ==================
  -- DOCUMENTOS (URLs o base64 almacenados en jsonb)
  -- ==================
  documentos jsonb DEFAULT '{}', -- { "cedula_alumno": "url", "cert_nacimiento": "url", ... }

  -- ==================
  -- GESTIÓN INTERNA
  -- ==================
  observaciones_apoderado text, -- Notas del apoderado al enviar
  observaciones_admin text,     -- Notas del gestor al revisar
  motivo_rechazo text,
  revisado_por uuid REFERENCES public.usuarios(id),
  revisado_at timestamptz,
  matricula_id uuid REFERENCES public.matriculas(id), -- Se llena al convertir

  -- Metadata
  ip_envio text,
  user_agent_envio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Acceso público para insertar (sin auth)
ALTER TABLE public.pre_admisiones ENABLE ROW LEVEL SECURITY;

-- Anon puede insertar
CREATE POLICY "anon: insert pre_admisiones" ON public.pre_admisiones
  FOR INSERT WITH CHECK (true);

-- Anon puede leer por código de seguimiento (para tracking)
CREATE POLICY "anon: select by codigo" ON public.pre_admisiones
  FOR SELECT USING (true);

-- Authenticated (admins) pueden todo
CREATE POLICY "colegio: all pre_admisiones" ON public.pre_admisiones
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

GRANT SELECT, INSERT ON public.pre_admisiones TO anon;
GRANT ALL ON public.pre_admisiones TO authenticated;
GRANT ALL ON public.pre_admisiones TO service_role;

CREATE INDEX IF NOT EXISTS idx_pre_admisiones_colegio_estado ON public.pre_admisiones(colegio_id, estado);
CREATE INDEX IF NOT EXISTS idx_pre_admisiones_codigo ON public.pre_admisiones(codigo_seguimiento);
CREATE INDEX IF NOT EXISTS idx_pre_admisiones_email ON public.pre_admisiones(apoderado_email);

DROP TRIGGER IF EXISTS tr_pre_admisiones_updated_at ON public.pre_admisiones;
CREATE TRIGGER tr_pre_admisiones_updated_at BEFORE UPDATE ON public.pre_admisiones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
