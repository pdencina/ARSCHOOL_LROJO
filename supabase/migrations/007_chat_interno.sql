-- ============================================================
-- MIGRACIÓN 007 — Chat Interno (reemplazo de WhatsApp)
-- Comunicación controlada entre staff y familias
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Conversaciones (1 a 1 o grupales por curso)
CREATE TABLE IF NOT EXISTS public.conversaciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id      uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  tipo            text NOT NULL DEFAULT 'individual' CHECK (tipo IN ('individual','curso')),
  curso           text,  -- solo para tipo 'curso'
  titulo          text,  -- nombre visible del chat grupal
  activa          boolean NOT NULL DEFAULT true,
  chat_habilitado boolean NOT NULL DEFAULT true,  -- admin puede deshabilitar
  creado_por      uuid REFERENCES public.usuarios(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Participantes de cada conversación
CREATE TABLE IF NOT EXISTS public.conversacion_participantes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  usuario_id      uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  rol_chat        text NOT NULL DEFAULT 'miembro' CHECK (rol_chat IN ('admin','miembro')),
  puede_escribir  boolean NOT NULL DEFAULT true,
  silenciado      boolean NOT NULL DEFAULT false,
  ultimo_leido_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversacion_id, usuario_id)
);

-- Mensajes
CREATE TABLE IF NOT EXISTS public.mensajes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  autor_id        uuid NOT NULL REFERENCES public.usuarios(id),
  contenido       text NOT NULL,
  tipo_contenido  text NOT NULL DEFAULT 'texto' CHECK (tipo_contenido IN ('texto','imagen','archivo','sistema')),
  archivo_url     text,
  archivo_nombre  text,
  editado         boolean NOT NULL DEFAULT false,
  eliminado       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversacion_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- Políticas: solo participantes pueden ver sus conversaciones
CREATE POLICY "participante: select conversaciones" ON public.conversaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversacion_participantes cp
      WHERE cp.conversacion_id = id AND cp.usuario_id = auth.uid()
    )
    OR colegio_id = public.mi_colegio_id()
  );

CREATE POLICY "staff: manage conversaciones" ON public.conversaciones
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

CREATE POLICY "participante: select participantes" ON public.conversacion_participantes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversacion_participantes cp2
      WHERE cp2.conversacion_id = conversacion_id AND cp2.usuario_id = auth.uid()
    )
  );

CREATE POLICY "staff: manage participantes" ON public.conversacion_participantes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversaciones c
      WHERE c.id = conversacion_id AND c.colegio_id = public.mi_colegio_id()
    )
  );

CREATE POLICY "participante: select mensajes" ON public.mensajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversacion_participantes cp
      WHERE cp.conversacion_id = conversacion_id AND cp.usuario_id = auth.uid()
    )
  );

CREATE POLICY "participante: insert mensajes" ON public.mensajes
  FOR INSERT WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversacion_participantes cp
      JOIN public.conversaciones c ON c.id = cp.conversacion_id
      WHERE cp.conversacion_id = conversacion_id 
        AND cp.usuario_id = auth.uid()
        AND cp.puede_escribir = true
        AND c.chat_habilitado = true
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_fecha ON public.mensajes(conversacion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participantes_usuario ON public.conversacion_participantes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_participantes_conversacion ON public.conversacion_participantes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_colegio ON public.conversaciones(colegio_id);

-- Triggers
DROP TRIGGER IF EXISTS tr_conversaciones_updated_at ON public.conversaciones;
CREATE TRIGGER tr_conversaciones_updated_at BEFORE UPDATE ON public.conversaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_mensajes_updated_at ON public.mensajes;
CREATE TRIGGER tr_mensajes_updated_at BEFORE UPDATE ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
