'use client';

import { Suspense } from "react"
import { Navigation } from "@/components/Navigation"
import { HeroSection } from "@/components/HeroSection"
import { AboutSection } from "@/components/AboutSection"
import { ContactSection } from "@/components/ContactSection"
import { Footer } from "@/components/Footer"
import { 
  WorkSectionLazy, 
  WorkshopsSectionLazy, 
  MultimodalChatLazy 
} from "@/components/LazyComponents"

// Page loading fallback
const PageSkeleton = () => (
  <div className="min-h-screen bg-background animate-pulse">
    <div className="h-16 bg-muted/20" />
    <div className="space-y-8 p-8">
      <div className="h-32 bg-muted/10 rounded" />
      <div className="h-24 bg-muted/10 rounded" />
    </div>
  </div>
)

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main>
        <HeroSection />
        
        {/* Lazy loaded sections for better performance */}
        <Suspense fallback={
          <div className="h-96 bg-muted/5 animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Loading services...</div>
          </div>
        }>
          <WorkSectionLazy />
        </Suspense>
        
        <AboutSection />
        
        <Suspense fallback={
          <div className="h-96 bg-muted/5 animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Loading workshops...</div>
          </div>
        }>
          <WorkshopsSectionLazy />
        </Suspense>
        
        <ContactSection />
      </main>
      <Footer />
      
      {/* Chat widget */}
      <Suspense fallback={
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 bg-primary rounded-full animate-pulse" />
      }>
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          <MultimodalChatLazy />
        </div>
      </Suspense>
    </div>
  )
}
