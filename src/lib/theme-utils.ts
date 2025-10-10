import { cn } from '@/lib/utils';

export const getThemeColors = () => ({
  // Backgrounds
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  
  // Accents
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',
  
  // States
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  
  // Borders
  border: 'hsl(var(--border))',
  ring: 'hsl(var(--ring))',
});

export const getGradientForTheme = (theme?: string) => {
  // Return theme-aware gradients
  return {
    voice: 'bg-gradient-to-b from-background via-muted to-background',
    camera: 'bg-background',
    overlay: 'bg-background/50 backdrop-blur-sm',
    card: 'bg-gradient-to-b from-card to-card/80',
  };
};

export const getMonochromeClass = () => '[.monochrome_&]:rounded-none [.monochrome_&]:border-2';

export const getThemeAwareBackdrop = () => 'bg-background/50 backdrop-blur-sm';

export const getThemeAwareShadow = () => 'shadow-[0_24px_60px_-40px_rgba(12,18,26,0.45)]';

export const combineThemeClasses = (...classes: string[]) => {
  return cn(...classes);
};

// Chat animations for smooth state transitions
export const chatAnimations = {
  // Slide from button position (bottom-right) to full-screen
  expandFromButton: {
    initial: { 
      x: 'calc(100vw - 400px)', 
      y: 'calc(100vh - 200px)',
      width: '380px',
      height: '160px',
      opacity: 0.8
    },
    animate: { 
      x: 0, 
      y: 0,
      width: '100vw',
      height: '100vh',
      opacity: 1
    },
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      duration: 0.4
    }
  },
  
  // Minimize to ConversationBar
  minimizeToBar: {
    initial: { 
      x: 0, 
      y: 0,
      width: '100vw',
      height: '100vh',
      opacity: 1
    },
    animate: { 
      x: 'calc(100vw - 420px)', 
      y: 'calc(100vh - 180px)',
      width: '400px',
      height: '160px',
      opacity: 1
    },
    exit: {
      opacity: 0,
      scale: 0.95
    },
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      duration: 0.3
    }
  }
};
