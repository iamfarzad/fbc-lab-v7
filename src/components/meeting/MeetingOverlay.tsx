"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface MeetingOverlayProps {
  open: boolean
  onClose: () => void
  username?: string
  event?: string
  title?: string
  description?: string
}

const CAL_SCRIPT_SRC = "https://app.cal.com/embed/embed.js"

export function MeetingOverlay({
  open,
  onClose,
  username = "farzad-bayat",
  event = "30min",
  title = "Schedule a Strategy Call",
  description = "Pick a time that works for you. You'll receive a calendar invite with the meeting details.",
}: MeetingOverlayProps) {
  const [mounted, setMounted] = React.useState(false)
  const calUrl = `https://cal.com/${username}/${event}`

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!open) return

    const alreadyLoaded = Array.from(document.scripts).some(
      (script) => script.src === CAL_SCRIPT_SRC,
    )

    if (alreadyLoaded) return

    const script = document.createElement("script")
    script.src = CAL_SCRIPT_SRC
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      // Keep the Cal.com script attached so subsequent openings are instant.
    }
  }, [open])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-[96vw] max-w-3xl rounded-2xl border border-border/40 bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border/40 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            aria-label="Close scheduler"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative m-4 rounded-xl border border-border/40 bg-background/80 p-2 md:p-4">
          <div className="absolute right-3 top-3 z-10">
            <a
              href={calUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs rounded-md border px-2 py-1 text-muted-foreground hover:text-foreground bg-card/70"
            >
              Open in new tab
            </a>
          </div>

          {/* Cal.com inline embed */}
          {/* @ts-expect-error - custom element injected by Cal.com script */}
          <cal-inline
            data-ui="true"
            username={username}
            event={event}
            style={{ width: "100%", height: "540px", display: "block" }}
          />

          <iframe
            title="Book a meeting"
            src={`https://app.cal.com/${username}/${event}?embed=true`}
            style={{
              position: "absolute",
              inset: 8,
              width: "calc(100% - 16px)",
              height: "calc(100% - 16px)",
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
            }}
            loading="lazy"
          />

          <noscript>
            <a href={calUrl} target="_blank" rel="noreferrer">
              Open scheduler
            </a>
          </noscript>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default MeetingOverlay

