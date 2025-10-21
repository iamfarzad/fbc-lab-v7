'use client'

import { useEffect } from 'react'
import { initBrowserLogCapture } from '@/lib/browser-log-capture'

export function BrowserLogInit() {
  useEffect(() => {
    // Only initialize browser log capture in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      initBrowserLogCapture()
    }
  }, [])

  return null // This component renders nothing
}

