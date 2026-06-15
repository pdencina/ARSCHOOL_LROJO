-- ============================================================
-- GUÍA: Crear usuarios por rol vía Supabase SQL Editor
-- ============================================================
-- IMPORTANTE: Supabase no permite crear auth.users directamente con INSERT.
-- El flujo correcto es:
--   1. Crear el usuario en Authentication → Users (o via API)
--   2. Copiar el UUID generado
--   3. Ejecutar el INSERT en public.usuarios con ese UUID
--
-- Alternativamente usa la función helper al final de este archivo
-- para hacerlo en un solo paso con la service_role key.
-- ============================================================

-- =====================
-- COLEGIO DE REFERENCIA
-- =====================
-- Reemplaza este UUID con el ID real de tu colegio:
-- SELECT id, nombre FROM public.colegios;

-- =====================================================================
-- ROL 1: SUPER ADMIN (acceso global, sin colegio fijo)
-- =====================================================================
-- ⚠ Solo crear 1 o 2. Tienen acceso a TODOS los colegios.
--
-- Paso 1: En Supabase → Authentication → Users → "Add user"
--   Email: superadmin@armglobal.cl
--   Password: (elige uno seguro)
--   Copia el UUID generado → reemplaza abajo
--
-- Paso 2: Ejecuta esto:

insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-del-super-admin>',       -- pegar UUID de auth.users
  null,                            -- super_admin no tiene colegio fijo
  'superadmin@armglobal.cl',
  'Carlos',
  'Administrador',
  'super_admin'
);

-- =====================================================================
-- ROL 2: ADMIN (secretaría / dirección — gestiona cobros, alumnos, etc.)
-- =====================================================================
-- Tiene acceso a: Alumnos, Comunicados, Asistencias, Calificaciones,
--                 Cobranzas, Calendario, Fichas, Reportes, Configuración.

insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-del-admin>',
  '00000000-0000-0000-0000-000000000001',  -- ID del colegio
  'admin@colegio.cl',
  'María',
  'González',
  'admin'
);

-- =====================================================================
-- ROL 3: TUTOR (Profesor — gestiona su curso)
-- =====================================================================
-- Tiene acceso a: Mis alumnos, Planificación, Asistencias,
--                 Calificaciones, Comunicados, Libro de clases,
--                 Fichas, Calendario, Reportes.

insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-del-tutor>',
  '00000000-0000-0000-0000-000000000001',
  'profesor.garcia@colegio.cl',
  'Juan',
  'García',
  'tutor'
);

-- =====================================================================
-- ROL 4: APODERADO (Padre/Madre — portal familiar)
-- =====================================================================
-- Tiene acceso al Portal: Comunicados, Asistencias, Calificaciones,
--                         Estado de pagos, Perfil.
--
-- Después de crear el usuario apoderado, vincularlo al(los) alumno(s):

-- 4a. Crear usuario apoderado
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-del-apoderado>',
  '00000000-0000-0000-0000-000000000001',
  'apoderado@gmail.com',
  'Ana',
  'Martínez',
  'apoderado'
);

-- 4b. Vincular al alumno (necesitas el alumno_id)
-- SELECT id, nombre, apellido, curso FROM public.alumnos WHERE colegio_id = '00000000-0000-0000-0000-000000000001';
insert into public.tutor_alumnos (tutor_id, alumno_id, parentesco)
values (
  '<UUID-del-apoderado>',
  '<UUID-del-alumno>',
  'apoderado'
);

-- =====================================================================
-- ROL 5: ALUMNO (estudiante — portal estudiantil)
-- =====================================================================
-- Tiene acceso al Portal: Mis notas, Asistencias, Tareas, Comunicados,
--                         Perfil.
--
-- Después de crear el usuario alumno, vincularlo al registro de alumnos:

-- 5a. Crear usuario alumno
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-del-alumno-usuario>',
  '00000000-0000-0000-0000-000000000001',
  'alumno.perez@colegio.cl',
  'Pedro',
  'Pérez',
  'alumno'
);

-- 5b. Vincular al registro de alumnos
insert into public.usuario_alumno (usuario_id, alumno_id)
values (
  '<UUID-del-alumno-usuario>',
  '<UUID-del-registro-alumno>'   -- el id en tabla public.alumnos
);

-- =====================================================================
-- QUERIES ÚTILES PARA VERIFICAR
-- =====================================================================

-- Ver todos los usuarios con su rol y colegio:
select
  u.id,
  u.email,
  u.nombre || ' ' || u.apellido as nombre_completo,
  u.rol,
  c.nombre as colegio,
  u.activo
from public.usuarios u
left join public.colegios c on c.id = u.colegio_id
order by u.rol, u.apellido;

-- Ver apoderados y sus alumnos vinculados:
select
  u.nombre || ' ' || u.apellido as apoderado,
  u.email,
  a.nombre || ' ' || a.apellido as alumno,
  a.curso,
  ta.parentesco
from public.tutor_alumnos ta
join public.usuarios u on u.id = ta.tutor_id
join public.alumnos a  on a.id = ta.alumno_id
order by u.apellido;

-- Ver alumnos con cuenta propia:
select
  u.nombre || ' ' || u.apellido as usuario_alumno,
  u.email,
  a.nombre || ' ' || a.apellido as alumno_registro,
  a.curso
from public.usuario_alumno ua
join public.usuarios u on u.id = ua.usuario_id
join public.alumnos a  on a.id = ua.alumno_id
order by a.curso, a.apellido;

-- =====================================================================
-- FUNCIÓN HELPER: crear usuario completo en un paso
-- (usa service_role internamente — ejecutar solo con permisos de admin)
-- =====================================================================
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
as $$
declare
  v_user_id uuid;
begin
  -- Validar rol
  if p_rol not in ('super_admin','admin','tutor','apoderado','alumno') then
    raise exception 'Rol inválido: %', p_rol;
  end if;

  -- Crear en auth.users (requiere permisos service_role)
  insert into auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, role, aud
  )
  values (
    uuid_generate_v4(),
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre, 'apellido', p_apellido),
    now(), now(), 'authenticated', 'authenticated'
  )
  returning id into v_user_id;

  -- Crear en public.usuarios
  insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
  values (v_user_id, p_colegio_id, p_email, p_nombre, p_apellido, p_rol);

  return v_user_id;
end;
$$;

-- =====================================================================
-- EJEMPLOS DE USO DE LA FUNCIÓN HELPER
-- =====================================================================

-- Crear un admin:
-- select public.crear_usuario_sistema('admin@colegio.cl','Pass1234!','María','González','admin','00000000-0000-0000-0000-000000000001');

-- Crear un profesor:
-- select public.crear_usuario_sistema('profesor@colegio.cl','Pass1234!','Juan','García','tutor','00000000-0000-0000-0000-000000000001');

-- Crear un apoderado (luego vincular con tutor_alumnos):
-- select public.crear_usuario_sistema('apoderado@gmail.com','Pass1234!','Ana','Martínez','apoderado','00000000-0000-0000-0000-000000000001');

-- Crear super admin (sin colegio):
-- select public.crear_usuario_sistema('superadmin@armglobal.cl','Pass1234!','Carlos','Admin','super_admin', null);
