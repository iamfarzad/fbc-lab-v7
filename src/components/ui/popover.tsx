import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined)

interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = React.useCallback((open: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(open)
    }
    onOpenChange?.(open)
  }, [controlledOpen, onOpenChange])

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </PopoverContext.Provider>
  )
}

function usePopover() {
  const context = React.useContext(PopoverContext)
  if (!context) {
    throw new Error("Popover components must be used within a Popover")
  }
  return context
}

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { isOpen, setIsOpen } = usePopover()
  
  return (
    <button
      ref={ref}
      type="button"
      className={cn("", className)}
      onClick={() => setIsOpen(!isOpen)}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      {...props}
    />
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverAnchor = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
PopoverAnchor.displayName = "PopoverAnchor"

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "center", side = "top", sideOffset = 4, ...props }, ref) => {
    const { isOpen, setIsOpen } = usePopover()
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    const [position, setPosition] = React.useState({ top: 0, left: 0 })

    React.useEffect(() => {
      if (!isOpen || !contentRef.current) return

      const updatePosition = () => {
        const anchor = contentRef.current?.previousElementSibling as HTMLElement
        if (!anchor || !contentRef.current) return

        const anchorRect = anchor.getBoundingClientRect()
        const contentRect = contentRef.current.getBoundingClientRect()
        
        let top = 0
        let left = 0

        // Position based on side preference
        if (side === "top") {
          top = anchorRect.top - contentRect.height - sideOffset
          left = anchorRect.left
          
          // Adjust horizontal alignment
          if (align === "center") {
            left = anchorRect.left + (anchorRect.width - contentRect.width) / 2
          } else if (align === "end") {
            left = anchorRect.right - contentRect.width
          }
          
          // Flip to bottom if not enough space above
          if (top < 0) {
            top = anchorRect.bottom + sideOffset
          }
        } else if (side === "bottom") {
          top = anchorRect.bottom + sideOffset
          left = anchorRect.left
          
          if (align === "center") {
            left = anchorRect.left + (anchorRect.width - contentRect.width) / 2
          } else if (align === "end") {
            left = anchorRect.right - contentRect.width
          }
        } else if (side === "left") {
          top = anchorRect.top
          left = anchorRect.left - contentRect.width - sideOffset
          
          if (align === "center") {
            top = anchorRect.top + (anchorRect.height - contentRect.height) / 2
          } else if (align === "end") {
            top = anchorRect.bottom - contentRect.height
          }
          
          // Flip to right if not enough space on left
          if (left < 0) {
            left = anchorRect.right + sideOffset
          }
        } else if (side === "right") {
          top = anchorRect.top
          left = anchorRect.right + sideOffset
          
          if (align === "center") {
            top = anchorRect.top + (anchorRect.height - contentRect.height) / 2
          } else if (align === "end") {
            top = anchorRect.bottom - contentRect.height
          }
        }

        // Keep within viewport bounds with responsive margins
        const margin = window.innerWidth < 640 ? 16 : 8 // More margin on mobile
        
        if (left < margin) {
          left = margin
        }
        if (left + contentRect.width > window.innerWidth - margin) {
          left = window.innerWidth - contentRect.width - margin
        }
        if (top < margin) {
          top = margin
        }
        if (top + contentRect.height > window.innerHeight - margin) {
          top = window.innerHeight - contentRect.height - margin
        }

        setPosition({ top, left })
      }

      updatePosition()
      
      // Debounce for performance on mobile
      let timeoutId: NodeJS.Timeout
      const debouncedUpdate = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(updatePosition, 10)
      }
      
      window.addEventListener('resize', debouncedUpdate)
      window.addEventListener('scroll', debouncedUpdate, true)
      window.addEventListener('orientationchange', updatePosition)

      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', debouncedUpdate)
        window.removeEventListener('scroll', debouncedUpdate, true)
        window.removeEventListener('orientationchange', updatePosition)
      }
    }, [isOpen, align, side, sideOffset])

    // Close on escape
    React.useEffect(() => {
      if (!isOpen) return

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false)
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, setIsOpen])

    // Close on click outside
    React.useEffect(() => {
      if (!isOpen) return

      const handleClickOutside = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          const anchor = contentRef.current.previousElementSibling as HTMLElement
          if (anchor && !anchor.contains(e.target as Node)) {
            setIsOpen(false)
          }
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, setIsOpen])

    if (!isOpen) return null

    return (
      <div
        ref={(node) => {
          contentRef.current = node
          if (typeof ref === 'function') {
            ref(node)
          }
        }}
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-[200] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        {...props}
      />
    )
  }
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
