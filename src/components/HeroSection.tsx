import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

interface HeroSectionProps extends ComponentProps<"section"> {}

export function HeroSection({ className, ...props }: HeroSectionProps) {
  return (
    <section 
      className={cn(
        "min-h-screen flex items-center justify-center px-6 pt-20 relative overflow-hidden",
        className
      )} 
      {...props}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0 bg-dotted"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />
        </div>
        
        {/* Floating Geometric Elements */}
        <div className="absolute inset-0">
          {/* Large Square */}
          <div 
            className={cn(
              "absolute w-32 h-32 border border-border/20 rotate-12",
              "animate-float-slow"
            )}
            style={{
              top: '10%',
              left: '85%',
              animationDelay: '0s',
              animationDuration: 'var(--duration-slow)'
            }}
          />
          
          {/* Medium Circle */}
          <div 
            className={cn(
              "absolute w-20 h-20 rounded-full border border-border/30",
              "animate-float-medium"
            )}
            style={{
              top: '20%',
              left: '10%',
              animationDelay: '3s',
              animationDuration: 'var(--duration-medium)'
            }}
          />
          
          {/* Small Triangle */}
          <div 
            className={cn(
              "absolute w-16 h-16",
              "animate-float-fast"
            )}
            style={{
              top: '70%',
              left: '80%',
              animationDelay: '6s',
              animationDuration: 'var(--duration-fast)'
            }}
          >
            <div className="w-full h-full border-l border-r border-b border-border/25 transform rotate-45" />
          </div>
          
          {/* Large Circle */}
          <div 
            className={cn(
              "absolute w-40 h-40 rounded-full border border-border/15",
              "animate-float-slow"
            )}
            style={{
              top: '60%',
              left: '5%',
              animationDelay: '9s',
              animationDuration: '25s'
            }}
          />
          
          {/* Medium Square */}
          <div 
            className={cn(
              "absolute w-24 h-24 border border-border/25 -rotate-12",
              "animate-float-medium"
            )}
            style={{
              top: '40%',
              left: '90%',
              animationDelay: '12s',
              animationDuration: '18s'
            }}
          />
          
          {/* Small Dots */}
          <div 
            className={cn(
              "absolute w-3 h-3 bg-muted/40 rounded-full",
              "animate-float-fast"
            )}
            style={{
              top: '25%',
              left: '25%',
              animationDelay: '2s',
              animationDuration: '10s'
            }}
          />
          
          <div 
            className={cn(
              "absolute w-2 h-2 bg-muted/50 rounded-full",
              "animate-float-slow"
            )}
            style={{
              top: '80%',
              left: '60%',
              animationDelay: '8s',
              animationDuration: '22s'
            }}
          />
          
          <div 
            className={cn(
              "absolute w-4 h-4 bg-muted/30 rounded-full",
              "animate-float-medium"
            )}
            style={{
              top: '15%',
              left: '70%',
              animationDelay: '5s',
              animationDuration: '16s'
            }}
          />
        </div>
        
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-transparent to-background/30" />
      </div>
      
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="space-y-8">
          <h1 className={cn(
            "text-4xl md:text-6xl lg:text-7xl tracking-tight leading-none",
            "font-display text-foreground"
          )}>
            AI CONSULTANT<br />
            & WORKSHOP<br />
            <span className="font-serif italic">FACILITATOR</span>
          </h1>
          
          <p className={cn(
            "text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto",
            "font-serif"
          )}>
            Helping organizations navigate the AI landscape through strategic consulting, 
            hands-on workshops, and practical implementation guidance.
          </p>
          
          <div className={cn(
            "flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6",
            "font-mono"
          )}>
            <div className={cn(
              "h-2 w-2 animate-pulse rounded-full",
              "bg-orange"
            )} />
            <span>MULTIMODAL AI CONSULTANT • CHAT • VOICE • WEBCAM • SCREEN SHARE</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button 
              size="lg" 
              className={cn(
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "font-sans"
              )}
            >
              BOOK A CONSULTATION
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="font-sans"
            >
              VIEW WORKSHOPS
            </Button>
          </div>
          
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 text-sm",
            "font-mono"
          )}>
            <div className="space-y-2">
              <div className="text-muted-foreground">EXPERTISE</div>
              <div className="text-foreground">AI STRATEGY / IMPLEMENTATION</div>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground">DELIVERY</div>
              <div className="text-foreground">REMOTE / ON-SITE</div>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground">EXPERIENCE</div>
              <div className="text-foreground">5+ YEARS IN AI</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
