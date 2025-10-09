import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

interface AboutSectionProps extends ComponentProps<"section"> {}

export function AboutSection({ className, ...props }: AboutSectionProps) {
  return (
    <section 
      id="about" 
      className={cn(
        "py-20 px-6",
        className
      )} 
      {...props}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={cn(
            "text-4xl md:text-5xl font-bold mb-6",
            "font-display text-foreground"
          )}>
            ABOUT
          </h2>
          <p className={cn(
            "text-lg text-muted-foreground max-w-3xl mx-auto",
            "font-serif"
          )}>
            With over 5 years of experience in AI implementation and strategy, I help organizations 
            leverage artificial intelligence to drive innovation and efficiency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ServiceCard
            title="STRATEGIC CONSULTING"
            description="Comprehensive AI strategy development aligned with your business objectives 
            and organizational capabilities."
          />
          
          <ServiceCard
            title="HANDS-ON WORKSHOPS"
            description="Interactive training sessions designed to upskill your team and build 
            internal AI capabilities."
          />
          
          <ServiceCard
            title="IMPLEMENTATION SUPPORT"
            description="End-to-end guidance from concept to deployment, ensuring successful 
            AI integration into your workflows."
          />
        </div>

        <div className="mt-16 text-center">
          <h3 className={cn(
            "text-2xl font-semibold mb-4",
            "font-display text-foreground"
          )}>
            Let's Build Your AI Future Together
          </h3>
          <p className={cn(
            "text-muted-foreground mb-8",
            "font-serif"
          )}>
            Whether you're just starting your AI journey or looking to optimize existing systems, 
            I provide the expertise and guidance you need.
          </p>
        </div>
      </div>
    </section>
  )
}

// Helper component for service cards
interface ServiceCardProps {
  title: string
  description: string
  className?: string
}

function ServiceCard({ title, description, className }: ServiceCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className={cn(
          "text-xl",
          "font-mono text-foreground"
        )}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn(
          "text-muted-foreground",
          "font-sans"
        )}>
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
