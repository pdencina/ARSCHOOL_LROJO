'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setLoading(false)
    setProgress(100)
    const timer = setTimeout(() => setProgress(0), 200)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    let interval: NodeJS.Timeout

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (anchor && anchor.href && !anchor.href.startsWith('#') && !anchor.target) {
        const url = new URL(anchor.href, window.location.origin)
        if (url.pathname !== pathname && url.origin === window.location.origin) {
          setLoading(true)
          setProgress(20)
          interval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 90) return prev
              return prev + Math.random() * 15
            })
          }, 200)
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      clearInterval(interval)
    }
  }, [pathname])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-[var(--ar-accent)] to-[#f5a623] transition-all duration-300 ease-out rounded-r-full"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  )
}
