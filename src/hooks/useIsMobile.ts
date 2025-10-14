import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(query.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    query.addEventListener('change', handler)
    
    return () => query.removeEventListener('change', handler)
  }, [breakpoint])
  
  return isMobile
}

