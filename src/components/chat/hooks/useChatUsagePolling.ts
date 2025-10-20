import { useEffect, useState } from 'react'

export function useChatUsagePolling(sessionId?: string | null) {
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) return

    let isMounted = true

    const pollUsage = async () => {
      try {
        const res = await fetch(`/api/usage/${sessionId}`)
        if (!res.ok) return
        const data = await res.json()
        if (isMounted) {
          setUsage(data)
        }
      } catch {
        // usage tracking is non-critical; ignore errors
      }
    }

    const interval = setInterval(pollUsage, 10_000)
    // run immediately so UI has initial value
    void pollUsage()

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [sessionId])

  return usage
}
