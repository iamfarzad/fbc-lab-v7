import { motion, AnimatePresence } from 'framer-motion'
import { X, Monitor, MonitorOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScreenDisplay } from './ScreenDisplay'

interface ScreenFullScreenProps {
  isOpen: boolean
  onClose: () => void
  isActive: boolean
  stream: MediaStream | null
  thumbnail?: string | null
  error?: string
  onToggle: () => void
}

export function ScreenFullScreen({
  isOpen,
  onClose,
  isActive,
  stream,
  thumbnail,
  error,
  onToggle
}: ScreenFullScreenProps) {
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
          <h2 className="text-lg font-semibold">Screen Share</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Screen View */}
        <div className="flex flex-col h-[calc(100vh-73px)] p-4">
          <div className="flex-1 mb-4">
            <ScreenDisplay stream={stream} thumbnail={thumbnail} error={error} />
          </div>

          {/* Controls */}
          <Button
            onClick={onToggle}
            size="lg"
            variant={isActive ? 'destructive' : 'default'}
            className="w-full"
          >
            {isActive ? (
              <>
                <MonitorOff className="mr-2 h-5 w-5" />
                Stop Screen Share
              </>
            ) : (
              <>
                <Monitor className="mr-2 h-5 w-5" />
                Start Screen Share
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}


