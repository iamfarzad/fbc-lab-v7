"use client"

import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import type { ComponentPropsWithoutRef, CSSProperties } from "react"

export type ShimmerState = "thinking" | "analyzing" | "processing" | "researching"

interface ShimmerLoaderProps extends Omit<ComponentPropsWithoutRef<"div">, "onDrag"> {
  state?: ShimmerState
  variant?: "inline" | "block"
  text?: string
  // Optional enhancements to match documented behavior
  startOnView?: boolean
  delayMs?: number
  spreadPx?: number
  autoSpread?: boolean
  repeatDelayMs?: number
}

const stateLabels: Record<ShimmerState, string> = {
  thinking: "Thinking",
  analyzing: "Analyzing",
  processing: "Processing",
  researching: "Researching",
}

export function ShimmerLoader({
  state = "thinking",
  variant = "inline",
  text,
  className,
  startOnView = false,
  delayMs = 0,
  spreadPx,
  autoSpread = false,
  repeatDelayMs = 0,
}: ShimmerLoaderProps) {
  const displayText = text ?? stateLabels[state]

  // Determine shimmer spread for inline variant
  const computedSpread = (() => {
    if (typeof spreadPx === 'number' && spreadPx > 0) return spreadPx
    if (autoSpread && typeof displayText === 'string') {
      // Heuristic: scale with text length, clamped to sensible bounds
      const approx = Math.round(displayText.length * 1.2)
      return Math.max(24, Math.min(96, approx))
    }
    return 40
  })()

  const delaySec = Math.max(0, delayMs) / 1000
  const repeatDelaySec = Math.max(0, repeatDelayMs) / 1000

  if (variant === "inline") {
    const baseClass = cn(
      "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
      "[--base-color:var(--muted-foreground)] [--shimmer-color:var(--foreground)]",
      "[background-repeat:no-repeat,padding-box]",
      // Use configurable spread via CSS variable
      "[--shimmer-bg:linear-gradient(90deg,transparent_calc(50%-var(--shimmer-spread,40px)),var(--shimmer-color),transparent_calc(50%+var(--shimmer-spread,40px)))]",
      "dark:[--base-color:var(--muted-foreground)] dark:[--shimmer-color:var(--foreground)]",
      className
    )

    const sharedProps = {
      className: baseClass,
      style: {
        // Provide background layers and computed spread
        backgroundImage: `var(--shimmer-bg), linear-gradient(var(--base-color), var(--base-color))`,
        ['--shimmer-spread']: `${computedSpread}px`,
      } as CSSProperties,
      initial: {
        backgroundPosition: "100% center",
        opacity: 0,
      },
      transition: {
        backgroundPosition: {
          repeat: Infinity as any,
          duration: 2,
          ease: "linear",
          delay: delaySec,
          // repeatDelay not guaranteed for backgroundPosition, but harmless if unsupported
          repeatDelay: repeatDelaySec,
        },
        opacity: {
          duration: 0.3,
          delay: delaySec,
        },
      } as any,
    }

    return startOnView ? (
      <motion.span
        {...sharedProps}
        whileInView={{
          backgroundPosition: "0% center",
          opacity: 1,
        }}
        viewport={{ once: false, amount: 0.6 }}
      >
        {displayText}...
      </motion.span>
    ) : (
      <motion.span
        {...sharedProps}
        animate={{
          backgroundPosition: "0% center",
          opacity: 1,
        }}
      >
        {displayText}...
      </motion.span>
    )
  }

  const BlockContent = (
    <>
      <div className="flex items-center gap-1">
        <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{ animationDelay: `${delayMs}ms` }}></div>
        <div className="h-1.5 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{ animationDelay: `${delayMs + 200}ms` }}></div>
        <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{ animationDelay: `${delayMs + 400}ms` }}></div>
      </div>
      <span className="tracking-[0.3em] uppercase">
        {displayText}
      </span>
    </>
  )

  const containerClass = cn(
    "flex items-center gap-2 rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-sm",
    className
  )

  return startOnView ? (
    <motion.div
      className={containerClass}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.6 }}
      transition={{ duration: 0.3, delay: delaySec }}
    >
      {BlockContent}
    </motion.div>
  ) : (
    <motion.div
      className={containerClass}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delaySec }}
    >
      {BlockContent}
    </motion.div>
  )
}
