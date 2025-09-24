import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export function AboutSection() {
  return (
    <section id="about" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            ABOUT
          </h2>
          <div className="text-lg text-muted-foreground max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-serif)' }}>
            With over 5 years of experience in AI implementation and strategy, I help organizations 
            leverage artificial intelligence to drive innovation and efficiency.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                STRATEGIC CONSULTING
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Comprehensive AI strategy development aligned with your business objectives 
                and organizational capabilities.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                HANDS-ON WORKSHOPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Interactive training sessions designed to upskill your team and build 
                internal AI capabilities.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                IMPLEMENTATION SUPPORT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                End-to-end guidance from concept to deployment, ensuring successful 
                AI integration into your workflows.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <div className="text-2xl font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Let's Build Your AI Future Together
          </div>
          <div className="text-muted-foreground mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
            Whether you're just starting your AI journey or looking to optimize existing systems, 
            I provide the expertise and guidance you need.
          </div>
        </div>
      </div>
    </section>
  )
}
