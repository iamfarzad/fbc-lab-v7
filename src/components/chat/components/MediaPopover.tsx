import React from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { VISUAL } from '../design-tokens';

interface MediaPopoverProps {
  type: 'voice' | 'camera' | 'screen';
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export function MediaPopover({ 
  type, 
  isOpen, 
  onClose, 
  children, 
  triggerRef,
  className 
}: MediaPopoverProps) {
  // Prevent body scroll when popover is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const computedAlign: 'start' | 'center' | 'end' = type === 'voice' ? 'end' : type === 'screen' ? 'start' : 'center';

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor ref={triggerRef} />
      <PopoverContent 
        side="top"
        align={computedAlign}
        sideOffset={12}
        className={cn(
          // Responsive width: full width on mobile (minus padding), wider on desktop
          "w-[calc(100vw-2rem)] sm:w-[400px] max-w-[480px]",
          type === 'voice' && "sm:w-[420px]", // Slightly wider for voice to accommodate waveform
          // Responsive height and scrolling
          "max-h-[60vh] sm:max-h-[70vh] overflow-y-auto overscroll-contain",
          // Visual styling with proper padding
          "bg-background/98 backdrop-blur-md border border-border/40 shadow-xl",
          "p-4", // Add padding for content
          // Z-index above everything
          "z-[200]",
          VISUAL.CORNER_RADIUS,
          "[.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2",
          // Touch and scroll optimization
          "touch-pan-y will-change-transform",
          // Smooth scrolling
          "scroll-smooth",
          className
        )}
        data-media-popover={type}
        aria-label={`${type} controls`}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
