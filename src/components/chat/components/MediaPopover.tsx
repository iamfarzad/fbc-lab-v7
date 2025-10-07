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
  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor ref={triggerRef} />
      <PopoverContent 
        align="center" 
        sideOffset={8}
        className={cn(
          "w-80 bg-background/95 backdrop-blur-sm border border-border/40 shadow-lg p-0",
          "z-50",
          VISUAL.CORNER_RADIUS,
          "[.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2",
          className
        )}
        data-media-popover={type}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
