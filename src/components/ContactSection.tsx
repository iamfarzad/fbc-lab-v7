import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

export function ContactSection({ className, ...props }: ComponentProps<"section">) {
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
    <section 
      id="contact" 
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
            CONTACT
          </h2>
          <p className={cn(
            "text-lg text-muted-foreground max-w-3xl mx-auto",
            "font-serif"
          )}>
            Ready to transform your organization with AI? Let's start a conversation about your specific needs and how we can work together.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <ContactCard title="GET IN TOUCH">
              <div className="space-y-6">
                <ContactItem
                  icon={Mail}
                  label="Email"
                  value="contact@farzadbayat.com"
                />
                <ContactItem
                  icon={Phone}
                  label="Phone"
                  value="+47 94446446"
                />
                <ContactItem
                  icon={MapPin}
                  label="Location"
                  value="Oslo, Norway & Remote"
                />
              </div>
            </ContactCard>

            <ContactCard title="AVAILABILITY">
              <div className="space-y-4">
                <AvailabilityItem
                  icon={Calendar}
                  iconColor="text-green-500"
                  title="Consultation Slots"
                  description="Available within 2-3 business days"
                />
                <AvailabilityItem
                  icon={Calendar}
                  iconColor="text-blue-500"
                  title="Workshop Scheduling"
                  description="Planning 2-4 weeks in advance"
                />
              </div>
            </ContactCard>
          </div>

          <div>
            <ContactCard title="SCHEDULE A CONSULTATION">
              <div className="space-y-6">
                <p className={cn(
                  "text-muted-foreground",
                  "font-serif"
                )}>
                  Take the first step towards AI transformation. Book a free 30-minute consultation to discuss your goals and explore how we can work together.
                </p>
                
                {/* Cal.com Widget */}
                <div className="bg-muted/5 rounded-lg p-4 border border-border">
                  <div className="text-center mb-4">
                    <h3 className={cn(
                      "text-lg font-semibold mb-2",
                      "font-mono text-foreground"
                    )}>
                      BOOK A CALL
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a time that works for you
                    </p>
                  </div>
                  
                  <div className="cal-embed" 
                    data-cal-link="farzad-bayat/consultation"
                    data-cal-config='{"layout":"month_view","theme":"light"}'
                    style={{ width: "100%", height: "600px", overflow: "scroll" }}
                  >
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Loading calendar...
                      </p>
                      <Button 
                        onClick={() => window.open('https://cal.com/farzad-bayat/consultation', '_blank')}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono"
                      >
                        OPEN CALENDAR
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Or fill out the form below for a callback
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField
                    name="name"
                    label="YOUR NAME"
                    placeholder="John Doe"
                    required
                  />
                  
                  <FormField
                    name="company"
                    label="COMPANY"
                    placeholder="Your Company"
                    required
                  />
                  
                  <FormField
                    name="email"
                    type="email"
                    label="EMAIL"
                    placeholder="john@company.com"
                    required
                  />
                  
                  <SelectField
                    name="areaOfInterest"
                    label="AREA OF INTEREST"
                    required
                  >
                    <option value="">Choose your area of interest</option>
                    <option value="AI Strategy Consulting">AI Strategy Consulting</option>
                    <option value="Team Training Workshop">Team Training Workshop</option>
                    <option value="Implementation Support">Implementation Support</option>
                    <option value="Custom AI Solution">Custom AI Solution</option>
                  </SelectField>
                  
                  <Button 
                    type="submit" 
                    size="lg" 
                    className={cn(
                      "w-full bg-primary text-primary-foreground hover:bg-primary/90",
                      "font-mono"
                    )}
                  >
                    REQUEST CONSULTATION
                  </Button>
                </form>
              </div>
            </ContactCard>
          </div>
        </div>
      </div>
    </section>
  )
}

// Helper components
interface ContactCardProps {
  title: string
  children: React.ReactNode
}

function ContactCard({ title, children }: ContactCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn(
          "text-xl",
          "font-mono text-foreground"
        )}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

interface ContactItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}

function ContactItem({ icon: Icon, label, value }: ContactItemProps) {
  return (
    <div className="flex items-center space-x-4">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <div className={cn(
          "font-medium",
          "font-sans text-foreground"
        )}>
          {label}
        </div>
        <div className={cn(
          "text-muted-foreground",
          "font-mono"
        )}>
          {value}
        </div>
      </div>
    </div>
  )
}

interface AvailabilityItemProps {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  description: string
}

function AvailabilityItem({ icon: Icon, iconColor, title, description }: AvailabilityItemProps) {
  return (
    <div className="flex items-center space-x-3">
      <Icon className={cn("h-4 w-4", iconColor)} />
      <div>
        <div className={cn(
          "font-medium",
          "font-sans text-foreground"
        )}>
          {title}
        </div>
        <div className={cn(
          "text-sm text-muted-foreground",
          "font-mono"
        )}>
          {description}
        </div>
      </div>
    </div>
  )
}

interface FormFieldProps {
  name: string
  label: string
  type?: string
  placeholder?: string
  required?: boolean
}

function FormField({ name, label, type = "text", placeholder, required }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className={cn(
        "text-sm font-medium block",
        "font-mono text-foreground"
      )}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        className={cn(
          "w-full px-4 py-3 border border-input rounded-md bg-background text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "font-sans placeholder:text-muted-foreground/70",
          "transition-all duration-200 hover:border-primary/50"
        )}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

interface SelectFieldProps {
  name: string
  label: string
  children: React.ReactNode
  required?: boolean
}

function SelectField({ name, label, children, required }: SelectFieldProps) {
  return (
    <div className="space-y-2">
      <label className={cn(
        "text-sm font-medium block",
        "font-mono text-foreground"
      )}>
        {label}
      </label>
      <select
        name={name}
        className={cn(
          "w-full px-4 py-3 border border-input rounded-md bg-background text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "font-sans",
          "transition-all duration-200 hover:border-primary/50"
        )}
        required={required}
      >
        {children}
      </select>
    </div>
  )
}
