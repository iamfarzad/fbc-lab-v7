"use client"

import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import type { ComponentPropsWithoutRef } from "react"

export type ShimmerState = "thinking" | "analyzing" | "processing" | "researching"

interface ShimmerLoaderProps extends Omit<ComponentPropsWithoutRef<"div">, "onDrag"> {
  state?: ShimmerState
  variant?: "inline" | "block"
  text?: string
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
}: ShimmerLoaderProps) {
  const displayText = text ?? stateLabels[state]

  if (variant === "inline") {
    return (
      <motion.span
        className={cn(
          "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
          "[--base-color:var(--muted-foreground)] [--shimmer-color:var(--foreground)]",
          "[background-repeat:no-repeat,padding-box]",
          "[--shimmer-bg:linear-gradient(90deg,transparent_calc(50%-40px),var(--shimmer-color),transparent_calc(50%+40px))]",
          "dark:[--base-color:var(--muted-foreground)] dark:[--shimmer-color:var(--foreground)]",
          className
        )}
        style={{
          backgroundImage: `var(--shimmer-bg), linear-gradient(var(--base-color), var(--base-color))`,
        }}
        initial={{
          backgroundPosition: "100% center",
          opacity: 0,
        }}
        animate={{
          backgroundPosition: "0% center",
          opacity: 1,
        }}
        transition={{
          backgroundPosition: {
            repeat: Infinity,
            duration: 2,
            ease: "linear",
          },
          opacity: {
            duration: 0.3,
          },
        }}
      >
        {displayText}...
      </motion.span>
    )
  }

  return (
    <motion.div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/40 bg-card/80 px-3 py-2 text-xs text-muted-foreground shadow-sm",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-1">
        <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse"></div>
        <div className="h-1.5 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{animationDelay: '0.2s'}}></div>
        <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))] animate-pulse" style={{animationDelay: '0.4s'}}></div>
      </div>
      <span className="tracking-[0.3em] uppercase">
        {displayText}
      </span>
    </motion.div>
  )
}

