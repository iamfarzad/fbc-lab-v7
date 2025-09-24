import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Users, Clock, Star, Target } from "lucide-react"

export function WorkshopsSection() {
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
    <section id="workshops" className="py-20 px-6 bg-muted/10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            WORKSHOPS
          </h2>
          <div className="text-lg text-muted-foreground max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-serif)' }}>
            Interactive, hands-on workshops designed to equip your team with practical AI skills 
            and knowledge for immediate application.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {workshops.map((workshop, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <CardTitle className="text-lg mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                  {workshop.title}
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{workshop.duration}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{workshop.audience}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                  {workshop.description}
                </p>
                <div>
                  <h4 className="font-medium mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                    KEY TOPICS:
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                    {workshop.highlights.map((highlight, idx) => (
                      <li key={idx}>• {highlight}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-card rounded-lg p-8 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="flex justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                CUSTOMIZED CONTENT
              </h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Workshops tailored to your specific industry, team size, and current AI maturity level.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                INTERACTIVE LEARNING
              </h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Hands-on exercises, group discussions, and real-world case studies for maximum engagement.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                ONGOING SUPPORT
              </h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Post-workshop resources and follow-up sessions to ensure successful implementation.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" style={{ fontFamily: 'var(--font-mono)' }}>
            SCHEDULE A WORKSHOP
          </Button>
        </div>
      </div>
    </section>
  )
}
