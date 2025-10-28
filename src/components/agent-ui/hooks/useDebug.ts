import * as React from 'react'

// LiveKit-free noop debug hook. Keeps the API surface for callers
export const useDebugMode = (options: { logLevel?: any; enabled?: boolean } = {}) => {
  const enabled = options.enabled ?? true
  React.useEffect(() => {
    if (!enabled) return
    // Attach minimal debug info to window if needed
    // @ts-expect-error - Adding debug object to window for development
    window.__fbc_debug = { enabled: true }
    return () => {
      // @ts-expect-error - Removing debug object from window
      window.__fbc_debug = undefined
    }
  }, [enabled])
}
