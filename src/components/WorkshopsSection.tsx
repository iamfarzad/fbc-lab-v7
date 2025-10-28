import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Users, Clock, Star, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"
import { CONTACT_CONFIG } from "@/config/constants"

export function WorkshopsSection({ className, ...props }: ComponentProps<"section">) {
  const workshops = [
    {
      title: "AI FUNDAMENTALS FOR LEADERS",
      duration: "Half Day",
      audience: "Executives & Managers",
      description: "Essential AI knowledge for decision-makers, covering strategic implications and implementation considerations.",
      highlights: ["AI landscape overview", "Strategic planning", "Risk assessment", "ROI frameworks"]
    },
    {
      title: "PRACTICAL AI IMPLEMENTATION",
      duration: "2 Days",
      audience: "Technical Teams",
      description: "Hands-on workshop focusing on implementing AI solutions in real-world business scenarios.",
      highlights: ["Tool selection", "Integration patterns", "Best practices", "Performance optimization"]
    },
    {
      title: "AI ETHICS & GOVERNANCE",
      duration: "Full Day",
      audience: "Compliance & Legal Teams",
      description: "Comprehensive guide to ethical AI implementation and governance frameworks.",
      highlights: ["Ethical frameworks", "Compliance requirements", "Bias mitigation", "Monitoring strategies"]
    },
    {
      title: "AI-POWERED CUSTOMER EXPERIENCE",
      duration: "Full Day",
      audience: "Marketing & Customer Service",
      description: "Transform customer interactions with AI-driven personalization and automation strategies.",
      highlights: ["Personalization engines", "Chatbot implementation", "Customer analytics", "Experience design"]
    }
  ]

  return (
    <section 
      id="workshops" 
      className={cn(
        "py-20 px-6 bg-muted/10",
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
            WORKSHOPS
          </h2>
          <p className={cn(
            "text-lg text-muted-foreground max-w-3xl mx-auto",
            "font-serif"
          )}>
            Interactive, hands-on workshops designed to equip your team with practical AI skills 
            and knowledge for immediate application.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {workshops.map((workshop, index) => (
            <WorkshopCard key={index} workshop={workshop} />
          ))}
        </div>

        <div className="bg-card rounded-md p-8 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <FeatureItem
              icon={Target}
              title="CUSTOMIZED CONTENT"
              description="Workshops tailored to your specific industry, team size, and current AI maturity level."
            />
            
            <FeatureItem
              icon={Users}
              title="INTERACTIVE LEARNING"
              description="Hands-on exercises, group discussions, and real-world case studies for maximum engagement."
            />
            
            <FeatureItem
              icon={Star}
              title="ONGOING SUPPORT"
              description="Post-workshop resources and follow-up sessions to ensure successful implementation."
            />
          </div>
        </div>

        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "font-mono"
            )}
            onClick={() => {
              window.open(CONTACT_CONFIG.SCHEDULING.BOOKING_URL, '_blank')
            }}
          >
            SCHEDULE A WORKSHOP
          </Button>
        </div>
      </div>
    </section>
  )
}

// Helper components
interface WorkshopCardProps {
  workshop: {
    title: string
    duration: string
    audience: string
    description: string
    highlights: string[]
  }
  className?: string
}

function WorkshopCard({ workshop, className }: WorkshopCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className={cn(
          "text-lg mb-4",
          "font-mono text-foreground"
        )}>
          {workshop.title}
        </CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span className={cn("font-mono")}>{workshop.duration}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span className={cn("font-mono")}>{workshop.audience}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={cn(
          "text-muted-foreground",
          "font-sans"
        )}>
          {workshop.description}
        </p>
        <div>
          <h4 className={cn(
            "font-medium mb-2",
            "font-mono text-foreground"
          )}>
            KEY TOPICS:
          </h4>
          <ul className={cn(
            "space-y-2 text-sm text-muted-foreground",
            "font-sans"
          )}>
            {workshop.highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  className?: string
}

function FeatureItem({ icon: Icon, title, description, className }: FeatureItemProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-center">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className={cn(
        "text-lg font-semibold",
        "font-mono text-foreground"
      )}>
        {title}
      </h3>
      <p className={cn(
        "text-sm text-muted-foreground",
        "font-sans"
      )}>
        {description}
      </p>
    </div>
  )
}
