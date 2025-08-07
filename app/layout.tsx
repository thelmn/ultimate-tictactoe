import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ultimate Tic-Tac-Toe',
  description: 'A modern implementation of Ultimate Tic-Tac-Toe',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}