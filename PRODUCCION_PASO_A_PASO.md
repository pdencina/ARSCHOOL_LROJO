# AR School — Paso a paso para salir a producción

> Versión preparada para pre-producción por Pablo Encina Acevedo.

## 1. Qué se corrigió en este ZIP

- Se eliminó la carpeta `.git` del paquete final.
- Se activó el middleware real de Supabase para refrescar sesión/cookies.
- Se agregó la migración `supabase/migrations/002_production_hardening.sql`.
- Se alinearon roles usados por el código: `super_admin`, `admin`, `director`, `docente`, `administrativo`, `tutor`, `apoderado`, `alumno`.
- Se agregaron tablas que el código ya estaba usando y que antes no existían:
  - `asistencias`
  - `evaluaciones`
  - `calificaciones`
  - `comunicados`
  - `comunicado_recepciones`
  - `notificaciones`
  - `planes_cobro`
  - `planificaciones`
  - `libro_clases`
  - `tareas`
  - `usuario_alumno`
  - `tutor_alumnos`

## 2. Antes de subir a Vercel

No publiques sin hacer esto primero:

1. Crear proyecto en Supabase o usar el proyecto final.
2. Ejecutar en Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - luego `supabase/migrations/002_production_hardening.sql`
3. Configurar variables en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. En Supabase Auth, configurar URL del sitio y redirect URLs.
5. Crear el primer usuario `super_admin` manualmente o usando el panel/API admin.

## 3. Orden recomendado de pruebas

1. Login.
2. Acceso `/super-admin` con usuario `super_admin`.
3. Crear colegio.
4. Crear usuario administrador del colegio.
5. Crear profesor/tutor.
6. Crear alumno.
7. Registrar asistencia.
8. Crear comunicado.
9. Crear evaluación y calificación.
10. Crear plan/cobro y registrar pago.
11. Probar portal de apoderado/alumno.

## 4. Alertas que aún debes considerar

- No dejé activado un cambio agresivo en `next.config.js`, porque podría bloquear el deploy si existen errores TypeScript heredados. Mi recomendación es endurecerlo después de validar la primera salida.
- La integración real de pagos/Webpay no está validada en este ZIP; el módulo actual registra pagos manuales.
- Hay que revisar branding visual final contra el sitio público de AR School antes de lanzamiento oficial.

## 5. Comandos locales

```bash
npm install
npm run dev
npm run build
```

Si `npm run build` falla, no publiques. Corrige primero el error que aparezca.
