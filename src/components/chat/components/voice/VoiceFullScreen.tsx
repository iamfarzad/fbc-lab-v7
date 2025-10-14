import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceDisplay } from './VoiceDisplay'
import { VoiceWaveform } from '../VoiceWaveform'

interface VoiceFullScreenProps {
  isOpen: boolean
  onClose: () => void
  isActive: boolean
  isProcessing: boolean
  transcript: string
  partialTranscript: string
  error: string | null
  onToggle: () => void
}

export function VoiceFullScreen({
  isOpen,
  onClose,
  isActive,
  isProcessing,
  transcript,
  partialTranscript,
  error,
  onToggle
}: VoiceFullScreenProps) {
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
          <h2 className="text-lg font-semibold">Voice Mode</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100vh-73px)]">
          {/* Waveform */}
          <div className="flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-2xl">
              <VoiceWaveform
                isActive={isActive}
                isProcessing={isProcessing}
                height={120}
                barWidth={4}
                barGap={3}
                barCount={60}
              />
            </div>
          </div>

          {/* Transcript */}
          <div className="flex-1 px-4">
            <VoiceDisplay
              transcript={transcript}
              partialTranscript={partialTranscript}
              isProcessing={isProcessing}
              error={error}
            />
          </div>

          {/* Controls */}
          <div className="p-6 border-t">
            <Button
              onClick={onToggle}
              size="lg"
              variant={isActive ? 'destructive' : 'default'}
              className="w-full"
            >
              {isActive ? (
                <>
                  <MicOff className="mr-2 h-5 w-5" />
                  Stop Voice
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Start Voice
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

