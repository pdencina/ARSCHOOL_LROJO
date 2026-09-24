'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// Lo que el equipo hace a diario: rota en el panel izquierdo
const TAREAS = [
  'revisar admisiones',
  'firmar contratos',
  'pasar lista',
  'validar vouchers',
  'enviar comunicados',
  'ver indicadores',
]

// Dibujos escolares a mano alzada (viewBox 48×48). Se trazan al cargar y luego flotan.
const DOODLES: { d: string; x: string; y: string; size: number; rot: number; delay: number; float: number; op: number; movil?: boolean }[] = [
  // lápiz
  { d: 'M10 38 L34 14 L40 20 L16 44 L8 46 Z M30 18 L36 24 M8 46 L12 42', x: '72%', y: '8%', size: 64, rot: 8, delay: 0.1, float: 7, op: 0.22, movil: true },
  // libro abierto
  { d: 'M6 12 C14 8 20 10 24 14 C28 10 34 8 42 12 L42 38 C34 34 28 36 24 40 C20 36 14 34 6 38 Z M24 14 L24 40', x: '86%', y: '20%', size: 64, rot: -6, delay: 0.35, float: 8, op: 0.16 },
  // pelota (Lions)
  { d: 'M24 6 A18 18 0 1 1 23.9 6 M24 16 L31 21 L28 29 L20 29 L17 21 Z M24 16 L24 6.5 M31 21 L41 18 M28 29 L33 39 M20 29 L15 39 M17 21 L7 18', x: '64%', y: '58%', size: 58, rot: 0, delay: 0.6, float: 9, op: 0.16 },
  // nota musical (Worship)
  { d: 'M13 36 A5 4 0 1 1 12.9 36 M18 36 L18 10 L38 6 L38 30 M33 30 A5 4 0 1 1 32.9 30 M18 16 L38 12', x: '86%', y: '72%', size: 50, rot: 10, delay: 0.85, float: 6.5, op: 0.2, movil: true },
  // estrella
  { d: 'M24 6 L29 18 L42 19 L32 27 L35 40 L24 33 L13 40 L16 27 L6 19 L19 18 Z', x: '58%', y: '20%', size: 36, rot: -12, delay: 1.05, float: 5.5, op: 0.24 },
  // avión de papel
  { d: 'M6 22 L42 8 L32 40 L22 28 Z M22 28 L42 8 M22 28 L20 38 L26 32', x: '89%', y: '57%', size: 46, rot: -8, delay: 1.25, float: 7.5, op: 0.18 },
  // ampolleta (ideas)
  { d: 'M18 31 C11 26 11 13 24 9 C37 13 37 26 30 31 L30 36 L18 36 Z M20 40 L28 40 M24 4 L24 1 M38 10 L40 8 M10 10 L8 8', x: '88%', y: '6%', size: 40, rot: 6, delay: 1.45, float: 6, op: 0.2 },
  // manzana
  { d: 'M24 15 C16 9 6 15 10 29 C13 39 20 43 24 39 C28 43 35 39 38 29 C42 15 32 9 24 15 M24 15 C24 11 26 7 30 6', x: '52%', y: '76%', size: 42, rot: 4, delay: 1.65, float: 8.5, op: 0.14 },
]

const PROGRAMAS = [
  { src: '/logo-arschool.png', alt: 'AR School', w: 110, h: 38 },
  { src: '/logo-playgroup.png', alt: 'Play and Group', w: 62, h: 40 },
  { src: '/logo-lions.png', alt: 'Lions Soccer School', w: 84, h: 40 },
  // Worship: la imagen trae mucho margen, se recorta al texto
  { src: '/logo-worship.png', alt: 'AR Worship School', w: 100, h: 28, recorte: true },
]

