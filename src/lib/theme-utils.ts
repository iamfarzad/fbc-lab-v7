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
