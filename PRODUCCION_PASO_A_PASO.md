# AR School — Guía de Producción

> Actualizado: Junio 2026

## 1. Requisitos Previos

- Node.js 18+ (recomendado 20 LTS)
- Proyecto en Supabase (free tier es suficiente para empezar)
- Cuenta en Vercel (para deploy)

## 2. Setup Local

```bash
# Clonar e instalar
git clone <repo-url>
cd arschool-platform
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con las credenciales reales de Supabase
```

## 3. Base de Datos — Ejecutar en Supabase SQL Editor

Ejecutar las migraciones **en este orden exacto:**

1. `supabase/migrations/001_initial_schema.sql` — Tablas core + RLS
2. `supabase/migrations/002_production_hardening.sql` — Tablas pedagógicas + portal
3. `supabase/migrations/003_ajustes_y_usuarios.sql` — Ajustes de roles + función helper

## 4. Crear Primer Super Admin

En Supabase SQL Editor, ejecutar:

```sql
SELECT public.crear_usuario_sistema(
  'admin@tudominio.cl',     -- email
  'ClaveSegura123!',        -- password (cambiar!)
  'Nombre',                 -- nombre
  'Apellido',               -- apellido
  'super_admin',            -- rol
  NULL                      -- colegio_id (null para super_admin)
);
```

## 5. Configurar Supabase Auth

En Supabase Dashboard > Authentication > URL Configuration:

- **Site URL:** `https://tu-dominio.vercel.app` (o tu dominio)
- **Redirect URLs:** agregar:
  - `https://tu-dominio.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (para desarrollo)

## 6. Variables en Vercel

En tu proyecto de Vercel > Settings > Environment Variables:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `NEXT_PUBLIC_SITE_URL` | URL de tu app en Vercel |

## 7. Deploy

```bash
# Verificar que compila
npm run build

# Deploy con Vercel CLI (opcional, también puedes desde el dashboard)
npx vercel --prod
```

O simplemente conecta tu repo de GitHub a Vercel y cada push a `main` hará deploy automático.

## 8. Post-Deploy — Orden de pruebas

1. Login con super_admin
2. Crear un colegio desde `/super-admin`
3. Crear usuario admin para el colegio
4. Crear usuario tutor (profesor)
5. Crear alumnos
6. Probar asistencias
7. Crear evaluación y poner calificaciones
8. Crear comunicado
9. Crear plan de cobro y generar cobros
10. Registrar pagos
11. Crear apoderado y vincularlo a alumno → probar portal
12. Probar reset de contraseña

## 9. Flujo de Roles

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| `super_admin` | Todo + multi-colegio | Fundación ARM Global |
| `admin` | Dashboard completo | Secretaría / dirección del colegio |
| `tutor` | Módulos pedagógicos | Profesor |
| `apoderado` | Portal familiar | Padre/madre/tutor legal |
| `alumno` | Portal estudiantil | Estudiante |

## 10. Notas Importantes

- **TypeScript errors:** El build ignora errores TS por ahora (`ignoreBuildErrors: true` en next.config.js). Esto es temporal para el primer lanzamiento.
- **Pagos:** Solo registro manual (no hay Webpay/Flow integrado aún).
- **Archivos:** Las fichas y tareas soportan URLs de archivos, pero la subida de archivos no está implementada (se puede hacer con Supabase Storage).
- **Emails:** Los comunicados son in-app. Para email real se necesita configurar Supabase Edge Functions o un servicio como Resend.

## 11. Comandos Útiles

```bash
npm run dev          # Servidor de desarrollo (localhost:3000)
npm run build        # Build de producción
npm run start        # Servir build localmente
npm run lint         # Lint del código
npm run db:types     # Regenerar tipos de Supabase (requiere CLI local)
```