function saludoPorHora(h: number) {
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verPassword, setVerPassword] = useState(false)
  const [mayus, setMayus] = useState(false)
  const [error, setError] = useState('')
  const [sacudir, setSacudir] = useState(0)
  // Se calculan en el cliente (la hora del servidor no es la del usuario)
  const [saludo, setSaludo] = useState('Hola')
  const [tarea, setTarea] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setSaludo(saludoPorHora(new Date().getHours()))
    const t = setInterval(() => setTarea(i => (i + 1) % TAREAS.length), 2200)
    return () => clearInterval(t)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos.')
      setSacudir(s => s + 1)
      setLoading(false)
      return
    }
    const { data: usuario } = await supabase.from('usuarios').select('rol, colegio_id').eq('id', data.user.id).single()
    const rol = (usuario as any)?.rol
    const colegioId = (usuario as any)?.colegio_id

    if (rol === 'super_admin' && !colegioId) {
      router.push('/super-admin')
    } else if (['apoderado', 'alumno'].includes(rol)) {
      router.push('/portal')
    } else {
      router.push('/inicio')
    }
    router.refresh()
  }

  const detectarMayus = (e: React.KeyboardEvent<HTMLInputElement>) => setMayus(e.getModifierState?.('CapsLock') ?? false)

  return (
    <div className="lg-root min-h-screen flex flex-col lg:flex-row bg-white">
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>

      {/* ── Panel izquierdo: cuaderno vivo ── */}
      <section className="lg-panel relative overflow-hidden text-white lg:w-[48%] flex flex-col justify-between px-6 pt-6 pb-8 lg:p-12">
        <div className="lg-cuadricula" aria-hidden="true"/>
        <div className="lg-brillo lg-brillo-1" aria-hidden="true"/>
        <div className="lg-brillo lg-brillo-2" aria-hidden="true"/>

        {/* Dibujos flotantes */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {DOODLES.map((g, i) => (
            <svg key={i} viewBox="0 0 48 48" width={g.size} height={g.size}
              className={`lg-doodle ${g.movil ? '' : 'hidden lg:block'}`}
              style={{ left: g.x, top: g.y, opacity: g.op, ['--rot' as any]: `${g.rot}deg`, ['--delay' as any]: `${g.delay}s`, ['--float' as any]: `${g.float}s` }}>
              <path d={g.d} pathLength={100}/>
            </svg>
          ))}
        </div>

        <div className="relative">
          <div className="inline-flex bg-white rounded-2xl px-4 py-3 shadow-lg shadow-black/10 lg-entra">
            <Image src="/logo-fundacion.png" alt="Fundación ARM Global" width={160} height={50} className="h-9 lg:h-11 w-auto" priority/>
          </div>

          <div className="mt-8 lg:mt-20 max-w-xl">
            <p className="lg-entra text-[#F4B183] text-sm lg:text-base font-semibold tracking-wide" style={{ animationDelay: '.1s' }}>
              {saludo} 👋
            </p>
            <h1 className="lg-entra mt-2 text-[27px] leading-[1.15] lg:text-[40px] xl:text-[42px] font-bold" style={{ fontFamily: 'DM Sans, sans-serif', animationDelay: '.2s' }}>
              Tu <span className="whitespace-nowrap">Centro Educacional,</span><br/>
              en{' '}
              <span className="relative inline-block whitespace-nowrap">
                un solo lugar.
                {/* Subrayado a mano */}
                <svg className="lg-subrayado" viewBox="0 0 220 16" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 11 C 40 4, 80 14, 120 8 S 190 5, 217 9" pathLength={100}/>
                </svg>
              </span>
            </h1>
            <p className="lg-entra hidden lg:block mt-6 text-white/65 text-[15px] leading-relaxed" style={{ animationDelay: '.35s' }}>
              Admisiones, matrículas, asistencia, pagos y comunicación con las familias: conectados en un mismo sistema.
            </p>

            <div className="lg-entra mt-5 lg:mt-8 inline-flex items-center gap-2 rounded-full bg-white/[0.08] border border-white/10 pl-3 pr-4 py-1.5 text-[13px] lg:text-sm backdrop-blur-sm" style={{ animationDelay: '.5s' }}>
              <span className="lg-punto" aria-hidden="true"/>
              <span className="text-white/60">Hoy puedes</span>
              <span className="relative inline-flex h-5 overflow-hidden min-w-[150px]" aria-live="polite">
                <span key={tarea} className="lg-tarea font-semibold text-white">{TAREAS[tarea]}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Programas */}
        <div className="relative hidden lg:block lg-entra" style={{ animationDelay: '.7s' }}>
          <div className="text-white/40 text-[10px] uppercase tracking-[0.18em] mb-3">Nuestros programas</div>
          <div className="flex flex-wrap items-center gap-3">
            {PROGRAMAS.map(p => (
              <div key={p.src} className="lg-programa h-14 px-4 rounded-xl bg-white/[0.06] border border-white/[0.09] flex items-center backdrop-blur-sm">
                {p.recorte ? (
                  <span className="block overflow-hidden relative" style={{ width: p.w, height: p.h }}>
                    {/* contenido del PNG: 15–85 % de ancho, 33–68 % de alto */}
                    <Image src={p.src} alt={p.alt} width={143} height={80} className="lg-blanco absolute max-w-none" style={{ width: 143, height: 80, left: -21, top: -26 }}/>
                  </span>
                ) : (
                  <Image src={p.src} alt={p.alt} width={p.w} height={p.h} className="lg-blanco w-auto" style={{ height: p.h * 0.72 }}/>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 text-white/30 text-[10px] uppercase tracking-[0.18em]">Fundación ARM Global</div>
        </div>
      </section>

      {/* ── Formulario ── */}
      <main className="flex-1 flex items-center justify-center px-6 py-10 lg:p-8 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-[26px] font-bold text-[#0F1B2D]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Iniciar sesión</h2>
          <p className="text-slate-500 text-sm mt-1 mb-8">Ingresa con tu cuenta institucional</p>

          <form key={sacudir} onSubmit={handleLogin} className={`space-y-5 ${sacudir ? 'lg-sacude' : ''}`} noValidate={false}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Correo electrónico</label>
              <div className="lg-campo">
                <i className="ti ti-mail" aria-hidden="true"/>
                <input id="email" type="email" autoComplete="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="usuario@institucion.org" required/>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
              <div className="lg-campo">
                <i className="ti ti-lock" aria-hidden="true"/>
                <input id="password" type={verPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyUp={detectarMayus} onKeyDown={detectarMayus}
                  placeholder="••••••••" required/>
                <button type="button" onClick={() => setVerPassword(v => !v)} className="lg-ojo"
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <i className={`ti ${verPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true"/>
                </button>
              </div>
              {mayus && (
                <p className="mt-1.5 text-[11px] text-amber-700 flex items-center gap-1">
                  <i className="ti ti-arrow-big-up-line text-xs" aria-hidden="true"/> Bloq Mayús está activado
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <i className="ti ti-alert-circle" aria-hidden="true"/> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="lg-boton group">
              {loading ? (
                <>
                  <svg className="lg-escribe" viewBox="0 0 44 14" aria-hidden="true">
                    <path d="M2 9 C 8 3, 12 13, 18 7 S 28 3, 32 8 S 40 11, 42 6" pathLength={100}/>
                  </svg>
                  Abriendo tu panel…
                </>
              ) : (
                <>
                  Ingresar
                  <i className="ti ti-arrow-right transition-transform group-hover:translate-x-1" aria-hidden="true"/>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/forgot-password" className="text-xs text-slate-500 hover:text-[#C45A1A] transition-colors">¿Olvidaste tu contraseña?</a>
          </div>

          <div className="mt-14 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">AR School · Fundación ARM Global</p>
          </div>
        </div>
      </main>
    </div>
  )
}

const CSS = `
.lg-panel{background:radial-gradient(120% 90% at 0% 0%, #24507c 0%, #1B3A5C 45%, #132b45 100%)}
.lg-cuadricula{position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);
  background-size:28px 28px;mask-image:radial-gradient(ellipse at 70% 40%,#000 30%,transparent 80%);-webkit-mask-image:radial-gradient(ellipse at 70% 40%,#000 30%,transparent 80%)}
.lg-brillo{position:absolute;border-radius:9999px;filter:blur(60px);pointer-events:none}
.lg-brillo-1{width:380px;height:380px;right:-120px;top:-100px;background:rgba(232,114,42,.22);animation:lg-respira 9s ease-in-out infinite alternate}
.lg-brillo-2{width:320px;height:320px;left:-120px;bottom:-120px;background:rgba(91,143,168,.28);animation:lg-respira 11s ease-in-out infinite alternate-reverse}

.lg-doodle{position:absolute;overflow:visible;transform:rotate(var(--rot));
  animation:lg-flota var(--float) ease-in-out calc(var(--delay) + 1.4s) infinite alternate}
.lg-doodle path{fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;
  stroke-dasharray:100;stroke-dashoffset:100;animation:lg-traza 1.4s cubic-bezier(.45,0,.25,1) var(--delay) forwards}

.lg-subrayado{position:absolute;left:-2%;bottom:-.28em;width:104%;height:.42em;overflow:visible}
.lg-subrayado path{fill:none;stroke:#E8722A;stroke-width:4;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;
  animation:lg-traza .9s cubic-bezier(.45,0,.25,1) .9s forwards}

.lg-entra{animation:lg-sube .6s cubic-bezier(.2,.8,.2,1) both}
.lg-punto{width:7px;height:7px;border-radius:9999px;background:#6EE7A8;box-shadow:0 0 0 0 rgba(110,231,168,.6);animation:lg-pulso 2s ease-out infinite}
.lg-tarea{position:absolute;left:0;top:0;white-space:nowrap;animation:lg-tarea .45s cubic-bezier(.2,.8,.2,1) both}

.lg-blanco{filter:brightness(0) invert(1);opacity:.85}
.lg-programa{transition:transform .25s ease, background-color .25s ease, border-color .25s ease}
.lg-programa:hover{transform:translateY(-3px);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18)}

.lg-campo{position:relative;display:flex;align-items:center}
.lg-campo > i{position:absolute;left:14px;font-size:17px;color:#94a3b8;pointer-events:none;transition:color .2s}
.lg-campo input{width:100%;height:46px;padding:0 44px 0 42px;border:1.5px solid #e2e8f0;border-radius:12px;background:#f8fafc;
  font-size:14px;color:#0F1B2D;outline:none;transition:border-color .2s, background-color .2s, box-shadow .2s}
.lg-campo input::placeholder{color:#a0aec0}
.lg-campo input:focus{border-color:#1B3A5C;background:#fff;box-shadow:0 0 0 4px rgba(27,58,92,.08)}
.lg-campo:focus-within > i{color:#1B3A5C}
.lg-ojo{position:absolute;right:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;color:#94a3b8;font-size:17px}
.lg-ojo:hover{color:#1B3A5C;background:#eef2f7}

.lg-boton{width:100%;height:48px;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:12px;
  background:#1B3A5C;color:#fff;font-weight:600;font-size:14px;letter-spacing:.01em;
  box-shadow:0 8px 20px -8px rgba(27,58,92,.55);transition:background-color .2s, transform .15s, box-shadow .2s}
.lg-boton:hover:not(:disabled){background:#14304d;transform:translateY(-1px);box-shadow:0 12px 24px -10px rgba(27,58,92,.6)}
.lg-boton:active:not(:disabled){transform:translateY(0)}
.lg-boton:disabled{opacity:.85;cursor:progress}
.lg-escribe{width:44px;height:14px;overflow:visible}
.lg-escribe path{fill:none;stroke:#F4B183;stroke-width:2.2;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;
  animation:lg-escribe 1.2s ease-in-out infinite}

.lg-sacude{animation:lg-sacude .42s cubic-bezier(.36,.07,.19,.97) both}

@keyframes lg-traza{to{stroke-dashoffset:0}}
@keyframes lg-flota{from{transform:rotate(var(--rot)) translateY(0)}to{transform:rotate(calc(var(--rot) + 4deg)) translateY(-10px)}}
@keyframes lg-respira{from{transform:scale(1);opacity:.8}to{transform:scale(1.15);opacity:1}}
@keyframes lg-sube{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes lg-tarea{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:none}}
@keyframes lg-pulso{0%{box-shadow:0 0 0 0 rgba(110,231,168,.6)}100%{box-shadow:0 0 0 8px rgba(110,231,168,0)}}
@keyframes lg-escribe{0%{stroke-dashoffset:100}60%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}
@keyframes lg-sacude{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}

@media (prefers-reduced-motion: reduce){
  .lg-doodle,.lg-brillo,.lg-punto,.lg-entra,.lg-tarea,.lg-sacude{animation:none}
  .lg-doodle path,.lg-subrayado path{animation:none;stroke-dashoffset:0}
  .lg-escribe path{animation:none;stroke-dashoffset:0}
}
`
