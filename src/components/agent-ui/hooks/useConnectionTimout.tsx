import { useEffect } from 'react'
import { toastAlert } from '@/components/agent-ui/livekit/alert-toast'
import { useSession } from '@/components/agent-ui/app/session-provider'
import { useLiveApi } from '@/hooks/useLiveApi'

export function useConnectionTimeout(timeoutMs = 20_000) {
  const { isSessionActive, endSession } = useSession()
  const liveApi = useLiveApi()

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Consider session ready if any of these are true
      const ready = isSessionActive || liveApi.isRecording || liveApi.isProcessing
      if (!ready) {
        toastAlert({
          title: 'Session ended',
          description: (
            <p className="w-full">
              Voice session did not initialize in time. Please check your microphone
              permissions and backend connectivity, then try again.
            </p>
          ),
        })
        try { endSession() } catch {}
      }
    }, timeoutMs)

    return () => clearTimeout(timeout)
  }, [isSessionActive, liveApi.isRecording, liveApi.isProcessing, endSession, timeoutMs])
}
