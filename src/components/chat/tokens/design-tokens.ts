import { cn } from '@/lib/utils';

export const DESIGN_TOKENS = {
  // Touch targets (minimum 44x44px)
  touchTarget: {
    min: 'min-h-[44px] min-w-[44px]',
    sm: 'h-8 w-8', // 32px
    md: 'h-11 w-11', // 44px
    lg: 'h-14 w-14', // 56px
    xl: 'h-20 w-20', // 80px for voice mode
  },
  
  // Spacing
  spacing: {
    mobile: 'px-4 py-3',
    tablet: 'px-6 py-4',
    desktop: 'px-8 py-6',
  },
  
  // Typography
  typography: {
    disclaimer: 'text-[10px]', // Minimum 10px
    body: 'text-sm',
    heading: 'text-lg font-semibold',
    display: 'text-4xl font-bold',
  },
  
  // Borders
  borders: {
    default: 'border border-border/40',
    strong: 'border-2 border-border',
    monochrome: '[.monochrome_&]:border-2',
  },
  
  // Corners
  corners: {
    default: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
    none: '[.monochrome_&]:rounded-none',
  },
  
  // Shadows
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-[0_24px_60px_-40px_rgba(12,18,26,0.45)]',
    lg: 'shadow-[0_20px_60px_rgba(0,0,0,0.3)]',
    none: '[.monochrome_&]:shadow-none',
  },
  
  // Safe areas
  safeArea: {
    top: 'pt-safe-area-inset-top',
    bottom: 'pb-safe-area-inset-bottom',
    both: 'pt-safe-area-inset-top pb-safe-area-inset-bottom',
  },
  
  // Animations
  animations: {
    pulse: 'animate-pulse',
    spin: 'animate-spin',
    slideUp: 'transition-transform duration-300',
    fade: 'transition-opacity duration-200',
  },
};

// Helper to combine tokens
export const combineTokens = (...tokens: string[]) => cn(...tokens);
