export type ThemeVariant =
  | 'orange-light'
  | 'orange-dark'
  | 'monochrome'
  | 'monochrome-dark'
  | 'monochrome-orange'
  | 'monochrome-orange-dark'
  | 'system'

export function applyThemeVariant(themeVariant: ThemeVariant) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // Remove all theme classes we manage
  root.classList.remove(
    'orange-light',
    'orange-dark',
    'monochrome',
    'monochrome-dark',
    'monochrome-orange',
    'monochrome-orange-dark',
    'reduce-motion',
    'dark'
  )

  switch (themeVariant) {
    case 'orange-light':
      root.classList.add('orange-light')
      break
    case 'orange-dark':
      root.classList.add('dark', 'orange-dark')
      break
    case 'monochrome':
      root.classList.add('monochrome')
      break
    case 'monochrome-dark':
      root.classList.add('dark', 'monochrome', 'monochrome-dark')
      break
    case 'monochrome-orange':
      root.classList.add('monochrome', 'monochrome-orange', 'orange-light')
      break
    case 'monochrome-orange-dark':
      root.classList.add('dark', 'monochrome', 'monochrome-orange-dark', 'orange-dark')
      break
    case 'system': {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      const prefersMonochrome = typeof window !== 'undefined' && window.matchMedia('(prefers-contrast: more)').matches
      const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (prefersReducedMotion) root.classList.add('reduce-motion')

      if (prefersMonochrome) {
        root.classList.add('monochrome')
        if (prefersDark) root.classList.add('dark', 'monochrome-dark')
      } else {
        if (prefersDark) root.classList.add('dark', 'orange-dark')
        else root.classList.add('orange-light')
      }
      break
    }
  }
}

// Legacy helpers used by older chat components — keep minimal, theme-safe
