import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, CameraOff, SwitchCamera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CameraDisplay } from './CameraDisplay'

interface CameraFullScreenProps {
  isOpen: boolean
  onClose: () => void
  isActive: boolean
  stream: MediaStream | null
  error?: string
  onToggle: () => void
  onSwitchCamera?: () => void
  hasMultipleCameras?: boolean
}

export function CameraFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  error,
  onToggle,
  onSwitchCamera,
  hasMultipleCameras
}: CameraFullScreenProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Camera</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Camera View */}
        <div className="flex flex-col h-[calc(100vh-73px)] p-4">
          <div className="flex-1 mb-4">
            <CameraDisplay stream={stream} error={error} />
          </div>

          {/* Controls */}
          <div className="space-y-2">
            {isActive && hasMultipleCameras && onSwitchCamera && (
              <Button
                onClick={onSwitchCamera}
                variant="outline"
                className="w-full"
              >
                <SwitchCamera className="mr-2 h-4 w-4" />
                Switch Camera
              </Button>
            )}
            <Button
              onClick={onToggle}
              size="lg"
              variant={isActive ? 'destructive' : 'default'}
              className="w-full"
            >
              {isActive ? (
                <>
                  <CameraOff className="mr-2 h-5 w-5" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}


