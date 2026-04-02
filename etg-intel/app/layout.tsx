import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ETG Project Intelligence',
  description: 'Construction project tracker for Exterior Technologies Group',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
