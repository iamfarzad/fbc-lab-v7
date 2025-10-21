import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/components/ai-elements/theme-overrides.css'
import { BrowserLogInit } from '@/components/browser-log-init'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'] })

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'FBC Landing Page',
  description: 'Intelligent conversation platform with multimodal AI capabilities',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BrowserLogInit />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
