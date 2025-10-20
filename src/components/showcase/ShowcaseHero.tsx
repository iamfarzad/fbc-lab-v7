'use client'

import { Matrix, wave, pulse } from '@/components/ui/matrix'
import { fbcPatterns, fbcPalettes } from '@/lib/elevenlabs-patterns'
import { cn } from '@/lib/utils'

interface ShowcaseHeroProps {
  isVisible: boolean
}

export function ShowcaseHero({ isVisible }: ShowcaseHeroProps) {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 pt-20 relative overflow-hidden">
      {/* Animated Matrix Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Background wave matrices - responsive grid */}
        <div className="absolute inset-0 grid grid-cols-6 md:grid-cols-8 grid-rows-4 md:grid-rows-6 gap-8 md:gap-12 p-4 md:p-8 opacity-10 dark:opacity-15">
          {Array(48).fill(0).map((_, i) => (
            <Matrix 
              key={i}
              rows={5} 
              cols={5} 
              frames={wave} 
              fps={20}
              size={5}
              gap={1}
              palette={{ 
                on: "hsl(var(--muted-foreground))",
                off: "transparent"
              }}
              style={{
                animationDelay: `${i * 50}ms`
              }}
            />
          ))}
        </div>
        
        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-transparent to-background/60" />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(1200px 600px at 50% 10%, transparent 0%, transparent 40%, hsl(var(--foreground) / 0.04) 100%)`
          }}
        />
      </div>
      
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="space-y-8">
          {/* F.B/c Matrix Branding - Animated entrance */}
          <div 
            className={cn(
              "flex justify-center gap-2 md:gap-3 mb-12 transition-all duration-1000",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <Matrix 
              rows={11} 
              cols={7} 
              pattern={fbcPatterns.letterF} 
              size={10} 
              gap={2}
              palette={{ on: fbcPalettes.default.primary, off: "transparent" }}
            />
            <Matrix 
              rows={11} 
              cols={7} 
              pattern={fbcPatterns.letterB}
              size={10} 
              gap={2}
              palette={{ on: fbcPalettes.default.primary, off: "transparent" }}
            />
            <Matrix 
              rows={11} 
              cols={7} 
              pattern={fbcPatterns.letterSlash}
              size={10} 
              gap={2}
              palette={{ on: fbcPalettes.default.primary, off: "transparent" }}
            />
            <Matrix 
              rows={11} 
              cols={7} 
              pattern={fbcPatterns.letterC}
              size={10} 
              gap={2}
              palette={{ on: fbcPalettes.default.orange, off: "transparent" }}
            />
          </div>
          
          {/* Title */}
          <h1 className={cn(
            "text-4xl md:text-6xl lg:text-7xl tracking-tight leading-none",
            "font-display text-foreground"
          )}>
            ELEVENLABS UI<br />
            SHOWCASE<br />
            <span className="font-serif italic">GALLERY</span>
          </h1>
          
          {/* Description */}
          <p className={cn(
            "text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto",
            "font-serif"
          )}>
            Experience the ultimate multimodal AI interface combining Vercel AI Elements, 
            ElevenLabs UI, and custom F.B/c components.
          </p>
          
          {/* Status indicator with Matrix */}
          <div className={cn(
            "flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6",
            "font-mono"
          )}>
            <Matrix rows={3} cols={3} frames={pulse} fps={16} size={4} />
            <span>MATRIX • ORB • VOICE • AUDIO • VISUALIZATION</span>
          </div>
        </div>
      </div>
    </section>
  )
}
