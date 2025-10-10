import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getThemeAwareBackdrop, getMonochromeClass } from "@/lib/theme-utils";
import { DESIGN_TOKENS } from "../tokens/design-tokens";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className 
}: BottomSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[200] flex items-end justify-center"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("absolute inset-0", getThemeAwareBackdrop())}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
            className={cn(
              "relative w-full max-w-lg max-h-[85vh] overflow-hidden",
              "bg-background border-t border-border/20",
              DESIGN_TOKENS.corners.lg,
              DESIGN_TOKENS.shadows.lg,
              DESIGN_TOKENS.safeArea.bottom,
              getMonochromeClass(),
              className
            )}
            onClick={(e) => e.stopPropagation()}
            // Swipe-down to close on touch devices
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) {
                onClose();
              }
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={cn(
                "w-12 h-1.5 bg-muted-foreground/30",
                DESIGN_TOKENS.corners.full,
                getMonochromeClass()
              )} />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4">
                <h2 className={cn(DESIGN_TOKENS.typography.heading, "text-foreground")}>{title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className={cn("h-8 w-8 p-0", DESIGN_TOKENS.touchTarget.sm)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// List item component for bottom sheets
interface BottomSheetListItemProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function BottomSheetListItem({
  icon,
  label,
  description,
  onClick,
  disabled = false,
  className
}: BottomSheetListItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-4 p-4 text-left transition-all duration-200",
        "hover:bg-muted/50 active:bg-muted/70",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        DESIGN_TOKENS.touchTarget.min,
        DESIGN_TOKENS.corners.default,
        getMonochromeClass(),
        className
      )}
    >
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          DESIGN_TOKENS.typography.body,
          "font-medium text-foreground",
          disabled && "text-muted-foreground"
        )}>
          {label}
        </p>
        {description && (
          <p className={cn(DESIGN_TOKENS.typography.disclaimer, "text-muted-foreground mt-0.5")}>
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
