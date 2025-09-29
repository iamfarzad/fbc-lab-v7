import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Calendar } from "lucide-react"

export function ContactSection() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Get form data
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      company: formData.get('company') as string,
      email: formData.get('email') as string,
      areaOfInterest: formData.get('areaOfInterest') as string
    }
    
    // For now, just log the data and show an alert
    console.log('Form submitted:', data)
    window.alert('Thank you for your interest! We will contact you within 2-3 business days to schedule your consultation.')
    
    // Reset form
    e.currentTarget.reset()
  }

  return (
    <section id="contact" className="py-20 px-6 bg-muted/10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            CONTACT
          </h2>
          <div className="text-lg text-muted-foreground max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-serif)' }}>
            Ready to transform your organization with AI? Let's start a conversation about your specific needs and how we can work together.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                  GET IN TOUCH
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium" style={{ fontFamily: 'var(--font-sans)' }}>Email</div>
                    <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      contact@farzadbayat.com
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium" style={{ fontFamily: 'var(--font-sans)' }}>Phone</div>
                    <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      +47 94446446
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium" style={{ fontFamily: 'var(--font-sans)' }}>Location</div>
                    <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      Oslo, Norway & Remote
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                  AVAILABILITY
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
                        Consultation Slots
                      </div>
                      <div className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                        Available within 2-3 business days
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
                        Workshop Scheduling
                      </div>
                      <div className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                        Planning 2-4 weeks in advance
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                  SCHEDULE A CONSULTATION
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-muted-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
                  Take the first step towards AI transformation. Book a free 30-minute consultation to discuss your goals and explore how we can work together.
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      YOUR NAME
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="John Doe"
                      style={{ fontFamily: 'var(--font-sans)' }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      COMPANY
                    </label>
                    <input
                      type="text"
                      name="company"
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Your Company"
                      style={{ fontFamily: 'var(--font-sans)' }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      EMAIL
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="john@company.com"
                      style={{ fontFamily: 'var(--font-sans)' }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'var(--font-mono)' }}>
                      AREA OF INTEREST
                    </label>
                    <select
                      name="areaOfInterest"
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{ fontFamily: 'var(--font-sans)' }}
                      required
                    >
                      <option value="">Select an option</option>
                      <option value="AI Strategy Consulting">AI Strategy Consulting</option>
                      <option value="Team Training Workshop">Team Training Workshop</option>
                      <option value="Implementation Support">Implementation Support</option>
                      <option value="Custom AI Solution">Custom AI Solution</option>
                    </select>
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    REQUEST CONSULTATION
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
