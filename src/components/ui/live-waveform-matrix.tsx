"use client"

import React from "react"
import { Matrix } from "./matrix"
import { digits, wave } from "./matrix-utils"

export interface LiveWaveformMatrixProps {
  mode: "idle" | "user" | "ai"
  active: boolean
  className?: string
  size?: number
  gap?: number
}

const defaultLevels = [0.1, 0.6, 0.9, 0.7, 0.4, 0.8, 0.5, 0.3, 0.6, 0.9, 0.5, 0.2]

export const LiveWaveformMatrix = React.forwardRef<HTMLDivElement, LiveWaveformMatrixProps>(
  ({ mode = "idle", className, size = 4, gap = 1 }, ref) => {
    if (mode === "idle") {
      return (
        <Matrix
          ref={ref}
          rows={7}
          cols={5}
          pattern={digits[5]}
          size={size}
          gap={gap}
          ariaLabel="Idle state"
          className={className}
        />
      )
    }

    if (mode === "user") {
      return (
        <div ref={ref} className={className}>
          <Matrix
            rows={7}
            cols={7}
            frames={wave}
            fps={20}
            loop
            ariaLabel="User speaking"
            size={size}
            gap={gap}
          />
          <Matrix
            rows={7}
            cols={12}
            mode="vu"
            levels={defaultLevels}
            size={size}
            gap={gap}
          />
        </div>
      )
    }

    if (mode === "ai") {
      return (
        <div ref={ref} className={className}>
          <Matrix
            rows={7}
            cols={7}
            frames={wave}
            fps={15}
            loop
            ariaLabel="AI speaking"
            size={size}
            gap={gap}
          />
          <Matrix
            rows={7}
            cols={12}
            mode="vu"
            levels={defaultLevels.map((l) => l * 0.8)}
            size={size}
            gap={gap}
          />
        </div>
      )
    }

    return null
  }
)

LiveWaveformMatrix.displayName = "LiveWaveformMatrix"
