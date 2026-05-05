-- ============================================================
-- FOLIO VERDE — Schema inicial
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- =====================
-- TABLA: colegios
-- =====================
create table if not exists public.colegios (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  rut         text,
  direccion   text,
  telefono    text,
  logo_url    text,
  plan        text not null default 'basico' check (plan in ('basico','profesional','enterprise')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =====================
-- TABLA: usuarios
-- =====================
create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  colegio_id  uuid not null references public.colegios(id) on delete cascade,
  email       text not null,
  nombre      text not null,
  apellido    text not null,
  rol         text not null default 'docente' check (rol in ('admin','director','docente','administrativo')),
  avatar_url  text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =====================
-- TABLA: fichas
-- =====================
create table if not exists public.fichas (
  id                  uuid primary key default uuid_generate_v4(),
  colegio_id          uuid references public.colegios(id) on delete cascade,
  titulo              text not null,
  descripcion         text,
  materia             text not null check (materia in ('lenguaje','matematicas','ciencias','historia','ingles','artes','educacion_fisica','otro')),
  grado               text not null,
  tipo                text not null default 'ejercicio' check (tipo in ('ejercicio','evaluacion','cuento','manualidad','guia')),
  archivo_url         text,
  miniatura_url       text,
  es_publica          boolean not null default false,
  valoraciones_total  integer not null default 0,
  valoraciones_suma   integer not null default 0,
  descargas           integer not null default 0,
  creado_por          uuid references public.usuarios(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =====================
-- TABLA: alumnos
-- =====================
create table if not exists public.alumnos (
  id               uuid primary key default uuid_generate_v4(),
  colegio_id       uuid not null references public.colegios(id) on delete cascade,
  nombre           text not null,
  apellido         text not null,
  rut              text,
  fecha_nacimiento date,
  curso            text not null,
  nivel            text not null,
  foto_url         text,
  activo           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- =====================
-- TABLA: familias
-- =====================
create table if not exists public.familias (
  id                   uuid primary key default uuid_generate_v4(),
  colegio_id           uuid not null references public.colegios(id) on delete cascade,
  alumno_id            uuid not null references public.alumnos(id) on delete cascade,
  nombre_apoderado     text not null,
  apellido_apoderado   text not null,
  email                text not null,
  telefono             text,
  rut                  text,
  direccion            text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- =====================
-- TABLA: conceptos_cobro
-- =====================
create table if not exists public.conceptos_cobro (
  id             uuid primary key default uuid_generate_v4(),
  colegio_id     uuid not null references public.colegios(id) on delete cascade,
  nombre         text not null,
  descripcion    text,
  monto          integer not null,
  periodicidad   text not null default 'mensual' check (periodicidad in ('mensual','trimestral','anual','unico')),
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- =====================
-- TABLA: cobros
-- =====================
create table if not exists public.cobros (
  id                uuid primary key default uuid_generate_v4(),
  colegio_id        uuid not null references public.colegios(id) on delete cascade,
  familia_id        uuid not null references public.familias(id),
  alumno_id         uuid not null references public.alumnos(id),
  concepto_id       uuid not null references public.conceptos_cobro(id),
  monto             integer not null,
  monto_pagado      integer not null default 0,
  mes               integer not null check (mes between 1 and 12),
  anio              integer not null,
  fecha_vencimiento date not null,
  fecha_pago        date,
  estado            text not null default 'pendiente' check (estado in ('pendiente','pagado','mora','parcial','anulado')),
  medio_pago        text check (medio_pago in ('transferencia','webpay','efectivo','cheque','app')),
  observaciones     text,
  factura_url       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =====================
-- TABLA: pagos
-- =====================
create table if not exists public.pagos (
  id               uuid primary key default uuid_generate_v4(),
  cobro_id         uuid not null references public.cobros(id) on delete cascade,
  monto            integer not null,
  medio_pago       text not null,
  referencia       text,
  registrado_por   uuid references public.usuarios(id),
  created_at       timestamptz not null default now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
alter table public.colegios        enable row level security;
alter table public.usuarios        enable row level security;
alter table public.fichas          enable row level security;
alter table public.alumnos         enable row level security;
alter table public.familias        enable row level security;
alter table public.conceptos_cobro enable row level security;
alter table public.cobros          enable row level security;
alter table public.pagos           enable row level security;

-- Helper: obtener colegio_id del usuario actual
create or replace function public.mi_colegio_id()
returns uuid language sql stable security definer as $$
  select colegio_id from public.usuarios where id = auth.uid()
$$;

-- Políticas: usuarios solo ven datos de su colegio
create policy "usuarios: ver propio colegio"   on public.usuarios        for select using (colegio_id = mi_colegio_id());
create policy "fichas: ver del colegio"         on public.fichas          for all    using (colegio_id = mi_colegio_id() or es_publica = true);
create policy "alumnos: ver del colegio"        on public.alumnos         for all    using (colegio_id = mi_colegio_id());
create policy "familias: ver del colegio"       on public.familias        for all    using (colegio_id = mi_colegio_id());
create policy "conceptos: ver del colegio"      on public.conceptos_cobro for all    using (colegio_id = mi_colegio_id());
create policy "cobros: ver del colegio"         on public.cobros          for all    using (colegio_id = mi_colegio_id());
create policy "pagos: ver via cobros"           on public.pagos           for select using (
  exists (select 1 from public.cobros c where c.id = cobro_id and c.colegio_id = mi_colegio_id())
);
create policy "pagos: insertar"                 on public.pagos           for insert with check (
  exists (select 1 from public.cobros c where c.id = cobro_id and c.colegio_id = mi_colegio_id())
);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger tr_colegios_updated_at   before update on public.colegios   for each row execute function set_updated_at();
create trigger tr_fichas_updated_at     before update on public.fichas     for each row execute function set_updated_at();
create trigger tr_alumnos_updated_at    before update on public.alumnos    for each row execute function set_updated_at();
create trigger tr_familias_updated_at   before update on public.familias   for each row execute function set_updated_at();
create trigger tr_cobros_updated_at     before update on public.cobros     for each row execute function set_updated_at();

-- =====================
-- FUNCIÓN: resumen cobros
-- =====================
create or replace view public.resumen_cobros_mes as
select
  colegio_id,
  mes,
  anio,
  count(*)                                              as total_cobros,
  sum(monto_pagado)                                     as total_recaudado,
  sum(case when estado = 'mora' then monto else 0 end)  as total_mora,
  count(case when estado = 'pagado' then 1 end)         as familias_al_dia,
  count(case when estado = 'mora'   then 1 end)         as familias_mora
from public.cobros
group by colegio_id, mes, anio;

-- =====================
-- DATOS DE EJEMPLO (seed)
-- =====================
-- Insertar un colegio de demostración
insert into public.colegios (id, nombre, rut, direccion, plan) values
  ('00000000-0000-0000-0000-000000000001', 'Colegio San Martín', '12.345.678-9', 'Av. Principal 1234, Santiago', 'profesional')
on conflict (id) do nothing;

-- Fichas públicas de ejemplo
insert into public.fichas (titulo, materia, grado, tipo, es_publica, descargas, valoraciones_total, valoraciones_suma, colegio_id, creado_por) values
  ('Comprensión lectora — textos informativos', 'lenguaje',    '2° Básico', 'ejercicio',  true, 1240, 48, 220, '00000000-0000-0000-0000-000000000001', null),
  ('Tablas de multiplicar — ejercicios progresivos','matematicas','3° Básico','ejercicio', true, 980,  36, 162, '00000000-0000-0000-0000-000000000001', null),
  ('El cuerpo humano — sistemas y órganos',     'ciencias',    '5° Básico', 'guia',       true, 870,  29, 130, '00000000-0000-0000-0000-000000000001', null),
  ('Present simple — verbos cotidianos',        'ingles',      '6° Básico', 'ejercicio',  true, 640,  22, 106, '00000000-0000-0000-0000-000000000001', null),
  ('Mandalas geométricas — concentración',      'artes',       '1° Básico', 'manualidad', true, 520,  18,  80, '00000000-0000-0000-0000-000000000001', null),
  ('Ortografía — uso de b y v',                 'lenguaje',    '3° Básico', 'ejercicio',  true, 490,  15,  63, '00000000-0000-0000-0000-000000000001', null),
  ('Fracciones — introducción visual',          'matematicas', '4° Básico', 'guia',       true, 430,  20,  96, '00000000-0000-0000-0000-000000000001', null),
  ('Los ecosistemas de Chile',                  'ciencias',    '6° Básico', 'guia',       true, 380,  14,  62, '00000000-0000-0000-0000-000000000001', null)
on conflict do nothing;
