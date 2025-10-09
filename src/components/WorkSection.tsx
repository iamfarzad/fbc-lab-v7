import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

interface WorkSectionProps extends ComponentProps<"section"> {}

export function WorkSection({ className, ...props }: WorkSectionProps) {
  const scrollToContact = () => {
    const element = document.getElementById('contact')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section 
      id="services" 
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
            SERVICES
          </h2>
          <p className={cn(
            "text-lg text-muted-foreground max-w-3xl mx-auto",
            "font-serif"
          )}>
            Comprehensive AI consulting services designed to help your organization 
            thrive in the age of artificial intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ServiceCard
            title="AI STRATEGY DEVELOPMENT"
            description="Comprehensive AI roadmap development aligned with your business objectives 
            and organizational capabilities."
            features={[
              "AI maturity assessment",
              "Opportunity identification", 
              "Implementation roadmap",
              "ROI analysis"
            ]}
          />

          <ServiceCard
            title="TEAM TRAINING & WORKSHOPS"
            description="Hands-on workshops designed to upskill your team and build 
            internal AI capabilities."
            features={[
              "AI fundamentals training",
              "Tool-specific workshops",
              "Best practices guidance",
              "Custom curriculum development"
            ]}
          />

          <ServiceCard
            title="IMPLEMENTATION SUPPORT"
            description="End-to-end guidance from concept to deployment, ensuring successful 
            AI integration into your workflows."
            features={[
              "Technical architecture design",
              "Integration support",
              "Performance optimization", 
              "Change management"
            ]}
          />
        </div>

        <div className="text-center mt-12">
          <Button 
            size="lg" 
            onClick={scrollToContact}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "font-mono"
            )}
          >
            DISCUSS YOUR PROJECT
          </Button>
        </div>
      </div>
    </section>
  )
}

// Helper component for service cards
interface ServiceCardProps {
  title: string
  description: string
  features: string[]
  className?: string
}

function ServiceCard({ title, description, features, className }: ServiceCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className={cn(
          "text-xl",
          "font-mono text-foreground"
        )}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={cn(
          "text-muted-foreground",
          "font-sans"
        )}>
          {description}
        </p>
        <ul className={cn(
          "space-y-2 text-sm text-muted-foreground",
          "font-sans"
        )}>
          {features.map((feature, index) => (
            <li key={index}>• {feature}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
