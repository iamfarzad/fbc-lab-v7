import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useCamera } from '@/hooks/useCamera'
import { useScreenShare } from '@/hooks/useScreenShare'
import { useLiveApi } from '@/hooks/useLiveApi'
import { FbcMatrixVisualizer } from '@/components/agent-ui/FbcMatrixVisualizer'

const MotionContainer = motion.create('div');

const ANIMATION_TRANSITION = {
  type: 'spring' as const,
  stiffness: 675,
  damping: 75,
  mass: 1,
};

const classNames = {
  // GRID
  // 2 Columns x 3 Rows
  grid: [
    'h-full w-full',
    'grid gap-x-2 place-content-center',
    'grid-cols-[1fr_1fr] grid-rows-[90px_1fr_90px]',
  ],
  // Agent
  // chatOpen: true,
  // hasSecondTile: true
  // layout: Column 1 / Row 1
  // align: x-end y-center
  agentChatOpenWithSecondTile: ['col-start-1 row-start-1', 'self-center justify-self-end'],
  // Agent
  // chatOpen: true,
  // hasSecondTile: false
  // layout: Column 1 / Row 1 / Column-Span 2
  // align: x-center y-center
  agentChatOpenWithoutSecondTile: ['col-start-1 row-start-1', 'col-span-2', 'place-content-center'],
  // Agent
  // chatOpen: false
  // layout: Column 1 / Row 1 / Column-Span 2 / Row-Span 3
  // align: x-center y-center
  agentChatClosed: ['col-start-1 row-start-1', 'col-span-2 row-span-3', 'place-content-center'],
  // Second tile
  // chatOpen: true,
  // hasSecondTile: true
  // layout: Column 2 / Row 1
  // align: x-start y-center
  secondTileChatOpen: ['col-start-2 row-start-1', 'self-center justify-self-start'],
  // Second tile
  // chatOpen: false,
  // hasSecondTile: false
  // layout: Column 2 / Row 2
  // align: x-end y-end
  secondTileChatClosed: ['col-start-2 row-start-3', 'place-content-end'],
};

// Removed LiveKit local track references. Preview tiles use plain <video> bound to FBC hooks.

type CameraHook = ReturnType<typeof useCamera>
type ScreenHook = ReturnType<typeof useScreenShare>

interface TileLayoutProps {
  chatOpen: boolean;
  camera: CameraHook;
  screen: ScreenHook;
}

export function TileLayout({ chatOpen, camera, screen }: TileLayoutProps) {
  useLiveApi() // ensure audio pipeline remains active
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)

  const isCameraEnabled = camera.isActive
  const isScreenShareEnabled = screen.isActive
  const hasSecondTile = isCameraEnabled || isScreenShareEnabled

  const animationDelay = chatOpen ? 0 : 0.15;
  const isAvatar = false

  useEffect(() => {
    if (cameraVideoRef.current && camera.stream) {
      try { cameraVideoRef.current.srcObject = camera.stream }
      catch (error) {
        console.warn('[TileLayout] Failed to bind camera stream', error)
      }
    }
  }, [camera.stream])

  useEffect(() => {
    if (screenVideoRef.current && screen.stream) {
      try { screenVideoRef.current.srcObject = screen.stream }
      catch (error) {
        console.warn('[TileLayout] Failed to bind screen stream', error)
      }
    }
  }, [screen.stream])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-8 bottom-32 z-50 md:top-12 md:bottom-40">
      <div className="relative mx-auto h-full max-w-2xl px-4 md:px-0">
        <div className={cn(classNames.grid)}>
          {/* Agent */}
          <div
            className={cn([
              'grid',
              !chatOpen && classNames.agentChatClosed,
              chatOpen && hasSecondTile && classNames.agentChatOpenWithSecondTile,
              chatOpen && !hasSecondTile && classNames.agentChatOpenWithoutSecondTile,
            ])}
          >
            <AnimatePresence mode="popLayout">
              {!isAvatar && (
                // Audio Agent
                <MotionContainer
                  key="agent"
                  layoutId="agent"
                  initial={{
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    opacity: 1,
                    scale: chatOpen ? 1 : 5,
                  }}
                  transition={{
                    ...ANIMATION_TRANSITION,
                    delay: animationDelay,
                  }}
                  className={cn(
                    'bg-background aspect-square h-[90px] rounded-md border border-transparent transition-[border,drop-shadow] overflow-hidden',
                    chatOpen && 'border-input/50 drop-shadow-lg/10 delay-200'
                  )}
                >
                  <div className="flex h-full w-full items-center justify-center overflow-hidden">
                    <FbcMatrixVisualizer variant="expanded" />
                  </div>
                </MotionContainer>
              )}

              {isAvatar && (
                // Avatar Agent
                <MotionContainer
                  key="avatar"
                  layoutId="avatar"
                  initial={{
                    scale: 1,
                    opacity: 1,
                    maskImage:
                      'radial-gradient(circle, rgba(0, 0, 0, 1) 0, rgba(0, 0, 0, 1) 20px, transparent 20px)',
                    filter: 'blur(20px)',
                  }}
                  animate={{
                    maskImage:
                      'radial-gradient(circle, rgba(0, 0, 0, 1) 0, rgba(0, 0, 0, 1) 500px, transparent 500px)',
                    filter: 'blur(0px)',
                    borderRadius: chatOpen ? 6 : 12,
                  }}
                  transition={{
                    ...ANIMATION_TRANSITION,
                    delay: animationDelay,
                    maskImage: {
                      duration: 1,
                    },
                    filter: {
                      duration: 1,
                    },
                  }}
                  className={cn(
                    'overflow-hidden bg-black drop-shadow-xl/80',
                    chatOpen ? 'h-[90px]' : 'h-auto w-full'
                  )}
                >
                  <div className={cn('bg-black', chatOpen && 'size-[90px]')} />
                </MotionContainer>
              )}
            </AnimatePresence>
          </div>

          <div
            className={cn([
              'grid',
              chatOpen && classNames.secondTileChatOpen,
              !chatOpen && classNames.secondTileChatClosed,
            ])}
          >
            {/* Camera & Screen Share */}
            <AnimatePresence>
              {(isCameraEnabled || isScreenShareEnabled) && (
                <MotionContainer
                  key="camera"
                  layout="position"
                  layoutId="camera"
                  initial={{
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{
                    ...ANIMATION_TRANSITION,
                    delay: animationDelay,
                  }}
                  className="drop-shadow-lg/20"
                >
                  <video
                    ref={isCameraEnabled ? cameraVideoRef : screenVideoRef}
                    muted
                    playsInline
                    autoPlay
                    className="bg-muted aspect-square w-[90px] rounded-md object-cover"
                  />
                </MotionContainer>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
