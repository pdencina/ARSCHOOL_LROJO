-- ============================================================
-- MIGRACIÓN 003 — Ajustes de inconsistencias + guía de usuarios
-- Ejecutar DESPUÉS de 001 y 002 en: Supabase Dashboard > SQL Editor
-- ============================================================

-- =====================
-- 1. ROLES: la app usa super_admin, admin, tutor, apoderado, alumno
--    (002 ya los agregó, esto solo es idempotente por si no se ejecutó)
-- =====================
alter table public.usuarios
  drop constraint if exists usuarios_rol_check;
alter table public.usuarios
  add constraint usuarios_rol_check
  check (rol in ('super_admin','admin','tutor','apoderado','alumno'));

-- super_admin no tiene colegio fijo → colegio_id puede ser NULL
alter table public.usuarios
  alter column colegio_id drop not null;

-- =====================
-- 2. INCONSISTENCIAS ENTRE 002 Y EL CÓDIGO
-- =====================

-- 2a. asistencias: el código usa 'tardanza', el 002 usaba 'atrasado'
alter table public.asistencias
  drop constraint if exists asistencias_estado_check;
alter table public.asistencias
  add constraint asistencias_estado_check
  check (estado in ('presente','ausente','tardanza','justificado'));

-- 2b. comunicados: el código usa tipo 'cobro', el 002 tenía 'cobranza'
alter table public.comunicados
  drop constraint if exists comunicados_tipo_check;
alter table public.comunicados
  add constraint comunicados_tipo_check
  check (tipo in ('general','urgente','evento','cobro','academico'));

-- 2c. tareas: el código usa campos estado y puntaje_max
alter table public.tareas
  add column if not exists estado       text not null default 'activa'
    check (estado in ('activa','cerrada','revisada')),
  add column if not exists puntaje_max  integer,
  add column if not exists tutor_id     uuid references public.usuarios(id);

-- 2d. planificaciones: el PlanificacionClient usa tutor_id (en 002 era creado_por)
alter table public.planificaciones
  add column if not exists tutor_id     uuid references public.usuarios(id),
  add column if not exists semana       date,
  add column if not exists contenidos   text,
  add column if not exists evaluacion_desc text;

-- =====================
-- 3. COLUMNAS FALTANTES EN alumnos
-- =====================
alter table public.alumnos
  add column if not exists direccion              text,
  add column if not exists nacionalidad           text default 'Chilena',
  add column if not exists necesidades_especiales text;

-- =====================
-- 4. TABLA: calendario_eventos (no existía en 002)
-- =====================
create table if not exists public.calendario_eventos (
  id          uuid primary key default uuid_generate_v4(),
  colegio_id  uuid not null references public.colegios(id) on delete cascade,
  titulo      text not null,
  descripcion text,
  fecha       date not null,
  tipo        text not null default 'evento'
              check (tipo in ('evaluacion','evento','comunicado','urgente','feriado')),
  curso       text,
  creado_por  uuid references public.usuarios(id),
  created_at  timestamptz not null default now()
);

alter table public.calendario_eventos enable row level security;

drop policy if exists "colegio: all calendario_eventos" on public.calendario_eventos;
create policy "colegio: all calendario_eventos" on public.calendario_eventos
  for all using (colegio_id = public.mi_colegio_id())
  with check (colegio_id = public.mi_colegio_id());

create index if not exists idx_calendario_eventos_colegio_fecha
  on public.calendario_eventos(colegio_id, fecha);

-- =====================
-- 5. FUNCIÓN: mi_rol() (si no existe del 002)
-- =====================
create or replace function public.mi_rol()
returns text
language sql stable security definer
set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid() and activo = true limit 1
$$;

-- =====================
-- 6. FUNCIÓN HELPER: crear usuario en un paso
--    (requiere ejecutarse con service_role en el SQL Editor)
-- =====================
create extension if not exists pgcrypto;

create or replace function public.crear_usuario_sistema(
  p_email      text,
  p_password   text,
  p_nombre     text,
  p_apellido   text,
  p_rol        text,
  p_colegio_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_rol not in ('super_admin','admin','tutor','apoderado','alumno') then
    raise exception 'Rol inválido: %. Opciones: super_admin, admin, tutor, apoderado, alumno', p_rol;
  end if;

  if p_rol <> 'super_admin' and p_colegio_id is null then
    raise exception 'colegio_id es requerido para el rol %', p_rol;
  end if;

  -- Crear en auth.users
  insert into auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud
  )
  values (
    uuid_generate_v4(),
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre, 'apellido', p_apellido),
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
  returning id into v_user_id;

  -- Crear en public.usuarios
  insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
  values (v_user_id, p_colegio_id, p_email, p_nombre, p_apellido, p_rol);

  return v_user_id;
