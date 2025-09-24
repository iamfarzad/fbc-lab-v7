/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", "monochrome"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--midday-border))",
        input: "hsl(var(--midday-input))",
        ring: "hsl(var(--midday-ring))",
        background: "hsl(var(--midday-background))",
        foreground: "hsl(var(--midday-foreground))",
        primary: {
          DEFAULT: "hsl(var(--midday-primary))",
          foreground: "hsl(var(--midday-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--midday-secondary))",
          foreground: "hsl(var(--midday-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--midday-destructive))",
          foreground: "hsl(var(--midday-destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--midday-muted))",
          foreground: "hsl(var(--midday-muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--midday-accent))",
          foreground: "hsl(var(--midday-accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--midday-popover))",
          foreground: "hsl(var(--midday-popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--midday-card))",
          foreground: "hsl(var(--midday-card-foreground))",
        },
        // Chat-specific colors
        chat: {
          user: {
            bg: "hsl(var(--midday-chat-user-bg))",
            text: "hsl(var(--midday-chat-user-text))",
          },
          assistant: {
            bg: "hsl(var(--midday-chat-assistant-bg))",
            text: "hsl(var(--midday-chat-assistant-text))",
            border: "hsl(var(--midday-chat-assistant-border))",
          },
        },
      },
      borderRadius: {
        lg: "var(--midday-radius)",
        md: "calc(var(--midday-radius) - 2px)",
        sm: "calc(var(--midday-radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(5deg)" },
        },
        "float-medium": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(-3deg)" },
        },
        "float-fast": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "float-medium": "float-medium 4s ease-in-out infinite",
        "float-fast": "float-fast 3s ease-in-out infinite",
      },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
  },
  plugins: [],
}
