import { Suspense } from 'react'
import PagoFacilClient from '@/components/pago/PagoFacilClient'

export const metadata = { title: 'Pago en línea — AR School' }
export const dynamic = 'force-dynamic'

export default function PagoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f6f8]"/>}>
      <PagoFacilClient />
    </Suspense>
  )
}
