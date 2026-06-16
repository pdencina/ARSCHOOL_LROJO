export const dynamic = 'force-dynamic'
import { Toaster } from 'react-hot-toast'

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-right"/>
      {children}
    </>
  )
}