end;
$$;

-- ============================================================
-- GUÍA DE CREACIÓN DE USUARIOS POR ROL
-- ============================================================
-- Reemplaza el colegio_id según tu instancia:
--   SELECT id, nombre FROM public.colegios;
--
-- OPCIÓN A — Función helper (un solo paso en SQL Editor):
--
--   select public.crear_usuario_sistema(
--     'email@ejemplo.cl',   -- email
--     'ClaveSegura123!',    -- password
--     'Nombre',             -- nombre
--     'Apellido',           -- apellido
--     'admin',              -- rol: super_admin | admin | tutor | apoderado | alumno
--     '00000000-0000-0000-0000-000000000001'  -- colegio_id (null para super_admin)
--   );
--
-- OPCIÓN B — Manual (crear en Auth primero, luego INSERT):
--
--   1. Supabase → Authentication → Users → "Add user"
--   2. Copia el UUID generado
--   3. Ejecuta el INSERT correspondiente abajo
-- ============================================================

-- =====================
-- SUPER ADMIN (sin colegio fijo — ve todos los colegios)
-- =====================
/*
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-de-auth>',
  null,
  'superadmin@armglobal.cl',
  'Carlos', 'Administrador',
  'super_admin'
);
*/

-- =====================
-- ADMIN (secretaría / dirección)
-- Módulos: Alumnos, Comunicados, Asistencias, Calificaciones,
--          Cobranzas, Calendario, Fichas, Reportes, Configuración
-- =====================
/*
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-de-auth>',
  '<COLEGIO-ID>',
  'admin@colegio.cl',
  'María', 'González',
  'admin'
);
*/

-- =====================
-- TUTOR (Profesor)
-- Módulos: Mis alumnos, Planificación, Asistencias, Calificaciones,
--          Comunicados, Libro de clases, Fichas, Calendario, Reportes
-- =====================
/*
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-de-auth>',
  '<COLEGIO-ID>',
  'profesor@colegio.cl',
  'Juan', 'García',
  'tutor'
);
*/

-- =====================
-- APODERADO (padre/madre — portal familiar)
-- Portal: Comunicados, Asistencias, Calificaciones, Estado de pagos, Perfil
-- =====================
-- Paso 1: crear usuario
/*
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-de-auth>',
  '<COLEGIO-ID>',
  'apoderado@gmail.com',
  'Ana', 'Martínez',
  'apoderado'
);
*/
-- Paso 2: vincular al alumno
--   SELECT id, nombre, apellido, curso FROM public.alumnos WHERE colegio_id = '<COLEGIO-ID>';
/*
insert into public.tutor_alumnos (tutor_id, alumno_id, parentesco)
values (
  '<UUID-del-apoderado>',
  '<UUID-del-alumno>',
  'apoderado'  -- o 'madre', 'padre', 'abuelo', etc.
);
*/

-- =====================
-- ALUMNO (portal estudiantil)
-- Portal: Mis notas, Asistencias, Tareas, Comunicados, Perfil
-- =====================
-- Paso 1: crear usuario
/*
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-de-auth>',
  '<COLEGIO-ID>',
  'alumno@colegio.cl',
  'Pedro', 'Pérez',
  'alumno'
);
*/
-- Paso 2: vincular al registro de alumno
--   SELECT id, nombre, apellido, curso FROM public.alumnos WHERE colegio_id = '<COLEGIO-ID>';
/*
insert into public.usuario_alumno (usuario_id, alumno_id)
values (
  '<UUID-del-usuario-alumno>',
  '<UUID-del-registro-en-alumnos>'
);
*/

-- ============================================================
-- QUERIES DE VERIFICACIÓN
-- ============================================================
/*
-- Ver todos los usuarios con su rol:
select u.email, u.nombre || ' ' || u.apellido as nombre,
       u.rol, c.nombre as colegio, u.activo
from public.usuarios u
left join public.colegios c on c.id = u.colegio_id
order by u.rol, u.apellido;

-- Ver apoderados y sus alumnos:
select u.nombre || ' ' || u.apellido as apoderado, u.email,
       a.nombre || ' ' || a.apellido as alumno, a.curso, ta.parentesco
from public.tutor_alumnos ta
join public.usuarios u on u.id = ta.tutor_id
join public.alumnos a  on a.id = ta.alumno_id
order by u.apellido;

-- Ver alumnos con cuenta propia:
select u.email, u.nombre || ' ' || u.apellido as usuario,
       a.nombre || ' ' || a.apellido as alumno, a.curso
from public.usuario_alumno ua
join public.usuarios u on u.id = ua.usuario_id
join public.alumnos a  on a.id = ua.alumno_id
order by a.curso, a.apellido;
*/
