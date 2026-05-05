# Folio Verde 🟢

Sistema educacional integral para colegios: fichas pedagógicas, gestión contable, comunicación con familias y evaluaciones.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel

---

## Inicio rápido

### 1. Clonar y configurar

```bash
git clone https://github.com/tu-usuario/folio-verde.git
cd folio-verde
npm install
cp .env.local.example .env.local
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Pega esos valores en tu `.env.local`
4. Ve a **SQL Editor** y ejecuta el archivo `supabase/migrations/001_initial_schema.sql`

### 3. Crear usuario de prueba

En Supabase → **Authentication → Users → Add user**:
- Email: `admin@colegio.cl`
- Password: `password123`

Luego en **SQL Editor**, vincula el usuario al colegio de demo:
```sql
insert into public.usuarios (id, colegio_id, email, nombre, apellido, rol)
values (
  '<UUID-del-usuario-recién-creado>',
  '00000000-0000-0000-0000-000000000001',
  'admin@colegio.cl',
  'Admin',
  'Demo',
  'admin'
);
```

### 4. Correr en desarrollo

```bash
npm run dev
# Abre http://localhost:3000
```

---

## Deploy en Vercel

### Opción A — Deploy directo desde GitHub (recomendado)

1. Sube el proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) → **New Project** → importa el repo
3. En **Environment Variables**, agrega:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY     = eyJ...
   NEXT_PUBLIC_SITE_URL          = https://tu-app.vercel.app
   ```
4. Click **Deploy** ✅

### Opción B — CLI

```bash
npm i -g vercel
vercel --prod
```

### Configurar dominio de Supabase para producción

En Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://tu-app.vercel.app`
- **Redirect URLs**: `https://tu-app.vercel.app/**`

---

## Estructura del proyecto

```
folio-verde/
├── app/
│   ├── (dashboard)/
│   │   ├── fichas/          # Biblioteca pedagógica
│   │   ├── contable/        # Cobranzas y facturación
│   │   ├── comunicacion/    # Mensajes a familias
│   │   └── evaluaciones/    # Notas y reportes
│   ├── login/               # Autenticación
│   └── api/                 # API Routes
│       ├── fichas/
│       ├── familias/
│       └── pagos/
├── components/
│   ├── layout/              # Topbar, Sidebar
│   ├── fichas/              # FichasClient, FichaCard
│   └── contable/            # ContableClient, ModalPago, Chart
├── lib/
│   ├── supabase/            # client.ts, server.ts, middleware.ts
│   └── utils.ts
├── types/                   # TypeScript types + DB types
├── supabase/
│   └── migrations/          # SQL schema
└── middleware.ts             # Auth guard
```

---

## Módulos

### 📚 Fichas Pedagógicas
- Biblioteca de fichas filtrable por materia, grado y tipo
- Código de color por materia (Lenguaje=rojo, Matemáticas=azul, etc.)
- Sistema de valoraciones y descargas
- Generación con IA (próximamente)

### 💳 Solución Contable
- Dashboard KPI: recaudación, mora, familias al día
- Tabla de cobros por familia con estados (pagado/mora/parcial/pendiente)
- Registro de pagos con emisión de boleta
- Gráfico de morosidad histórica
- Exportación Excel / reportes mensuales

### 📣 Comunicación *(próximamente)*
- Avisos masivos con botón de pago integrado
- Reportes de lectura
- Mensajes individuales

### 📝 Evaluaciones *(próximamente)*
- Registro de notas por alumno
- Generación de informes de rendimiento

---

## Variables de entorno

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon | Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo servidor) | Settings → API |
| `NEXT_PUBLIC_SITE_URL` | URL de tu app | Vercel dashboard |

---

## Scripts útiles

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run lint         # Lint
npm run db:types     # Regenerar tipos TypeScript desde Supabase
```

---

## Licencia

MIT
