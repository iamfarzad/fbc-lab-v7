import { useEffect, useRef } from 'react'

interface CameraDisplayProps {
  stream: MediaStream | null
  error?: string
}

export function CameraDisplay({ stream, error }: CameraDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-sm text-destructive px-4 text-center">{error}</p>
      </div>
    )
  }

  if (!stream) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">No camera stream</p>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover rounded-lg"
    />
  )
}


