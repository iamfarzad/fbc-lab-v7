import { useEffect, useRef } from 'react'

interface ScreenDisplayProps {
  stream: MediaStream | null
  thumbnail?: string | null
  error?: string
}

export function ScreenDisplay({ stream, thumbnail, error }: ScreenDisplayProps) {
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

  if (!stream && !thumbnail) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">No screen share active</p>
      </div>
    )
  }

  if (thumbnail && !stream) {
    return (
      <img
        src={thumbnail}
        alt="Screen thumbnail"
        className="w-full h-full object-cover rounded-lg"
      />
    )
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain rounded-lg bg-black"
    />
  )
}


