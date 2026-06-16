export const dynamic = 'force-dynamic'
import { Toaster } from 'react-hot-toast'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-right"/>
      {children}
    </>
  )
}
