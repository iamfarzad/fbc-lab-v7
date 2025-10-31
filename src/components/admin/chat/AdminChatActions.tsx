'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Paperclip,
  Mic,
  Camera,
  Monitor,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminChatActionsProps {
  // File upload handler
  onFileUpload: () => void
  
  // Voice state
  isVoiceActive: boolean
  onVoiceToggle: () => void
  isVoiceLoading: boolean
  
  // Webcam state
  isWebcamActive: boolean
  onWebcamToggle: () => void
  isWebcamLoading: boolean
  
  // Screenshare state
  isScreenShareActive: boolean
  onScreenShareToggle: () => void
  isScreenShareLoading: boolean
  
  className?: string
}

export function AdminChatActions({
  onFileUpload,
  isVoiceActive,
  onVoiceToggle,
  isVoiceLoading,
  isWebcamActive,
  onWebcamToggle,
  isWebcamLoading,
  isScreenShareActive,
  onScreenShareToggle,
  isScreenShareLoading,
  className,
}: AdminChatActionsProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1 shrink-0', className)}>
        {/* File Upload Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onFileUpload}
              disabled={isVoiceLoading || isWebcamLoading || isScreenShareLoading}
              aria-label="Upload files"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upload files or images</TooltipContent>
        </Tooltip>

        {/* Voice Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isVoiceActive ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8', isVoiceActive && 'ring-2 ring-primary/30')}
              onClick={onVoiceToggle}
              disabled={isVoiceLoading || isWebcamLoading || isScreenShareLoading}
              aria-label={isVoiceActive ? 'Stop voice' : 'Start voice'}
            >
              {isVoiceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVoiceActive ? 'Stop voice input' : 'Start voice input'}
          </TooltipContent>
        </Tooltip>

        {/* Webcam Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isWebcamActive ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8', isWebcamActive && 'ring-2 ring-primary/30')}
              onClick={onWebcamToggle}
              disabled={isVoiceLoading || isWebcamLoading || isScreenShareLoading}
              aria-label={isWebcamActive ? 'Stop webcam' : 'Start webcam'}
            >
              {isWebcamLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isWebcamActive ? 'Stop webcam' : 'Start webcam'}
          </TooltipContent>
        </Tooltip>

        {/* Screenshare Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isScreenShareActive ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8', isScreenShareActive && 'ring-2 ring-primary/30')}
              onClick={onScreenShareToggle}
              disabled={isVoiceLoading || isWebcamLoading || isScreenShareLoading}
              aria-label={isScreenShareActive ? 'Stop screen share' : 'Start screen share'}
            >
              {isScreenShareLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenShareActive ? 'Stop screen share' : 'Start screen share'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

