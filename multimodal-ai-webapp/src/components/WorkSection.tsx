import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"

export function WorkSection() {
  return (
    <section id="services" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            SERVICES
          </h2>
          <div className="text-lg text-muted-foreground max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-serif)' }}>
            Comprehensive AI consulting services designed to help your organization 
            thrive in the age of artificial intelligence.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                AI STRATEGY DEVELOPMENT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Comprehensive AI roadmap development aligned with your business objectives 
                and organizational capabilities.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                <li>• AI maturity assessment</li>
                <li>• Opportunity identification</li>
                <li>• Implementation roadmap</li>
                <li>• ROI analysis</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                TEAM TRAINING & WORKSHOPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Hands-on workshops designed to upskill your team and build 
                internal AI capabilities.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                <li>• AI fundamentals training</li>
                <li>• Tool-specific workshops</li>
                <li>• Best practices guidance</li>
                <li>• Custom curriculum development</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                IMPLEMENTATION SUPPORT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                End-to-end guidance from concept to deployment, ensuring successful 
                AI integration into your workflows.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                <li>• Technical architecture design</li>
                <li>• Integration support</li>
                <li>• Performance optimization</li>
                <li>• Change management</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" style={{ fontFamily: 'var(--font-mono)' }}>
            DISCUSS YOUR PROJECT
          </Button>
        </div>
      </div>
    </section>
  )
}
