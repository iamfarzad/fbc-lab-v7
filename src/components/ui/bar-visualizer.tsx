import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { useMultibandVolume, useBarAnimator, type AgentState } from "./bar-visualizer-utils"

export type { AgentState }

export interface AudioAnalyserOptions {
  fftSize?: number
  smoothingTimeConstant?: number
  minDecibels?: number
  maxDecibels?: number
}






export interface BarVisualizerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Voice assistant state */
  state?: AgentState
  /** Number of bars to display */
  barCount?: number
  /** Audio source */
  mediaStream?: MediaStream | null
  /** Min/max height as percentage */
  minHeight?: number
  maxHeight?: number
  /** Enable demo mode with fake audio data */
  demo?: boolean
  /** Align bars from center instead of bottom */
  centerAlign?: boolean
}

const BarVisualizerComponent = React.forwardRef<
  HTMLDivElement,
  BarVisualizerProps
>(
  (
    {
      state,
      barCount = 15,
      mediaStream,
      minHeight = 20,
      maxHeight = 100,
      demo = false,
      centerAlign = false,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Audio processing
    const { frequencyBands: realVolumeBands } = useMultibandVolume(mediaStream, {
      bands: barCount,
      loPass: 100,
      hiPass: 200,
    })

    // Generate fake volume data for demo mode using refs to avoid state updates
    const fakeVolumeBandsRef = useRef<number[]>(new Array(barCount).fill(0.2))
    const [fakeVolumeBands, setFakeVolumeBands] = useState<number[]>(() =>
      new Array(barCount).fill(0.2)
    )
    const fakeAnimationRef = useRef<number | undefined>(undefined)

    // Animate fake volume bands for speaking and listening states
    useEffect(() => {
      if (!demo) return

      if (state !== "speaking" && state !== "listening") {
        const bands = new Array(barCount).fill(0.2)
        fakeVolumeBandsRef.current = bands
        setFakeVolumeBands(bands)
        return
      }

      let lastUpdate = 0
      const updateInterval = 50
      const startTime = Date.now() / 1000

      const updateFakeVolume = (timestamp: number) => {
        if (timestamp - lastUpdate >= updateInterval) {
          const time = Date.now() / 1000 - startTime
          const newBands = new Array(barCount)

          for (let i = 0; i < barCount; i++) {
            const waveOffset = i * 0.5
            const baseVolume = Math.sin(time * 2 + waveOffset) * 0.3 + 0.5
            const randomNoise = Math.random() * 0.2
            newBands[i] = Math.max(0.1, Math.min(1, baseVolume + randomNoise))
          }

          // Only update if values changed significantly
          let hasChanged = false
          for (let i = 0; i < barCount; i++) {
            if (Math.abs(newBands[i] - fakeVolumeBandsRef.current[i]) > 0.05) {
              hasChanged = true
              break
            }
          }

          if (hasChanged) {
            fakeVolumeBandsRef.current = newBands
            setFakeVolumeBands(newBands)
          }

          lastUpdate = timestamp
        }

        fakeAnimationRef.current = requestAnimationFrame(updateFakeVolume)
      }

      fakeAnimationRef.current = requestAnimationFrame(updateFakeVolume)

      return () => {
        if (fakeAnimationRef.current) {
          cancelAnimationFrame(fakeAnimationRef.current)
        }
      }
    }, [demo, state, barCount])

    // Use fake or real volume data based on demo mode
    const volumeBands = useMemo(
      () => (demo ? fakeVolumeBands : realVolumeBands),
      [demo, fakeVolumeBands, realVolumeBands]
    )

    // Animation sequencing
    const highlightedIndices = useBarAnimator(
      state,
      barCount,
      state === "connecting"
        ? 2000 / barCount
        : state === "thinking"
          ? 150
          : state === "listening"
            ? 500
            : 1000
    )

    return (
      <div
        ref={ref}
        data-state={state}
        className={cn(
          "relative flex justify-center gap-1.5",
          centerAlign ? "items-center" : "items-end",
          "bg-muted h-32 w-full overflow-hidden rounded-lg p-4",
          className
        )}
        style={{
          ...style,
        }}
        {...props}
      >
        {volumeBands.map((volume, index) => {
          const heightPct = Math.min(
            maxHeight,
            Math.max(minHeight, volume * 100 + 5)
          )
          const isHighlighted = highlightedIndices?.includes(index) ?? false

          return (
            <Bar
              key={index}
              heightPct={heightPct}
              isHighlighted={isHighlighted}
              state={state}
            />
          )
        })}
      </div>
    )
  }
)

// Memoized Bar component to prevent unnecessary re-renders
const Bar = React.memo<{
  heightPct: number
  isHighlighted: boolean
  state?: AgentState
}>(({ heightPct, isHighlighted, state }) => (
  <div
    data-highlighted={isHighlighted}
    className={cn(
      "max-w-[12px] min-w-[8px] flex-1 transition-all duration-150",
      "rounded-full",
      "bg-border data-[highlighted=true]:bg-primary",
      state === "speaking" && "bg-primary",
      state === "thinking" && isHighlighted && "animate-pulse"
    )}
    style={{
      height: `${heightPct}%`,
      animationDuration: state === "thinking" ? "300ms" : undefined,
    }}
  />
))

Bar.displayName = "Bar"

// Wrap the main component with React.memo for prop comparison optimization
const BarVisualizer = React.memo(
  BarVisualizerComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.state === nextProps.state &&
      prevProps.barCount === nextProps.barCount &&
      prevProps.mediaStream === nextProps.mediaStream &&
      prevProps.minHeight === nextProps.minHeight &&
      prevProps.maxHeight === nextProps.maxHeight &&
      prevProps.demo === nextProps.demo &&
      prevProps.centerAlign === nextProps.centerAlign &&
      prevProps.className === nextProps.className &&
      JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
    )
  }
)

BarVisualizerComponent.displayName = "BarVisualizerComponent"
BarVisualizer.displayName = "BarVisualizer"

export { BarVisualizer }
