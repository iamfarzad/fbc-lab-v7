'use client'

import { useEffect } from 'react'
import { initBrowserLogCapture } from '@/lib/browser-log-capture'

export function BrowserLogInit() {
  useEffect(() => {
    // Initialize browser log capture in both dev and production
    if (typeof window !== 'undefined') {
      initBrowserLogCapture()
    }
  }, [])

  return null // This component renders nothing
}

