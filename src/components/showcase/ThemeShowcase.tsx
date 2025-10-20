'use client'

import { Matrix, Orb } from '@/components/ui'
import { fbcPatterns, fbcPalettes } from '@/lib/elevenlabs-patterns'
import { useSimulatedAudio } from '@/hooks/useElevenLabsAudio'
// import { useState } from 'react'

type Theme = 'light' | 'dark' | 'terminal'

interface ThemeShowcaseProps {
  currentTheme: Theme
  onThemeChange: (theme: Theme) => void
}

export function ThemeShowcase({ currentTheme, onThemeChange }: ThemeShowcaseProps) {
  const { levels, volume } = useSimulatedAudio(true, 100)
  
  const themeConfig = {
    light: {
      name: 'Light Mode',
      description: 'Clean, modern interface',
      palette: fbcPalettes.default
    },
    dark: {
      name: 'Dark Mode', 
      description: 'Easy on the eyes',
      palette: fbcPalettes.dark
    },
    terminal: {
      name: 'Terminal Mode',
      description: 'Retro phosphor green',
      palette: fbcPalettes.terminal
    }
  }
  
  return (
    <div className="space-y-8">
      {/* Theme selector */}
      <div className="flex justify-center gap-4">
        {Object.entries(themeConfig).map(([theme, config]) => (
          <button
            key={theme}
            onClick={() => onThemeChange(theme as Theme)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentTheme === theme
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {config.name}
          </button>
        ))}
      </div>
      
      {/* Current theme display */}
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">
          {themeConfig[currentTheme].name}
        </h3>
        <p className="text-muted-foreground">
          {themeConfig[currentTheme].description}
        </p>
      </div>
      
      {/* Theme comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.entries(themeConfig).map(([theme, config]) => (
          <div
            key={theme}
            className={`p-6 rounded-lg border-2 transition-colors ${
              currentTheme === theme
                ? 'border-primary bg-primary/5'
                : 'border-muted bg-muted/20'
            }`}
          >
            <h4 className="font-semibold mb-4 text-center">{config.name}</h4>
            
            {/* F.B/c Matrix branding */}
            <div className="flex justify-center gap-1 mb-4">
              <Matrix 
                rows={7} 
                cols={5} 
                pattern={fbcPatterns.letterF.slice(0, 7)} 
                size={6} 
                gap={1}
                palette={{ on: config.palette.primary, off: "transparent" }}
              />
              <Matrix 
                rows={7} 
                cols={5} 
                pattern={fbcPatterns.letterB.slice(0, 7)} 
                size={6} 
                gap={1}
                palette={{ on: config.palette.primary, off: "transparent" }}
              />
              <Matrix 
                rows={7} 
                cols={5} 
                pattern={fbcPatterns.letterSlash.slice(0, 7)} 
                size={6} 
                gap={1}
                palette={{ on: config.palette.primary, off: "transparent" }}
              />
              <Matrix 
                rows={7} 
                cols={5} 
                pattern={fbcPatterns.letterC.slice(0, 7)} 
                size={6} 
                gap={1}
                palette={{ on: config.palette.orange, off: "transparent" }}
              />
            </div>
            
            {/* Orb visualization */}
            <div className="flex justify-center mb-4">
              <Orb
                agentState="talking"
                manualInput={volume}
                manualOutput={volume}
                volumeMode="manual"
                className="w-20 h-20"
              />
            </div>
            
            {/* Matrix VU meter */}
            <div className="flex justify-center">
              <Matrix
                rows={5}
                cols={12}
                mode="vu"
                levels={levels}
                size={6}
                gap={1}
                palette={{
                  on: config.palette.primary,
                  off: "hsl(var(--muted-foreground) / 0.3)"
                }}
              />
            </div>
            
            <p className="text-sm text-muted-foreground text-center mt-4">
              {config.description}
            </p>
          </div>
        ))}
      </div>
      
      {/* Color palette display */}
      <div className="bg-muted/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-4 text-center">Color Palettes</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(themeConfig).map(([theme, config]) => (
            <div key={theme} className="space-y-2">
              <div className="font-medium">{config.name}</div>
              <div className="flex gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: config.palette.primary }}
                  title="Primary"
                />
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: config.palette.orange }}
                  title="Orange"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
