'use client'

import { useState, useEffect } from 'react'
// import { Matrix, Orb, MicSelector, VoicePicker, AudioPlayer, ShimmeringText } from '@/components/ui'
// import { wave, pulse, loader, snake } from '@/components/ui/matrix'
// import { fbcPatterns, fbcPalettes } from '@/lib/elevenlabs-patterns'
// import { useSimulatedAudio } from '@/hooks/useElevenLabsAudio'
import { ShowcaseSection } from '@/components/showcase/ShowcaseSection'
import { ShowcaseHero } from '@/components/showcase/ShowcaseHero'
import { VisualizationComparison } from '@/components/showcase/VisualizationComparison'
import { VoiceStateDemo } from '@/components/showcase/VoiceStateDemo'
import { HybridDemo } from '@/components/showcase/HybridDemo'
import { FullVoiceInterfaceDemo } from '@/components/showcase/FullVoiceInterfaceDemo'
import { ThemeShowcase } from '@/components/showcase/ThemeShowcase'
import { PerformanceMonitor } from '@/components/showcase/PerformanceMonitor'

export default function MultimodalShowcase() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'terminal'>('light')
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(true)
  }, [])
  
  return (
    <div className={`min-h-screen bg-background ${currentTheme}`}>
      {/* Hero: Animated F.B/c Matrix Banner */}
      <ShowcaseHero isVisible={isVisible} />
      
      {/* Section 1: Audio Visualization Comparison */}
      <ShowcaseSection title="Audio Visualization Mastery">
        <VisualizationComparison />
      </ShowcaseSection>
      
      {/* Section 2: Voice Interface States */}
      <ShowcaseSection title="Voice Interface States">
        <VoiceStateDemo />
      </ShowcaseSection>
      
      {/* Section 3: Hybrid Compositions */}
      <ShowcaseSection title="Hybrid Visualizations">
        <HybridDemo />
      </ShowcaseSection>
      
      {/* Section 4: Full Integration Example */}
      <ShowcaseSection title="Complete Voice Experience">
        <FullVoiceInterfaceDemo />
      </ShowcaseSection>
      
      {/* Section 5: Theme Showcase */}
      <ShowcaseSection title="Theme Adaptability">
        <ThemeShowcase 
          currentTheme={currentTheme} 
          onThemeChange={setCurrentTheme} 
        />
      </ShowcaseSection>
      
      {/* Section 6: Performance Metrics */}
      <ShowcaseSection title="Performance">
        <PerformanceMonitor />
      </ShowcaseSection>
    </div>
  )
}
