import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const getViewportWidth = () => {
    if (typeof window === 'undefined') return breakpoint;
    if (window.visualViewport) {
      return window.visualViewport.width;
    }
    return window.innerWidth;
  };

  const [isMobile, setIsMobile] = useState<boolean>(() => getViewportWidth() <= breakpoint);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(getViewportWidth() <= breakpoint);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [breakpoint, getViewportWidth]);

  return isMobile;
}
