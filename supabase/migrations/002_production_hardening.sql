-- ============================================================
-- AR SCHOOL — Hardening pre-producción
-- Objetivo: alinear roles, tablas usadas por la app, RLS básico
-- Ejecutar después de 001_initial_schema.sql en Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1) Roles reales usados por la aplicación
-- ------------------------------------------------------------
alter table public.usuarios drop constraint if exists usuarios_rol_check;
alter table public.usuarios add constraint usuarios_rol_check
  check (rol in ('super_admin','admin','director','docente','administrativo','tutor','apoderado','alumno'));

-- ------------------------------------------------------------
-- 2) Helper seguro para consultar usuario actual
-- ------------------------------------------------------------
create or replace function public.mi_colegio_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select colegio_id from public.usuarios where id = auth.uid() and activo = true limit 1
$$;

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid() and activo = true limit 1
$$;

-- ------------------------------------------------------------
-- 3) Tablas pedagógicas y portal
-- ------------------------------------------------------------
create table if not exists public.planificaciones (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  titulo text not null,
  descripcion text,
  curso text,
  materia text,
  fecha date,
  objetivos text,
  actividades text,
  recursos text,
  estado text not null default 'borrador' check (estado in ('borrador','publicada','archivada')),
  creado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.libro_clases (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  curso text not null,
  materia text,
  fecha date not null default current_date,
  contenido text not null,
  observaciones text,
  creado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asistencias (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  fecha date not null default current_date,
  estado text not null default 'presente' check (estado in ('presente','ausente','atrasado','justificado')),
  hora_ingreso time,
  observacion text,
  registrado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alumno_id, fecha)
);

create table if not exists public.evaluaciones (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  nombre text not null,
  descripcion text,
  materia text not null,
  curso text not null,
  fecha date not null default current_date,
  ponderacion numeric(5,2) not null default 100,
  creado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calificaciones (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  nota numeric(3,1) not null check (nota >= 1.0 and nota <= 7.0),
  observacion text,
  registrado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluacion_id, alumno_id)
);

create table if not exists public.tareas (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  curso text not null,
  titulo text not null,
  descripcion text,
  materia text,
  fecha_entrega date,
  archivo_url text,
  creado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usuario_alumno (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (usuario_id, alumno_id)
);

create table if not exists public.tutor_alumnos (
  id uuid primary key default uuid_generate_v4(),
  tutor_id uuid not null references public.usuarios(id) on delete cascade,
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  parentesco text,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tutor_id, alumno_id)
);

-- ------------------------------------------------------------
-- 4) Comunicaciones / notificaciones
-- ------------------------------------------------------------
create table if not exists public.comunicados (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  titulo text not null,
  contenido text not null,
  tipo text not null default 'general' check (tipo in ('general','urgente','evento','academico','cobranza')),
  curso text,
  requiere_confirmacion boolean not null default false,
  enviado_at timestamptz not null default now(),
  creado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comunicado_recepciones (
  id uuid primary key default uuid_generate_v4(),
  comunicado_id uuid not null references public.comunicados(id) on delete cascade,
  familia_id uuid references public.familias(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','abierto','confirmado')),
  abierto_at timestamptz,
  confirmado_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notificaciones (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete cascade,
  titulo text not null,
  mensaje text,
  tipo text not null default 'info' check (tipo in ('info','alerta','cobranza','academico','sistema')),
  leida boolean not null default false,
  href text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5) Cobranzas: planes usados por el módulo contable
-- ------------------------------------------------------------
create table if not exists public.planes_cobro (
  id uuid primary key default uuid_generate_v4(),
  colegio_id uuid not null references public.colegios(id) on delete cascade,
  nombre text not null,
  descripcion text,
  monto integer not null check (monto >= 0),
  periodicidad text not null default 'mensual' check (periodicidad in ('mensual','trimestral','anual','unico')),
  cursos text[],
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6) Triggers updated_at
-- ------------------------------------------------------------
drop trigger if exists tr_planificaciones_updated_at on public.planificaciones;
create trigger tr_planificaciones_updated_at before update on public.planificaciones for each row execute function public.set_updated_at();

drop trigger if exists tr_libro_clases_updated_at on public.libro_clases;
create trigger tr_libro_clases_updated_at before update on public.libro_clases for each row execute function public.set_updated_at();

drop trigger if exists tr_asistencias_updated_at on public.asistencias;
create trigger tr_asistencias_updated_at before update on public.asistencias for each row execute function public.set_updated_at();

drop trigger if exists tr_evaluaciones_updated_at on public.evaluaciones;
create trigger tr_evaluaciones_updated_at before update on public.evaluaciones for each row execute function public.set_updated_at();

drop trigger if exists tr_calificaciones_updated_at on public.calificaciones;
create trigger tr_calificaciones_updated_at before update on public.calificaciones for each row execute function public.set_updated_at();

drop trigger if exists tr_tareas_updated_at on public.tareas;
create trigger tr_tareas_updated_at before update on public.tareas for each row execute function public.set_updated_at();

drop trigger if exists tr_comunicados_updated_at on public.comunicados;
create trigger tr_comunicados_updated_at before update on public.comunicados for each row execute function public.set_updated_at();

drop trigger if exists tr_planes_cobro_updated_at on public.planes_cobro;
create trigger tr_planes_cobro_updated_at before update on public.planes_cobro for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 7) RLS mínimo para producción
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'planificaciones','libro_clases','asistencias','evaluaciones','calificaciones','tareas',
    'usuario_alumno','tutor_alumnos','comunicados','comunicado_recepciones','notificaciones','planes_cobro'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Evitar error al re-ejecutar la migración
drop policy if exists "colegio: all planificaciones" on public.planificaciones;
drop policy if exists "colegio: all libro_clases" on public.libro_clases;
drop policy if exists "colegio: all asistencias" on public.asistencias;
drop policy if exists "colegio: all evaluaciones" on public.evaluaciones;
drop policy if exists "colegio: all calificaciones" on public.calificaciones;
drop policy if exists "colegio: all tareas" on public.tareas;
drop policy if exists "colegio: all comunicados" on public.comunicados;
drop policy if exists "colegio: all notificaciones" on public.notificaciones;
drop policy if exists "colegio: all planes_cobro" on public.planes_cobro;
drop policy if exists "portal: select usuario_alumno" on public.usuario_alumno;
drop policy if exists "portal: select tutor_alumnos" on public.tutor_alumnos;
drop policy if exists "portal: select comunicado_recepciones" on public.comunicado_recepciones;
drop policy if exists "portal: update comunicado_recepciones" on public.comunicado_recepciones;

create policy "colegio: all planificaciones" on public.planificaciones for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all libro_clases" on public.libro_clases for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all asistencias" on public.asistencias for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all evaluaciones" on public.evaluaciones for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all calificaciones" on public.calificaciones for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all tareas" on public.tareas for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all comunicados" on public.comunicados for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all notificaciones" on public.notificaciones for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());
create policy "colegio: all planes_cobro" on public.planes_cobro for all using (colegio_id = public.mi_colegio_id()) with check (colegio_id = public.mi_colegio_id());

create policy "portal: select usuario_alumno" on public.usuario_alumno for select using (usuario_id = auth.uid());
create policy "portal: select tutor_alumnos" on public.tutor_alumnos for select using (tutor_id = auth.uid());
create policy "portal: select comunicado_recepciones" on public.comunicado_recepciones for select using (
  usuario_id = auth.uid()
  or exists (
    select 1 from public.tutor_alumnos ta
    join public.familias f on f.alumno_id = ta.alumno_id
    where ta.tutor_id = auth.uid() and f.id = comunicado_recepciones.familia_id
  )
);
create policy "portal: update comunicado_recepciones" on public.comunicado_recepciones for update using (
  usuario_id = auth.uid()
  or exists (
    select 1 from public.tutor_alumnos ta
    join public.familias f on f.alumno_id = ta.alumno_id
    where ta.tutor_id = auth.uid() and f.id = comunicado_recepciones.familia_id
  )
) with check (true);

-- Índices para que producción no se sienta lenta en los módulos principales
create index if not exists idx_asistencias_colegio_fecha on public.asistencias(colegio_id, fecha);
create index if not exists idx_asistencias_alumno_fecha on public.asistencias(alumno_id, fecha);
create index if not exists idx_evaluaciones_colegio_fecha on public.evaluaciones(colegio_id, fecha);
create index if not exists idx_calificaciones_alumno on public.calificaciones(alumno_id);
create index if not exists idx_comunicados_colegio_fecha on public.comunicados(colegio_id, enviado_at desc);
create index if not exists idx_notificaciones_usuario_leida on public.notificaciones(usuario_id, leida);
create index if not exists idx_tutor_alumnos_tutor on public.tutor_alumnos(tutor_id);
create index if not exists idx_usuario_alumno_usuario on public.usuario_alumno(usuario_id);
