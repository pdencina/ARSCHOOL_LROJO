'use client'
import { useEffect, useState } from 'react'

/**
 * Pantalla de carga al recargar o entrar al panel (F5, Ctrl+Shift+R, login).
 *
 * Se renderiza en el HTML inicial del layout del dashboard, así que aparece en
 * cuanto el navegador pinta la página nueva y se retira cuando todo terminó de
 * cargar. La navegación entre secciones NO la muestra: el layout no se vuelve a
 * montar al cambiar de página.
 *
 * Un lápiz dibuja un trazo bajo el logo mientras rotan frases escolares.
 */

const FRASES_CARGA = [
  'Tocando la campana…',
  'Pasando lista…',
  'Afilando lápices…',
  'Ordenando los cuadernos…',
  'Borrando la pizarra…',
  'Preparando la jornada…',
  'Abriendo el libro de clases…',
  'Revisando las mochilas…',
]

const MIN_MS = 1200 // lo justo para que el lápiz termine su trazo
const MAX_MS = 5000 // nunca bloquea más que esto
const SALIDA_MS = 450

// Trazo a mano alzada (ondulado) que dibuja el lápiz
const TRAZO = 'M6 16 C 26 4, 42 26, 62 14 S 98 6, 118 16 S 156 24, 174 12'

// Mismo color de acento por rol que el menú lateral
const COLOR_ROL: Record<string, string> = {
  super_admin: '#C45A1A', admin: '#C45A1A', coordinador: '#C45A1A',
  pastor_campus: '#4A3080', gestor_admision: '#1B3A5C',
  tutor_supervisor: '#3D7A94', tutor: '#2D5A3F',
}

export default function PantallaCarga({ nombre, rol, fraseInicial = 0 }: { nombre?: string | null; rol?: string | null; fraseInicial?: number }) {
  const color = COLOR_ROL[rol ?? ''] ?? '#1B3A5C'
  const [fase, setFase] = useState<'visible' | 'saliendo' | 'oculta'>('visible')
  const [frase, setFrase] = useState(fraseInicial % FRASES_CARGA.length)

  useEffect(() => {
    let cancelado = false
    const inicio = performance.now() // ms desde que empezó la navegación
    const rotar = setInterval(() => setFrase(f => (f + 1) % FRASES_CARGA.length), 1400)

    const salir = () => {
      if (cancelado) return
      setFase('saliendo')
      setTimeout(() => { if (!cancelado) setFase('oculta') }, SALIDA_MS)
    }
    const cuandoListo = () => {
      const espera = Math.max(0, MIN_MS - (performance.now() - inicio))
      setTimeout(salir, espera)
    }

    if (document.readyState === 'complete') cuandoListo()
    else window.addEventListener('load', cuandoListo, { once: true })
    const tope = setTimeout(salir, MAX_MS)

    return () => {
      cancelado = true
      clearInterval(rotar)
      clearTimeout(tope)
      window.removeEventListener('load', cuandoListo)
    }
  }, [])

  if (fase === 'oculta') return null

  return (
    <div className={`pc-overlay ${fase === 'saliendo' ? 'pc-saliendo' : ''}`} role="status" aria-live="polite" style={{ ['--pc-color' as any]: color }}>
      {/* dangerouslySetInnerHTML: como texto, React escapa las comillas en el servidor y la hidratación falla */}
      <style dangerouslySetInnerHTML={{ __html: CSS }}/>
      <div className="pc-contenido">
        <img src="/logo-arschool.png" alt="AR School" className="pc-logo" width={72} height={72}/>

        {/* Trazo + lápiz: ambos con animaciones CSS de igual duración, así avanzan juntos */}
        <div className="pc-trazo" aria-hidden="true">
          <svg viewBox="0 0 180 30" width="180" height="30">
            <path d={TRAZO} className="pc-linea" pathLength={100}/>
          </svg>
          {/* Lápiz: la punta está en (4, 28) y es el punto que recorre el trazo */}
          <svg className="pc-lapiz" viewBox="0 0 24 30" width="24" height="30">
            <g transform="translate(4 28) rotate(35) translate(0 -25)">
              <rect x="-3.2" y="0" width="6.4" height="18" rx="1" fill="#F2B233"/>
              <rect x="-3.2" y="0" width="6.4" height="3.4" rx="1" fill="#E58FA2"/>
              <rect x="-3.2" y="3.4" width="6.4" height="1.6" fill="#9CA3AF"/>
              <path d="M-3.2 18 L3.2 18 L0 25 Z" fill="#F4D7A6"/>
              <path d="M-1.1 22.6 L1.1 22.6 L0 25 Z" fill="var(--pc-color)"/>
            </g>
          </svg>
        </div>

        <p className="pc-saludo">{nombre ? `Hola, ${nombre}` : 'AR School'}</p>
        <p className="pc-frase" key={frase}>{FRASES_CARGA[frase]}</p>
      </div>
    </div>
  )
}

const CSS = `
.pc-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;
  background:var(--ar-bg,#FDF8F3);transition:opacity ${SALIDA_MS}ms ease, visibility ${SALIDA_MS}ms ease}
.pc-overlay.pc-saliendo{opacity:0;visibility:hidden;pointer-events:none}
.pc-contenido{display:flex;flex-direction:column;align-items:center;gap:6px;transition:transform ${SALIDA_MS}ms cubic-bezier(.4,0,.2,1)}
.pc-saliendo .pc-contenido{transform:translateY(-14px) scale(.98)}
.pc-logo{width:72px;height:72px;object-fit:contain;animation:pc-entra .5s cubic-bezier(.2,.8,.2,1) both}
.pc-trazo{position:relative;width:180px;height:30px;margin-top:2px}
.pc-trazo svg{overflow:visible}
.pc-lapiz{position:absolute;left:0;top:0;offset-path:path('${TRAZO}');offset-rotate:0deg;offset-anchor:4px 28px;
  offset-distance:0%;animation:pc-recorre 1.1s cubic-bezier(.45,0,.25,1) forwards}
.pc-linea{fill:none;stroke:var(--pc-color);stroke-width:3;stroke-linecap:round;
  stroke-dasharray:100;stroke-dashoffset:100;animation:pc-dibuja 1.1s cubic-bezier(.45,0,.25,1) forwards}
.pc-saludo{margin-top:10px;font-family:'DM Sans',system-ui,sans-serif;font-size:15px;font-weight:700;color:var(--ar-text,#1B3A5C);
  animation:pc-sube .5s .15s ease-out both}
.pc-frase{font-size:12px;color:var(--ar-muted,#6b7280);min-height:18px;animation:pc-sube .35s ease-out both}
@keyframes pc-dibuja{to{stroke-dashoffset:0}}
@keyframes pc-recorre{to{offset-distance:100%}}
@keyframes pc-entra{from{opacity:0;transform:scale(.85) rotate(-6deg)}to{opacity:1;transform:none}}
@keyframes pc-sube{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){
  .pc-logo,.pc-saludo,.pc-frase{animation:none}
  .pc-linea{animation:none;stroke-dashoffset:0}
  .pc-lapiz{display:none}
  .pc-saliendo .pc-contenido{transform:none}
}
`
